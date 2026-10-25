// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import { loadBuiltinTrackers } from '@nimbalyst/runtime/plugins/TrackerPlugin/models';
import { globalRegistry } from '@nimbalyst/tracker-schema';

const { gridProps, gridElement, gridListeners, dispatchGridEvent } = vi.hoisted(() => ({
  gridProps: { current: null as Record<string, any> | null },
  gridElement: {} as Record<string, any>,
  gridListeners: new Map<string, Set<(event: { detail: any; preventDefault: () => void }) => void>>(),
  dispatchGridEvent: (type: string, detail: any) => {
    const event = { detail, preventDefault: vi.fn() };
    for (const listener of gridListeners.get(type) ?? []) listener(event);
    return event;
  },
}));

vi.mock('@revolist/react-datagrid', async () => {
  const React = await import('react');
  return {
    RevoGrid: React.forwardRef((props: Record<string, any>, ref) => {
      gridProps.current = props;
      Object.assign(gridElement, {
        componentOnReady: vi.fn(async () => gridElement),
        addEventListener: (
          type: string,
          listener: (event: { detail: any; preventDefault: () => void }) => void,
        ) => {
          const listeners = gridListeners.get(type) ?? new Set();
          listeners.add(listener);
          gridListeners.set(type, listeners);
        },
        removeEventListener: (
          type: string,
          listener: (event: { detail: any; preventDefault: () => void }) => void,
        ) => {
          gridListeners.get(type)?.delete(listener);
        },
      });
      React.useImperativeHandle(ref, () => gridElement);
      return <div data-testid="mock-revogrid" />;
    }),
  };
});

vi.mock('@nimbalyst/runtime/plugins/TrackerPlugin/components/useTrackerRows', () => {
  return {
    // Only the edit path is under test here; the rest of the hook's surface is
    // stubbed so the grid's context menu renders closed.
    useTrackerRows: () => ({
      handleItemUpdate: vi.fn(),
      isItemEditable: () => true,
      containerRef: { current: null },
      selectedIds: new Set<string>(),
      setSelectedIds: vi.fn(),
      contextAnchor: null,
      contextRefs: { setFloating: vi.fn(), setReference: vi.fn() },
      contextFloatingStyles: {},
      openContextMenuForIds: vi.fn(),
      closeContextMenu: vi.fn(),
      handleBulkStatusUpdate: vi.fn(),
      handleBulkPriorityUpdate: vi.fn(),
      handleAddSelectionToCollection: vi.fn(),
      statusOptionsForBulk: [],
    }),
  };
});

import { TrackerGridView } from '../TrackerGridView';
import { TrackerGridSurface } from '../../../../../../collab-client/src/trackers-ui/grid/TrackerGridSurface';

function record(id: string, status: string): TrackerRecord {
  return {
    id,
    primaryType: 'bug',
    typeTags: ['bug'],
    issueKey: id.toUpperCase(),
    source: 'native',
    archived: false,
    syncStatus: 'local',
    system: {
      workspace: '/ws',
      createdAt: '2026-07-25T00:00:00.000Z',
      updatedAt: '2026-07-25T00:00:00.000Z',
    },
    fields: { title: id, status, priority: 'medium' },
  };
}

describe('TrackerGridView grouping', () => {
  beforeAll(() => loadBuiltinTrackers());

  beforeEach(() => {
    gridProps.current = null;
    gridListeners.clear();
  });

  it('rebuilds desktop grid date text and exact titles on en → ja → en switching', async () => {
    const i18n = await createI18nInstance('en');
    i18n.addResource('en', 'tracker', 'grid.open_details', 'Open details');
    i18n.addResource('ja', 'tracker', 'grid.open_details', '詳細を開く');
    const date = new Date(Date.now() - 3 * 3_600_000);
    const recent = record('recent-date', 'in-progress');
    recent.system.updatedAt = date.toISOString();
    recent.system.lastIndexed = date.toISOString();
    render(
      <I18nextProvider i18n={i18n}>
        <TrackerGridView filterType="bug" overrideItems={[recent]}
          onItemSelect={vi.fn()} onOpenDocument={vi.fn()} onColumnFiltersChange={vi.fn()}
          columnConfig={{ visibleColumns: ['key', 'updated'], columnWidths: {} }} />
      </I18nextProvider>,
    );
    const h = (tag: string, props: { title?: string }, text: string) => {
      const node = document.createElement(tag);
      node.textContent = text;
      if (props.title) node.title = props.title;
      return node;
    };
    for (const locale of ['en', 'ja', 'en'] as const) {
      await act(async () => { await i18n.changeLanguage(locale); });
      await waitFor(() => {
        const column = gridProps.current?.columns?.find((candidate: { prop: string }) => candidate.prop === 'updated');
        expect(column).toBeDefined();
        expect(column.name).toBe(i18n.t('columns.updated', { ns: 'tracker' }));
        // Run the real template passed by TrackerGridView, not a rebuilt test column.
        const node = column.cellTemplate(h, { model: gridProps.current?.source[0] }) as HTMLElement;
        expect(node.textContent).toBe(locale === 'ja' ? '3時間前' : '3h ago');
        expect(node.title).toBe(date.toLocaleString(locale, {
          month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
        }));
        const vnode = (tag: string, props: any, children: any): any => ({ tag, props, children });
        const keyColumn = gridProps.current?.columns.find((candidate: { prop: string }) => candidate.prop === 'key');
        const keyCell = keyColumn.cellTemplate(vnode, { model: gridProps.current?.source[0] });
        expect(keyCell.children[0].props.title).toBe(locale === 'ja' ? '詳細を開く' : 'Open details');
        expect(keyCell.children[1].props['aria-label']).toBe(locale === 'ja' ? 'ドキュメントを開く' : 'Open document');
        const actions = gridProps.current?.columns.at(-1).cellTemplate(vnode);
        expect(actions.props['aria-label']).toBe(locale === 'ja' ? '項目の操作' : 'Item actions');
        const header = column.columnTemplate(vnode);
        expect(header.children[1].children[0].props.title).toBe(i18n.t('grid.filter_column', { ns: 'tracker', column: column.name }));
      });
    }
  });

  it.each(['desktop', 'shared'] as const)('%s preserves explicit schema labels while re-localizing raw structural and standard columns', async (surface) => {
    const i18n = await createI18nInstance('en');
    const model = globalRegistry.get('bug')!;
    const type = 'grid-custom-label-regression';
    globalRegistry.register({
      ...model, type,
      fields: model.fields.map(field => field.name === 'status' ? { ...field, displayLabel: 'Status' } : field),
    });
    try {
      render(<I18nextProvider i18n={i18n}>
        {surface === 'desktop'
          ? <TrackerGridView filterType={type} overrideItems={[{ ...record('custom', 'open'), primaryType: type }]}
              onColumnFiltersChange={vi.fn()}
              columnConfig={{ visibleColumns: ['status', 'priority', 'createdBy', 'updatedBy'], columnWidths: {} }} />
          : <TrackerGridSurface trackerType={type} rows={[{ ...record('custom', 'open'), primaryType: type }]} loaded
              onColumnFiltersChange={vi.fn()}
              columnConfig={{ visibleColumns: ['status', 'priority', 'createdBy', 'updatedBy'], columnWidths: {} }} />}
      </I18nextProvider>);
      for (const locale of ['en', 'ja', 'en'] as const) {
        await act(async () => { await i18n.changeLanguage(locale); });
        await waitFor(() => {
          const columns = gridProps.current?.columns;
          expect(columns?.find((column: { prop: string }) => column.prop === 'status').name).toBe('Status');
          for (const prop of ['priority', 'createdBy', 'updatedBy']) {
            expect(columns?.find((column: { prop: string }) => column.prop === prop).name)
              .toBe(i18n.t(`columns.${prop}`, { ns: 'tracker' }));
          }
          const priority = columns?.find((column: { prop: string }) => column.prop === 'priority');
          const vnode = (tag: string, props: any, children: any): any => ({ tag, props, children });
          const header = priority.columnTemplate(vnode);
          expect(header.children[1].children[0].props.title).toBe(i18n.t('grid.filter_column', {
            ns: 'tracker', column: i18n.t('columns.priority', { ns: 'tracker' }),
          }));
        });
      }
    } finally {
      globalRegistry.unregister(type);
    }
  });

  it('passes the Display Options grouping field and readable labels to RevoGrid', async () => {
    render(
      <TrackerGridView
        filterType="bug"
        groupBy="status"
        overrideItems={[
          record('bug-1', 'in-progress'),
          record('bug-2', 'done'),
        ]}
        columnConfig={{
          visibleColumns: ['title', 'status', 'priority'],
          columnWidths: {},
        }}
      />,
    );

    await waitFor(() => expect(gridProps.current).not.toBeNull());
    expect(gridProps.current?.grouping).toEqual({
      props: ['__trackerGroupKey'],
      expandedAll: true,
      groupLabelTemplate: expect.any(Function),
    });
    expect(gridProps.current?.source.map((row: Record<string, unknown>) => row.__trackerGroupLabel))
      .toEqual(['In Progress', 'Done']);
  });

  it('keeps types with the same display name in distinct grid groups', async () => {
    const model = { ...globalRegistry.get('bug')!, type: 'same-label-a', displayNamePlural: 'Issues' };
    globalRegistry.register(model);
    globalRegistry.register({ ...model, type: 'same-label-b' });
    try {
      render(<TrackerGridView groupBy="type" overrideItems={[
        { ...record('a', 'open'), primaryType: model.type },
        { ...record('b', 'open'), primaryType: 'same-label-b' },
      ]} columnConfig={{ visibleColumns: ['title'], columnWidths: {} }} />);
      await waitFor(() => expect(gridProps.current).not.toBeNull());
      const { source, grouping } = gridProps.current!;
      const keys = source.map((row: Record<string, unknown>) => row[grouping.props[0]]);
      expect(new Set(keys).size).toBe(2);
      expect(keys.map((name: string) => grouping.groupLabelTemplate(vi.fn(), { name, expanded: true })[1])).toEqual(['Issues', 'Issues']);
    } finally {
      globalRegistry.unregister(model.type);
      globalRegistry.unregister('same-label-b');
    }
  });
});

describe('TrackerGridView sorting', () => {
  beforeAll(() => loadBuiltinTrackers());

  beforeEach(() => {
    gridProps.current = null;
    gridListeners.clear();
  });

  it('uses RevoGrid header sorting while synchronizing the shared view state', async () => {
    const onSortChange = vi.fn();
    render(
      <TrackerGridView
        filterType="bug"
        overrideItems={[
          record('bug-1', 'in-progress'),
          record('bug-2', 'done'),
        ]}
        sortBy="status"
        sortDirection="desc"
        onSortChange={onSortChange}
        columnConfig={{
          visibleColumns: ['title', 'status', 'priority'],
          columnWidths: {},
        }}
      />,
    );

    await waitFor(() => expect(gridElement.columns).toEqual(expect.arrayContaining([
      expect.objectContaining({ prop: 'status', sortable: true }),
    ])));
    const statusColumn = gridElement.columns.find(
      (column: Record<string, unknown>) => column.prop === 'status',
    );

    expect(statusColumn.sortable).toBe(true);
    expect(gridProps.current?.sorting).toEqual({
      columns: [{ prop: 'status', order: 'desc' }],
    });

    let sortEvent: ReturnType<typeof dispatchGridEvent>;
    act(() => {
      sortEvent = dispatchGridEvent('beforesorting', {
        column: statusColumn,
        order: 'asc',
        additive: false,
      });
    });

    expect(sortEvent!.preventDefault).toHaveBeenCalledOnce();
    expect(onSortChange).toHaveBeenCalledWith('status', 'asc');
  });
});
