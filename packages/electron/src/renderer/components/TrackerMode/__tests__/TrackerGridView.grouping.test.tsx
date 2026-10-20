// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import { loadBuiltinTrackers } from '@nimbalyst/runtime/plugins/TrackerPlugin/models';

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

vi.mock('@nimbalyst/runtime/plugins/TrackerPlugin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nimbalyst/runtime/plugins/TrackerPlugin')>();
  return {
    ...actual,
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

afterEach(async () => { cleanup(); await i18next.changeLanguage('en'); });

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

  it('passes the Display Options grouping field and readable labels to RevoGrid', async () => {
    render(
      <TrackerGridView
        filterType="bug"
        overrideItems={[
          record('bug-1', 'in-progress'),
          record('bug-2', 'done'),
        ]}
        columnConfig={{
          visibleColumns: ['title', 'status', 'priority'],
          columnWidths: {},
          groupBy: 'status',
        }}
      />,
    );

    await waitFor(() => expect(gridProps.current).not.toBeNull());
    expect(gridProps.current?.grouping).toEqual({
      props: ['__trackerGroupLabel'],
      expandedAll: true,
    });
    expect(gridProps.current?.source.map((row: Record<string, unknown>) => row.__trackerGroupLabel))
      .toEqual(['In Progress', 'Done']);
  });

  it('localizes only group captions and column headings while keeping the group key and row order stable', async () => {
    const items = [record('missing', ''), record('working', 'in-progress')];
    render(<TrackerGridView filterType="bug" overrideItems={items}
      columnConfig={{ visibleColumns: ['title', 'status', 'priority'], columnWidths: {}, groupBy: 'status' }} />);
    await waitFor(() => expect(gridProps.current).not.toBeNull());
    const originalRows = gridProps.current?.source;
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(gridProps.current?.source).toEqual(originalRows);
    expect(gridProps.current?.source.map((row: Record<string, unknown>) => row.__trackerGroupLabel)).toEqual(['None', 'In Progress']);
    expect(gridProps.current?.columns.map((column: Record<string, unknown>) => [column.prop, column.name]))
      .toEqual([['title', 'タイトル'], ['status', 'ステータス'], ['priority', '優先度']]);
    const h = (tag: string, props: Record<string, unknown>, children: unknown) => ({ tag, props, children });
    const template = gridProps.current?.grouping.groupLabelTemplate;
    const rendered = template(h, { name: 'None', hasExpand: true, expanded: false });
    expect(rendered[0].props.class).toBe('group-expand');
    expect(rendered[1].children).toBe('なし');
    const stopPropagation = vi.fn();
    rendered[1].props.onClick({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(template(h, { name: 'In Progress', hasExpand: true, expanded: true })[1].children).toBe('In Progress');
    expect(template(h, { name: 'None', hasExpand: false })).toBeNull();
    expect(items[0].fields.status).toBe('');
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
          groupBy: null,
        }}
      />,
    );

    await waitFor(() => expect(gridElement.columns).toHaveLength(3));
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
