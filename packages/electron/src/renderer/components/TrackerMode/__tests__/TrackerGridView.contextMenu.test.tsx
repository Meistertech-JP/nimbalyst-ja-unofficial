// @vitest-environment jsdom
/**
 * The RevoGrid table replaced the hand-rolled one as the `table` view mode, so
 * it has to carry that view's bulk row actions. Selection lives in RevoGrid's
 * cell range, which these cover: a right-click inside the range acts on every
 * row in it, and a right-click outside it acts on the clicked row alone.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import { loadBuiltinTrackers } from '@nimbalyst/runtime/plugins/TrackerPlugin/models';

const { selectedRange, gridElement } = vi.hoisted(() => ({
  selectedRange: { current: null as { y: number; y1: number } | null },
  gridElement: {} as Record<string, any>,
}));

// JSDOM has no menu layout; avoid its CSS :has()/arbitrary-class selector bug
// during Floating UI measurements. Real menu captions and action handlers run.
vi.mock('@floating-ui/react', async importOriginal => {
  const actual = await importOriginal<typeof import('@floating-ui/react')>();
  const React = await import('react');
  return {
    ...actual,
    useFloating: () => ({
      refs: React.useMemo(() => ({ setReference: vi.fn(), setFloating: vi.fn() }), []),
      floatingStyles: {},
    }),
  };
});

vi.mock('@revolist/react-datagrid', async () => {
  const React = await import('react');
  return {
    RevoGrid: React.forwardRef((props: Record<string, any>, ref) => {
      Object.assign(gridElement, {
        getSelectedRange: async () => selectedRange.current,
        getFocused: async () => null,
        componentOnReady: async () => gridElement,
        addEventListener: () => {},
        removeEventListener: () => {},
      });
      React.useImperativeHandle(ref, () => gridElement);
      // Stand-in for RevoGrid's rendered cells: only `data-rgrow` matters here.
      return (
        <div data-testid="mock-revogrid">
          {(props.source ?? []).map((_row: unknown, index: number) => (
            <div key={index} data-rgrow={String(index)} data-testid={`mock-row-${index}`}>
              row {index}
            </div>
          ))}
        </div>
      );
    }),
  };
});

import { TrackerGridView } from '../TrackerGridView';

afterEach(async () => { cleanup(); vi.restoreAllMocks(); await i18next.changeLanguage('en'); });

function record(id: string): TrackerRecord {
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
      createdAt: '2026-07-23T00:00:00.000Z',
      updatedAt: '2026-07-23T00:00:00.000Z',
    },
    fields: { title: `Title ${id}`, status: 'to-do' },
  } as TrackerRecord;
}

const ITEMS = [record('bug-1'), record('bug-2')];

function renderGrid(overrides: Record<string, unknown> = {}) {
  return render(
    <TrackerGridView
      filterType="bug"
      overrideItems={ITEMS}
      columnConfig={{ visibleColumns: ['title', 'status'], columnWidths: {}, groupBy: null }}
      {...overrides}
    />,
  );
}

/** Right-click a mock row; the handler resolves the selection asynchronously. */
function rightClickRow(index: number): void {
  fireEvent.contextMenu(screen.getByTestId(`mock-row-${index}`), {
    clientX: 40,
    clientY: 60,
  });
}

describe('TrackerGridView row context menu', () => {
  beforeAll(() => loadBuiltinTrackers());

  beforeEach(() => {
    selectedRange.current = null;
    (window as any).electronAPI = { documentService: { updateTrackerItem: vi.fn() } };
  });

  it('acts on the clicked row when the click lands outside the selected range', async () => {
    const onArchiveItems = vi.fn();
    renderGrid({ onArchiveItems });

    selectedRange.current = { y: 0, y1: 0 };
    rightClickRow(1);

    await waitFor(() => expect(screen.getByTestId('tracker-row-context-menu')).toBeTruthy());
    expect(screen.getByText('1 item selected')).toBeTruthy();

    fireEvent.click(screen.getByTestId('tracker-row-context-archive'));
    expect(onArchiveItems).toHaveBeenCalledWith(['bug-2'], true);
  });

  it('acts on every row of the selected range when the click lands inside it', async () => {
    const onDeleteItems = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderGrid({ onDeleteItems });

    selectedRange.current = { y: 0, y1: 1 };
    rightClickRow(1);

    await waitFor(() => expect(screen.getByText('2 items selected')).toBeTruthy());

    fireEvent.click(screen.getByTestId('tracker-row-context-delete'));
    expect(onDeleteItems).toHaveBeenCalledWith(['bug-1', 'bug-2']);
    confirmSpy.mockRestore();
  });

  it('updates an open bulk menu in Japanese while preserving action values, selection and cancellation', async () => {
    const onDeleteItems = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderGrid({ onDeleteItems });
    selectedRange.current = { y: 0, y1: 1 };
    rightClickRow(1);
    await waitFor(() => expect(screen.getByText('2 items selected')).toBeTruthy());
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText('2件を選択中')).toBeTruthy();
    fireEvent.mouseEnter(screen.getByText('優先度を設定').parentElement!.parentElement!);
    fireEvent.click(await screen.findByText('重大'));
    await waitFor(() => expect(window.electronAPI.documentService.updateTrackerItem).toHaveBeenCalledWith(expect.objectContaining({
      itemId: 'bug-1', updates: { priority: 'critical' },
    })));
    expect(window.electronAPI.documentService.updateTrackerItem).toHaveBeenCalledWith(expect.objectContaining({
      itemId: 'bug-2', updates: { priority: 'critical' },
    }));
    rightClickRow(1);
    await screen.findByText('2件を選択中');
    fireEvent.click(screen.getByTestId('tracker-row-context-delete'));
    expect(confirmSpy).toHaveBeenCalledWith('項目を2件削除しますか？この操作は取り消せません。');
    expect(onDeleteItems).not.toHaveBeenCalled();
    confirmSpy.mockReturnValue(true);
    rightClickRow(1);
    await screen.findByText('2件を選択中');
    fireEvent.click(screen.getByTestId('tracker-row-context-delete'));
    expect(onDeleteItems).toHaveBeenCalledWith(['bug-1', 'bug-2']);
  });

  it('offers the deep link only for a single-row selection', async () => {
    const onCopyDeepLink = vi.fn();
    renderGrid({ onCopyDeepLink });

    selectedRange.current = { y: 0, y1: 1 };
    rightClickRow(0);
    await waitFor(() => expect(screen.getByText('2 items selected')).toBeTruthy());
    expect(screen.queryByTestId('tracker-row-context-copy-link')).toBeNull();

    selectedRange.current = null;
    rightClickRow(0);
    await waitFor(() => expect(screen.getByText('1 item selected')).toBeTruthy());
    fireEvent.click(screen.getByTestId('tracker-row-context-copy-link'));
    expect(onCopyDeepLink).toHaveBeenCalledWith('bug-1');
  });

  it('ignores a right-click that is not over a row', async () => {
    renderGrid({ onDeleteItems: vi.fn() });

    // Inside the grid canvas but below no row -- e.g. the empty space under the
    // last row, where a menu of bulk actions would have nothing to act on.
    fireEvent.contextMenu(screen.getByTestId('mock-revogrid'), { clientX: 5, clientY: 5 });

    await Promise.resolve();
    expect(screen.queryByTestId('tracker-row-context-menu')).toBeNull();
  });
});

describe('TrackerGridView favorites', () => {
  beforeAll(() => loadBuiltinTrackers());

  it('renders a star in the title cell that toggles without focusing the row', async () => {
    const onToggleFavorite = vi.fn();
    const onItemSelect = vi.fn();
    renderGrid({
      onToggleFavorite,
      onItemSelect,
      favoriteItemIds: new Set(['bug-1']),
    });

    await waitFor(() => expect(gridElement.columns).toBeTruthy());
    const title = (gridElement.columns as Array<Record<string, any>>)
      .find(column => column.prop === 'title')!;

    const h = (tag: string, props: Record<string, unknown>, children: unknown) => ({
      tag,
      props,
      children,
    });
    const cell = title.cellTemplate(h, {
      model: { __trackerItemId: 'bug-1', title: 'Title bug-1' },
    });
    const star = cell.children[0];
    expect(star.props.class).toContain('is-favorite');

    const stop = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    star.props.onPointerDown(stop);
    expect(stop.stopPropagation).toHaveBeenCalled();

    star.props.onClick({ preventDefault: vi.fn(), stopPropagation: vi.fn() });
    expect(onToggleFavorite).toHaveBeenCalledWith('bug-1');
  });

  it('omits the star when the surface does not support favorites', async () => {
    renderGrid({});

    await waitFor(() => expect(gridElement.columns).toBeTruthy());
    const title = (gridElement.columns as Array<Record<string, any>>)
      .find(column => column.prop === 'title')!;
    const h = (tag: string, props: Record<string, unknown>, children: unknown) => ({
      tag,
      props,
      children,
    });
    const cell = title.cellTemplate(h, {
      model: { __trackerItemId: 'bug-1', title: 'Title bug-1' },
    });

    expect(cell.props.class).toBe('tracker-grid-cell-text');
  });
});
