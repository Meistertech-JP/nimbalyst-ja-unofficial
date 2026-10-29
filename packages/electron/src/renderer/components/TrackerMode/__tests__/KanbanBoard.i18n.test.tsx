// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { SessionMeta } from '@nimbalyst/runtime';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import { loadBuiltinTrackers } from '@nimbalyst/runtime/plugins/TrackerPlugin/models';
import { trackerItemsMapAtom } from '@nimbalyst/runtime/plugins/TrackerPlugin/trackerDataAtoms';
import { KanbanBoard } from '../KanbanBoard';
import { KanbanBoardSelectionBar } from '../KanbanBoardSelectionBar';
import { SessionKanbanBoard } from '../SessionKanbanBoard';
import { sessionProcessingAtom, sessionRegistryAtom } from '../../../store/atoms/sessions';

beforeAll(() => {
  loadBuiltinTrackers();
});
afterEach(cleanup);

describe('KanbanBoard localization', () => {
  it('switches builtin lane headings while retaining the raw lane order, values and cards', async () => {
    const i18n = await createI18nInstance('en');
    const plan = {
      id: 'localized-lane-plan', primaryType: 'plan', typeTags: ['plan'], source: 'native', archived: false, syncStatus: 'local',
      system: { workspace: '/test', createdAt: '', updatedAt: '' },
      fields: { title: 'User plan title', status: 'in-development', priority: 'medium' },
    } as TrackerRecord;
    const before = JSON.stringify(plan);
    const { container } = render(<UiLanguageProvider i18n={i18n} preference="en" systemLocale="en"><KanbanBoard filterType="plan" overrideItems={[plan]} /></UiLanguageProvider>);
    const lanes = () => [...container.querySelectorAll('[data-column-key]')];
    const keys = lanes().map(lane => lane.getAttribute('data-column-key'));
    const heading = () => container.querySelector('[data-column-key="in-development"] .font-semibold.text-nim.truncate');
    for (const language of ['ja', 'en', 'ja']) {
      await act(() => i18n.changeLanguage(language));
      expect(heading()?.textContent).toBe(language === 'ja' ? '開発中' : 'In Development');
      expect(lanes().map(lane => lane.getAttribute('data-column-key'))).toEqual(keys);
      // virtua does not mount offscreen cards in jsdom; the lane's count still
      // comes from the unchanged membership calculation, not the display label.
      expect(container.querySelector('[data-column-key="in-development"] .text-nim-faint.ml-auto')?.textContent).toBe('1');
    }
    expect(JSON.stringify(plan)).toBe(before);
  });

  it('renders the empty state in Japanese', async () => {
    const i18n = await createI18nInstance('ja');

    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <KanbanBoard filterType="all" overrideItems={[]} />
      </UiLanguageProvider>,
    );

    expect(screen.getByText('表示する項目はありません')).toBeDefined();
  });

  it('renders the selection bar and milestone actions in Japanese', async () => {
    const i18n = await createI18nInstance('ja');
    const plan = {
      id: 'plan-ja',
      primaryType: 'plan',
      typeTags: ['plan'],
      source: 'native',
      archived: false,
      syncStatus: 'local',
      system: { workspace: '/ws', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      fields: { title: '計画' },
    } as unknown as TrackerRecord;
    const milestone = {
      ...plan,
      id: 'milestone-ja',
      primaryType: 'milestone',
      typeTags: ['milestone'],
      fields: { title: 'マイルストーン' },
    } as unknown as TrackerRecord;
    const store = createStore();
    store.set(trackerItemsMapAtom, new Map([[plan.id, plan], [milestone.id, milestone]]));
    const onClearSelection = vi.fn();

    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <Provider store={store}>
          <KanbanBoardSelectionBar items={[plan]} onClearSelection={onClearSelection} />
        </Provider>
      </UiLanguageProvider>,
    );

    expect(screen.getByText('1件を選択中')).toBeDefined();
    expect(screen.getByText('Shift+クリックで範囲選択')).toBeDefined();
    fireEvent.click(screen.getByTestId('tracker-board-bulk-milestone-button'));
    expect(screen.getByText('1件の項目を次に割り当て')).toBeDefined();
    expect(screen.getByTestId('tracker-board-bulk-milestone-clear').textContent).toContain('マイルストーンから削除');
    fireEvent.click(screen.getByTestId('tracker-board-clear-selection'));
    expect(onClearSelection).toHaveBeenCalledOnce();
  });

  it('renders session run states and relative time in Japanese', async () => {
    const i18n = await createI18nInstance('ja');
    const updatedAt = Date.now();
    const parent = {
      id: 'workstream-ja',
      title: '作業セッション',
      createdAt: updatedAt,
      updatedAt,
      phase: 'implementing',
      sessionType: 'workstream',
      childCount: 1,
      uncommittedCount: 0,
      tags: [],
    } as unknown as SessionMeta;
    const child = {
      ...parent,
      id: 'child-ja',
      parentSessionId: parent.id,
      sessionType: 'session',
      childCount: 0,
    } as unknown as SessionMeta;
    const store = createStore();
    store.set(sessionRegistryAtom, new Map([[parent.id, parent], [child.id, child]]));
    store.set(sessionProcessingAtom(child.id), true);

    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <Provider store={store}>
          <SessionKanbanBoard />
        </Provider>
      </UiLanguageProvider>,
    );

    const card = screen.getByTestId('session-kanban-card');
    expect(card.textContent).toContain('1件実行中');
    expect(card.textContent).toContain('1件のセッション');
    expect(card.textContent).toContain('たった今');
    expect(card.textContent).not.toContain('running');
    expect(card.textContent).not.toContain('just now');
    expect(screen.getByTestId('kanban-toggle-complete').textContent).toContain('完了');
  });
});
