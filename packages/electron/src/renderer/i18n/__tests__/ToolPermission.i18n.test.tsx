import React from 'react';
import i18next from 'i18next';
import { createStore, Provider } from 'jotai';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { ToolPermissionWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/ToolPermissionWidget';
import type { CustomToolWidgetProps } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets';
import type { InteractiveWidgetHost } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/InteractiveWidgetHost';
import { interactiveWidgetHostAtom, setInteractiveWidgetHost } from '../../../../../runtime/src/store/atoms/interactiveWidgetHost';

const locale = i18next.createInstance();
let testStore: ReturnType<typeof createStore>;
const submit = vi.fn();
const host = { toolPermissionSubmit: submit } as unknown as InteractiveWidgetHost;
function message(args: object = {}, result?: string): CustomToolWidgetProps['message'] {
  return {
    id: 1, sequence: 1, type: 'tool_call', subagentId: null, createdAt: new Date(),
    toolCall: {
      toolName: 'ToolPermission', providerToolCallId: 'provider-request', status: result ? 'completed' : 'running', result,
      toolDisplayName: 'ToolPermission', description: null, targetFilePath: null, mcpServer: null, mcpTool: null, progress: [],
      arguments: { requestId: 'raw-request', toolName: 'Bash', rawCommand: 'git status --short', pattern: 'Bash(git status:*)', patternDisplayName: 'git status commands', ...args },
    },
  };
}
function localized(data: CustomToolWidgetProps['message'], language = 'ja') {
  const translate = locale.getFixedT(language);
  return <Provider store={testStore}><RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => translate(key, { ...params, defaultValue }) }}>
    <ToolPermissionWidget message={data} sessionId="permission-i18n" isExpanded onToggle={() => {}} />
  </RuntimeTranslationProvider></Provider>;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  testStore = createStore();
  submit.mockReset().mockResolvedValue(undefined);
  testStore.set(interactiveWidgetHostAtom('permission-i18n'), host);
  setInteractiveWidgetHost('permission-i18n', null);
});
afterEach(() => { cleanup(); setInteractiveWidgetHost('permission-i18n', null); vi.restoreAllMocks(); });

describe('tool permission localization', () => {
  it.each([
    ['deny', 'deny', 'once', '拒否しました', '今回のみ'],
    ['allow-once', 'allow', 'once', '許可しました', '今回のみ'],
    ['allow-session', 'allow', 'session', '許可しました', 'このセッション中'],
    ['allow-always', 'allow', 'always', '許可しました', '常に許可'],
    ['allow-all-domains', 'allow', 'always-all', '許可しました', 'すべてのドメイン'],
  ])('preserves %s decision and scope across language changes', async (button, decision, scope, caption, scopeCaption) => {
    const data = message({ toolName: 'WebFetch', pattern: 'WebFetch(domain:example.com)', patternDisplayName: undefined, rawCommand: 'https://example.com/Original' });
    const view = render(localized(data, 'en'));
    expect(screen.getByText('Allow this tool?')).toBeTruthy();
    const control = screen.getByTestId(`tool-permission-${button}`);
    view.rerender(localized(data));
    expect(screen.getByTestId(`tool-permission-${button}`)).toBe(control);
    expect(screen.getByText('このツールの実行を許可しますか？')).toBeTruthy();
    await act(async () => { fireEvent.click(control); });
    expect(submit).toHaveBeenCalledExactlyOnceWith('raw-request', { decision, scope });
    expect(screen.getByText(caption)).toBeTruthy();
    expect(screen.getByText(scopeCaption)).toBeTruthy();
    expect(screen.getByText('https://example.com/Original')).toBeTruthy();
    view.rerender(localized(data, 'en'));
    expect(screen.getByText(decision === 'allow' ? 'Permission Granted' : 'Permission Denied')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('updates open tooltip, title and teammate captions without changing commands or patterns', () => {
    const data = message({ teammateName: 'Original Agent' });
    const view = render(localized(data, 'en'));
    const tooltipTrigger = view.container.querySelector('span.cursor-pointer')!;
    fireEvent.mouseEnter(tooltipTrigger);
    expect(screen.getByText('Permission Options')).toBeTruthy();
    view.rerender(localized(data));
    expect(screen.getByText('許可の種類')).toBeTruthy();
    expect(screen.getByText('（チームメイト: Original Agent）')).toBeTruthy();
    expect(screen.getByText('Bash(git status:*)')).toBeTruthy();
    expect(screen.getByText('.claude/settings.local.json')).toBeTruthy();
    expect(screen.getByText('git status --short')).toBeTruthy();
    expect(screen.getByTestId('tool-permission-allow-session').getAttribute('title')).toBe('このセッション中はgit statusコマンドを許可');
    expect(screen.getByTestId('tool-permission-allow-always').getAttribute('title')).toBe('git statusコマンドを.claude/settings.local.jsonに保存');
    expect(submit).not.toHaveBeenCalled();
  });

  it.each([
    ['Bash:compound:abc', undefined, 'この複合コマンド（今回のみ）'],
    ['Bash', undefined, 'シェルコマンドの実行'],
    ['Edit', undefined, 'プロジェクト内のファイル編集'],
    ['Write', undefined, 'プロジェクト内のファイル作成'],
    ['Read', undefined, 'ファイルの読み取り'],
    ['Glob', undefined, 'ファイルの検索'],
    ['Grep', undefined, 'ファイル内容の検索'],
    ['WebSearch', undefined, 'ウェブ検索'],
    ['Task', undefined, 'バックグラウンドタスクの実行'],
    ['TodoWrite', undefined, 'タスク一覧の更新'],
    ['WebFetch', undefined, '任意のウェブページの取得'],
    ['WebFetch', 'all web fetches', 'すべてのウェブ取得'],
    ['WebFetch(example.com:*)', 'Fetch from example.com', 'example.comからの取得'],
    ['WebFetch(domain:example.com)', 'Fetch from example.com', 'example.comからの取得'],
    ['Bash(git status:*)', 'My custom permission', 'My custom permission'],
    ['mcp__my-server__my_tool', undefined, 'My Server: My Tool'],
    ['custom_tool', undefined, 'custom_tool'],
  ])('classifies caption for %s (%s)', (pattern, patternDisplayName, expected) => {
    render(localized(message({ pattern, patternDisplayName })));
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it('translates generated warnings while keeping custom warning and classifier reason intact', () => {
    const data = message({ warnings: [
      'This is part of a compound command - each part is checked separately',
      'Auto-mode classifier requested user approval before running this tool.',
      'Auto-mode classifier flagged this call: Original reason /path',
      'External warning /literal',
    ], isDestructive: true });
    const view = render(localized(data));
    expect(screen.getByText('複合コマンドの一部です。各部分を個別に確認します')).toBeTruthy();
    expect(screen.getByText('自動モードの分類器が、このツールの実行前にユーザーの承認を求めています。')).toBeTruthy();
    expect(screen.getByText('自動モードの分類器がこの呼び出しに注意を促しています: Original reason /path')).toBeTruthy();
    expect(screen.getByText('External warning /literal')).toBeTruthy();
    view.rerender(localized(data, 'en'));
    expect(screen.getByText('Auto-mode classifier flagged this call: Original reason /path')).toBeTruthy();
  });

  it.each([
    [JSON.stringify({ decision: 'allow', scope: 'session' }), '許可しました', 'このセッション中'],
    [JSON.stringify({ decision: 'deny', scope: 'once', cancelled: true }), '権限の確認はキャンセルされました', '今回のみ'],
    ['allow', '許可しました', '今回のみ'],
    ['deny', '拒否しました', '今回のみ'],
    ['cancel', '権限の確認はキャンセルされました', '今回のみ'],
  ])('retains persisted result parsing for %s', (result, caption, scopeCaption) => {
    render(localized(message({}, result)));
    expect(screen.getByText(caption)).toBeTruthy();
    expect(screen.getByText(scopeCaption)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(submit).not.toHaveBeenCalled();
  });

  it('keeps host-null recovery interactive and uses the live host without translating request IDs', async () => {
    testStore.set(interactiveWidgetHostAtom('permission-i18n'), null);
    render(localized(message({ requestId: undefined })));
    expect(screen.getByTestId('tool-permission-host-reconnecting').textContent).toContain('権限サービスに再接続中');
    const button = screen.getByRole('button', { name: '今回のみ許可' });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    await act(async () => { fireEvent.click(button); });
    expect(submit).not.toHaveBeenCalled();
    setInteractiveWidgetHost('permission-i18n', host);
    await act(async () => { fireEvent.click(button); });
    expect(submit).toHaveBeenCalledExactlyOnceWith('provider-request', { decision: 'allow', scope: 'once' });
  });

  it('preserves pending recovery after a failed submission', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    submit.mockRejectedValueOnce(new Error('Backend failure'));
    const data = message();
    render(localized(data));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'セッション中' })); });
    expect(screen.getByTestId('tool-permission-widget').getAttribute('data-state')).toBe('pending');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'セッション中' })); });
    expect(submit).toHaveBeenCalledTimes(2);
    expect(screen.getByText('許可しました')).toBeTruthy();
  });
});
