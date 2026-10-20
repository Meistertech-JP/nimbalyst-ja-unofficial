// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MCPServersPanel } from '../MCPServersPanel';
import { ClaudeCodePanel } from '../ClaudeCodePanel';
import { OpenAICodexPanel } from '../OpenAICodexPanel';
import { ApiKeyDialog } from '../../../ApiKeyDialog/ApiKeyDialog';

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: ({ icon, title }: { icon: string; title?: string }) => <span data-icon={icon} title={title} />,
}));
vi.mock('posthog-js/react', () => ({ usePostHog: () => ({ capture: vi.fn() }) }));
vi.mock('jotai', () => ({
  useAtomValue: (atom: string) => atom === 'providers' ? ['claude-code', 'openai-codex'] : atom === 'hidden' ? [] : null,
  useSetAtom: () => vi.fn(),
}));
vi.mock('../../../../store/atoms/appSettings', () => ({
  enabledProvidersAtom: 'providers', hiddenGutterItemsAtom: 'hidden', toggleGutterItemHiddenAtom: 'toggle-hidden',
  getProviderConfigAtom: () => 'codex-acp', setProviderConfigAtom: 'set-provider',
}));
vi.mock('../../../../store/atoms/openAICodexAuth', () => ({ openAICodexAuthVersionAtom: 'codex-auth-version' }));
vi.mock('../../../../store/atoms/openProjects', () => ({ activeWorkspacePathAtom: 'workspace' }));
vi.mock('../../../../store/atoms/mcpStatus', () => ({ mcpTestProgressAtom: 'progress' }));
vi.mock('../../../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('../../../ErrorBoundary', () => ({ ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const invoke = vi.fn();
const setEnv = vi.fn();
const oauthConfig = { command: 'npx', args: ['-y', 'mcp-remote', 'https://example.com/mcp'], oauth: {} };
let savedServers: Record<string, unknown>;
let authorized: boolean;

async function openServer() {
  fireEvent.click(await screen.findByText('MyServer'));
  await screen.findByPlaceholderText('/path/to/server または npx @modelcontextprotocol/server-name');
}

describe('remaining global settings UI in Japanese', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('ja');
    savedServers = { MyServer: oauthConfig };
    authorized = false;
    invoke.mockReset().mockImplementation(async (channel: string) => {
      if (channel === 'mcp-config:read-user' || channel === 'mcp-config:read-workspace') return { mcpServers: structuredClone(savedServers) };
      if (channel === 'mcp-config:check-oauth-status') return { authorized, requiresOAuth: true };
      if (channel === 'claude-code:check-login') return { isLoggedIn: true, hasOAuthToken: true, isExpired: false };
      return { success: false };
    });
    setEnv.mockReset();
    window.electronAPI = {
      invoke,
      claudeCode: { getEnv: vi.fn().mockResolvedValue({}), setEnv },
      aiGetSettings: vi.fn().mockResolvedValue({}),
      cliCheckClaudeCodeWindowsInstallation: vi.fn().mockResolvedValue({ isPlatformWindows: true, claudeCodeVersion: '2.0.0' }),
    } as unknown as typeof window.electronAPI;
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    await i18next.changeLanguage('en');
  });

  it('shows descriptions for actual MCP catalog IDs and preserves server names', async () => {
    render(<MCPServersPanel />);
    fireEvent.click(await screen.findByRole('button', { name: '新しいMCPサーバーを追加' }));
    for (const description of [
      'インフラへのアクセスと管理', '段階的な推論と問題解決', 'HTTPリクエストとWebコンテンツの取得',
      'ナレッジグラフを使った永続メモリ', 'コードベースのセマンティック検索と編集',
    ]) expect(screen.getByText(description)).toBeTruthy();
    expect(screen.getByText('Corridor')).toBeTruthy();
    expect(screen.getByText('Sequential Thinking')).toBeTruthy();
    expect(screen.getByText('Serena')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('テンプレートを検索…'), { target: { value: '段階的' } });
    fireEvent.click(screen.getByRole('button', { name: /Sequential Thinking/ }));
    expect((screen.getByPlaceholderText('my-server') as HTMLInputElement).value).toBe('sequential-thinking');
    expect(screen.getByDisplayValue('@modelcontextprotocol/server-sequential-thinking')).toBeTruthy();
  });

  it('localizes the command example and connection failure while preserving command arguments', async () => {
    savedServers = { MyServer: { command: 'custom-executable', args: ['--raw-flag'] } };
    const base = invoke.getMockImplementation()!;
    invoke.mockImplementation((channel: string, ...args: unknown[]) => channel === 'mcp-config:test-server' ? Promise.reject(null) : base(channel, ...args));
    render(<MCPServersPanel />);
    await openServer();
    fireEvent.click(screen.getByRole('button', { name: 'サーバー接続をテスト' }));
    await screen.findByText('テストに失敗しました');
    expect(invoke).toHaveBeenCalledWith('mcp-config:test-server', {
      type: 'stdio', oauth: undefined, env: {}, command: 'custom-executable', args: ['--raw-flag'],
    });
  });

  it('localizes deletion confirmation, respects cancellation, and preserves raw failure details', async () => {
    const base = invoke.getMockImplementation()!;
    invoke.mockImplementation((channel: string, ...args: unknown[]) => channel === 'mcp-config:write-user'
      ? Promise.resolve({ success: false, error: 'EACCES: raw-path' }) : base(channel, ...args));
    render(<MCPServersPanel />);
    await openServer();
    fireEvent.click(screen.getByRole('button', { name: 'サーバー「MyServer」を削除' }));
    expect(window.confirm).toHaveBeenCalledWith('MCPサーバー「MyServer」を削除しますか？');
    expect(invoke.mock.calls.some(([channel]) => channel === 'mcp-config:write-user')).toBe(false);
    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'サーバー「MyServer」を削除' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('削除に失敗しました：EACCES: raw-path'));
    expect(invoke).toHaveBeenCalledWith('mcp-config:write-user', { mcpServers: {} });
  });

  it('localizes OAuth revocation and cancellation without changing its config payload', async () => {
    authorized = true;
    render(<MCPServersPanel />);
    await openServer();
    const revoke = await screen.findByRole('button', { name: '取り消す' });
    fireEvent.click(revoke);
    expect(window.confirm).toHaveBeenCalledWith('認証を取り消しますか？このサーバーを使用するには再認証が必要になります。');
    expect(invoke.mock.calls.some(([channel]) => channel === 'mcp-config:revoke-oauth')).toBe(false);
    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(revoke);
    await screen.findAllByText('認証の取り消しに失敗しました');
    expect(invoke).toHaveBeenCalledWith('mcp-config:revoke-oauth', { ...oauthConfig, type: 'stdio', url: undefined, headers: {} });
  });

  it.each([
    [false, '認証に失敗しました：認証に失敗しました'],
    [true, '認証エラー：不明なエラーが発生しました'],
  ])('localizes OAuth fallback messages (throw=%s)', async (throws, message) => {
    const base = invoke.getMockImplementation()!;
    invoke.mockImplementation((channel: string, ...args: unknown[]) => channel === 'mcp-config:trigger-oauth'
      ? throws ? Promise.reject(null) : Promise.resolve({ success: false }) : base(channel, ...args));
    render(<MCPServersPanel />);
    await openServer();
    fireEvent.click(await screen.findByRole('button', { name: '認証' }));
    await screen.findAllByText(message);
  });

  it.each([
    [null, '不明なエラー'],
    [new Error('EACCES: settings.json'), 'EACCES: settings.json'],
  ])('localizes Claude environment-save errors and preserves values (%s)', async (failure, message) => {
    setEnv.mockRejectedValue(failure);
    render(<ClaudeCodePanel
      config={{ enabled: true }} apiKeys={{}} availableModels={[]} loading={false}
      onToggle={vi.fn()} onApiKeyChange={vi.fn()} onModelVisibilityToggle={vi.fn()} onSetAllVisible={vi.fn()}
      onTestConnection={vi.fn()} onConfigChange={vi.fn()}
      cli={{ config: { enabled: false }, availableModels: [], loading: false, onToggle: vi.fn(), onModelVisibilityToggle: vi.fn(), onSetAllVisible: vi.fn() }}
    />);
    fireEvent.change(await screen.findByPlaceholderText('VARIABLE_NAME'), { target: { value: 'CUSTOM_VARIABLE' } });
    fireEvent.change(screen.getByPlaceholderText('値'), { target: { value: 'untranslated-user-value' } });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(`環境変数の保存に失敗しました: ${message}`));
    expect(setEnv).toHaveBeenCalledWith({ CUSTOM_VARIABLE: 'untranslated-user-value' });
  });

  it('keeps API provider brands and links intact while showing Japanese dialog actions', () => {
    const actions: string[] = [];
    render(<ApiKeyDialog isOpen onClose={() => actions.push('close')} onOpenPreferences={() => actions.push('preferences')} />);
    expect(screen.getByRole('link', { name: 'Anthropic' }).getAttribute('href')).toBe('https://console.anthropic.com/settings/keys');
    expect(screen.getByRole('link', { name: 'OpenAI' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'LM Studio' })).toBeTruthy();
    expect(screen.getByText('(GPT-4)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'AI設定を開く' }));
    expect(actions).toEqual(['close', 'preferences']);
  });

  it('localizes the Codex authentication check fallback without changing the auth channel', async () => {
    invoke.mockRejectedValue(null);
    render(<OpenAICodexPanel
      config={{ enabled: true }} apiKeys={{}} availableModels={[]} loading={false}
      onToggle={vi.fn()} onApiKeyChange={vi.fn()} onModelToggle={vi.fn()} onSelectAllModels={vi.fn()}
      onTestConnection={vi.fn()} onConfigChange={vi.fn()}
    />);
    await screen.findByText('Codexの認証状態の確認に失敗しました');
    expect(invoke).toHaveBeenCalledWith('openai-codex:check-login');
  });
});
