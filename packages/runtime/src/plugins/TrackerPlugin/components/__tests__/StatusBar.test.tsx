import { beforeAll, describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act, render as testingRender, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { globalRegistry } from '../../models';
import type { TrackerDataModel } from '@nimbalyst/tracker-schema';
import { StatusBar } from '../StatusBar';
import { parseBuiltinTrackers } from '../../models/ModelLoader';
import { TrackerTypeRow } from '../TrackerTypeRow';

let testI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  testI18n = await createI18nInstance('en');
});

function render(ui: React.ReactNode) {
  return testingRender(ui, {
    wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>,
  });
}

const model: TrackerDataModel = {
  type: 'statusBarPlan',
  displayName: 'Plan',
  displayNamePlural: 'Plans',
  icon: 'flag',
  color: '#3b82f6',
  modes: { inline: true, fullDocument: true },
  idPrefix: 'SBP',
  idFormat: 'ulid',
  sharing: 'personal',
  draftByDefault: false,
  fields: [
    { name: 'title', type: 'string', required: true },
    {
      name: 'status',
      type: 'select',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'completed', label: 'Completed' },
      ],
    },
    { name: 'progress', type: 'number', min: 0, max: 100 },
    { name: 'owner', type: 'user' },
    {
      name: 'collection',
      type: 'relationship',
      relationshipTypeKey: 'in-collection',
      targetTrackerTypes: ['milestone'],
      multiValue: true,
    },
    { name: 'created', type: 'datetime', readOnly: true },
    { name: 'updated', type: 'datetime', readOnly: true },
  ],
  roles: { title: 'title', workflowStatus: 'status', assignee: 'owner', progress: 'progress' },
};

function renderStatusBar(data: Record<string, unknown> = {}) {
  globalRegistry.register(model);
  const onChange = vi.fn();
  render(<StatusBar model={model} data={data} onChange={onChange} />);
  return { onChange };
}

describe('StatusBar', () => {
  it('updates builtin document and page type headers while preserving custom same-text names', async () => {
    const seed = parseBuiltinTrackers().find(model => model.type === 'plan')!;
    globalRegistry.register(seed, true);
    globalRegistry.register(model);
    const i18n = await createI18nInstance('ja');
    const { container } = testingRender(
      <I18nextProvider i18n={i18n}>
        <StatusBar model={seed} data={{ title: 'User title', status: 'draft' }} onChange={vi.fn()} />
        <StatusBar model={model} data={{ title: 'Custom title' }} onChange={vi.fn()} />
        <TrackerTypeRow typeId="plan" values={{ status: 'draft' }} editable={false} onSaveField={vi.fn()} />
      </I18nextProvider>,
    );
    for (const language of ['ja', 'en', 'ja']) {
      await act(async () => { await i18n.changeLanguage(language); });
      const expected = i18n.t('table.types.plan', { ns: 'tracker' });
      const headers = container.querySelectorAll('.status-bar-title');
      expect(headers[0].textContent).toContain(expected);
      expect(headers[1].textContent).toContain('Plan');
      expect(container.querySelector('.tracker-type-row-type')?.textContent).toContain(expected);
    }
    expect(seed.displayName).toBe('Plan');
  });

  it('localizes accessibility labels in Japanese', async () => {
    const i18n = await createI18nInstance('ja');
    testingRender(
      <I18nextProvider i18n={i18n}>
        <StatusBar
          model={model}
          data={{}}
          onChange={() => {}}
          onClose={() => {}}
          trackerItemLink={{ label: 'NIM-42', title: 'Roadmap', onOpen: () => {} }}
        />
      </I18nextProvider>,
    );

    screen.getByRole('button', { name: 'ステータスバーを折りたたむ' });
    screen.getByRole('button', { name: 'トラッカー項目NIM-42を開く' });
    screen.getByRole('button', { name: 'トラッカーを削除' });
  });

  it('renders the tracker fields as a chip row and writes one field per change', () => {
    const { onChange } = renderStatusBar({ status: 'draft', progress: 40 });

    screen.getByTestId('tracker-status-bar-field-pills');
    expect(screen.getByTestId('tracker-status-bar-field-pill-status').textContent).toContain('Draft');
    expect(screen.getByTestId('tracker-status-bar-field-pill-progress').textContent).toContain('40');

    fireEvent.click(screen.getByTestId('tracker-status-bar-field-pill-status'));
    expect(screen.getByTestId('tracker-status-bar-field-popover-header-status').textContent)
      .toBe('Status');

    fireEvent.click(screen.getByText('Completed'));
    expect(onChange).toHaveBeenCalledWith({ status: 'completed' });
  });

  it('leaves the created and updated timestamps to the document, not the header', () => {
    renderStatusBar({
      status: 'draft',
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-02-01T00:00:00.000Z',
    });

    expect(screen.queryByTestId('tracker-status-bar-field-pill-created')).toBeNull();
    expect(screen.queryByTestId('tracker-status-bar-field-pill-updated')).toBeNull();
    expect(screen.queryByText(/Created/)).toBeNull();
    expect(screen.queryByText(/Updated/)).toBeNull();
  });

  it('collapses to the title and restores the chips', () => {
    renderStatusBar({ status: 'draft' });

    fireEvent.click(screen.getByRole('button', { name: 'Collapse status bar' }));
    expect(screen.queryByTestId('tracker-status-bar-field-pills')).toBeNull();
    screen.getByText('Plan');

    fireEvent.click(screen.getByRole('button', { name: 'Expand status bar' }));
    screen.getByTestId('tracker-status-bar-field-pills');
  });

  it('keeps the issue-key chip clickable without collapsing the header', () => {
    globalRegistry.register(model);
    const onOpen = vi.fn();
    render(
      <StatusBar
        model={model}
        data={{ status: 'draft' }}
        onChange={() => {}}
        trackerItemLink={{ label: 'NIM-42', title: 'Roadmap', onOpen }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open tracker item NIM-42' }));

    expect(onOpen).toHaveBeenCalledOnce();
    screen.getByTestId('tracker-status-bar-field-pills');
  });

  it('forwards people, relationship, navigation, and creation capabilities to the chips', () => {
    globalRegistry.register(model);
    const onOpenItem = vi.fn();
    const onCreateCollection = vi.fn();
    render(
      <StatusBar
        model={model}
        data={{ owner: '', collection: [{ itemId: 'mst_1', title: 'Alpha' }] }}
        onChange={() => {}}
        teamMembers={[{ email: 'ada@example.com', name: 'Ada' }]}
        relationshipCandidates={new Map([[
          'collection',
          [{ itemId: 'mst_1', title: 'Alpha', trackerType: 'milestone' }],
        ]])}
        onOpenItem={onOpenItem}
        onCreateCollection={onCreateCollection}
      />,
    );

    fireEvent.click(screen.getByTestId('tracker-status-bar-field-pill-owner'));
    screen.getByText('Ada');

    fireEvent.click(screen.getByTestId('tracker-status-bar-field-pill-collection'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Alpha' })[0]);
    expect(onOpenItem).toHaveBeenCalledWith('mst_1');
    fireEvent.change(screen.getByTestId('tracker-status-bar-field-collection-picker-search'), {
      target: { value: 'New milestone' },
    });
    screen.getByTestId('tracker-status-bar-field-collection-picker-create');
  });
});
