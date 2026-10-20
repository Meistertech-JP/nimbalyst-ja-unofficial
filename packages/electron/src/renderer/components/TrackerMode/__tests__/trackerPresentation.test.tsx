// @vitest-environment jsdom
import React, { type ComponentProps, useMemo } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import { TrackerTable, groupTrackerRecords, resolveColumnsForType, trackerDataLoadedAtom } from '@nimbalyst/runtime/plugins/TrackerPlugin';
import { globalRegistry, loadBuiltinTrackers } from '@nimbalyst/runtime/plugins/TrackerPlugin/models';
import {
  localizeTrackerColumns,
  trackerColumnLabel,
  trackerGroupLabel,
  trackerRelativeDate,
  trackerTypeLabel,
} from '../trackerPresentation';
import { createTrackerTablePresentation } from '../trackerRuntimePresentation';

beforeAll(() => loadBuiltinTrackers());
afterEach(async () => { cleanup(); globalRegistry.unregister('i18n-hybrid'); vi.restoreAllMocks(); await i18next.changeLanguage('en'); });

function record(id: string, fields: Record<string, unknown> = {}): TrackerRecord {
  return { id, primaryType: 'bug', typeTags: ['bug'], source: 'native', archived: false, syncStatus: 'local',
    system: { workspace: '/workspace', createdAt: '2026-09-18T11:00:00Z', updatedAt: '2026-09-18T11:00:00Z' },
    fields: { title: id, ...fields } } as TrackerRecord;
}

function LocalizedList({ items, ...props }: { items: TrackerRecord[] } & ComponentProps<typeof TrackerTable>) {
  const { t } = useTranslation(['tracker']);
  const presentation = useMemo(() => createTrackerTablePresentation(t), [t]);
  return <TrackerTable presentation={presentation} filterType="bug" hideTypeTabs hideToolbar overrideItems={items}
    columnConfig={{ visibleColumns: ['title', 'updated'], columnWidths: {}, groupBy: 'owner' }} {...props} />;
}

describe('tracker presentation without storage changes', () => {
  it('localizes builtin tracker type names while preserving custom labels and identifiers', () => {
    const t = i18next.getFixedT('ja');
    expect(trackerTypeLabel('plan', t)).toBe('プラン');
    expect(trackerTypeLabel('plan', t, true)).toBe('プラン');
    expect(trackerTypeLabel('milestone', t, true)).toBe('マイルストーン');
    expect(trackerTypeLabel('release', t, true)).toBe('リリース');
    expect(trackerTypeLabel('custom', t, true, 'Custom plural')).toBe('Custom plural');
  });

  it('localizes generated columns but preserves all identifiers, edit settings and custom captions', () => {
    const original = resolveColumnsForType('bug');
    const saved = structuredClone(original);
    const translated = localizeTrackerColumns(original, i18next.getFixedT('ja'));
    expect(translated.find(column => column.id === 'createdBy')?.label).toBe('作成者');
    expect(translated.find(column => column.id === 'title')?.label).toBe('タイトル');
    expect(translated.map(({ label: _label, ...column }) => column))
      .toEqual(original.map(({ label: _label, ...column }) => column));
    expect(original).toEqual(saved);
    const title = original.find(column => column.id === 'title')!;
    expect(trackerColumnLabel({ ...title, label: 'My headline' }, i18next.getFixedT('ja'))).toBe('My headline');
    expect(trackerColumnLabel({ ...title, id: 'customPhase', label: 'Custom Phase' }, i18next.getFixedT('ja'))).toBe('Custom Phase');
    expect(trackerColumnLabel({ ...title, builtin: false }, i18next.getFixedT('ja'))).toBe('Title');
  });

  it('localizes only empty grouping fallbacks, not user strings matching those fallbacks', () => {
    const t = i18next.getFixedT('ja');
    for (const field of ['status', 'priority', 'type', 'owner', 'assignee', 'customField']) {
      const empty = record('empty');
      if (field === 'type') empty.primaryType = '';
      const [group] = groupTrackerRecords([empty], field);
      const originalKey = group.key;
      expect(trackerGroupLabel(group, field, t)).toBe(['owner', 'assignee'].includes(field) ? '未割り当て' : 'なし');
      expect(group.key).toBe(originalKey);
      expect(group.items).toEqual([empty]);
    }
    const [explicitNone] = groupTrackerRecords([record('user', { status: 'None' })], 'status');
    expect(trackerGroupLabel(explicitNone, 'status', t)).toBe('None');
    const [mixed] = groupTrackerRecords([record('empty'), record('user', { owner: 'Unassigned' })], 'owner');
    expect(mixed.items).toHaveLength(2);
    expect(trackerGroupLabel(mixed, 'owner', t)).toBe('Unassigned');
    const [identity] = groupTrackerRecords([record('identity', { owner: { displayName: 'None' } })], 'owner');
    expect(trackerGroupLabel(identity, 'owner', t)).toBe('None');
  });

  it('keeps relative-date thresholds, invalid dates and long-date formatting unchanged', () => {
    const now = new Date('2026-09-18T12:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const t = i18next.getFixedT('ja');
    expect(trackerRelativeDate(new Date(0), t)).toBe('');
    expect(trackerRelativeDate(new Date('invalid'), t)).toBe('');
    expect(trackerRelativeDate(new Date(now + 60_000), t)).toBe('たった今');
    expect(trackerRelativeDate(new Date(now - 86_400_000), t)).toBe('昨日');
    expect(trackerRelativeDate(new Date(now - 7 * 86_400_000), t)).toBe('1週前');
    const oldDate = new Date(now - 30 * 86_400_000);
    expect(trackerRelativeDate(oldDate, t)).toBe(oldDate.toLocaleDateString());
  });

  it('updates the runtime list group header and date when the host language changes without changing records', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-18T12:00:00Z').getTime());
    const items = [record('Keep user title')];
    const snapshot = structuredClone(items);
    render(<LocalizedList items={items} />);
    expect(screen.getByTestId('tracker-table-group-header').textContent).toBe('Unassigned1');
    expect(screen.getByText('1h ago')).toBeTruthy();
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByTestId('tracker-table-group-header').textContent).toBe('未割り当て1');
    expect(screen.getByText('1時間前')).toBeTruthy();
    expect(screen.getByText('Keep user title')).toBeTruthy();
    expect(items).toEqual(snapshot);
  });

  it('localizes loading and empty-state instructions without translating command literals or new-item values', async () => {
    const store = createStore();
    const onNewItem = vi.fn();
    const { container, rerender } = render(<Provider store={store}><LocalizedList items={[]} onNewItem={onNewItem} /></Provider>);
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText('トラッカー項目を読み込み中…')).toBeTruthy();
    act(() => { store.set(trackerDataLoadedAtom, true); });
    expect(screen.getByText(/バグでは、修正が必要な問題や不具合を追跡します/)).toBeTruthy();
    expect(Array.from(container.querySelectorAll('code')).map(code => code.textContent)).toEqual(['#bug', '/track bug']);
    fireEvent.click(screen.getByText('新規バグ'));
    expect(onNewItem).toHaveBeenCalledWith('bug');
    rerender(<Provider store={store}><LocalizedList items={[]} filterType="plan" /></Provider>);
    expect(Array.from(container.querySelectorAll('code')).map(code => code.textContent)).toEqual(['/plan']);
    rerender(<Provider store={store}><LocalizedList items={[]} filterType="all" /></Provider>);
    expect(screen.getByText('トラッカー項目が見つかりません')).toBeTruthy();
    expect(screen.getByText('Markdownファイル内で#bug、#task、#plan、#ideaを使って項目を作成できます')).toBeTruthy();
  });

  it('keeps filter clearing and type-specific creation available in the translated filtered-empty state', async () => {
    const store = createStore();
    store.set(trackerDataLoadedAtom, true);
    const onClearFilters = vi.fn();
    const onNewItem = vi.fn();
    render(<Provider store={store}><LocalizedList items={[]} hasExternalFilters onClearFilters={onClearFilters} onNewItem={onNewItem} /></Provider>);
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText('フィルターに一致するトラッカー項目はありません')).toBeTruthy();
    fireEvent.click(screen.getByText('フィルターをクリア'));
    expect(onClearFilters).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('新規バグ'));
    expect(onNewItem).toHaveBeenCalledWith('bug');
  });

  it('localizes database, sharing, priority and favorite captions without changing record fields or favorite IDs', async () => {
    globalRegistry.register({ ...globalRegistry.get('bug')!, type: 'i18n-hybrid', sync: { mode: 'hybrid', scope: 'project' } });
    const items = [record('Team item', { shared: true, priority: 'high' }), record('Local item', { share: { status: 'private' } })]
      .map(item => ({ ...item, primaryType: 'i18n-hybrid' }));
    const snapshot = structuredClone(items);
    const onToggleFavorite = vi.fn();
    render(<LocalizedList items={items} filterType="i18n-hybrid" favoriteItemIds={new Set(['Team item'])} onToggleFavorite={onToggleFavorite}
      columnConfig={{ visibleColumns: ['title', 'module', 'shared', 'priority'], columnWidths: {}, groupBy: null }} />);
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getAllByTestId('tracker-source-db-badge').map(badge => badge.title))
      .toEqual(['データベースに保存されています', 'データベースに保存されています']);
    expect(screen.getAllByTestId('tracker-shared-badge').map(badge => [badge.title, badge.textContent]))
      .toEqual([['チームと共有中', 'group共有'], ['このデバイスのみ', 'personローカル']]);
    expect(screen.getByText('高')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('お気に入りから削除'));
    expect(onToggleFavorite).toHaveBeenCalledWith('Team item');
    expect(screen.getByLabelText('お気に入りに追加')).toBeTruthy();
    expect(items).toEqual(snapshot);
  });

  it('passes unchanged list selection to Japanese context actions and keeps cancel authoritative', async () => {
    const items = [record('one'), record('two')];
    const onCopyDeepLink = vi.fn();
    const onArchiveItems = vi.fn();
    const onDeleteItems = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<LocalizedList items={items} onCopyDeepLink={onCopyDeepLink} onArchiveItems={onArchiveItems} onDeleteItems={onDeleteItems} />);
    await act(async () => { await i18next.changeLanguage('ja'); });
    const row = screen.getAllByTestId('tracker-table-row')[0];
    row.scrollIntoView = vi.fn();
    fireEvent.contextMenu(row, { clientX: 20, clientY: 30 });
    expect(screen.getByText('1件を選択中')).toBeTruthy();
    expect(screen.getByText('ステータスを設定')).toBeTruthy();
    expect(screen.getByText('優先度を設定')).toBeTruthy();
    fireEvent.click(screen.getByTestId('tracker-row-context-copy-link'));
    expect(onCopyDeepLink).toHaveBeenCalledWith('one');
    fireEvent.contextMenu(row, { clientX: 20, clientY: 30 });
    fireEvent.click(screen.getByTestId('tracker-row-context-delete'));
    expect(confirm).toHaveBeenCalledWith('項目を1件削除しますか？この操作は取り消せません。');
    expect(onDeleteItems).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.contextMenu(row, { clientX: 20, clientY: 30 });
    fireEvent.click(screen.getByTestId('tracker-row-context-delete'));
    expect(onDeleteItems).toHaveBeenCalledWith(['one']);
    fireEvent.contextMenu(row, { clientX: 20, clientY: 30 });
    fireEvent.click(within(screen.getByTestId('tracker-row-context-menu')).getByText('アーカイブ'));
    expect(onArchiveItems).toHaveBeenCalledWith(['one'], true);
  });
});
