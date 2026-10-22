// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { resources } from '@nimbalyst/i18n/resources';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackerFieldEditor } from '../TrackerFieldEditor';
import { TrackerFieldChoiceList } from '../TrackerFieldChoiceList';
import { TrackerAddFieldMenu } from '../TrackerTypeRow';

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
    fireEvent.click(screen.getByTitle('クリア'));
    expect(onChange).toHaveBeenCalledWith('');
    expect(screen.getByTitle('リンクを開く')).toBeDefined();
    expect(screen.getByPlaceholderText('表示ラベル（任意）')).toBeDefined();
    expect(screen.getByText('なし')).toBeDefined();
  });

  it('localizes the add-field menu and preserves the selected schema field', async () => {
    await testI18n.changeLanguage('ja');
    const onAdd = vi.fn();
    renderWithI18n(
      <TrackerAddFieldMenu
        fields={[{ name: 'releaseDate', type: 'date' }]}
        onAdd={onAdd}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'フィールドを追加' }));
    expect(screen.getByText('フィールドを追加')).toBeDefined();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Release Date' }));
    expect(onAdd).toHaveBeenCalledWith('releaseDate');
  });
});
