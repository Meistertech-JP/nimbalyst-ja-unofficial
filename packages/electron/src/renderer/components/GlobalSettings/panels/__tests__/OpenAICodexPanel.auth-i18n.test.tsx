import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { ReactElement } from 'react';

const authMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('jotai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jotai')>();
  return {
    ...actual,
    useAtomValue: (atom: { testKey?: string }) => {
      if (atom.testKey === 'hidden-gutter-items') return [];
      if (atom.testKey === 'codex-acp-config') return { enabled: false };
      return 0;
    },
    useSetAtom: () => vi.fn(),
  };
});

vi.mock('../../../../store/atoms/appSettings', () => ({
  getProviderConfigAtom: () => ({ testKey: 'codex-acp-config' }),
  hiddenGutterItemsAtom: { testKey: 'hidden-gutter-items' },
  setProviderConfigAtom: {},
  toggleGutterItemHiddenAtom: {},
}));

vi.mock('../../../../store/atoms/openAICodexAuth', () => ({
  openAICodexAuthVersionAtom: { testKey: 'auth-version' },
}));

vi.mock('../../SettingsToggle', () => ({
  SettingsToggle: () => null,
}));

vi.mock('../CodexWindowsSandboxSection', () => ({
  CodexWindowsSandboxSection: () => null,
}));

import { OpenAICodexPanel } from '../OpenAICodexPanel';

let enI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let jaI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [enI18n, jaI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

afterEach(() => {
  cleanup();
  authMocks.invoke.mockReset();
  delete (window as unknown as { electronAPI?: unknown }).electronAPI;
});

function renderPanel(i18n: typeof enI18n, language: 'en' | 'ja') {
  (window as unknown as { electronAPI?: unknown }).electronAPI = {
    invoke: authMocks.invoke,
  };

  const props = {
    config: { enabled: true },
    apiKeys: {},
    availableModels: [],
    loading: false,
    onToggle: vi.fn(),
    onApiKeyChange: vi.fn(),
    onModelToggle: vi.fn(),
    onSelectAllModels: vi.fn(),
    onTestConnection: vi.fn().mockResolvedValue(undefined),
    onConfigChange: vi.fn(),
  } as React.ComponentProps<typeof OpenAICodexPanel>;

  return render(
    <UiLanguageProvider
      i18n={i18n}
      preference={language}
      systemLocale={`${language}-US`}
    >
      <OpenAICodexPanel {...props} />
    </UiLanguageProvider>,
  );
}

function mockLoginFailure() {
  authMocks.invoke.mockImplementation((channel: string) => {
    if (channel === 'openai-codex:check-login') {
      return Promise.resolve({
        installed: true,
        isLoggedIn: false,
        authMode: null,
        email: null,
        planType: null,
        message: 'Not signed in.',
      });
    }
    return Promise.resolve({
      success: false,
      error: 'English diagnostic from the Codex authentication service',
    });
  });
}

it('shows a localized generic error instead of an English Codex diagnostic', async () => {
  mockLoginFailure();
  renderPanel(enI18n, 'en');

  fireEvent.click(await screen.findByRole('button', { name: 'Sign in with ChatGPT' }));

  const error = await screen.findByTestId('codex-auth-error');
  expect(error.textContent).toBe('Login failed');
  expect(screen.queryByText('English diagnostic from the Codex authentication service')).toBeNull();
});

it('shows ChatGPT login failures in Japanese when the UI language is Japanese', async () => {
  mockLoginFailure();
  renderPanel(jaI18n, 'ja');

  fireEvent.click(await screen.findByRole('button', { name: 'ChatGPTでサインイン' }));

  await waitFor(() => {
    expect(screen.getByTestId('codex-auth-error').textContent).toBe('ログインに失敗しました');
  });
  expect(screen.queryByText('English diagnostic from the Codex authentication service')).toBeNull();
});

it('localizes an authentication-status error returned by the Codex service', async () => {
  authMocks.invoke.mockResolvedValue({
    installed: false,
    isLoggedIn: false,
    authMode: null,
    email: null,
    planType: null,
    message: 'Codex CLI is unavailable.',
    error: 'Codex CLI is unavailable. English diagnostic',
  });
  renderPanel(jaI18n, 'ja');

  const error = await screen.findByTestId('codex-auth-error');
  expect(error.textContent).toBe('Codexの認証状態の確認に失敗しました');
  expect(screen.queryByText('Codex CLI is unavailable. English diagnostic')).toBeNull();
});

it('localizes logout failures returned by the Codex service', async () => {
  authMocks.invoke.mockImplementation((channel: string) => {
    if (channel === 'openai-codex:check-login') {
      return Promise.resolve({
        installed: true,
        isLoggedIn: true,
        authMode: 'chatgpt',
        email: null,
        planType: null,
        message: 'Signed in with ChatGPT.',
      });
    }
    return Promise.resolve({
      success: false,
      error: 'English logout diagnostic from the Codex service',
    });
  });
  renderPanel(jaI18n, 'ja');

  fireEvent.click(await screen.findByRole('button', { name: 'サインアウト' }));

  const error = await screen.findByTestId('codex-auth-error');
  expect(error.textContent).toBe('ログアウトに失敗しました');
  expect(screen.queryByText('English logout diagnostic from the Codex service')).toBeNull();
});

it('localizes API-key login failures returned by the Codex service', async () => {
  mockLoginFailure();
  renderPanel(jaI18n, 'ja');

  fireEvent.click(await screen.findByRole('button', { name: 'APIキー' }));
  fireEvent.change(screen.getByPlaceholderText('sk-...'), { target: { value: 'sk-test-key' } });
  fireEvent.click(screen.getByRole('button', { name: '保存' }));

  const error = await screen.findByTestId('codex-auth-error');
  expect(error.textContent).toBe('ログインに失敗しました');
  expect(screen.queryByText('English diagnostic from the Codex authentication service')).toBeNull();
});

it('localizes thrown Codex authentication errors without rendering their English message', async () => {
  authMocks.invoke.mockImplementation((channel: string) => {
    if (channel === 'openai-codex:check-login') {
      return Promise.resolve({
        installed: true,
        isLoggedIn: false,
        authMode: null,
        email: null,
        planType: null,
        message: 'Not signed in.',
      });
    }
    return Promise.reject(new Error('English exception from Codex app-server'));
  });
  renderPanel(jaI18n, 'ja');

  fireEvent.click(await screen.findByRole('button', { name: 'ChatGPTでサインイン' }));

  const error = await screen.findByTestId('codex-auth-error');
  expect(error.textContent).toBe('ログインに失敗しました');
  expect(screen.queryByText('English exception from Codex app-server')).toBeNull();
});
