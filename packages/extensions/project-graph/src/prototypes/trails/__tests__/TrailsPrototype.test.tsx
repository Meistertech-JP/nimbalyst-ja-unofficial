import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { ReactNode } from 'react';
import type { PrototypeViewProps } from '../../contracts';
import { TrailsPrototype } from '../TrailsPrototype';
import { makeLargeModel, makeModel, RANGE } from './fixture';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
});

function renderTrails(overrides: Partial<PrototypeViewProps> = {}) {
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
    ...overrides,
  };
  const withEnglishUi = (ui: ReactNode) => (
    <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
      {ui}
    </UiLanguageProvider>
  );
  const utils = render(withEnglishUi(<TrailsPrototype {...props} />));
  const focusCard = () => utils.container.querySelector('.pg-trails-focus') as HTMLElement;
  const focusTitle = () => within(focusCard()).getByRole('heading', { level: 2 }).textContent;
  return { ...utils, props, focusTitle, withEnglishUi };
}

describe('TrailsPrototype', () => {
  it('starts a trail from the keyboard and publishes the selection to the shell', () => {
    const { props, focusTitle } = renderTrails();

    const list = screen.getByRole('listbox', { name: 'Starting records' });
    // Records with evidence in the window lead: the session, then the commit.
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'Enter' });

    expect(props.onSelectNode).toHaveBeenCalledWith('commit:c1');
    expect(focusTitle()).toBe('fix: persist tracker body');
  });

  it('lets a modified arrow through to the application instead of moving the list', () => {
    const { props, focusTitle } = renderTrails();

    const list = screen.getByRole('listbox', { name: 'Starting records' });
    // fireEvent returns false when the handler called preventDefault.
    expect(fireEvent.keyDown(list, { key: 'ArrowDown', metaKey: true })).toBe(true);
    expect(fireEvent.keyDown(list, { key: 'ArrowDown', altKey: true })).toBe(true);
    expect(fireEvent.keyDown(list, { key: 'Enter', ctrlKey: true })).toBe(true);
    expect(props.onSelectNode).not.toHaveBeenCalled();

    // The active option never moved off the first suggestion.
    fireEvent.keyDown(list, { key: 'Enter' });
    expect(props.onSelectNode).toHaveBeenCalledWith('session:s1');
    expect(focusTitle()).toBe('Body cache repair session');

    const search = screen.getByLabelText('Search starting records');
    expect(fireEvent.keyDown(search, { key: 'ArrowDown', metaKey: true })).toBe(true);
  });

  it('filters starting artifacts by name so an unlinked record stays reachable', () => {
    renderTrails();

    fireEvent.change(screen.getByLabelText('Search starting records'), { target: { value: 'use one' } });

    expect(screen.getByRole('listbox').textContent).toContain('Use one write coordinator');
    expect(screen.getByRole('listbox').textContent).toContain('No recorded connections');
    const resultSummary = [...document.querySelectorAll('.pg-trails-start .pg-trails-note')]
      .map((element) => element.textContent ?? '')
      .find((text) => text.includes('matches'));
    expect(resultSummary).toContain('1 of 1 matches');
    expect(resultSummary).toContain('7 in scope');
  });

  it('names each relation, states its basis, and separates path containment from explicit links', () => {
    const { container } = renderTrails({ selectedNodeId: 'tracker:bug1' });

    const lanes = [...container.querySelectorAll('.pg-trails-lane-head')].map(el => el.textContent);
    expect(lanes[0]).toContain('→ worked on in');
    expect(lanes.some(text => text?.includes('→ part of'))).toBe(true);
    expect(screen.getByText(/Where a file is filed, not what it is about/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Containment relations shown/ }));

    expect(container.querySelectorAll('.pg-trails-lane')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Show 1 hidden containment relations/ })).toBeTruthy();
    // The census keeps reporting every resolved connection while a lane is hidden.
    expect(screen.getByText(/2 explicit · 1 derived/)).toBeTruthy();
  });

  it('inspects a connection, walks to the second hop, and comes back', () => {
    const { props, focusTitle } = renderTrails({ selectedNodeId: 'tracker:bug1' });

    fireEvent.click(screen.getByRole('button', { name: /Body cache repair session/ }));

    const inspector = screen.getByRole('complementary', { name: 'Connection inspector' });
    expect(within(inspector).getByText(/explicit tracker-to-session link/)).toBeTruthy();
    // Second hop, with the record we are standing on left out.
    expect(within(inspector).getByRole('button', { name: /edited in.*electron/s })).toBeTruthy();

    fireEvent.click(within(inspector).getByRole('button', { name: 'Center trail on this record' }));

    expect(props.onSelectNode).toHaveBeenLastCalledWith('session:s1');
    expect(focusTitle()).toBe('Body cache repair session');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(focusTitle()).toBe('NIM-1 tracker body lost on reload');
    expect(props.onSelectNode).toHaveBeenLastCalledWith('tracker:bug1');
  });

  it('captions dates from recorded events, never from an inferred node.createdAt', () => {
    const { container, rerender, props, withEnglishUi } = renderTrails({ selectedNodeId: 'session:s1' });

    const focus = container.querySelector('.pg-trails-focus') as HTMLElement;
    expect(within(focus).getByText(/Creation date not recorded/)).toBeTruthy();
    expect(focus.textContent).not.toMatch(/Created \w+ \d/);
    expect(focus.textContent).toContain('Session activity · last observed');

    rerender(withEnglishUi(<TrailsPrototype {...props} selectedNodeId="plan:tracker-body" />));

    const planFocus = container.querySelector('.pg-trails-focus') as HTMLElement;
    expect(within(planFocus).getByText(/Created \w+ \d{1,2}, 2026/)).toBeTruthy();
  });

  it('reports an unlinked record as an absence of links, not as an unrelated one', () => {
    renderTrails({ selectedNodeId: 'tracker:lonely' });

    expect(screen.getByText(/No connection to this artifact is present in the loaded snapshot/)).toBeTruthy();
    expect(screen.getByText(/No area membership is recorded for this item/)).toBeTruthy();
    expect(screen.getByText(/a link may exist in a record that was not loaded/)).toBeTruthy();
  });

  it('presents area membership as a grouping rather than a recorded relation', () => {
    const { props } = renderTrails({ selectedNodeId: 'tracker:bug1' });

    expect(screen.getByText('Area membership')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delivery' }));

    expect(props.onSelectArea).toHaveBeenCalledWith('area:delivery');
  });

  it('stays bounded on a 3,000-record hub and labels what it is showing of the total', () => {
    const { container } = renderTrails({ model: makeLargeModel(3000), selectedNodeId: 'dir:hub' });

    expect(container.querySelectorAll('.pg-trails-node')).toHaveLength(5);
    expect(screen.getByText(/5 of 3000 records/)).toBeTruthy();
    expect(screen.getByText(/5 of 3000 recorded connections shown/)).toBeTruthy();
    // The starting list is bounded the same way, and says so.
    expect(screen.getByText(/60 of 3001 matches/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Show 5 more of 3000' }));

    expect(container.querySelectorAll('.pg-trails-node')).toHaveLength(10);
  });

  it('follows the shell when it selects a different node', () => {
    const { rerender, props, focusTitle, withEnglishUi } = renderTrails({ selectedNodeId: 'tracker:bug1' });

    rerender(withEnglishUi(<TrailsPrototype {...props} selectedNodeId="commit:c1" />));

    expect(focusTitle()).toBe('fix: persist tracker body');
    expect(screen.getByRole('button', { name: 'Back' })).toHaveProperty('disabled', true);
  });

  it('shows a dangling link as an unresolved endpoint and offers to resolve it', () => {
    const onResolveNode = vi.fn();
    const { container } = renderTrails({ selectedNodeId: 'tracker:bug1', onResolveNode });

    const unresolved = container.querySelector('.pg-trails-unresolved') as HTMLElement;
    // The id is the only handle a reader has on a record the snapshot skipped.
    expect(within(unresolved).getByText('issue:999')).toBeTruthy();
    expect(within(unresolved).getByText(/closes/)).toBeTruthy();

    // Resolve opens the source drawer whether the record was never indexed or
    // is only filtered out of this view, so the affordance does not promise a
    // load and the copy does not claim which of the two it is.
    expect(unresolved.textContent).toMatch(/referenced records are unavailable in the loaded sources/i);

    fireEvent.click(within(unresolved).getByRole('button', { name: /Open this record/ }));
    expect(onResolveNode).toHaveBeenCalledWith('issue:999');
  });

  it('omits the resolve affordance when the shell offers no way to load the record', () => {
    const { container } = renderTrails({ selectedNodeId: 'tracker:bug1' });

    const unresolved = container.querySelector('.pg-trails-unresolved') as HTMLElement;
    expect(within(unresolved).getByText('issue:999')).toBeTruthy();
    expect(within(unresolved).queryByRole('button', { name: /Open this record/ })).toBeNull();
  });
});
