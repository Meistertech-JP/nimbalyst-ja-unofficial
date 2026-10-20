import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider, useRuntimeTranslation } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { BashWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/BashWidget';
import { CrossSessionToolWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/CrossSessionToolWidget';
import { useElapsedTimeRef } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/useElapsedTime';
import { SessionReferenceChip } from '../../../../../runtime/src/ui/AgentTranscript/session/SessionReferenceChip';
import { sessionRefMapAtom } from '../../../../../runtime/src/ui/AgentTranscript/session/sessionRefAtoms';
import { copyToClipboard } from '../../../../../runtime/src/utils/clipboard';
import type { TranscriptViewMessage } from '../../../../../runtime/src/ai/server/types';

vi.mock('../../../../../runtime/src/utils/clipboard', () => ({ copyToClipboard: vi.fn().mockResolvedValue(undefined) }));
const locale = i18next.createInstance();
const child = '72989f55-3c63-48e3-9abc-0123456789ab';
function translated(children: React.ReactNode, language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider>;
}
function message(toolName: string, args: Record<string, unknown>, result?: string): TranscriptViewMessage {
  return { id: 1, sequence: 1, createdAt: new Date(1000), type: 'tool_call', subagentId: null, toolCall: { toolName, toolDisplayName: toolName, status: result === undefined ? 'running' : 'completed', description: null, arguments: args, targetFilePath: null, mcpServer: null, mcpTool: null, providerToolCallId: 'raw-tool', progress: [], result } };
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  vi.clearAllMocks();
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('terminal-style tool localization', () => {
  it.each([16, 18])('retains expanded output with %s original lines during locale changes', count => {
    const output = Array.from({ length: count }, (_, i) => `Raw line ${i + 1}`).join('\n');
    const onToggle = vi.fn();
    const widget = <BashWidget sessionId="host" message={message('Bash', { command: 'git status --short', description: 'Raw description' }, output)} isExpanded onToggle={onToggle} />;
    const view = render(translated(widget, 'en'));
    expect(view.container.querySelector('pre')?.textContent?.split('\n')).toHaveLength(15);
    fireEvent.click(screen.getByRole('button', { name: `Show ${count - 15} more line${count === 16 ? '' : 's'}` }));
    view.rerender(translated(widget));
    expect(screen.getByText('ターミナル')).toBeTruthy();
    expect(screen.getByText('Raw description')).toBeTruthy();
    expect(view.container.querySelector('pre')?.textContent).toBe(output);
    fireEvent.click(screen.getByRole('button', { name: '表示を減らす' }));
    expect(screen.getByRole('button', { name: `残り${count - 15}行を表示` })).toBeTruthy();
    expect(view.container.querySelector('pre')?.textContent?.split('\n')).toHaveLength(15);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('copies the original command and preserves copied state when changing language', async () => {
    const command = 'printf "raw <literal>"';
    const onToggle = vi.fn();
    const widget = <BashWidget sessionId="host" message={message('Bash', { command }, 'Raw stdout')} isExpanded onToggle={onToggle} />;
    const view = render(translated(widget, 'en'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy command' }));
    await screen.findByRole('button', { name: 'Copied!' });
    view.rerender(translated(widget));
    expect(screen.getByRole('button', { name: 'コピーしました！' }).getAttribute('title')).toBe('コピーしました！');
    expect(copyToClipboard).toHaveBeenCalledExactlyOnceWith(command);
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByText('Raw stdout')).toBeTruthy();
  });

  it('updates the running caption and stops the elapsed ref when a result arrives', () => {
    vi.spyOn(Date, 'now').mockReturnValue(6000);
    const running = message('Bash', { command: 'raw command' });
    const props = { sessionId: 'host', message: running, isExpanded: true, onToggle: vi.fn() };
    const view = render(translated(<BashWidget {...props} />, 'en'));
    expect(screen.getByText('5s')).toBeTruthy();
    view.rerender(translated(<BashWidget {...props} />));
    expect(screen.getByText('実行中')).toBeTruthy();
    expect(screen.getByText('5秒')).toBeTruthy();
    vi.mocked(cancelAnimationFrame).mockClear();
    view.rerender(translated(<BashWidget {...props} message={message('Bash', { command: 'raw command' }, 'Raw result')} />));
    expect(screen.queryByText('5秒')).toBeNull();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(screen.getByText('Raw result')).toBeTruthy();
  });

  it.each([[5000, '5s', '5秒'], [125000, '2m 5s', '2分5秒'], [3605000, '1h 0m', '1時間0分']] as const)('keeps the direct-DOM timer at %s ms without React tick renders', (elapsed, english, japanese) => {
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(1000 + elapsed);
    let renders = 0;
    function Timer() {
      const { t } = useRuntimeTranslation();
      const ref = useElapsedTimeRef(1000, t);
      renders++;
      return <span ref={ref} />;
    }
    const view = render(translated(<Timer />, 'en'));
    expect(screen.getByText(english)).toBeTruthy();
    view.rerender(translated(<Timer />));
    expect(screen.getByText(japanese)).toBeTruthy();
    const beforeTick = renders;
    dateNow.mockReturnValue(2000 + elapsed);
    const tick = vi.mocked(requestAnimationFrame).mock.calls.at(-1)![0];
    act(() => tick(0));
    expect(renders).toBe(beforeTick);
    expect(view.container.textContent).not.toMatch(/[hms]/);
    view.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});

describe('cross-session tools and reference chip localization', () => {
  it.each([
    ['send_prompt', 'Send prompt', 'プロンプトを送信'],
    ['respond_to_prompt', 'Respond to prompt', 'プロンプトに回答'],
    ['spawn_session', 'Spawn session', '子セッションを起動'],
    ['create_session', 'Create session', 'セッションを作成'],
    ['get_session_status', 'Get session status', 'セッションの状態を取得'],
    ['get_session_result', 'Get session result', 'セッションの結果を取得'],
    ['list_queued_prompts', 'List queued prompts', '待機中のプロンプト一覧を取得'],
    ['list_spawned_sessions', 'List spawned sessions', '起動したセッション一覧を取得'],
  ])('preserves %s protocol, session IDs and result payloads', (name, english, japanese) => {
    const store = createStore();
    store.set(sessionRefMapAtom, new Map([[child, { id: child, title: 'Raw child title', phase: 'implementing' }]]));
    const rawResult = JSON.stringify({ sessionId: child, raw: 'Original result' });
    const props = { sessionId: 'host', message: message(`mcp__nimbalyst-host__${name}`, { sessionId: child, prompt: 'Raw prompt', response: 'Raw response', initialPrompt: 'Raw initial prompt' }, rawResult), isExpanded: false, onToggle: vi.fn() };
    const widget = (expanded = false) => <JotaiProvider store={store}><CrossSessionToolWidget {...props} isExpanded={expanded} /></JotaiProvider>;
    const view = render(translated(widget(), 'en'));
    expect(screen.getByText(english)).toBeTruthy();
    view.rerender(translated(widget()));
    expect(screen.getByText(japanese)).toBeTruthy();
    expect(view.container.querySelector('[data-tool]')?.getAttribute('data-tool')).toBe(name);
    const chip = screen.getByRole('button', { name: /Raw child title/ });
    expect(chip.getAttribute('title')).toBe('Raw child title · 実装中 — セッションを開く');
    const dispatch = vi.spyOn(window, 'dispatchEvent');
    fireEvent.click(chip);
    const event = dispatch.mock.calls.map(([event]) => event).find(event => event.type === 'open-ai-session') as CustomEvent;
    expect(event.detail.sessionId).toBe(child);
    fireEvent.click(screen.getByRole('button', { name: /詳細/ }));
    expect(props.onToggle).toHaveBeenCalledTimes(1);
    view.rerender(translated(widget(true)));
    expect(screen.getByRole('button', { name: /非表示/ })).toBeTruthy();
    expect(screen.getByText(rawResult)).toBeTruthy();
    view.rerender(translated(widget(true), 'en'));
    expect(screen.getByText(rawResult)).toBeTruthy();
  });

  it.each([
    ['backlog', 'バックログ'], ['planning', '計画中'], ['implementing', '実装中'], ['validating', '検証中'], ['complete', '完了'],
  ])('localizes phase %s without modifying its stored identifier or navigation override', (phase, label) => {
    const store = createStore();
    store.set(sessionRefMapAtom, new Map([[child, { id: child, title: 'Raw title', phase }]]));
    const onOpen = vi.fn();
    render(translated(<JotaiProvider store={store}><SessionReferenceChip sessionId={child} onOpen={onOpen} /></JotaiProvider>));
    expect(screen.getByText(label)).toBeTruthy();
    const chip = screen.getByRole('button');
    expect(chip.getAttribute('data-phase')).toBe(phase);
    expect(chip.getAttribute('title')).toBe(`Raw title · ${label} — セッションを開く`);
    fireEvent.click(chip);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(child);
  });

  it('keeps unknown tool names and unresolved session IDs verbatim', () => {
    const store = createStore();
    render(translated(<JotaiProvider store={store}><CrossSessionToolWidget sessionId="host" message={message('custom_tool', { sessionId: child })} isExpanded={false} onToggle={vi.fn()} /></JotaiProvider>));
    expect(screen.getByText('custom_tool')).toBeTruthy();
    expect(screen.getByTitle('セッション72989f55 — セッションを開く').getAttribute('data-session-id')).toBe(child);
    expect(screen.queryByRole('button', { name: /詳細/ })).toBeNull();
  });
});
