import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { FileChangeFidelity } from '@nimbalyst/runtime/ai/server/providerFileTracking';
import { HeadlessCliProviderPanel } from '../HeadlessCliProviderPanel';

const cliMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  availability: vi.fn(),
}));

vi.mock('../../SettingsToggle', () => ({
  SettingsToggle: () => null,
}));

vi.mock('../../common/AlphaBadge', () => ({
  AlphaBadge: () => null,
}));

const providers = [
  {
    name: 'Grok Build',
    toolId: 'grok-build',
    title: 'Grok Build',
    commandName: 'Grok',
    loginCommand: 'grok login',
    docsUrl: 'https://docs.x.ai/build/cli/headless-scripting',
    docsLabel: 'Grok Build CLI documentation',
    fidelity: 'tool-args' as FileChangeFidelity,
  },
  {
    name: 'Cursor',
    toolId: 'cursor-agent',
    title: 'Cursor Agent',
    commandName: 'Cursor',
    loginCommand: 'cursor-agent login',
    docsUrl: 'https://cursor.com/docs/cli/using',
    docsLabel: 'Cursor CLI documentation',
    fidelity: 'structured' as FileChangeFidelity,
  },
] as const;

let jaI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  jaI18n = await createI18nInstance('ja');
});

afterEach(() => {
  cleanup();
  cliMocks.invoke.mockReset();
  cliMocks.availability.mockReset();
  delete (window as unknown as { electronAPI?: unknown }).electronAPI;
});

function renderJapanesePanel(provider: (typeof providers)[number]) {
  (window as unknown as { electronAPI?: unknown }).electronAPI = {
    invoke: cliMocks.invoke,
    aiGetHeadlessAgentAvailability: cliMocks.availability,
  };

  return render(
    <UiLanguageProvider i18n={jaI18n} preference="ja" systemLocale="ja-JP">
      <HeadlessCliProviderPanel
        config={{ enabled: true }}
        onToggle={vi.fn()}
        toolId={provider.toolId}
        title={provider.title}
        description={`${provider.title} English fallback description`}
        commandName={provider.commandName}
        loginCommand={provider.loginCommand}
        docsUrl={provider.docsUrl}
        docsLabel={provider.docsLabel}
        fileChangeFidelity={provider.fidelity}
      />
    </UiLanguageProvider>,
  );
}

function mockInstalledProvider(signedIn: boolean) {
  cliMocks.availability.mockResolvedValue({
    [providers[0].toolId]: { signedIn },
    [providers[1].toolId]: { signedIn },
  });
  cliMocks.invoke.mockImplementation((channel: string) => {
    if (channel === 'cli:checkInstallation') {
      return Promise.resolve({ installed: true, version: '1.2.3' });
    }
    if (channel === 'cli:getInstallStrategy') return Promise.resolve(null);
    return Promise.resolve(null);
  });
}

function expectJapaneseSharedGuidance(provider: (typeof providers)[number]) {
  expect(screen.getByText('認証')).toBeTruthy();
  expect(screen.getByText('ファイル追跡')).toBeTruthy();
  expect(screen.getByText('APIキーは不要です。Nimbalystが環境変数からAPIキーを読み取ることもありません。')).toBeTruthy();
  expect(screen.getByText('インストールと認証については', { exact: false }).textContent).toContain('を参照してください。');
  expect(screen.getAllByText(provider.loginCommand, { selector: 'code' }).length).toBeGreaterThan(0);
  expect(screen.queryByText(new RegExp(`${provider.commandName} English fallback description`))).toBeNull();
}

describe.each(providers)('$name Japanese headless CLI panel', (provider) => {
  it('shows Japanese sign-in guidance while preserving the CLI login command', async () => {
    mockInstalledProvider(false);
    const { container } = renderJapanesePanel(provider);

    await screen.findByText(/^インストール済みですが、サインインしていません/);
    expect(container.textContent).toContain(`ターミナルで ${provider.loginCommand} を実行してから、もう一度確認してください。`);
    expect(screen.getByRole('button', { name: '再確認' })).toBeTruthy();
    expectJapaneseSharedGuidance(provider);
    expect(container.textContent).not.toContain('English fallback description');
  });

  it('shows Japanese signed-in status and authentication guidance', async () => {
    mockInstalledProvider(true);
    const { container } = renderJapanesePanel(provider);

    await screen.findByText('インストール済み、サインイン済み (1.2.3)');
    expect(container.textContent).toContain(`${provider.commandName} CLIがインストールされ、サインイン済みのため、既定で有効です。ここで無効にすると、その設定が保持されます。`);
    expect(container.textContent).toContain(`ターミナルで ${provider.loginCommand} を実行して認証してください。`);
    expectJapaneseSharedGuidance(provider);
    expect(container.textContent).not.toContain('English fallback description');
  });

  it('uses Japanese not-installed fallback and hides an English detection error', async () => {
    const englishDiagnostic = `${provider.commandName} CLI detection failed: English diagnostic`;
    cliMocks.availability.mockRejectedValue(new Error(`${provider.commandName} auth detection failed`));
    cliMocks.invoke.mockImplementation((channel: string) => {
      if (channel === 'cli:checkInstallation') return Promise.reject(new Error(englishDiagnostic));
      if (channel === 'cli:getInstallStrategy') return Promise.resolve(null);
      return Promise.resolve(null);
    });
    const { container } = renderJapanesePanel(provider);

    await screen.findByText('再確認');
    await waitFor(() => expect(container.textContent).toContain(`このエージェントの実行には${provider.commandName} CLIが必要です。`));
    expect(container.textContent).toContain('Nimbalystではインストールされません。ターミナルで提供元のインストーラーを実行してください:');
    expectJapaneseSharedGuidance(provider);
    expect(container.textContent).not.toContain(englishDiagnostic);
    expect(container.textContent).not.toContain('auth detection failed');
  });
});
