// @vitest-environment jsdom
/**
 * The view keeps its whole state in one host-held query string, and the
 * omnibox commits a filter as two updates in one tick (filters, then the
 * leftover search text). Both must survive.
 */
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { resources } from '@nimbalyst/i18n/resources';
import type { SavedView } from '@nimbalyst/collab-client/trackers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PagesSearchView } from '../PagesSearchView';
import { PagesTypesView } from '../PagesTypesView';
import { TrackerSavedViewsSection } from '../../TrackerSavedViewsSection';
import { TrackerFilterOmnibox } from '../../TrackerFilterOmnibox';

const testI18n = createInstance();
const testI18nReady = testI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources,
  ns: Object.keys(resources.en),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

vi.mock('../../useTrackerData', () => ({
  useTrackerDataSelector: (selector: (state: { records: unknown[]; loaded: boolean }) => unknown) => selector({ records: [], loaded: true }),
}));

const PAGES = [
  { documentId: 'doc-a', title: 'Alpha page', updatedAt: 2, fields: { tags: ['alpha'] } },
  { documentId: 'doc-b', title: 'Beta page', updatedAt: 1, fields: { tags: ['beta'] } },
];

function Host() {
  const [search, setSearch] = useState('');
  return (
    <PagesSearchView
      lane="team"
      pages={PAGES}
      typePlacements={[]}
      authorLabel={(author) => author}
      search={search}
      onSearchChange={(next) => setSearch(next)}
      onOpenPage={() => {}}
      onOpenItem={() => {}}
    />
  );
}

afterEach(cleanup);

beforeEach(async () => {
  await testI18nReady;
  await testI18n.changeLanguage('en');
});

describe('PagesSearchView', () => {
  it('localizes page search controls and retains the current search behavior', async () => {
    await act(async () => { await testI18n.changeLanguage('ja'); });
    render(<Host />, { wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider> });

    expect(screen.getByRole('heading', { name: '検索' })).toBeDefined();
    expect(screen.getByPlaceholderText('ページを検索、またはフィールド名を入力して絞り込み')).toBeDefined();
    expect(screen.getByRole('columnheader', { name: '名前' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: '更新日時' })).toBeDefined();
  });

  it('localizes relative page timestamps across live language changes', async () => {
    const updatedAt = Date.now() - 3 * 60_000;
    const { container } = render(
      <PagesSearchView
        lane="team"
        pages={[{ documentId: 'time-page', title: 'Timestamp page', updatedAt, fields: {} }]}
        typePlacements={[]}
        authorLabel={(author) => author}
        search=""
        onSearchChange={vi.fn()}
        onOpenPage={vi.fn()}
        onOpenItem={vi.fn()}
      />,
      { wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider> },
    );

    const timestamp = () => container.querySelector('.pages-search-row td:last-child');
    expect(timestamp()?.textContent).toBe('3m ago');
    await act(async () => { await testI18n.changeLanguage('ja'); });
    expect(timestamp()?.textContent).toBe('3分前');
    expect(screen.getByRole('columnheader', { name: '更新日時' })).toBeDefined();
    await act(async () => { await testI18n.changeLanguage('en'); });
    expect(timestamp()?.textContent).toBe('3m ago');
  });

  it('keeps a committed tag filter as a pill in the box and narrows the rows to it', () => {
    render(<Host />, { wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider> });
    const input = screen.getByTestId('tracker-filter-omnibox-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'tags:alpha' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.queryByText('Beta page')).toBeNull();
    screen.getByText('Alpha page');
    // The pill sits inside the search box, before the text.
    expect(screen.getByTestId('tracker-filter-omnibox-pill-0').closest('.tracker-filter-omnibox-box')).not.toBeNull();
  });

  it('localizes the default search placeholder and clear action without changing query behavior', async () => {
    await act(async () => {
      await testI18n.changeLanguage('ja');
    });
    const onSearchQueryChange = vi.fn();
    const onFiltersChange = vi.fn();
    const view = render(
      <TrackerFilterOmnibox
        searchQuery=""
        onSearchQueryChange={onSearchQueryChange}
        fields={[]}
        filters={null}
        onFiltersChange={onFiltersChange}
      />,
      { wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider> },
    );

    const input = screen.getByRole('combobox', { name: 'トラッカー項目を検索または絞り込み' });
    expect(input.getAttribute('placeholder')).toBe('検索、#でタグ検索、またはフィールド名で絞り込み…');
    fireEvent.change(input, { target: { value: '検索語' } });
    expect(onSearchQueryChange).toHaveBeenLastCalledWith('検索語');
    view.rerender(
      <TrackerFilterOmnibox
        searchQuery="検索語"
        onSearchQueryChange={onSearchQueryChange}
        fields={[]}
        filters={null}
        onFiltersChange={onFiltersChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '検索とフィルターをクリア' }));
    expect(onSearchQueryChange).toHaveBeenLastCalledWith('');
    expect(onFiltersChange).toHaveBeenCalled();
  });

  it('localizes Pages Types controls while preserving view switching and new-type behavior', async () => {
    await act(async () => { await testI18n.changeLanguage('ja'); });
    const onViewChange = vi.fn();
    const onOpenType = vi.fn();
    render(
      <PagesTypesView
        lane="team"
        typePlacements={[]}
        view="map"
        onViewChange={onViewChange}
        onOpenType={onOpenType}
        renderNewType={({ onClose }) => <button onClick={onClose}>close-new-type</button>}
      />,
      { wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider> },
    );

    expect(screen.getByRole('tablist', { name: 'タイプの表示形式' })).toBeDefined();
    expect(screen.getByText('チームのページタイプはまだありません。タイプを使うとページに共通のフィールドを設定でき、タイプページにはその一覧がテーブルで表示されます。')).toBeDefined();
    fireEvent.click(screen.getByRole('tab', { name: /テーブル$/ }));
    expect(onViewChange).toHaveBeenCalledWith('table');
    fireEvent.click(screen.getByRole('button', { name: /タイプを新規作成/ }));
    expect(screen.getByRole('button', { name: 'close-new-type' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'close-new-type' }));
    expect(screen.queryByRole('button', { name: 'close-new-type' })).toBeNull();
  });

  it('localizes saved-view labels and preserves apply, share, and delete actions', async () => {
    await act(async () => { await testI18n.changeLanguage('ja'); });
    const savedView = { id: 'view-1', name: 'Milestones', builtIn: false, shared: true } as SavedView;
    const onApplyView = vi.fn();
    const onToggleShareView = vi.fn();
    const onDeleteView = vi.fn();
    render(
      <TrackerSavedViewsSection
        savedViews={[savedView]}
        activeSavedViewId={null}
        isSharedLayout
        onApplyView={onApplyView}
        onToggleShareView={onToggleShareView}
        onDeleteView={onDeleteView}
      />,
      { wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider> },
    );

    expect(screen.getByText('保存済みビュー')).toBeTruthy();
    fireEvent.click(screen.getByTitle('表示を適用: Milestones'));
    fireEvent.click(screen.getByTitle('チームとの共有を停止'));
    fireEvent.click(screen.getByTitle('チーム全体から表示を削除'));
    expect(onApplyView).toHaveBeenCalledWith(savedView);
    expect(onToggleShareView).toHaveBeenCalledWith(savedView);
    expect(onDeleteView).toHaveBeenCalledWith(savedView);
  });
});
