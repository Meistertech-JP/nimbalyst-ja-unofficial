// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { resources } from '@nimbalyst/i18n/resources';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackerFieldEditor } from '../TrackerFieldEditor';
import { TrackerFieldChoiceList } from '../TrackerFieldChoiceList';
import { TrackerAddFieldMenu } from '../TrackerTypeRow';
import { globalRegistry, type FieldDefinition } from '@nimbalyst/tracker-schema';
import { parseBuiltinTrackers } from '../../models/ModelLoader';

const testI18n = createInstance();
const testI18nReady = testI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources,
  ns: Object.keys(resources.en),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

function renderWithI18n(element: React.ReactNode) {
  return render(<I18nextProvider i18n={testI18n}>{element}</I18nextProvider>);
}

afterEach(cleanup);

beforeEach(async () => {
  await testI18nReady;
  await testI18n.changeLanguage('en');
});

describe('TrackerFieldEditor array values', () => {
  it('localizes only registry-owned builtin choices and emits their unchanged values', async () => {
    const task = parseBuiltinTrackers().find(model => model.type === 'task')!;
    globalRegistry.register(task, true);
    const field = globalRegistry.get('task')!.fields.find(field => field.name === 'status')!;
    const custom = structuredClone(field);
    const before = JSON.stringify(field);
    const onChange = vi.fn();
    const { container } = renderWithI18n(<>
      <TrackerFieldEditor field={field} value="to-do" onChange={onChange} />
      <TrackerFieldEditor field={custom} value="to-do" onChange={vi.fn()} />
    </>);
    for (const language of ['ja', 'en', 'ja']) {
      await act(async () => { await testI18n.changeLanguage(language); });
      const triggers = container.querySelectorAll('.custom-select-trigger');
      expect(triggers[0].textContent).toContain(language === 'ja' ? '未着手' : 'To Do');
      expect(triggers[1].textContent).toContain('To Do');
    }
    fireEvent.click(container.querySelector('.custom-select-trigger')!);
    fireEvent.click(await screen.findByText('進行中'));
    expect(onChange).toHaveBeenLastCalledWith('in-progress');
    expect(JSON.stringify(field)).toBe(before);
  });

  it('renders structured runtime entries safely when legacy schema metadata says string array', () => {
    const requirement = {
      id: 'criterion-1',
      description: 'Open the tracker item',
      owner: 'Keith',
      evidenceRequirement: 'The detail view renders',
      state: 'pending',
    };

    renderWithI18n(
      <TrackerFieldEditor
        field={{ name: 'requirements', type: 'array', itemType: 'string' }}
        value={[requirement]}
        onChange={vi.fn()}
      />,
    );

    screen.getByText(JSON.stringify(requirement));
    expect(screen.queryByPlaceholderText('Add tag...')).toBeNull();
  });

  it('localizes field placeholders and actions in Japanese while retaining the field value', async () => {
    await testI18n.changeLanguage('ja');
    const onChange = vi.fn();
    renderWithI18n(
      <>
        <TrackerFieldEditor field={{ name: 'summary', type: 'text', required: true }} value="既存の値" onChange={onChange} />
        <TrackerFieldEditor field={{ name: 'tags', type: 'array' }} value={[]} onChange={onChange} />
        <TrackerFieldEditor field={{ name: 'owner', type: 'user' }} value="ada@example.com" onChange={onChange} />
        <TrackerFieldEditor field={{ name: 'website', type: 'url' }} value={{ url: 'https://example.com' }} onChange={onChange} />
        <TrackerFieldChoiceList choices={[]} value="" allowNone onPick={onChange} />
      </>,
    );

    expect(screen.getByPlaceholderText('必須')).toBeDefined();
    expect(screen.getByPlaceholderText('タグを追加…')).toBeDefined();
    expect(screen.getByText('タグ', { selector: 'label' }).textContent).toBe('タグ');
    expect(screen.getByText('担当者', { selector: 'label' }).textContent).toBe('担当者');
    fireEvent.click(screen.getByTitle('クリア'));
    expect(onChange).toHaveBeenCalledWith('');
    expect(screen.getByTitle('リンクを開く')).toBeDefined();
    expect(screen.getByPlaceholderText('表示ラベル（任意）')).toBeDefined();
    expect(screen.getByText('なし')).toBeDefined();
  });

  it('updates built-in labels live without changing custom labels or field values', async () => {
    await testI18n.changeLanguage('ja');
    const onChange = vi.fn();
    const customOwner: FieldDefinition & { displayLabel: string } = {
      name: 'owner', type: 'user', displayLabel: 'Review lead',
    };
    renderWithI18n(<>
      <TrackerFieldEditor field={{ name: 'tags', type: 'array' }} value={['user-label']} onChange={onChange} />
      <TrackerFieldEditor field={customOwner} value="member@example.com" onChange={onChange} />
      <TrackerFieldEditor field={{ name: 'releaseNotes', type: 'text' }} value="Keep this English content" onChange={onChange} />
    </>);
    expect(screen.getByText('タグ', { selector: 'label' }).textContent).toBe('タグ');
    expect(screen.getByText('Review lead', { selector: 'label' }).textContent).toBe('Review lead');
    expect(screen.getByText('Release Notes', { selector: 'label' }).textContent).toBe('Release Notes');
    expect(screen.getByDisplayValue('Keep this English content').textContent).toBe('Keep this English content');

    await act(async () => { await testI18n.changeLanguage('en'); });
    expect(screen.getByText('Tags', { selector: 'label' }).textContent).toBe('Tags');
    expect(screen.getByText('Review lead', { selector: 'label' }).textContent).toBe('Review lead');
    await act(async () => { await testI18n.changeLanguage('ja'); });
    expect(screen.getByText('タグ', { selector: 'label' }).textContent).toBe('タグ');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('localizes the add-field menu and preserves the selected schema field', async () => {
    await testI18n.changeLanguage('ja');
    const onAdd = vi.fn();
    renderWithI18n(
      <TrackerAddFieldMenu
        fields={[{ name: 'releaseDate', type: 'date' }, { name: 'owner', type: 'user' }, { name: 'dependsOn', type: 'relationship' }]}
        onAdd={onAdd}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'フィールドを追加' }));
    expect(screen.getByText('フィールドを追加')).toBeDefined();
    expect(screen.getByRole('menuitem', { name: '担当者' }).textContent).toContain('担当者');
    expect(screen.getByRole('menuitem', { name: '依存先' }).textContent).toContain('依存先');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Release Date' }));
    expect(onAdd).toHaveBeenCalledWith('releaseDate');
  });
});
