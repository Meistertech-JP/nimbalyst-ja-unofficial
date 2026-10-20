import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { SuperLoopProgressWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/SuperLoopProgressWidget';
import { SuperProgressSnapshotWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/SuperProgressSnapshotWidget';
import { ToolWidgetErrorBoundary } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/ToolWidgetErrorBoundary';
import { noopInteractiveWidgetHost } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/InteractiveWidgetHost';
import { interactiveWidgetHostAtom } from '../../../../../runtime/src/store/atoms/interactiveWidgetHost';
import type { TranscriptViewMessage } from '../../../../../runtime/src/ai/server/types';

const locale = i18next.createInstance();
let store: ReturnType<typeof createStore>;
const sendFeedback = vi.fn();
const copy = vi.fn();
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const progress = { phase: 'planning', status: 'running', completionSignal: false, currentIteration: 3, learnings: [{ iteration: 2, summary: 'Raw learning', filesChanged: ['/repo/raw.ts'] }], blockers: ['Raw blocker'], userFeedback: 'Raw feedback' };
function message(args: Record<string, unknown>): TranscriptViewMessage {
  return { id: 1, sequence: 1, type: 'tool_call', subagentId: null, createdAt: new Date(1000), toolCall: {
    toolName: 'super_loop_progress_update', toolDisplayName: 'super_loop_progress_update', status: 'completed', description: null,
    arguments: args, targetFilePath: null, mcpServer: null, mcpTool: null, providerToolCallId: 'raw-tool', progress: [], result: 'raw result',
  } };
}
function localized(children: React.ReactNode, language = 'ja') {
  const t = locale.getFixedT(language);
  return <JotaiProvider store={store}><RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider></JotaiProvider>;
}
function update(args = progress) {
  return <SuperLoopProgressWidget sessionId="progress-i18n" message={message(args)} isExpanded onToggle={() => {}} />;
}
function snapshot(args = progress, timing = 'iteration-start') {
  return <SuperProgressSnapshotWidget sessionId="progress-i18n" message={message({ timing, iterationNumber: 4, progress: args, superLoopId: 'raw-loop', capturedAt: 1000 })} isExpanded onToggle={() => {}} />;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  store = createStore();
  sendFeedback.mockReset().mockResolvedValue({ success: true });
  copy.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
  store.set(interactiveWidgetHostAtom('progress-i18n'), { ...noopInteractiveWidgetHost, superLoopBlockedFeedback: sendFeedback });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks();
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else Reflect.deleteProperty(navigator, 'clipboard');
});

describe('progress presentation without protocol mutation', () => {
  it.each([
    ['planning', 'running', '計画中', '実行中'],
    ['building', 'completed', '構築中', '完了'],
    ['future-phase', 'future-status', 'future-phase', 'future-status'],
  ])('displays %s/%s while preserving raw arguments', (phase, status, phaseLabel, statusLabel) => {
    const args = { ...progress, phase, status };
    const content = update(args);
    const view = render(localized(content, 'en'));
    expect(screen.getByText('Progress Update')).toBeTruthy();
    view.rerender(localized(content));
    expect(screen.getByText('進捗更新')).toBeTruthy();
    expect(screen.getByText(phaseLabel)).toBeTruthy();
    expect(screen.getByText(statusLabel)).toBeTruthy();
    expect(screen.getByText('イテレーション3')).toBeTruthy();
    expect(screen.getByText('Raw learning')).toBeTruthy();
    expect(args.phase).toBe(phase);
    expect(args.status).toBe(status);
  });

  it.each(['iteration-start', 'iteration-end'])('retains expanded raw JSON and dynamic content for %s', timing => {
    const args = { ...progress, status: 'blocked', completionSignal: true };
    const content = snapshot(args, timing);
    const view = render(localized(content, 'en'));
    fireEvent.click(screen.getByRole('button', { name: /Raw JSON/ }));
    const raw = view.container.querySelector('pre');
    expect(raw?.textContent).toBe(JSON.stringify(args, null, 2));
    view.rerender(localized(content));
    expect(screen.getByText(timing === 'iteration-start' ? 'イテレーション開始 #4' : 'イテレーション終了 #4')).toBeTruthy();
    expect(screen.getByText('ブロック中')).toBeTruthy();
    expect(screen.getByText('完了')).toBeTruthy();
    expect(screen.getByText('得られた知見（1件）')).toBeTruthy();
    for (const rawText of ['Raw feedback', 'Raw blocker', 'Raw learning']) expect(screen.getByText(rawText)).toBeTruthy();
    expect(view.container.querySelector('pre')).toBe(raw);
    expect(raw?.textContent).toBe(JSON.stringify(args, null, 2));
  });

  it('localizes empty progress states and preserves absent-tool behavior', () => {
    const empty = { ...progress, learnings: [], blockers: [], userFeedback: '' };
    const view = render(localized(snapshot(empty)));
    expect(screen.getByText('知見や障害はまだ記録されていません')).toBeTruthy();
    view.rerender(localized(update(empty)));
    expect(screen.getByText('知見はまだ記録されていません')).toBeTruthy();
    view.rerender(localized(<SuperLoopProgressWidget sessionId="progress-i18n" message={{ ...message({}), toolCall: undefined }} isExpanded onToggle={() => {}} />));
    expect(view.container.textContent).toBe('');
  });
});

describe('blocked feedback locale switching', () => {
  it('retains draft and pending submission, trims only as before, and sends once via keyboard', async () => {
    let resolve!: (value: { success: boolean }) => void;
    sendFeedback.mockReturnValue(new Promise(done => { resolve = done; }));
    const content = update({ ...progress, status: 'blocked' });
    const view = render(localized(content, 'en'));
    const input = screen.getByPlaceholderText('Provide guidance to help overcome the blockers...') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '  Raw guidance\nKeep this  ' } });
    view.rerender(localized(content));
    expect(screen.getByPlaceholderText('障害の解消に向けた指示を入力...')).toBe(input);
    expect(input.value).toBe('  Raw guidance\nKeep this  ');
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
    expect(screen.getByRole('button', { name: '送信中...' })).toBeTruthy();
    expect(input.disabled).toBe(true);
    view.rerender(localized(content, 'en'));
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    expect(sendFeedback).toHaveBeenCalledExactlyOnceWith('Raw guidance\nKeep this');
    await act(async () => resolve({ success: true }));
    expect(screen.getByText('Feedback sent')).toBeTruthy();
    view.rerender(localized(content));
    expect(screen.getByText('フィードバックを送信しました')).toBeTruthy();
    expect(screen.getByText(/Raw guidance/).textContent).toBe('Raw guidance\nKeep this');
  });

  it.each(['missing', 'raw', 'throw', 'unknown'])('handles %s send errors without resubmission on locale switch', async kind => {
    if (kind === 'throw') sendFeedback.mockRejectedValue(new Error('Raw send error'));
    else if (kind === 'unknown') sendFeedback.mockRejectedValue(null);
    else sendFeedback.mockResolvedValue({ success: false, error: kind === 'raw' ? 'Raw send error' : undefined });
    const content = update({ ...progress, status: 'blocked' });
    const view = render(localized(content, 'en'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Feedback' }));
    const isRaw = kind === 'raw' || kind === 'throw';
    expect(await screen.findByText(isRaw ? 'Raw send error' : 'Failed to send feedback')).toBeTruthy();
    view.rerender(localized(content));
    expect(screen.getByText(isRaw ? 'Raw send error' : 'フィードバックを送信できませんでした')).toBeTruthy();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Keep draft');
    expect(sendFeedback).toHaveBeenCalledTimes(1);
  });

  it('keeps host-unavailable feedback disabled and localizes waiting', () => {
    store.set(interactiveWidgetHostAtom('progress-i18n'), null);
    render(localized(update({ ...progress, status: 'blocked' })));
    expect(screen.getByText('セッションを待っています...')).toBeTruthy();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'フィードバックを送信' }) as HTMLButtonElement).disabled).toBe(true);
    expect(sendFeedback).not.toHaveBeenCalled();
  });
});

describe('widget error boundary locale changes', () => {
  function Broken({ error }: { error: Error }): never { throw error; }
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });

  it('retains expanded error details and copies the exact diagnostic, then retries', async () => {
    const error = new Error('Raw render error');
    error.stack = 'Raw stack\n at original.ts:1';
    const content = <ToolWidgetErrorBoundary toolName="raw_tool"><Broken error={error} /></ToolWidgetErrorBoundary>;
    const view = render(localized(content, 'en'));
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    view.rerender(localized(content));
    expect(screen.getByText('ウィジェットを表示できませんでした')).toBeTruthy();
    expect(screen.getByText('raw_tool')).toBeTruthy();
    expect(screen.getByRole('button', { name: '詳細を非表示' })).toBeTruthy();
    expect(view.container.querySelector('pre')?.textContent).toBe(error.stack);
    fireEvent.click(screen.getByRole('button', { name: 'コピー' }));
    expect(copy).toHaveBeenCalledExactlyOnceWith(`Tool widget: raw_tool\nError: Raw render error\n${error.stack}`);
    view.rerender(localized(<ToolWidgetErrorBoundary toolName="raw_tool"><span>Recovered child</span></ToolWidgetErrorBoundary>));
    expect(screen.queryByText('Recovered child')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(screen.getByText('Recovered child')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('translates unknown fallbacks even after the boundary has caught an error', () => {
    const content = <ToolWidgetErrorBoundary><Broken error={new Error('')} /></ToolWidgetErrorBoundary>;
    const view = render(localized(content, 'en'));
    expect(screen.getByText('Unknown error')).toBeTruthy();
    view.rerender(localized(content));
    expect(screen.getByText('不明なエラー')).toBeTruthy();
    expect(screen.getByText('不明なツール')).toBeTruthy();
  });
});
