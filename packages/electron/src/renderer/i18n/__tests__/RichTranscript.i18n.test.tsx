import React from 'react';
import i18next from 'i18next';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider, type RuntimeTranslate } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { RichTranscriptView, formatSubagentAuditLabel } from '../../../../../runtime/src/ui/AgentTranscript/components/RichTranscriptView';
import { AgentTranscriptPanel } from '../../../../../runtime/src/ui/AgentTranscript/components/AgentTranscriptPanel';
import { formatToolArguments } from '../../../../../runtime/src/ui/AgentTranscript/utils/pathResolver';
import { formatToolDisplayName } from '../../../../../runtime/src/ui/AgentTranscript/utils/toolNameFormatter';
import { formatMessageTime, formatTurnFinishedAt } from '../../../../../runtime/src/utils/dateUtils';
import { copyToClipboard } from '../../../../../runtime/src/utils/clipboard';
import type { SessionData, TranscriptViewMessage } from '../../../../../runtime/src/ai/server/types';

const scrollToIndex = vi.hoisted(() => vi.fn());
vi.mock('../../../../../runtime/src/utils/clipboard', () => ({ copyToClipboard: vi.fn().mockResolvedValue(undefined) }));
vi.mock('virtua', async () => {
  const ReactModule = await import('react');
  return { VList: ReactModule.forwardRef(({ children }: { children: React.ReactNode }, ref) => {
    ReactModule.useImperativeHandle(ref, () => ({
      cache: undefined, scrollOffset: 0, scrollSize: 300, viewportSize: 100,
      findItemIndex: (offset: number) => offset >= 100 ? 1 : 0, scrollToIndex,
    }));
    return <div>{ReactModule.Children.toArray(children)}</div>;
  }) };
});

const locale = i18next.createInstance();
type Props = React.ComponentProps<typeof RichTranscriptView>;
const settings = { showToolCalls: true, compactMode: false, collapseTools: false, showThinking: true, showSessionInit: false };
const now = new Date(2026, 8, 21, 12, 0, 0);
function translate(language = 'ja'): RuntimeTranslate {
  const fixedT = locale.getFixedT(language);
  return (key, defaultValue, params) => fixedT(key, { ...params, defaultValue });
}
function localized(props: Partial<Props> = {}, language = 'ja') {
  return <RuntimeTranslationProvider value={{ locale: language, t: translate(language) }}>
    <RichTranscriptView sessionId="rich-i18n" messages={[]} persistScrollState={false} {...props} />
  </RuntimeTranslationProvider>;
}
function message(id: number, overrides: Partial<TranscriptViewMessage> = {}): TranscriptViewMessage {
  return { id, sequence: id, createdAt: new Date(now.getTime() - 600000 + id * 1000), type: 'assistant_message', subagentId: null, ...overrides };
}
function tool(id: number, name: string, args: Record<string, unknown> = {}): TranscriptViewMessage {
  return message(id, { type: 'tool_call', toolCall: {
    toolName: name, toolDisplayName: name, status: 'running', description: null, arguments: args,
    targetFilePath: null, mcpServer: null, mcpTool: null, providerToolCallId: `tool-${id}`, progress: [],
  } });
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  vi.stubGlobal('CSS', { highlights: { delete: vi.fn(), set: vi.fn() } });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('rich transcript locale switching', () => {
  it('updates the memoized panel captions without resetting sidebar or raw task state', () => {
    const sessionData: SessionData = { id: 'panel-i18n', provider: 'claude-code', messages: [], createdAt: 1000, updatedAt: 1000 };
    const panel = <AgentTranscriptPanel sessionId="panel-i18n" sessionData={sessionData} todos={[
      { status: 'completed', content: 'Raw done', activeForm: 'unused' },
      { status: 'in_progress', content: 'unused', activeForm: 'Raw active' },
    ]} />;
    const localizedPanel = (language: string) => <RuntimeTranslationProvider value={{ locale: language, t: translate(language) }}>{panel}</RuntimeTranslationProvider>;
    localStorage.removeItem('agent-transcript-sidebar-panel-i18n');
    const view = render(localizedPanel('en'));
    expect(screen.getByText('Files Edited')).toBeTruthy();
    expect(screen.getByText('Tasks (1/2)')).toBeTruthy();
    const task = screen.getByText('Raw active');
    view.rerender(localizedPanel('ja'));
    expect(screen.getByText('編集したファイル')).toBeTruthy();
    expect(screen.getByText('タスク（1/2）')).toBeTruthy();
    expect(screen.getByText('Raw active')).toBe(task);
    expect(screen.getByText('Raw done')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'ファイル履歴を非表示' }));
    view.rerender(localizedPanel('en'));
    expect(screen.queryByText('Files Edited')).toBeNull();
    expect(screen.getByRole('button', { name: 'Show file history' })).toBeTruthy();
    view.unmount();
    localStorage.removeItem('agent-transcript-sidebar-panel-i18n');
    localStorage.removeItem('agent-transcript-sidebar-width-panel-i18n');
  });

  it.each(['agent', 'session', 'worker'])('updates waiting text without mutating the %s identifier', noun => {
    const props: Partial<Props> = { waitingForNoun: noun, currentTeammates: [{ agentId: 'raw-1', status: 'running' }, { agentId: 'raw-2', status: 'running' }] };
    const view = render(localized(props, 'en'));
    expect(screen.getByText(`Waiting for 2 ${noun}s to complete...`)).toBeTruthy();
    view.rerender(localized(props));
    const label = noun === 'agent' ? 'エージェント' : noun === 'session' ? 'セッション' : 'worker';
    expect(screen.getByText(`2件の${label}の完了を待っています...`)).toBeTruthy();
    view.rerender(localized({ ...props, currentTeammates: props.currentTeammates!.slice(0, 1) }, 'en'));
    expect(screen.getByText(`Waiting for 1 ${noun} to complete...`)).toBeTruthy();
  });

  it('suppresses thinking while a user response is required', () => {
    const view = render(localized({ isProcessing: true }, 'en'));
    expect(screen.getByText('Thinking...')).toBeTruthy();
    view.rerender(localized({ isProcessing: true }));
    expect(screen.getByText('思考中...')).toBeTruthy();
    view.rerender(localized({ isProcessing: true, hasPendingInteractivePrompt: true }));
    expect(screen.queryByText('思考中...')).toBeNull();
    view.rerender(localized({ isProcessing: true, messages: [tool(1, 'mcp__nimbalyst-mcp__AskUserQuestion', { questions: [] })] }));
    expect(screen.queryByText('思考中...')).toBeNull();
  });

  it('preserves collapsed message state and copies the original Markdown', async () => {
    const raw = '**Original payload** ' + 'long text '.repeat(30);
    const props = { messages: [message(1, { type: 'user_message', text: raw, mode: 'planning' })] };
    const view = render(localized(props, 'en'));
    fireEvent.click(screen.getByTitle('Collapse message'));
    view.rerender(localized(props));
    expect(screen.getByText('あなた')).toBeTruthy();
    expect(screen.getByTitle('メッセージ全文を表示')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Markdownとしてコピー'));
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledExactlyOnceWith(raw));
    view.rerender(localized(props, 'en'));
    expect(screen.getByTitle('Show full message')).toBeTruthy();
  });

  it.each([
    ['ツール呼び出しを表示', 'showToolCalls', false],
    ['コンパクト表示', 'compactMode', true],
    ['思考内容を表示', 'showThinking', false],
  ])('preserves settings keys for %s', (label, key, value) => {
    const onSettingsChange = vi.fn();
    const props = { settings, showSettings: true, onSettingsChange };
    const view = render(localized(props, 'en'));
    const originalInput = screen.getAllByRole('checkbox')[1];
    view.rerender(localized(props));
    expect(screen.getByRole('checkbox', { name: 'コンパクト表示' })).toBe(originalInput);
    fireEvent.click(screen.getByRole('checkbox', { name: label as string }));
    expect(onSettingsChange).toHaveBeenCalledExactlyOnceWith({ ...settings, [key as string]: value });
  });

  it('keeps raw paths clickable and expanded arguments across locale switches', () => {
    const onOpenFile = vi.fn();
    const props = { onOpenFile, workspacePath: '/repo', messages: [tool(1, 'Read', { file_path: '/repo/raw.md', offset: 2, limit: 4 })] };
    const view = render(localized(props, 'en'));
    fireEvent.click(screen.getByRole('button', { name: /Read/ }));
    expect(screen.getByText('Arguments:')).toBeTruthy();
    view.rerender(localized(props));
    expect(screen.getByText('引数:')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'raw.md, 2～6行' });
    expect(link.getAttribute('title')).toBe('/repo/raw.mdを開く');
    fireEvent.click(link);
    fireEvent.keyDown(link, { key: 'Enter' });
    expect(onOpenFile.mock.calls).toEqual([['/repo/raw.md'], ['/repo/raw.md']]);
    expect(screen.getByText('引数:')).toBeTruthy();
  });

  it.each(['mode', 'rule', 'asyncAgent', 'future-reason'])('localizes known denial sources and preserves %s diagnostics', reasonType => {
    const messages = [message(1, { type: 'system_message', systemMessage: { systemType: 'permission_denied', deniedReasonType: reasonType, deniedReason: 'Raw provider explanation' } })];
    render(localized({ messages }));
    expect(screen.getByText('ツールの実行が拒否されました')).toBeTruthy();
    expect(screen.getByText('不明なツール')).toBeTruthy();
    expect(screen.getByText('Raw provider explanation')).toBeTruthy();
    const labels: Record<string, string> = { mode: '権限モード', rule: '権限ルール', asyncAgent: '非同期エージェント' };
    expect(screen.getByText(`拒否元: ${labels[reasonType] ?? reasonType}`)).toBeTruthy();
  });

  it.each([
    ['session_naming', 'Session metadata reminder', 'セッション情報のリマインダー'],
    ['wakeup_resume', 'Resumed from scheduled wakeup', '再開予約から再開しました'],
    ['other', 'System Reminder', 'システムリマインダー'],
  ])('keeps expanded %s reminder payloads across locale changes', (kind, english, japanese) => {
    const props = { messages: [message(1, { type: 'system_message', text: '<SYSTEM_REMINDER>Raw reminder</SYSTEM_REMINDER>', systemMessage: { systemType: 'status' }, metadata: { reminderKind: kind } })] };
    const view = render(localized(props, 'en'));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(english) }));
    view.rerender(localized(props));
    expect(screen.getByRole('button', { name: new RegExp(japanese) }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Raw reminder')).toBeTruthy();
  });

  it.each(['running', 'idle', 'completed', 'errored'] as const)('translates subagent status %s without changing model metadata', status => {
    const child = tool(2, 'web_search');
    const subagent = { ...tool(1, 'Task', { prompt: 'Raw task prompt', description: 'Raw description', run_in_background: true }), type: 'subagent' as const, subagentId: 'tool-1', subagent: {
      agentType: 'raw-type', status: 'running' as const, teammateName: null, teamName: null, teammateMode: null, model: 'raw-model', reasoningEffort: 'raw-effort', color: null, isBackground: true, prompt: 'Raw task prompt', childEvents: [child],
    } };
    const props = { messages: [subagent], currentTeammates: [{ agentId: 'tool-1', status }] };
    const view = render(localized(props, 'en'));
    expect(screen.getByText('View full prompt')).toBeTruthy();
    view.rerender(localized(props));
    const labels = { running: '実行中', idle: '待機中', completed: '完了', errored: 'エラー' };
    expect(screen.getByText(labels[status])).toBeTruthy();
    expect(screen.getByTitle('モデル: raw-model; 推論の深さ: raw-effort').getAttribute('aria-label')).toBe('モデル: raw-model; 推論の深さ: raw-effort');
    expect(screen.getByText('プロンプト全文を表示')).toBeTruthy();
    expect(screen.getByText('Raw task prompt')).toBeTruthy();
    expect(screen.getByText('サブエージェントの操作（1件）:')).toBeTruthy();
    expect(screen.getByText('ウェブ検索')).toBeTruthy();
  });

  it.each(['Scout', undefined])('preserves teammate payload and avoids duplicated fallback names (%s)', name => {
    render(localized({ messages: [message(1, { type: 'user_message', text: 'Raw payload', metadata: { isTeammateMessage: true, teammateName: name } })] }));
    expect(screen.getByText(`${name ?? 'エージェント'}からメッセージを受信: Raw payload`)).toBeTruthy();
  });

  it('keeps the permission review target after a hidden classifier denial', async () => {
    const messages = [
      message(1, { type: 'system_message', systemMessage: { systemType: 'permission_denied', deniedToolName: 'Bash', deniedReasonType: 'classifier' } }),
      tool(2, 'ToolPermission', { requestId: 'permission-1', toolName: 'Bash', rawCommand: 'npm test', pattern: 'Bash(npm test:*)', patternDisplayName: 'npm test commands', isDestructive: true, warnings: [], workspacePath: '/repo' }),
      message(3, { text: '' }),
    ];
    const props = { messages, isProcessing: true, hasPendingInteractivePrompt: true };
    const view = render(localized(props, 'en'));
    await screen.findByRole('button', { name: /1 pending permission.*click to review/ });
    view.rerender(localized(props));
    scrollToIndex.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /承認待ちの権限1件/ }));
    expect(scrollToIndex).toHaveBeenCalledExactlyOnceWith(2, { align: 'center' });
    expect(screen.queryByText('思考中...')).toBeNull();
  });

  it('localizes turn duration and file counts, but omits a zero-duration footer', () => {
    const messages = [message(1, { type: 'user_message', text: 'Raw request' }), tool(2, 'Edit', { file_path: '/repo/raw.md', old_string: '', new_string: 'raw content' }), message(3, { text: 'Raw answer' })];
    const props = { messages, settings: { ...settings, showToolCalls: false } };
    const view = render(localized(props, 'en'));
    expect(view.container.querySelector('.rich-transcript-turn-elapsed')?.textContent).toContain('Finished in 2.0s');
    expect(view.container.querySelector('.rich-transcript-turn-elapsed')?.textContent).toContain('1 file');
    view.rerender(localized(props));
    const footer = view.container.querySelector('.rich-transcript-turn-elapsed');
    expect(footer?.textContent).toContain('2.0秒で完了');
    expect(footer?.textContent).toContain('ファイル1件 +1');
    expect(footer?.textContent).not.toMatch(/Finished| at /);
    view.rerender(localized({ ...props, messages: messages.map(msg => ({ ...msg, createdAt: messages[0].createdAt })) }));
    expect(view.container.querySelector('.rich-transcript-turn-elapsed')).toBeNull();
  });
});

describe('localized transcript helpers', () => {
  it('preserves technical names, paths and default English output', () => {
    const t = translate();
    expect(formatToolDisplayName('file_change', t)).toBe('ファイルの変更');
    expect(formatToolDisplayName('exec_command', t)).toBe('Bash');
    expect(formatToolDisplayName('raw_tool', t)).toBe('raw_tool');
    expect(formatToolDisplayName('web_search')).toBe('Web Search');
    expect(formatToolArguments('Read', { file_path: '/repo/raw.md', offset: 2 }, '/repo', t)).toBe('raw.md, 2行目以降');
    expect(formatToolArguments('Read', { file_path: '/repo/raw.md', limit: 3 }, '/repo', t)).toBe('raw.md, 先頭3行');
    expect(formatToolArguments('Grep', { pattern: 'literal', path: '/repo/src' }, '/repo', t)).toBe('"literal" src内');
    expect(formatToolArguments('Bash', { command: 'git status --short' }, '/repo', t)).toBe('git status --short');
    expect(formatSubagentAuditLabel('raw-model', 'raw-effort', t)).toBe('モデル: raw-model; 推論の深さ: raw-effort');
    expect(formatSubagentAuditLabel(null, null, t)).toBeNull();
  });

  it('keeps the five-minute threshold and formats Japanese clock/calendar values', () => {
    const t = translate();
    const recent = new Date(now.getTime() - 300000);
    const earlier = new Date(2026, 8, 21, 11, 0, 0);
    const yesterday = new Date(2026, 8, 20, 11, 0, 0);
    expect(formatTurnFinishedAt(recent, now, 'ja', t)).toBe('');
    expect(formatTurnFinishedAt(earlier, now)).toBe('at 11:00 am');
    expect(formatTurnFinishedAt(earlier, now, 'ja', t)).toBe('（11:00に完了）');
    expect(formatTurnFinishedAt(yesterday, now, 'ja', t)).toContain('2026年9月20日');
    expect(formatMessageTime(earlier, 'ja')).toBe(earlier.toLocaleTimeString('ja'));
    expect(formatMessageTime(yesterday, 'ja')).toBe(yesterday.toLocaleString('ja', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
    expect(formatMessageTime('invalid', 'ja')).toBe('');
  });
});
