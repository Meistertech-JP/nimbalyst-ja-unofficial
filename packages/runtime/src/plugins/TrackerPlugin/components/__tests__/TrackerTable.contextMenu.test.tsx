// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { getDefaultStore } from 'jotai';
import type { TrackerRecord } from '../../../../core/TrackerRecord';
import { globalRegistry, loadBuiltinTrackers } from '../../models';
import { trackerItemsMapAtom } from '../../trackerDataAtoms';
import { TrackerTable } from '../TrackerTable';
import { TrackerTypeCell } from '../TrackerTypeCell';

vi.mock('posthog-js/react', () => ({
  usePostHog: () => ({ capture: vi.fn() }),
}));

let testI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeEach(async () => {
  testI18n = await createI18nInstance('en');
});

function renderWithI18n(ui: ReactElement) {
  return render(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);
}

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
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      lastIndexed: '2026-08-01T00:00:00.000Z',
    },
    fields: { title: `Title ${id}`, status: 'to-do', priority: 'medium' },
  } as TrackerRecord;
}

describe('TrackerTable context menu trigger', () => {
  beforeAll(() => loadBuiltinTrackers());

  beforeEach(() => {
    (window as any).electronAPI = {
      documentService: { updateTrackerItem: vi.fn() },
    };
  });

  it('refreshes group headings without regrouping records when the language changes', async () => {
    const plan = { ...record('grouped-plan'), primaryType: 'plan', typeTags: ['plan'], fields: { title: 'User plan', status: 'in-development', priority: 'medium' } } as TrackerRecord;
    const { container } = renderWithI18n(<TrackerTable filterType="plan" groupBy="status" hideTypeTabs hideToolbar overrideItems={[plan]} />);
    for (const language of ['ja', 'en', 'ja']) {
      await act(async () => { await testI18n.changeLanguage(language); });
      expect(container.querySelector('[data-testid="tracker-table-group-header"]')?.textContent).toContain(language === 'ja' ? '開発中' : 'In Development');
      expect(container.querySelector('[data-testid="tracker-table-row"]')?.getAttribute('data-item-id')).toBe('grouped-plan');
    }
    expect(plan.fields.status).toBe('in-development');
  });

  it('updates built-in status and priority labels without changing stored field values', async () => {
    const plan = {
      ...record('localized-plan'),
      primaryType: 'plan',
      typeTags: ['plan'],
      fields: { title: 'Keep this user title', status: 'in-development', priority: 'medium' },
    } as TrackerRecord;
    const { container } = renderWithI18n(
      <TrackerTable filterType="plan" hideTypeTabs hideToolbar overrideItems={[plan]}
        columnConfig={{ visibleColumns: ['type', 'title', 'status', 'priority'], columnWidths: {}, typeColumnDisplay: 'label' }} />,
    );
    const row = () => container.querySelector('[data-item-id="localized-plan"]')!;
    const cell = (name: string) => row().querySelector(`[data-column-id="${name}"]`)?.textContent;
    expect(cell('status')).toBe('In Development');
    expect(cell('priority')).toBe('Medium');
    await act(async () => { await testI18n.changeLanguage('ja'); });
    expect(cell('status')).toBe('開発中');
    expect(cell('priority')).toBe('中');
    expect(row().textContent).toContain('Keep this user title');
    await act(async () => { await testI18n.changeLanguage('en'); });
    expect(cell('status')).toBe('In Development');
    expect(cell('priority')).toBe('Medium');
    expect(plan.fields).toEqual({ title: 'Keep this user title', status: 'in-development', priority: 'medium' });
  });

  it('updates the built-in type label and tooltip when the display language changes', async () => {
    const { container } = renderWithI18n(<TrackerTypeCell type="plan" display="label" />);
    const label = () => container.querySelector('.tracker-type-indicator')!;
    expect(label().textContent).toBe('Plan');
    for (const language of ['ja', 'en', 'ja']) {
      await act(async () => { await testI18n.changeLanguage(language); });
      const expected = testI18n.t('table.types.plan', { ns: 'tracker' });
      expect(label().textContent).toBe(expected);
      expect(label().getAttribute('title')).toBe(expected);
    }
  });

  it('updates rendered relative date cells when the UI language changes', async () => {
    const recent = record('recent-date');
    recent.system.lastIndexed = new Date(Date.now() - 3 * 3_600_000).toISOString();
    recent.system.updatedAt = recent.system.lastIndexed;
    const { container } = renderWithI18n(
      <TrackerTable filterType="bug" hideTypeTabs hideToolbar overrideItems={[recent]} />,
    );
    const cell = () => container.querySelector('[data-column-id="updated"]')?.textContent;
    expect(cell()).toBe('3h ago');
    await act(async () => { await testI18n.changeLanguage('ja'); });
    expect(cell()).toBe('3時間前');
    await act(async () => { await testI18n.changeLanguage('en'); });
    expect(cell()).toBe('3h ago');
  });

  it('preserves a multi-selection when its overflow action opens the shared menu', () => {
    renderWithI18n(
      <TrackerTable
        filterType="bug"
        hideTypeTabs
        hideToolbar
        overrideItems={[record('bug-1'), record('bug-2')]}
      />,
    );

    const rows = screen.getAllByTestId('tracker-table-row');
    fireEvent.click(rows[0], { metaKey: true });
    fireEvent.click(rows[1], { metaKey: true });
    fireEvent.click(screen.getAllByTestId('tracker-row-more-actions')[1]);

    expect(screen.getByText('2 items selected')).toBeDefined();
  });
});

describe('TrackerTable delete confirmation', () => {
  beforeAll(() => loadBuiltinTrackers());

  beforeEach(() => {
    (window as any).electronAPI = {
      documentService: { updateTrackerItem: vi.fn() },
    };
  });

  function renderSelected(props: Record<string, unknown>) {
    renderWithI18n(
      <TrackerTable
        filterType="bug"
        hideTypeTabs
        hideToolbar
        overrideItems={[record('bug-1'), record('bug-2')]}
        {...props}
      />,
    );
    const rows = screen.getAllByTestId('tracker-table-row');
    fireEvent.click(rows[0], { metaKey: true });
    fireEvent.click(rows[1], { metaKey: true });
  }

  it('deletes from the context menu only after the host confirms', async () => {
    const onDeleteItems = vi.fn();
    const confirmDelete = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const nativeConfirm = vi.spyOn(window, 'confirm');
    renderSelected({ onDeleteItems, confirmDelete });

    fireEvent.click(screen.getAllByTestId('tracker-row-more-actions')[1]);
    fireEvent.click(screen.getByTestId('tracker-row-context-delete'));
    await waitFor(() => expect(confirmDelete).toHaveBeenCalledWith(2));
    expect(onDeleteItems).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByTestId('tracker-row-more-actions')[1]);
    fireEvent.click(screen.getByTestId('tracker-row-context-delete'));
    await waitFor(() => expect(onDeleteItems).toHaveBeenCalledWith(['bug-1', 'bug-2']));
    expect(nativeConfirm).not.toHaveBeenCalled();
    nativeConfirm.mockRestore();
  });

  it('deletes on Cmd+Delete only after the host confirms', async () => {
    const onDeleteItems = vi.fn();
    const confirmDelete = vi.fn().mockResolvedValue(true);
    renderSelected({ onDeleteItems, confirmDelete });

    fireEvent.keyDown(document.querySelector('.tracker-table-container')!, { key: 'Delete', metaKey: true });
    await waitFor(() => expect(onDeleteItems).toHaveBeenCalledWith(['bug-1', 'bug-2']));
    expect(confirmDelete).toHaveBeenCalledWith(2);
  });

  it('refuses to delete without a host confirm rather than raising a native dialog', async () => {
    const onDeleteItems = vi.fn();
    const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderSelected({ onDeleteItems });

    fireEvent.keyDown(document.querySelector('.tracker-table-container')!, { key: 'Delete', metaKey: true });
    fireEvent.click(screen.getAllByTestId('tracker-row-more-actions')[1]);
    expect(screen.queryByTestId('tracker-row-context-delete')).toBeNull();
    await Promise.resolve();
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(onDeleteItems).not.toHaveBeenCalled();
    nativeConfirm.mockRestore();
  });
});

describe('TrackerTable collection cell', () => {
  beforeAll(() => loadBuiltinTrackers());

  it('names a collection from the live record, not the link snapshot', () => {
    const milestone = {
      ...record('mst_1'),
      primaryType: 'milestone',
      typeTags: ['milestone'],
      fields: { title: 'Onboarding' },
    } as TrackerRecord;
    getDefaultStore().set(trackerItemsMapAtom, new Map([[milestone.id, milestone]]));

    const bug = record('bug-1');
    // A link written from the milestone's side carries no title, so the cell
    // would otherwise read as the raw item id.
    bug.fields.collection = [{ itemId: 'mst_1', trackerType: 'milestone' }];

    renderWithI18n(
      <TrackerTable
        filterType="bug"
        hideTypeTabs
        hideToolbar
        overrideItems={[bug]}
        columnConfig={{ visibleColumns: ['title', 'collection'], columnWidths: {} }}
      />,
    );

    expect(screen.getByText('Onboarding')).toBeDefined();
    expect(screen.queryByText('mst_1')).toBeNull();
  });
});

/**
 * The Type column read a hardcoded map of the seven built-in types, so every row
 * of a custom type rendered an empty glyph -- the reporter in nimbalyst#1422 runs
 * ~30 of them. Identity now comes from the type's own schema, and the column can
 * print the type name instead of a glyph.
 */
describe('TrackerTable type column', () => {
  beforeAll(() => loadBuiltinTrackers());

  const customType = {
    type: 'securityReview',
    displayName: 'Security Review',
    displayNamePlural: 'Security Reviews',
    icon: 'shield_lock',
    color: '#dc2626',
    modes: { inline: true, fullDocument: false },
    idPrefix: 'SEC',
    idFormat: 'ulid',
    fields: [{ name: 'title', type: 'string', required: true }],
    roles: { title: 'title' },
  } as const;

  function customItem(): TrackerRecord {
    return {
      ...record('sec-1'),
      primaryType: 'securityReview',
      typeTags: ['securityReview'],
      fields: { title: 'Review the auth flow' },
    } as TrackerRecord;
  }

  function renderTypeColumn(typeColumnDisplay?: 'icon' | 'label') {
    globalRegistry.register(customType as any);
    const { container } = renderWithI18n(
      <TrackerTable
        filterType={'securityReview' as any}
        hideTypeTabs
        hideToolbar
        overrideItems={[customItem()]}
        columnConfig={{ visibleColumns: ['type', 'title'], columnWidths: {}, typeColumnDisplay }}
      />,
    );
    return container.querySelector('.tracker-type-indicator');
  }

  it('draws the icon the custom type declares rather than an empty glyph', () => {
    expect(renderTypeColumn()?.textContent).toBe('shield_lock');
  });

  it('draws the type name when the view asks for names', () => {
    expect(renderTypeColumn('label')?.textContent).toBe('Security Review');
  });
});
