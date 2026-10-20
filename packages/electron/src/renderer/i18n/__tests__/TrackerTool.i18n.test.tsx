import React from 'react';
import i18next from 'i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { TrackerToolWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/TrackerToolWidget';
import type { TranscriptViewMessage } from '../../../../../runtime/src/ai/server/types';

const locale = i18next.createInstance();
const item = { id: 'raw-id', type: 'bug', title: 'Raw title', status: 'custom-status', priority: 'high', tags: ['raw-tag'], owner: 'Raw owner' };
function message(result: unknown, toolName = 'tracker_update', args: Record<string, unknown> = {}): TranscriptViewMessage {
  return { id: 1, sequence: 1, type: 'tool_call', subagentId: null, createdAt: new Date(1000), toolCall: {
    toolName, toolDisplayName: toolName, status: 'completed', description: null, arguments: args,
    targetFilePath: null, mcpServer: null, mcpTool: null, providerToolCallId: 'raw-tool', progress: [],
    // Preserve coverage of legacy object results handled by this widget.
    result: result as string,
  } };
}
function localized(msg: TranscriptViewMessage, language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
    <TrackerToolWidget sessionId="tracker-i18n" message={msg} isExpanded onToggle={() => {}} />
  </RuntimeTranslationProvider>;
}
function structured(data: object, legacy = false) {
  const result = { structured: data, summary: 'Raw summary' };
  return message(legacy ? result : JSON.stringify(result));
}
function updated(changes: Record<string, { from: unknown; to: unknown }>) {
  return structured({ ...item, action: 'updated', changes });
}
beforeEach(async () => { await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('structured tracker results', () => {
  it.each(['created', 'retrieved'])('translates %s captions and retains original navigation/title/status/tag data', action => {
    const msg = structured({ action, item });
    const view = render(localized(msg, 'en'));
    expect(screen.getByText(action === 'created' ? 'Tracker Created' : 'Tracker Item')).toBeTruthy();
    const title = screen.getByText('Raw title');
    view.rerender(localized(msg));
    expect(screen.getByText(action === 'created' ? 'トラッカー項目を作成しました' : 'トラッカー項目')).toBeTruthy();
    expect(screen.getByText('タイトル')).toBeTruthy();
    expect(screen.getByText('バグ')).toBeTruthy();
    expect(screen.getByText('高')).toBeTruthy();
    expect(screen.getByText('custom-status')).toBeTruthy();
    expect(screen.getByText('#raw-tag')).toBeTruthy();
    expect(screen.getByText('Raw title')).toBe(title);
    const dispatch = vi.spyOn(window, 'dispatchEvent');
    fireEvent.click(title);
    const event = dispatch.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('nimbalyst:navigate-tracker-item');
    expect(event.detail).toEqual({ itemId: 'raw-id' });
  });

  it.each([['bug', 'バグ'], ['task', 'タスク'], ['plan', 'プラン'], ['idea', 'アイデア'], ['decision', '決定事項'], ['feature', '機能'], ['automation', '自動化'], ['custom-kind', 'custom-kind']])('localizes only known type %s', (type, label) => {
    render(localized(structured({ action: 'created', item: { ...item, type } })));
    expect(screen.getByText(label)).toBeTruthy();
  });

  it.each([['critical', '重大'], ['high', '高'], ['medium', '中'], ['low', '低'], ['custom-priority', 'custom-priority']])('localizes only known priority %s', (priority, label) => {
    render(localized(structured({ action: 'retrieved', item: { ...item, priority } })));
    expect(screen.getByText(label)).toBeTruthy();
  });

  it.each(['array', 'json', 'invalid'])('retains legacy secondary type tag handling for %s', shape => {
    const tags = ['bug', 'feature', 'custom-type'];
    const typeTags = shape === 'array' ? tags : shape === 'json' ? JSON.stringify(tags) : 'invalid JSON';
    render(localized(structured({ action: 'created', item: { ...item, typeTags } }, true)));
    expect(screen.getAllByText('バグ')).toHaveLength(1);
    if (shape === 'invalid') expect(screen.queryByText('機能')).toBeNull();
    else { expect(screen.getByText('機能')).toBeTruthy(); expect(screen.getByText('custom-type')).toBeTruthy(); }
  });

  it('renders all specialized changes with original payloads and preserved tag normalization', () => {
    const msg = updated({
      status: { from: null, to: 'custom-status' }, priority: { from: 'low', to: 'high' },
      title: { from: 'Old title', to: 'New title' }, owner: { from: null, to: 'Raw owner' },
      archived: { from: true, to: false }, progress: { from: 20, to: 75 },
      tags: { from: ' keep, remove ', to: ['keep', 'add'] },
      description: { from: 'x'.repeat(1000), to: 'raw' },
    });
    const view = render(localized(msg, 'en'));
    expect(screen.getByText('1,000 chars')).toBeTruthy();
    view.rerender(localized(msg));
    for (const text of ['トラッカー項目を更新しました', 'ステータス', '優先度', 'タイトル', '担当者', '進捗', 'タグ', '説明', '1,000文字', '3文字', '低', '高', 'Old title', 'New title', 'Raw owner', 'custom-status', '20%', '75%', 'アーカイブ解除済み']) expect(screen.getByText(text)).toBeTruthy();
    expect(screen.getByText('#remove').style.textDecoration).toBe('line-through');
    expect(screen.getByText('#add').textContent).toBe('+#add');
    expect(screen.getByText('#keep').textContent).toBe('#keep');
    expect(screen.getAllByText('なし')).toHaveLength(2);
  });

  it('localizes generated generic empty/boolean labels while preserving custom fields and serialized values', () => {
    const msg = updated({
      customFlag: { from: false, to: true }, customEmpty: { from: [], to: null },
      dueDate: { from: '2026-01-01', to: '2026-02-01' },
      custom_data: { from: { rawKey: true }, to: ['raw-one', 'raw-two'] },
      customLong: { from: 'x'.repeat(130), to: '' },
    });
    render(localized(msg));
    for (const text of ['Custom Flag', '真', '偽', '期限', '2026-01-01', '2026-02-01', 'Custom data', '{"rawKey":true}', 'raw-one, raw-two', 'x'.repeat(117) + '...']) expect(screen.getByText(text)).toBeTruthy();
    expect(screen.getAllByText('なし')).toHaveLength(3);
  });

  it('localizes conventional filter labels without changing schema-owned status or custom filter values', () => {
    const data = { action: 'listed', count: 1, filters: { type: 'bug', priority: 'high', status: 'custom-status', custom_field: 'raw-filter' }, items: [item] };
    const msg = structured(data);
    const view = render(localized(msg, 'en'));
    view.rerender(localized(msg));
    expect(screen.getByText('トラッカー一覧')).toBeTruthy();
    expect(screen.getByText('種類: バグ, 優先度: 高, ステータス: custom-status, custom_field: raw-filter')).toBeTruthy();
    expect(screen.getByText('(1)')).toBeTruthy();
    expect(data.filters.type).toBe('bug');
    view.rerender(localized(structured({ ...data, count: 0, items: [] })));
    expect(screen.getByText('項目が見つかりません')).toBeTruthy();
  });

  it.each([1, 3])('localizes %s linked sessions/files and preserves target IDs and paths', count => {
    const view = render(localized(structured({ action: 'linked', trackerId: 'raw-target', type: 'task', title: 'Raw target', linkedCount: count }), 'en'));
    expect(screen.getByText(`(${count} ${count === 1 ? 'session' : 'sessions'})`)).toBeTruthy();
    view.rerender(localized(structured({ action: 'linked', trackerId: 'raw-target', type: 'task', title: 'Raw target', linkedCount: count })));
    expect(screen.getByText(`（セッション${count}件）`)).toBeTruthy();
    const dispatch = vi.spyOn(window, 'dispatchEvent');
    fireEvent.click(screen.getByText('Raw target'));
    expect((dispatch.mock.calls[0][0] as CustomEvent).detail).toEqual({ itemId: 'raw-target' });
    view.rerender(localized(structured({ action: 'linked_file', filePath: '/repo/raw.md', linkedCount: count })));
    expect(screen.getByText('ファイルをリンクしました')).toBeTruthy();
    expect(screen.getByText('/repo/raw.md')).toBeTruthy();
    expect(screen.getByText(`（合計${count}件のリンク）`)).toBeTruthy();
  });
});

describe('legacy and pending tracker results', () => {
  it.each([
    ['tracker_list', 'トラッカー一覧'], ['tracker_get', 'トラッカー項目の取得'], ['tracker_create', 'トラッカー項目の作成'],
    ['tracker_update', 'トラッカー項目の更新'], ['tracker_link_session', 'トラッカー項目のリンク'], ['tracker_link_file', 'ファイルのリンク'], ['future_tool', 'トラッカー'],
  ])('translates %s pending, fallback and error headers while retaining raw details', (name, label) => {
    const toolName = `mcp__nimbalyst__${name}`;
    const args = { type: 'bug', title: 'Pending title' };
    const view = render(localized(message(null, toolName, args)));
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText('Pending title')).toBeTruthy();
    view.rerender(localized(message('Raw legacy result', toolName, args)));
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText('Raw legacy result')).toBeTruthy();
    view.rerender(localized(message({ isError: true, content: [{ type: 'text', text: 'Raw service error' }] }, toolName)));
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText('Raw service error')).toBeTruthy();
  });

  it('keeps hooks stable across absent data and preserves empty-updates null rendering', () => {
    const msg = { ...message(null), toolCall: undefined };
    const view = render(localized(msg));
    expect(view.container.textContent).toBe('');
    view.rerender(localized(structured({ action: 'created', item })));
    expect(screen.getByText('Raw title')).toBeTruthy();
    view.rerender(localized(updated({})));
    expect(view.container.textContent).toBe('');
  });
});
