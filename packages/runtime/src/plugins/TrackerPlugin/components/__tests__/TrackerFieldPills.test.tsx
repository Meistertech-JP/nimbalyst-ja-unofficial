import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { resources } from '@nimbalyst/i18n/resources';
import { TrackerFieldPills } from '../TrackerFieldPills';
import { globalRegistry, emptyLabelRegistry, type FieldDefinition } from '@nimbalyst/tracker-schema';
import { labelPropertyToFieldDefinition, unwrapLabelFieldValues } from '../trackerLabelFields';

const testI18n = createInstance();
const testI18nReady = testI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources,
  ns: Object.keys(resources.en),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

beforeEach(async () => {
  await testI18nReady;
  await testI18n.changeLanguage('en');
});

afterEach(async () => {
  cleanup();
  await testI18n.changeLanguage('en');
});

const statusField: FieldDefinition = {
  name: 'state',
  type: 'select',
  options: [
    { value: 'open', label: 'Open', icon: 'radio_button_checked' },
    { value: 'done', label: 'Done', icon: 'check_circle' },
  ],
};

const ownerField: FieldDefinition = { name: 'owner', type: 'user' };
const dueField: FieldDefinition = { name: 'dueDate', type: 'date' };
const tagsField: FieldDefinition = { name: 'tags', type: 'array' };

function renderPills(
  fields: FieldDefinition[],
  values: Record<string, unknown>,
  overrides: Partial<React.ComponentProps<typeof TrackerFieldPills>> = {},
) {
  const onSave = vi.fn();
  render(
    <TrackerFieldPills
      fields={fields}
      values={values}
      onSave={onSave}
      {...overrides}
    />,
  );
  return { onSave };
}

function renderPillsWithI18n(
  fields: FieldDefinition[],
  values: Record<string, unknown>,
  overrides: Partial<React.ComponentProps<typeof TrackerFieldPills>> = {},
) {
  const onSave = vi.fn();
  render(
    <I18nextProvider i18n={testI18n}>
      <TrackerFieldPills fields={fields} values={values} onSave={onSave} {...overrides} />
    </I18nextProvider>,
  );
  return { onSave };
}

describe('TrackerFieldPills', () => {
  it('localizes citation counts and boolean values when the language changes', async () => {
    await testI18n.changeLanguage('ja');
    renderPillsWithI18n(
      [{ name: 'sources', type: 'citation' }, { name: 'verified', type: 'boolean' }],
      { sources: [{ id: 'source-1' }], verified: true },
    );
    expect(screen.getByText('引用1件')).toBeDefined();
    expect(screen.getByText('はい')).toBeDefined();
    await act(async () => { await testI18n.changeLanguage('en'); });
    expect(screen.getByText('1 citation')).toBeDefined();
    expect(screen.getByText('Yes')).toBeDefined();
  });

  it('localizes plural citations and a false boolean without changing custom choice values', async () => {
    await testI18n.changeLanguage('ja');
    renderPillsWithI18n(
      [{ name: 'sources', type: 'citation' }, { name: 'verified', type: 'boolean' }, statusField],
      { sources: [{ id: 'one' }, { id: 'two' }], verified: false, state: 'open' },
    );
    expect(screen.getByText('引用2件')).toBeDefined();
    expect(screen.getByText('いいえ')).toBeDefined();
    expect(screen.getByText('Open')).toBeDefined();
    await act(async () => { await testI18n.changeLanguage('en'); });
    expect(screen.getByText('2 citations')).toBeDefined();
    expect(screen.getByText('No')).toBeDefined();
  });
  it('localizes built-in field labels and accessible titles without translating custom labels or values', async () => {
    await testI18n.changeLanguage('ja');
    const customLabelFields: Array<FieldDefinition & { displayLabel: string }> = [
      { name: 'customRelation', type: 'relationship', displayLabel: 'Custom dependency' },
      { name: 'customDate', type: 'date', displayLabel: '予定日' },
    ];
    renderPillsWithI18n(
      [
        { name: 'tags', type: 'array' },
        { name: 'owner', type: 'user' },
        { name: 'status', type: 'select', options: [{ value: 'todo', label: 'To Do' }] },
        { name: 'priority', type: 'select', options: [{ value: 'medium', label: 'Medium' }] },
        { name: 'dependsOn', type: 'relationship' },
        { name: 'blocks', type: 'relationship' },
        { name: 'collection', type: 'relationship' },
        { name: 'goal', type: 'relationship' },
        { name: 'startDate', type: 'date' },
        { name: 'dueDate', type: 'date' },
        { name: 'progress', type: 'number' },
        ...customLabelFields,
        { name: 'customField', type: 'text' },
        { name: 'constructor', type: 'text' },
      ],
      {
        tags: [],
        owner: '',
        status: 'todo',
        priority: 'medium',
        dependsOn: '',
        customRelation: '',
        customDate: '2026-08-01',
        customField: 'keep this value',
        constructor: 'keep built-in-like custom field',
      },
      { editable: false },
    );

    expect(screen.getByTestId('tracker-field-pill-tags').getAttribute('aria-label')).toContain('タグ');
    expect(screen.getByTestId('tracker-field-pill-owner').getAttribute('aria-label')).toContain('担当者');
    expect(screen.getByTestId('tracker-field-pill-owner').textContent).toContain('担当者');
    expect(screen.getByTestId('tracker-field-pill-status').getAttribute('aria-label')).toBe('ステータス: To Do');
    expect(screen.getByTestId('tracker-field-pill-priority').getAttribute('aria-label')).toBe('優先度: Medium');
    expect(screen.getByTestId('tracker-field-pill-dependsOn').getAttribute('aria-label')).toContain('依存先');
    for (const [field, label] of [
      ['blocks', 'ブロック'], ['collection', 'コレクション'], ['goal', '目標'],
      ['startDate', '開始日'], ['dueDate', '期限'], ['progress', '進捗'],
    ]) {
      expect(screen.getByTestId(`tracker-field-pill-${field}`).textContent).toContain(label);
      expect(screen.getByTestId(`tracker-field-pill-${field}`).getAttribute('title')).toBe(`${label}は読み取り専用です`);
    }
    expect(screen.getByTestId('tracker-field-pill-customRelation').getAttribute('aria-label')).toContain('Custom dependency');
    expect(screen.getByTestId('tracker-field-pill-customDate').getAttribute('aria-label')).toContain('予定日');
    expect(screen.getByTestId('tracker-field-pill-customField').getAttribute('aria-label')).toContain('Custom Field');
    expect(screen.getByTestId('tracker-field-pill-constructor').getAttribute('aria-label')).toContain('Constructor');
    expect(screen.getByTestId('tracker-field-pill-owner').getAttribute('title')).toBe('担当者は読み取り専用です');
    expect(screen.getByTestId('tracker-field-pill-customField').textContent).toContain('keep this value');
  });

  it('shows translated set and read-only titles and switches field labels back to English', async () => {
    await testI18n.changeLanguage('ja');
    renderPillsWithI18n([ownerField], { owner: '' });
    expect(screen.getByTestId('tracker-field-pill-owner').getAttribute('title')).toBe('担当者を設定');

    await act(async () => { await testI18n.changeLanguage('en'); });
    expect(screen.getByTestId('tracker-field-pill-owner').getAttribute('title')).toBe('Set Owner');
    expect(screen.getByTestId('tracker-field-pill-owner').getAttribute('aria-label')).toContain('Owner');
  });

  it('names the field in the popover of a select chip and saves the choice', () => {
    const { onSave } = renderPills([statusField], { state: 'open' });

    const chip = screen.getByTestId('tracker-field-pill-state');
    expect(chip.textContent).toContain('Open');

    fireEvent.click(chip);
    expect(screen.getByTestId('tracker-field-popover-header-state').textContent).toBe('State');

    fireEvent.click(screen.getByText('Done'));
    expect(onSave).toHaveBeenCalledWith('state', 'done');
  });

  it('names the field in a people chip popover built from team members', () => {
    const { onSave } = renderPills([ownerField], { owner: '' }, {
      teamMembers: [{ email: 'ada@example.com', name: 'Ada' }],
    });

    const chip = screen.getByTestId('tracker-field-pill-owner');
    expect(chip.getAttribute('data-empty')).toBe('true');

    fireEvent.click(chip);
    expect(screen.getByTestId('tracker-field-popover-header-owner').textContent).toBe('Owner');
    screen.getByTestId('tracker-field-choices-owner');

    fireEvent.click(screen.getByText('Ada'));
    expect(onSave).toHaveBeenCalledWith('owner', 'ada@example.com');
  });

  it('heads form-style editors once, without the editor repeating the label', () => {
    renderPills([dueField], { dueDate: '2026-07-30' });

    fireEvent.click(screen.getByTestId('tracker-field-pill-dueDate'));
    const popover = screen.getByTestId('tracker-field-popover-dueDate');
    expect(screen.getByTestId('tracker-field-popover-header-dueDate').textContent)
      .toBe('Due Date');
    expect(popover.querySelectorAll('label').length).toBe(0);
  });

  it('formats Date instances instead of treating them as empty objects', () => {
    renderPills([dueField], { dueDate: new Date(2026, 6, 30) });

    const chip = screen.getByTestId('tracker-field-pill-dueDate');
    expect(chip.getAttribute('data-empty')).toBe('false');
    expect(chip.textContent).toContain(new Date(2026, 6, 30).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    }));
  });

  it('renders read-only chips without opening an editor', () => {
    renderPills([tagsField], { tags: ['design'] }, { editable: false });

    const chip = screen.getByTestId('tracker-field-pill-tags') as HTMLButtonElement;
    expect(chip.textContent).toContain('design');
    expect(chip.disabled).toBe(true);

    fireEvent.click(chip);
    expect(screen.queryByTestId('tracker-field-popover-tags')).toBeNull();
  });

  it('labels filled chips whose value cannot name its own field', () => {
    const shotField: FieldDefinition = { name: 'shootDate', type: 'date' };
    const briefField: FieldDefinition = { name: 'brief', type: 'url' };
    renderPills(
      [statusField, dueField, shotField, briefField, ownerField],
      {
        state: 'open',
        dueDate: '2026-05-29',
        shootDate: '2026-05-01',
        brief: { url: 'https://drive.example/brief' },
        owner: '',
      },
    );

    const labelOf = (field: string): string | undefined => screen
      .getByTestId(`tracker-field-pill-${field}`)
      .querySelector('.tracker-field-pill-label')?.textContent ?? undefined;

    // Two dates and a URL are indistinguishable as bare values (#1166).
    expect(labelOf('dueDate')).toBe('Due Date');
    expect(labelOf('shootDate')).toBe('Shoot Date');
    expect(labelOf('brief')).toBe('Brief');

    // A select value is already its own label, so labelling it would duplicate.
    expect(labelOf('state')).toBeUndefined();

    // An empty chip renders the label as its value; it must not show up twice.
    expect(labelOf('owner')).toBeUndefined();
    expect(screen.getByTestId('tracker-field-pill-owner').textContent).toContain('Owner');
  });

  it('honours a surface-specific test id base and row class', () => {
    renderPills([statusField], { state: 'open' }, {
      testIdBase: 'tracker-document-field',
      className: 'tracker-document-field-pills',
    });

    const row = screen.getByTestId('tracker-document-field-pills');
    expect(row.className).toContain('tracker-field-pills');
    expect(row.className).toContain('tracker-document-field-pills');
    screen.getByTestId('tracker-document-field-pill-state');
  });

  it('shows a legacy qualified label property by its value, never the stored object', () => {
    const flag = labelPropertyToFieldDefinition({
      id: 'feature-flag',
      label: 'Feature flag',
      type: 'string',
      qualifiers: { rollout: { type: 'number', label: 'Rollout %' } },
    }, 'feature');
    const stored = { 'feature-flag': { value: 'new-editor', qualifiers: { rollout: 25 } } };
    renderPills([flag], unwrapLabelFieldValues([flag], stored));

    const chip = screen.getByTestId('tracker-field-pill-feature-flag');
    expect(chip.textContent).toContain('new-editor');
  });

  it('names labels on a label-ref chip and keeps an unknown label rather than dropping it', async () => {
    globalRegistry.setLabels({ labels: [{ id: 'feature', label: 'Feature' }], properties: [], claimProperties: {} });
    try {
      const { onSave } = renderPills([{ name: 'labels', type: 'label-ref', multiValue: true }], { labels: ['feature', 'pending-label'] });
      const chip = screen.getByTestId('tracker-field-pill-labels');
      expect(chip.textContent).toContain('Feature, pending-label');

      fireEvent.click(chip);
      // The picker loads lazily on first edit.
      expect((await screen.findByTestId('label-ref-picker-row-pending-label')).getAttribute('data-unknown')).toBe('true');
      fireEvent.click(screen.getByTestId('label-ref-picker-row-feature'));
      expect(onSave).toHaveBeenCalledWith('labels', ['pending-label']);
    } finally {
      globalRegistry.setLabels(emptyLabelRegistry());
    }
  });
});
