import React from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  showInfo: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('jotai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jotai')>();
  return { ...actual, useAtomValue: () => [], useSetAtom: () => vi.fn() };
});

vi.mock('../../../../store/atoms/openProjects', () => ({ activeWorkspacePathAtom: {} }));
vi.mock('../../../../store/atoms/appSettings', () => ({ hiddenGutterItemsAtom: {}, toggleGutterItemHiddenAtom: {} }));
vi.mock('../SettingsToggle', () => ({ SettingsToggle: () => null, ToggleSwitch: () => null }));
vi.mock('../../common/AlphaBadge', () => ({ SettingsAlphaBadge: () => null }));
vi.mock('../ClaudeRuntimeStatus', () => ({ ClaudeRuntimeStatus: () => null }));
vi.mock('../../../../services/ErrorNotificationService', () => ({
  errorNotificationService: { showInfo: mocks.showInfo, showError: mocks.showError },
}));

import { ClaudeCodePanel } from '../ClaudeCodePanel';

let jaI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  jaI18n = await createI18nInstance('ja');
});

afterEach(() => {
  cleanup();
  mocks.invoke.mockReset();
  mocks.showInfo.mockReset();
  mocks.showError.mockReset();
  delete (window as unknown as { electronAPI?: unknown }).electronAPI;
});

function renderPanel(isLoggedIn: boolean) {
  mocks.invoke.mockImplementation((channel: string) => {
    if (channel === 'claude-code:check-login') {
      return Promise.resolve({ isLoggedIn, hasOAuthToken: isLoggedIn, isExpired: !isLoggedIn });
    }
    if (channel === 'ai:getProjectSettings') return Promise.resolve({ success: true, overrides: {} });
    if (channel === 'ai:getEffectiveSettings') return Promise.resolve({ success: true, settings: {} });
    if (channel === 'claude-code:login' || channel === 'claude-code:logout') {
      return Promise.resolve({ success: true, message: 'Terminal window opened. Complete authentication in the terminal.' });
    }
    return Promise.resolve({ success: true });
  });

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      invoke: mocks.invoke,
      claudeCode: { getEnv: vi.fn().mockResolvedValue({}), setEnv: vi.fn().mockResolvedValue(undefined) },
      aiGetSettings: vi.fn().mockResolvedValue({}),
      aiSaveSettings: vi.fn().mockResolvedValue(undefined),
      settingsSet: vi.fn().mockResolvedValue(undefined),
      cliCheckClaudeCodeWindowsInstallation: vi.fn().mockResolvedValue({ isPlatformWindows: true, claudeCodeVersion: '1.0.0' }),
    },
  });

  return render(
    <UiLanguageProvider i18n={jaI18n} preference="ja" systemLocale="ja-JP">
      <ClaudeCodePanel
        config={{ enabled: true, authMethod: 'login' }}
        apiKeys={{}}
        availableModels={[]}
        loading={false}
        onToggle={vi.fn()}
        onApiKeyChange={vi.fn()}
        onModelVisibilityToggle={vi.fn()}
        onSetAllVisible={vi.fn()}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        onConfigChange={vi.fn()}
        cli={{ config: { enabled: false }, availableModels: [], loading: false, onToggle: vi.fn(), onModelVisibilityToggle: vi.fn(), onSetAllVisible: vi.fn() }}
      />
    </UiLanguageProvider>,
  );
}

it('shows Japanese logout toast copy and passes Japanese instructions to the IPC', async () => {
  renderPanel(true);
  fireEvent.click(await screen.findByRole('button', { name: 'ログアウト' }));

  await waitFor(() => expect(mocks.showInfo).toHaveBeenCalledWith(
    'Claude Codeからログアウト',
    expect.stringContaining('ログアウトを開始しました'),
    { duration: 0 },
  ));
  const logoutArgs = mocks.invoke.mock.calls.find(([channel]) => channel === 'claude-code:logout');
  expect(JSON.stringify(logoutArgs)).toContain('/logout');
  expect(JSON.stringify(logoutArgs)).toContain('ログアウトできます');
  expect(JSON.stringify(logoutArgs)).not.toContain('Terminal window opened');
});

it('shows Japanese login toast copy and passes Japanese instructions to the IPC', async () => {
  renderPanel(false);
  fireEvent.click(await screen.findByRole('button', { name: /Claudeプランでログイン/ }));

  await waitFor(() => expect(mocks.showInfo).toHaveBeenCalledWith(
    'Claude Codeにログイン',
    expect.stringContaining('ログインを開始しました'),
    { duration: 0 },
  ));
  const loginArgs = mocks.invoke.mock.calls.find(([channel]) => channel === 'claude-code:login');
  expect(JSON.stringify(loginArgs)).toContain('ターミナル');
  expect(JSON.stringify(loginArgs)).not.toContain('Terminal window opened');
});

it('hides English IPC diagnostics in a Japanese login failure toast', async () => {
  renderPanel(false);
  mocks.invoke.mockImplementation((channel: string) => {
    if (channel === 'claude-code:check-login') return Promise.resolve({ isLoggedIn: false, hasOAuthToken: false, isExpired: true });
    if (channel === 'claude-code:login') return Promise.reject(new Error('English backend login diagnostic'));
    if (channel === 'ai:getProjectSettings') return Promise.resolve({ success: true, overrides: {} });
    return Promise.resolve({ success: true });
  });

  fireEvent.click(await screen.findByRole('button', { name: /ログイン/ }));
  await waitFor(() => expect(mocks.showError).toHaveBeenCalledWith('ログインに失敗しました', 'ログインに失敗しました。'));
  expect(JSON.stringify(mocks.showError.mock.calls)).not.toContain('English backend login diagnostic');
});

it('hides English IPC diagnostics in a Japanese logout failure toast', async () => {
  renderPanel(true);
  mocks.invoke.mockImplementation((channel: string) => {
    if (channel === 'claude-code:check-login') return Promise.resolve({ isLoggedIn: true, hasOAuthToken: true, isExpired: false });
    if (channel === 'claude-code:logout') return Promise.reject(new Error('English backend logout diagnostic'));
    if (channel === 'ai:getProjectSettings') return Promise.resolve({ success: true, overrides: {} });
    return Promise.resolve({ success: true });
  });

  fireEvent.click(await screen.findByRole('button', { name: 'ログアウト' }));
  await waitFor(() => expect(mocks.showError).toHaveBeenCalledWith('ログアウトに失敗しました', 'ログアウトに失敗しました。'));
  expect(JSON.stringify(mocks.showError.mock.calls)).not.toContain('English backend logout diagnostic');
});
