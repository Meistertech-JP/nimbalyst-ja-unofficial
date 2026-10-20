// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemesPanel } from '../ThemesPanel';
import { GitHubAccountPanel } from '../GitHubAccountPanel';
import { ToolsMcpPanel } from '../ToolsMcpPanel';
import { ProjectAIProvidersPanel } from '../ProjectAIProvidersPanel';
import { ProviderOverrideWrapper } from '../ProviderOverrideWrapper';
import { SettingsSidebar } from '../../SettingsSidebar';

const { accountService, saveWorkspaceAISettings, pending, setPending } = vi.hoisted(() => ({
  accountService: {
    listAccounts: vi.fn(), getAccountConfig: vi.fn(),
    setDefaultAccount: vi.fn(), setAccountOverride: vi.fn(),
  },
  saveWorkspaceAISettings: vi.fn(),
  pending: { value: null as null | { missingId: string; appliedId: string } },
  setPending: vi.fn(),
}));

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: ({ icon, title }: { icon: string; title?: string }) => <span data-icon={icon} title={title} />,
  getProviderIcon: () => <span />,
}));
vi.mock('jotai', async () => {
  const { useState } = await import('react');
  return {
    useAtom: () => useState({ overrides: {}, loading: false }),
    useAtomValue: (atom: string) => atom === 'advanced' ? { showDirectChatProviders: true } : atom === 'pending' ? pending.value : 0,
    useSetAtom: () => setPending,
  };
});
vi.mock('../../../../store/atoms/appSettings', () => ({
  advancedSettingsAtom: 'advanced', developerModeAtom: 'developer',
  workspaceAISettingsAtomFamily: () => 'workspace-ai',
  loadWorkspaceAISettings: async () => ({ overrides: {}, loading: false }),
  saveWorkspaceAISettings,
}));
vi.mock('../../../../store/atoms/themeFallback', () => ({ pendingThemeFallbackAtom: 'pending' }));
vi.mock('../../../../store/atoms/themeList', () => ({ themeListChangedVersionAtom: 'theme-list' }));
vi.mock('../../../../hooks/useTheme', () => ({ useTheme: () => ({ themeId: 'dark' }) }));
vi.mock('../../../../services/RendererPullRequestService', () => ({ getPullRequestService: () => accountService }));
vi.mock('../../../common/AlphaBadge', () => ({ AlphaBadge: () => null, SETTINGS_ALPHA_TOOLTIP: '' }));
vi.mock('../../../common/TeamAlphaNotice', () => ({ TEAM_ALPHA_TOOLTIP: '' }));

describe('settings panels in Japanese', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('ja');
    pending.value = null;
    setPending.mockClear();
    saveWorkspaceAISettings.mockReset().mockResolvedValue(undefined);
    accountService.listAccounts.mockReset().mockResolvedValue([{ login: 'work-user', host: 'github.example.com', active: true }]);
    accountService.getAccountConfig.mockReset().mockResolvedValue({ defaultAccount: 'personal-user', override: null });
    accountService.setAccountOverride.mockReset().mockResolvedValue(undefined);
    accountService.setDefaultAccount.mockReset().mockResolvedValue(undefined);
    window.electronAPI = {
      invoke: vi.fn().mockImplementation(async (channel: string) => {
        if (channel === 'theme:list') return [
          { id: 'dark', name: 'Dark', description: 'Default dark theme', origin: 'builtin', isDark: true, version: '1.0.0', colors: {}, tags: ['dark', 'default'] },
          { id: 'light', name: 'Light', description: 'Default light theme', origin: 'builtin', isDark: false, version: '1.0.0', colors: {} },
          { id: 'custom-theme', name: 'My Theme', description: 'User-authored description', origin: 'user', isDark: true, version: '1.0.0', colors: {}, tags: ['custom-English'] },
        ];
        if (channel === 'ai:getProjectSettings') return { success: true, overrides: {} };
        if (channel === 'ai:getProjectTrackerAutomation') return { success: true, override: null };
        if (channel === 'agent-providers:list') return { success: true, data: [] };
        if (channel === 'mcp-config:get-tool-budget') return {
          eagerEstTokens: 1500,
          groups: [
            { configKey: 'nimbalyst', displayName: 'Core', source: 'core', loadPolicy: 'eager', toolCount: 1, estTokens: 1500, enabled: true, lockedOn: true },
            { configKey: 'nimbalyst-trackers', displayName: 'Trackers', source: 'first-party', loadPolicy: 'deferred', toolCount: 2, estTokens: 300, enabled: true, lockedOn: false },
            { configKey: 'my-extension', displayName: 'My Extension', source: 'extension', loadPolicy: 'external', toolCount: 3, estTokens: null, enabled: true, lockedOn: false },
          ],
        };
        return { success: true };
      }),
      send: vi.fn(),
      aiGetSettings: vi.fn().mockResolvedValue({ providerSettings: { claude: { enabled: true, models: ['claude-test-model'] } }, apiKeys: {} }),
      aiGetAllModels: vi.fn().mockResolvedValue({ success: true, grouped: { claude: [{ id: 'claude-test-model', name: 'Example Model', provider: 'claude' }] } }),
    } as unknown as typeof window.electronAPI;
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    await i18next.changeLanguage('en');
  });

  it('translates built-in theme presentation while retaining theme ids and user metadata', async () => {
    render(<ThemesPanel scope="user" />);
    const light = await screen.findByText('ライト');
    expect(screen.getAllByText('標準のダークテーマ').length).toBeGreaterThan(0);
    fireEvent.click(within(light.parentElement!.parentElement!).getByRole('button', { name: '適用' }));
    await waitFor(() => expect(window.electronAPI.send).toHaveBeenCalledWith('set-theme', 'light', false));
    fireEvent.click(await screen.findByText('My Theme'));
    expect(screen.getAllByText('User-authored description').length).toBeGreaterThan(0);
    expect(screen.getByText('custom-English')).toBeTruthy();
  });

  it('keeps theme uninstall confirmation and cancellation functional in Japanese', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ThemesPanel scope="user" />);
    fireEvent.click(await screen.findByTitle('テーマをアンインストール'));
    expect(confirm).toHaveBeenCalledWith('「My Theme」をアンインストールしますか？');
    expect(window.electronAPI.invoke).not.toHaveBeenCalledWith('theme:uninstall', 'custom-theme');
  });

  it('shows a translated fallback notice without translating the missing theme identifier', async () => {
    pending.value = { missingId: 'extension:lost-theme', appliedId: 'dark' };
    render(<ThemesPanel scope="user" />);
    const missing = await screen.findByText('extension:lost-theme');
    expect(missing.parentElement!.textContent).toBe('テーマ「extension:lost-theme」は利用できなくなったため、「dark」に切り替えました。');
    fireEvent.click(screen.getByTestId('dismiss-theme-fallback'));
    expect(window.electronAPI.send).toHaveBeenCalledWith('theme:dismiss-pending-fallback');
    expect(setPending).toHaveBeenCalledWith(null);
  });

  it('preserves the selected GitHub login and project path', async () => {
    render(<GitHubAccountPanel scope="project" workspacePath="/workspace" />);
    const select = await screen.findByTestId('github-account-select');
    expect(screen.getByText('このプロジェクトのアカウント')).toBeTruthy();
    expect((screen.getByRole('option', { name: /work-user/ }) as HTMLOptionElement).value).toBe('work-user');
    fireEvent.change(select, { target: { value: 'work-user' } });
    await waitFor(() => expect(accountService.setAccountOverride).toHaveBeenCalledWith('/workspace', 'work-user'));
  });

  it('preserves the gh command in translated account setup help', async () => {
    accountService.listAccounts.mockResolvedValue([]);
    render(<GitHubAccountPanel scope="application" />);
    const command = await screen.findByText('gh auth login');
    expect(command.tagName).toBe('CODE');
    expect(command.parentElement!.textContent).toContain('GitHub CLIアカウントが見つかりません');
  });

  it('translates built-in tool groups without changing toggles or extension identities', async () => {
    const onNavigateToCategory = vi.fn();
    render(<ToolsMcpPanel workspacePath="/workspace" onNavigateToCategory={onNavigateToCategory} />);
    const core = await screen.findByTestId('tool-group-nimbalyst');
    expect(within(core).getByText('コア')).toBeTruthy();
    expect(within(core).getByRole('checkbox', { hidden: true }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(within(screen.getByTestId('tool-group-nimbalyst-trackers')).getByRole('checkbox', { hidden: true }));
    expect(window.electronAPI.invoke).toHaveBeenCalledWith('workspace:update-state', '/workspace', { trackersEnabled: false });
    expect(screen.getByText('My Extension')).toBeTruthy();
    fireEvent.click(within(screen.getByTestId('tool-group-my-extension')).getByRole('button', { name: '管理' }));
    expect(onNavigateToCategory).toHaveBeenCalledWith('installed-extensions');
  });

  it('preserves provider id and global enabled state when enabling an override', async () => {
    render(<ProviderOverrideWrapper providerId="claude-code" providerName="Claude Agent" workspacePath="/workspace" workspaceName="Example" globalEnabled><div>Provider content</div></ProviderOverrideWrapper>);
    await screen.findByText('Claude Agentのグローバル設定を使用中');
    fireEvent.click(screen.getByLabelText('上書き'));
    await waitFor(() => expect(saveWorkspaceAISettings).toHaveBeenCalledWith('/workspace', { providers: { 'claude-code': { enabled: true } } }));
    expect(screen.getByText('Example').parentElement!.textContent).toBe('Exampleのプロジェクト設定で上書き中');
  });

  it('keeps project provider model ids and tracker automation values unchanged', async () => {
    render(<ProjectAIProvidersPanel workspacePath="/workspace" workspaceName="Example" />);
    fireEvent.click(await screen.findByText('Claude'));
    fireEvent.click(screen.getByLabelText('グローバル設定を使用'));
    expect(screen.getByText('Example Model')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'disable' } });
    fireEvent.click(screen.getByRole('button', { name: '変更を保存' }));
    await waitFor(() => expect(window.electronAPI.invoke).toHaveBeenCalledWith('ai:saveProjectSettings', '/workspace', { providers: { claude: { enabled: true, models: ['claude-test-model'], apiKey: '' } } }));
    expect(window.electronAPI.invoke).toHaveBeenCalledWith('ai:saveProjectTrackerAutomation', '/workspace', { enabled: false });
  });

  it('translates sidebar group labels and tooltips without changing navigation ids', async () => {
    const onSelectCategory = vi.fn();
    render(<SettingsSidebar selectedCategory="themes" onSelectCategory={onSelectCategory} showDirectChatProviders />);
    expect(screen.getByText('エージェントプロバイダー')).toBeTruthy();
    fireEvent.focus(screen.getByRole('button', { name: 'エージェントプロバイダーについて' }));
    expect((await screen.findByRole('tooltip')).textContent).toBe('エージェントがツールとプロジェクトファイルを使って複数ステップの作業を行います。');
    fireEvent.click(screen.getByTestId('settings-route-themes'));
    expect(onSelectCategory).toHaveBeenCalledWith('themes');
  });

  it('uses language-appropriate plural forms for project-specific MCP server counts', () => {
    const en = i18next.getFixedT('en');
    const ja = i18next.getFixedT('ja');
    expect(en('settings:mcp.project_additional_servers', { count: 1 })).toBe('There is 1 additional MCP server configured just for this project.');
    expect(en('settings:mcp.project_additional_servers', { count: 2 })).toBe('There are 2 additional MCP servers configured just for this project.');
    expect(ja('settings:mcp.project_additional_servers', { count: 2 })).toBe('このプロジェクト専用に追加のMCPサーバーが2件設定されています。');
  });
});
