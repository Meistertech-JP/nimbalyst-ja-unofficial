import React from 'react';
import i18next from 'i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { MemoryToolWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/MemoryToolWidget';
import { UpdateSessionMetaWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/UpdateSessionMetaWidget';
import { noopInteractiveWidgetHost } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/InteractiveWidgetHost';
import { interactiveWidgetHostAtom } from '../../../../../runtime/src/store/atoms/interactiveWidgetHost';
import type { TranscriptViewMessage } from '../../../../../runtime/src/ai/server/types';

const locale = i18next.createInstance();
let store: ReturnType<typeof createStore>;
const openFile = vi.fn();
const toggle = vi.fn();
function message(result: unknown, args: Record<string, unknown> = {}, toolName = 'update_session_meta'): TranscriptViewMessage {
  return { id: 1, sequence: 1, type: 'tool_call', subagentId: null, createdAt: new Date(1000), toolCall: {
    toolName, toolDisplayName: toolName, status: 'completed', description: null, arguments: args,
    targetFilePath: null, mcpServer: null, mcpTool: null, providerToolCallId: 'raw-tool', progress: [],
    // Both widgets retain legacy non-string result support alongside canonical strings.
    result: result as string,
  } };
}
function localized(children: React.ReactNode, language = 'ja') {
  const t = locale.getFixedT(language);
  return <JotaiProvider store={store}><RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider></JotaiProvider>;
}
function meta(result: unknown, args: Record<string, unknown> = {}) {
  return <UpdateSessionMetaWidget sessionId="memory-meta" message={message(result, args)} isExpanded onToggle={toggle} />;
}
function memory(result: unknown, props: Partial<React.ComponentProps<typeof MemoryToolWidget>> = {}) {
  return <MemoryToolWidget sessionId="memory-meta" message={message(result, { query: '  Raw query  ' }, 'memory_recall')} workspacePath="C:\repo" isExpanded={false} onToggle={toggle} {...props} />;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  store = createStore(); openFile.mockReset(); toggle.mockReset();
  store.set(interactiveWidgetHostAtom('memory-meta'), { ...noopInteractiveWidgetHost, openFile });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('session metadata display', () => {
  it.each([
    ['backlog', 'バックログ'], ['planning', '計画中'], ['implementing', '実装中'], ['validating', '検証中'], ['complete', '完了'], ['custom-phase', 'custom-phase'],
  ])('translates known %s phase without changing tags/names/protocol', (phase, label) => {
    const result = { summary: 'Raw summary', before: { name: null, tags: ['kept', 'removed'], phase: null }, after: { name: 'Raw title', tags: ['kept', 'added'], phase } };
    const content = meta(JSON.stringify(result));
    const view = render(localized(content, 'en'));
    expect(screen.getByText('Session Meta')).toBeTruthy();
    view.rerender(localized(content));
    expect(screen.getByText('セッション情報')).toBeTruthy();
    expect(screen.getByText('設定済み')).toBeTruthy();
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText('Raw title')).toBeTruthy();
    expect(screen.getByText('#kept').textContent).toBe('#kept');
    expect(screen.getByText('#added').textContent).toBe('+#added');
    expect(screen.getByText('#removed').textContent).toBe('-#removed');
    expect(screen.getByText('#removed').style.textDecoration).toBe('line-through');
    expect(result.after.phase).toBe(phase);
  });

  it.each(['direct', 'mcp', 'codex'])('preserves %s structured parsing and the already-set name rule', shape => {
    const state = { name: 'Original name', tags: [], phase: null };
    const result = { summary: 'Raw summary', before: state, after: state };
    const wrapped = shape === 'direct' ? result : shape === 'mcp' ? JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(result) }] }) : JSON.stringify({ success: true, result });
    render(localized(meta(wrapped, { name: 'Attempted rename' })));
    expect(screen.getByText('Original name')).toBeTruthy();
    expect(screen.getByText('（設定済みのため変更なし）')).toBeTruthy();
    expect(screen.queryByText('Attempted rename')).toBeNull();
  });

  it('retains pending/legacy content and translates empty metadata', () => {
    const view = render(localized(meta(null, { name: 'Pending name' })));
    expect(screen.getByText('Pending name')).toBeTruthy();
    view.rerender(localized(meta('Raw legacy result')));
    expect(screen.getByText('Raw legacy result')).toBeTruthy();
    const empty = { name: null, phase: null, tags: [] };
    view.rerender(localized(meta(JSON.stringify({ before: empty, after: empty }))));
    expect(screen.getByText('情報は設定されていません')).toBeTruthy();
  });
});

describe('memory retrieval display', () => {
  it.each([
    ['recall', 'メモリーの参照'], ['memory_recall', 'メモリーの参照'], ['mcp__nimbalyst-memory__memory_search_project_knowledge', 'メモリー検索'], ['unknown-memory', 'メモリーツール'],
  ])('translates the %s heading and preserves the query', (name, label) => {
    render(localized(memory(null, { message: message(null, { query: 'Raw query' }, name) })));
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByTestId('memory-tool-query').textContent).toBe('検索文: “Raw query”');
  });

  it.each([1, 4, 5])('preserves source DOM, bounded snippets, expansion and navigation for %s facts', count => {
    const result = JSON.stringify({ facts: Array.from({ length: count }, (_, i) => ({ sourcePath: `facts/raw-${i}.md`, text: `Raw ${i} ` + 'x'.repeat(500), category: 'custom-category', scope: 'raw-scope' })) });
    const view = render(localized(memory(result), 'en'));
    expect(screen.getByText(`(${count} ${count === 1 ? 'source' : 'sources'})`)).toBeTruthy();
    const first = screen.getAllByTestId('memory-tool-source')[0];
    view.rerender(localized(memory(result)));
    expect(screen.getAllByTestId('memory-tool-source')).toHaveLength(Math.min(3, count));
    expect(screen.getAllByTestId('memory-tool-source')[0]).toBe(first);
    expect(first.textContent?.length).toBeLessThan(320);
    expect(first.textContent).toContain('custom-category / raw-scope');
    expect(screen.getByText(`（参照元${count}件）`)).toBeTruthy();
    fireEvent.click(screen.getAllByTestId('memory-tool-source-title')[0]);
    expect(openFile).toHaveBeenCalledExactlyOnceWith(String.raw`C:\repo\facts/raw-0.md`);
    expect(toggle).not.toHaveBeenCalled();
    if (count > 3) {
      fireEvent.click(screen.getByRole('button', { name: `参照元をあと${count - 3}件表示` }));
      expect(toggle).toHaveBeenCalledTimes(1);
      view.rerender(localized(memory(result, { isExpanded: true })));
      expect(screen.getAllByTestId('memory-tool-source')).toHaveLength(count);
      expect(screen.getByRole('button', { name: '表示を減らす' })).toBeTruthy();
    }
  });

  it('localizes known virtual result kinds but never opens their synthetic IDs', () => {
    const chunks = ['doc-file', 'tracker', 'session', 'future-kind'].map(refType => ({ refType, sourcePath: refType === 'doc-file' ? '' : `${refType}:uuid`, text: 'Raw text' }));
    const view = render(localized(memory(JSON.stringify({ chunks }), { isExpanded: true })));
    for (const label of ['ドキュメントの結果', 'トラッカーの結果', 'セッションの結果', 'Future-kindの結果']) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByTestId('memory-tool-source-title')).toBeNull();
    expect(view.container.textContent).not.toContain(':uuid');
    expect(openFile).not.toHaveBeenCalled();
  });

  it('localizes generated fact titles and keeps custom headings and absolute paths', () => {
    const view = render(localized(memory(JSON.stringify({ facts: [{ text: 'Raw fact' }] }))));
    expect(screen.getByText('情報0')).toBeTruthy();
    view.rerender(localized(memory(JSON.stringify({ chunks: [{ refType: 'doc-file', sourcePath: '/absolute/file.md', headingPath: ['Raw heading', 'Raw section'], text: '  Raw\n  snippet ' }] }))));
    fireEvent.click(screen.getByText('Raw heading › Raw section'));
    expect(openFile).toHaveBeenCalledExactlyOnceWith('/absolute/file.md');
    expect(screen.getByText('Raw snippet')).toBeTruthy();
  });

  it.each(['empty', 'unparseable', 'raw-error', 'fallback-error'])('handles %s without exposing or translating raw result payloads', kind => {
    const result = kind === 'empty' ? JSON.stringify({ facts: [] }) : kind === 'unparseable' ? 'unparseable secret blob' : kind === 'raw-error' ? 'Error: Raw provider diagnostic' : null;
    const input = message(result, { query: 'Raw query' }, 'recall');
    if (input.toolCall && kind === 'fallback-error') input.toolCall.isError = true;
    const content = memory(result, { message: input });
    const view = render(localized(content, 'en'));
    view.rerender(localized(content));
    if (kind === 'raw-error') expect(screen.getByTestId('memory-tool-error').textContent).toBe(result);
    else if (kind === 'fallback-error') expect(screen.getByText('メモリーの検索に失敗しました。')).toBeTruthy();
    else expect(screen.getByText('この検索文に一致するメモリーは見つかりませんでした。')).toBeTruthy();
    expect(view.container.textContent).not.toContain('unparseable secret blob');
  });
});
