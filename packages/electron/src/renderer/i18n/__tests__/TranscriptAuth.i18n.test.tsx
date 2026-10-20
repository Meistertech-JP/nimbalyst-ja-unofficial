import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { LoginRequiredWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/LoginRequiredWidget';
import { OpenAIAuthWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/OpenAIAuthWidget';
import { CodexAuthRequiredWidget, OPEN_CODEX_AUTH_SETTINGS_EVENT } from '../../../../../runtime/src/ui/AgentTranscript/components/CodexAuthRequiredWidget';

const locale = i18next.createInstance();
const invoke = vi.fn();
const openExternal = vi.fn();
function translated(children: React.ReactNode, language = 'ja') {
  const translate = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => translate(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider>;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  invoke.mockReset().mockResolvedValue({ isLoggedIn: false });
  openExternal.mockReset();
  vi.stubGlobal('electronAPI', { invoke, openExternal });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('transcript authentication presentation', () => {
  it('opens the same settings anchor without changing raw fallback diagnostics', () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_CODEX_AUTH_SETTINGS_EVENT, listener);
    try {
      render(translated(<CodexAuthRequiredWidget fallbackMessage="Raw auth error <unchanged>" />));
      expect(screen.getByText('続行するにはOpenAI Codexにログインしてください')).toBeTruthy();
      expect(screen.getByText('Raw auth error <unchanged>')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'サインイン' }));
      expect(listener).toHaveBeenCalledTimes(1);
      expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ anchor: 'codex-auth-section' });
      expect(invoke).not.toHaveBeenCalled();
    } finally { window.removeEventListener(OPEN_CODEX_AUTH_SETTINGS_EVENT, listener); }
  });

  it('updates stored Claude login errors without rechecking authentication on language change', async () => {
    const widget = <LoginRequiredWidget workspacePath="/workspace/User Project" />;
    const view = render(translated(widget));
    expect(await screen.findByText('ログインしていません。認証手続きを完了してください。')).toBeTruthy();
    expect(view.container.querySelector('code')!.textContent).toBe('/login');
    view.rerender(translated(widget, 'en'));
    expect(screen.getByText('Not logged in. Please complete the authentication flow.')).toBeTruthy();
    expect(invoke).toHaveBeenCalledTimes(1);
    invoke.mockResolvedValueOnce({ success: false });
    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
    expect(await screen.findByText('Login failed. Please try again.')).toBeTruthy();
    expect(invoke).toHaveBeenLastCalledWith('claude-code:login', '/workspace/User Project');
    view.rerender(translated(widget));
    expect(screen.getByText('ログインに失敗しました。もう一度お試しください。')).toBeTruthy();
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('preserves logged-in account data and manual refresh', async () => {
    invoke.mockResolvedValue({ isLoggedIn: true, email: 'user@example.test', organization: 'Original Org' });
    const view = render(translated(<LoginRequiredWidget />));
    expect(await screen.findByText('アカウント: user@example.test')).toBeTruthy();
    expect(screen.getByText('組織: Original Org')).toBeTruthy();
    expect(screen.getByRole('button', { name: '再ログイン' })).toBeTruthy();
    view.rerender(translated(<LoginRequiredWidget />, 'en'));
    expect(screen.getByText('Organization: Original Org')).toBeTruthy();
    expect(invoke).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Check Status' }));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
  });

  it('localizes caught error framing while preserving provider diagnostics', async () => {
    invoke.mockRejectedValueOnce(new Error('Raw transport failure'));
    const view = render(translated(<LoginRequiredWidget />));
    expect(await screen.findByText('状態の確認に失敗しました: Raw transport failure')).toBeTruthy();
    invoke.mockRejectedValueOnce({});
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    expect(await screen.findByText('ログインに失敗しました: 不明なエラー')).toBeTruthy();
    view.rerender(translated(<LoginRequiredWidget />, 'en'));
    expect(screen.getByText('Login failed: Unknown error')).toBeTruthy();
  });

  it.each([<LoginRequiredWidget />, <OpenAIAuthWidget />])('localizes unavailable desktop APIs', async (widget) => {
    vi.stubGlobal('electronAPI', undefined);
    const view = render(translated(widget));
    expect(await screen.findByText('Electron APIにアクセスできません。アプリケーションを再起動してください。')).toBeTruthy();
    view.rerender(translated(widget, 'en'));
    expect(screen.getByText('Cannot access Electron API. Please restart the application.')).toBeTruthy();
  });

  it.each(['chatgpt', 'api-key', 'unknown'])('preserves Codex auth method %s and raw server messages', async (authMethod) => {
    invoke.mockResolvedValue({ installed: true, isLoggedIn: true, authMethod, message: 'Original server status' });
    const view = render(translated(<OpenAIAuthWidget />));
    expect(await screen.findByText('OpenAI Codexにログイン済みです')).toBeTruthy();
    expect(screen.getByText('Original server status')).toBeTruthy();
    const descriptions: Record<string, string> = { chatgpt: 'ChatGPTでCodexに認証済みです。', 'api-key': 'APIキーでCodexに認証済みです。', unknown: 'Codexに認証済みです。' };
    expect(view.container.textContent).toContain(descriptions[authMethod]);
    fireEvent.click(screen.getByRole('button', { name: 'セットアップ手順を開く' }));
    expect(openExternal).toHaveBeenCalledWith('https://developers.openai.com/codex');
    view.rerender(translated(<OpenAIAuthWidget />, 'en'));
    expect(screen.getByText('OpenAI Codex is logged in')).toBeTruthy();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('retains in-flight Codex login state across language changes', async () => {
    let finishLogin!: (value: unknown) => void;
    const view = render(translated(<OpenAIAuthWidget />));
    await waitFor(() => expect((screen.getByRole('button', { name: '状態を確認' }) as HTMLButtonElement).disabled).toBe(false));
    invoke.mockImplementationOnce(() => new Promise(resolve => { finishLogin = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    const button = screen.getByRole('button', { name: 'ログイン画面を開いています...' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    view.rerender(translated(<OpenAIAuthWidget />, 'en'));
    expect(screen.getByRole('button', { name: 'Opening Login...' })).toBe(button);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenLastCalledWith('openai-codex:login');
    await act(async () => { finishLogin({ success: true }); });
    expect(screen.getByText('Started the Codex login flow.')).toBeTruthy();
    view.rerender(translated(<OpenAIAuthWidget />));
    expect(screen.getByText('Codexのログイン手続きを開始しました。')).toBeTruthy();
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
