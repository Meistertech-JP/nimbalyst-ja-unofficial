import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { LoginRequiredWidget } from '../LoginRequiredWidget';

let testI18n: Awaited<ReturnType<typeof createI18nInstance>>;

function renderWidget() {
  return render(
    <I18nextProvider i18n={testI18n}>
      <LoginRequiredWidget workspacePath="/workspace" />
    </I18nextProvider>
  );
}

describe('LoginRequiredWidget localization', () => {
  beforeEach(async () => {
    testI18n = await createI18nInstance('ja');
  });

  afterEach(() => {
    cleanup();
    delete (window as any).electronAPI;
    vi.restoreAllMocks();
  });

  it('localizes login guidance and hides English service error details', async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === 'claude-code:check-login') {
        return { isLoggedIn: false, error: 'Auth service unavailable' };
      }
      return { success: false, error: 'OAuth callback failed' };
    });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { invoke },
    });

    renderWidget();

    expect(screen.getByText('Claude Agentを使用するにはAnthropicアカウントが必要です。ログインするか、アカウントを作成してください。')).toBeTruthy();
    expect(await screen.findByText('認証状態を確認できませんでした。')).toBeTruthy();
    expect(screen.queryByText('Auth service unavailable')).toBeNull();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '状態を確認' })).toBeTruthy();
    expect(screen.getByText(/Claude Codeのターミナルセッションを開き/)).toBeTruthy();
    expect(screen.getByText('/login')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    await waitFor(() => expect(screen.getByText('ログインに失敗しました。もう一度お試しください。')).toBeTruthy());
    expect(screen.queryByText('OAuth callback failed')).toBeNull();
    expect(invoke).toHaveBeenCalledWith('claude-code:login', '/workspace');
  });

  it('localizes the signed-in account details and relogin action', async () => {
    const invoke = vi.fn().mockResolvedValue({
      isLoggedIn: true,
      email: 'user@example.com',
      organization: 'Example Org',
    });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { invoke },
    });

    renderWidget();

    expect(await screen.findByText('ログイン済みです。会話を続行できます')).toBeTruthy();
    expect(screen.getByText('アカウント: user@example.com')).toBeTruthy();
    expect(screen.getByText('組織: Example Org')).toBeTruthy();
    expect(screen.getByRole('button', { name: '再ログイン' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '状態を確認' })).toBeTruthy();
  });
});
