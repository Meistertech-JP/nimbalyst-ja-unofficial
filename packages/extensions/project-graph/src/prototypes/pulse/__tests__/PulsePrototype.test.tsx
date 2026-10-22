import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { ReactNode } from 'react';
import type {
  PrototypeArea,
  PrototypeEvent,
  PrototypeMembership,
  PrototypeModel,
  PrototypeViewProps,
} from '../../contracts';
import type { ProjectGraphNode } from '../../../types';
import { PulsePrototype } from '../PulsePrototype';

const DAY = (day: number, hour = 10) => new Date(2026, 8, day, hour, 0, 0, 0).getTime();
const RANGE = {
  startMs: new Date(2026, 8, 1, 0, 0, 0, 0).getTime(),
  endMs: new Date(2026, 8, 5, 23, 59, 59, 999).getTime(),
};
const PREVIOUS = {
  startMs: new Date(2026, 7, 27, 0, 0, 0, 0).getTime(),
  endMs: new Date(2026, 7, 31, 23, 59, 59, 999).getTime(),
};

function node(id: string, extra: Partial<ProjectGraphNode> = {}): ProjectGraphNode {
  return {
    id,
    type: 'task',
    label: `Node ${id}`,
    category: 'delivery',
    source: 'tracker',
    visibility: 'local',
    ...extra,
  };
}

function event(id: string, nodeId: string, at: number): PrototypeEvent {
  return { id, nodeId, at, kind: 'commit', label: `commit on ${nodeId}`, provenance: 'recorded' };
}

const AREAS: PrototypeArea[] = [
  { id: 'editor', label: 'Editor Experience', nodeIds: ['a'], basis: 'tag:editor' },
  { id: 'collab', label: 'Collaboration', nodeIds: ['b'], basis: 'tag:collab' },
  { id: 'quiet', label: 'Customer Learning', nodeIds: ['c'], basis: 'tag:crm' },
];

function makeModel(): PrototypeModel {
  const nodes = [node('a'), node('b'), node('c')];
  const memberships = new Map<string, PrototypeMembership[]>();
  for (const area of AREAS) {
    for (const id of area.nodeIds) memberships.set(id, [{ areaId: area.id, basis: area.basis }]);
  }
  return {
    snapshot: {
      generatedAt: DAY(6, 12),
      nodes,
      edges: [],
      stats: { nodeCount: nodes.length, edgeCount: 0, countsByType: {} },
    },
    nodeById: new Map(nodes.map((n) => [n.id, n])),
    areas: AREAS,
    memberships,
    events: [
      event('c1', 'a', DAY(2)),
      event('c2', 'b', DAY(3)),
      event('p1', 'a', new Date(2026, 7, 29, 10).getTime()),
    ],
    coverage: ['sample coverage note'],
    source: 'sample',
    periodCoverage: { startMs: PREVIOUS.startMs, endMs: RANGE.endMs, complete: true },
  };
}

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

function renderPulse(
  over: Partial<PrototypeViewProps> = {},
  i18n = englishI18n,
) {
  const props: PrototypeViewProps = {
    model: makeModel(),
    range: RANGE,
    selectedAreaId: null,
    selectedNodeId: null,
    onSelectArea: vi.fn(),
    onSelectNode: vi.fn(),
    onOpenNode: vi.fn(),
    onNavigate: vi.fn(),
    onRenameArea: vi.fn(),
    ...over,
  };
  const withEnglishUi = (ui: ReactNode) => (
    <UiLanguageProvider i18n={i18n} preference={i18n.language === 'ja' ? 'ja' : 'en'} systemLocale="en-US">
      {ui}
    </UiLanguageProvider>
  );
  return {
    props,
    withEnglishUi,
    ...render(withEnglishUi(<PulsePrototype {...props} />)),
  };
}

describe('PulsePrototype layout inputs', () => {
  /**
   * An inline custom property beats every stylesheet rule, so the column-count
   * metrics and the container-width metrics cannot share a variable name: the
   * responsive floor would never win. The component writes its own `-fit`
   * names and the stylesheet combines the two.
   */
  it('writes column-count metrics under names the stylesheet can still narrow', () => {
    const { container } = renderPulse();
    const grid = container.querySelector('.pgp-grid') as HTMLElement;

    expect(grid.style.getPropertyValue('--pgp-cell-min-fit')).toBe('56px');
    expect(grid.style.getPropertyValue('--pgp-cell-min')).toBe('');
    expect(grid.style.getPropertyValue('--pgp-cell-h')).toBe('');
    expect(grid.style.getPropertyValue('--pgp-cell-font')).toBe('');
  });

  it('puts the responsive layout on a descendant of the query container', () => {
    // `@container` never matches the element that declares the container, so
    // every responsive rule has to have something inside it to style.
    const { container } = renderPulse();
    const root = container.querySelector('.pgp-pulse') as HTMLElement;

    expect(root.querySelector(':scope > .pgp-shell')).toBeTruthy();
  });
});

describe('PulsePrototype comparison', () => {
  it('shows the preceding period the shell supplied, with its delta', () => {
    renderPulse({ comparisonRange: PREVIOUS });
    const compare = screen.getByLabelText('Period comparison');

    expect(within(compare).getByText(/2 events across 2 artifacts/)).toBeTruthy();
    expect(within(compare).getByText(/1 events across 1 artifacts/)).toBeTruthy();
    expect(within(compare).getByText(/\+1 events/)).toBeTruthy();
  });

  it('offers no comparison at all when the shell supplies no preceding period', () => {
    renderPulse();
    expect(screen.queryByLabelText('Period comparison')).toBeNull();
  });

  it('names the exact interval it compared against, and does not call it a calendar period', () => {
    renderPulse({ comparisonRange: PREVIOUS });
    const compare = screen.getByLabelText('Period comparison');

    // Day-aligned, so no time of day is printed.
    const bounds = within(compare).getByLabelText('Preceding interval');
    expect(bounds.textContent).not.toMatch(/\d{1,2}:\d{2}/);
    expect(within(compare).getByText(/exact preceding interval, not a calendar period/i)).toBeTruthy();
    // No copy that *asserts* a calendar period; the disclaimer denying one is
    // the only place the word may appear.
    expect(compare.textContent).not.toMatch(/last week|previous week|last month/i);
    expect(compare.textContent).not.toMatch(/(?<!not a )calendar (period|week|month)/i);
  });

  it('prints the time of day when the preceding interval does not sit on day boundaries', () => {
    // A range that is still running gives a comparison window starting mid-day;
    // showing only the date would imply a whole day it does not cover.
    const partial = {
      startMs: new Date(2026, 8, 3, 14, 30).getTime(),
      endMs: new Date(2026, 8, 5, 9, 15).getTime(),
    };
    const preceding = {
      startMs: new Date(2026, 8, 1, 19, 45).getTime(),
      endMs: new Date(2026, 8, 3, 14, 29, 59, 999).getTime(),
    };
    renderPulse({ range: partial, comparisonRange: preceding });

    const bounds = within(
      screen.getByLabelText('Period comparison'),
    ).getByLabelText('Preceding interval');
    expect(bounds.textContent).toMatch(/\d{1,2}:\d{2}/);
  });

  it('does not claim a clipped edge bucket suppresses the comparison', () => {
    // That rule died when the shell took over supplying the comparison window:
    // it is gated on retrieval coverage now, not on bucket clipping. A clipped
    // edge bucket makes that one column's count incomparable with its
    // neighbours, which is a different and much narrower statement.
    const clipped = { startMs: new Date(2026, 8, 1, 6, 0).getTime(), endMs: RANGE.endMs };
    const model = makeModel();
    renderPulse({
      range: clipped,
      comparisonRange: { startMs: PREVIOUS.startMs, endMs: PREVIOUS.endMs },
      model: {
        ...model,
        periodCoverage: { startMs: PREVIOUS.startMs, endMs: RANGE.endMs, complete: true },
      },
    });

    const clippedHeader = screen.getAllByRole('columnheader').find((element) =>
      element.getAttribute('title')?.includes('Clipped to the selected range'),
    );
    expect(clippedHeader).toBeDefined();
    expect(screen.queryByText(/no period-over-period comparison/i)).toBeNull();
    // The comparison itself is still offered.
    expect(screen.getByLabelText('Period comparison')).toBeTruthy();
  });

  it('labels a delta as observed when the bounds do not support a stronger claim', () => {
    const model = makeModel();
    renderPulse({
      comparisonRange: PREVIOUS,
      model: {
        ...model,
        periodCoverage: {
          startMs: 0,
          endMs: DAY(6, 12),
          complete: false,
          reason: 'Some sources do not report how far back they retrieved.',
        },
      },
    });
    const compare = screen.getByLabelText('Period comparison');

    expect(within(compare).getByText(/\+1 events .* in loaded records/)).toBeTruthy();
    expect(within(compare).getByText(/do not report how far back they retrieved/)).toBeTruthy();
  });

  it('states why it will not compare against a period the sources did not load', () => {
    const model = makeModel();
    renderPulse({
      comparisonRange: PREVIOUS,
      model: {
        ...model,
        periodCoverage: { startMs: RANGE.startMs, endMs: RANGE.endMs, complete: true },
      },
    });
    const compare = screen.getByLabelText('Period comparison');

    expect(within(compare).queryByText(/[+-]\d+ event/)).toBeNull();
    expect(within(compare).getByText(/outside|not.*loaded/i)).toBeTruthy();
  });
});

describe('PulsePrototype Japanese labels', () => {
  it.each([
    ['en', 'Auto', 'week'],
    ['ja', '自動', '週'],
  ] as const)('labels automatic buckets and retains unit selection in %s', async (language, automatic, week) => {
    const i18n = await createI18nInstance(language);
    renderPulse({}, i18n);
    const option = screen.getByRole('option', { name: automatic }) as HTMLOptionElement;
    const select = option.closest('select')!;
    expect(option.value).toBe('auto');
    expect(select.value).toBe('auto');
    fireEvent.change(select, { target: { value: 'week' } });
    expect(select.value).toBe('week');
    expect((screen.getByRole('option', { name: week }) as HTMLOptionElement).selected).toBe(true);
    fireEvent.change(select, { target: { value: 'auto' } });
    expect(option.selected).toBe(true);
  });

  it('localizes the count of selected rows', () => {
    const { container } = renderPulse({}, japaneseI18n);
    const cells = container.querySelectorAll('.pgp-cell');
    expect(cells.length).toBeGreaterThan(1);

    fireEvent.mouseDown(cells[0]);
    fireEvent.mouseEnter(cells[cells.length - 1]);

    expect(container.querySelector('.pgp-selection .pgp-eyebrow')?.textContent).toContain('3行');
  });
});

describe('PulsePrototype under a progressive index', () => {
  /**
   * The index publishes a new model object on every progress tick. Treating
   * model identity as invalidation threw away the reader's selection and focus
   * several times a second while the first index ran.
   */
  const selectFirstCell = (container: HTMLElement) => {
    const cell = container.querySelector('.pgp-cell') as HTMLElement;
    fireEvent.mouseDown(cell);
    return cell;
  };

  it('keeps the selection when a refreshed model carries the same rows and buckets', () => {
    const { container, props, rerender, withEnglishUi } = renderPulse();
    selectFirstCell(container);
    expect(container.querySelectorAll('.pgp-cell-selected').length).toBeGreaterThan(0);

    rerender(withEnglishUi(<PulsePrototype {...props} model={makeModel()} />));

    expect(container.querySelectorAll('.pgp-cell-selected').length).toBeGreaterThan(0);
  });

  it('keeps focus on the same row across a model refresh', () => {
    const { container, props, rerender, withEnglishUi } = renderPulse();
    const grid = container.querySelector('.pgp-grid') as HTMLElement;
    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    const before = container.querySelector('.pgp-cell[tabindex="0"]')!.getAttribute('aria-label');

    rerender(withEnglishUi(<PulsePrototype {...props} model={makeModel()} />));

    expect(container.querySelector('.pgp-cell[tabindex="0"]')!.getAttribute('aria-label')).toBe(
      before,
    );
  });

  it('survives a range end that advances inside the bucket it already covered', () => {
    // The shell derives the range end from the snapshot timestamp, which moves
    // on every refresh. While the day buckets are unchanged, the column indices
    // still name the same days, so the selection is still meaningful.
    const { container, props, rerender, withEnglishUi } = renderPulse();
    selectFirstCell(container);

    rerender(withEnglishUi(
      <PulsePrototype
        {...props}
        model={makeModel()}
        range={{ ...RANGE, endMs: new Date(2026, 8, 5, 18, 30).getTime() }}
      />,
    ));

    expect(container.querySelectorAll('.pgp-cell-selected').length).toBeGreaterThan(0);
  });

  it('still clears the selection when the buckets or the scope actually change', () => {
    const { container, props, rerender, withEnglishUi } = renderPulse();
    selectFirstCell(container);

    rerender(withEnglishUi(
      <PulsePrototype
        {...props}
        range={{ startMs: new Date(2026, 7, 1).getTime(), endMs: RANGE.endMs }}
      />,
    ));
    expect(container.querySelectorAll('.pgp-cell-selected')).toHaveLength(0);

    selectFirstCell(container);
    rerender(withEnglishUi(<PulsePrototype {...props} selectedAreaId="editor" />));
    expect(container.querySelectorAll('.pgp-cell-selected')).toHaveLength(0);
  });
});

describe('PulsePrototype keyboard focus', () => {
  it('keeps focus on the same row after the rows are re-sorted', () => {
    const { container } = renderPulse();
    const grid = container.querySelector('.pgp-grid') as HTMLElement;
    const rowLabel = (cell: Element) =>
      (cell.getAttribute('aria-label') ?? '').split(',')[0];

    // Move down one row from the default focus, then re-sort the grid.
    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    const before = rowLabel(container.querySelector('.pgp-cell[tabindex="0"]')!);

    fireEvent.change(screen.getAllByRole('combobox')[1]!, { target: { value: 'name' } });

    expect(rowLabel(container.querySelector('.pgp-cell[tabindex="0"]')!)).toBe(before);
  });

  it('leaves a modified arrow chord to the application', () => {
    const { container } = renderPulse();
    const grid = container.querySelector('.pgp-grid') as HTMLElement;

    expect(fireEvent.keyDown(grid, { key: 'ArrowDown', metaKey: true })).toBe(true);
    expect(fireEvent.keyDown(grid, { key: 'ArrowLeft', altKey: true })).toBe(true);
  });
});
