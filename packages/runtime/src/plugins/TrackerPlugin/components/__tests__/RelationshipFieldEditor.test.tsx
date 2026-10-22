import { beforeEach, describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { RelationshipFieldEditor } from '../RelationshipFieldEditor';
import type { FieldDefinition } from '@nimbalyst/tracker-schema';

const field: FieldDefinition = {
  name: 'dependsOn',
  type: 'relationship',
  relationshipTypeKey: 'depends-on',
  multiValue: true,
};

let testI18n: Awaited<ReturnType<typeof createI18nInstance>>;

const render = (ui: React.ReactElement) =>
  rtlRender(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);

beforeEach(async () => {
  testI18n = await createI18nInstance('en');
});

describe('RelationshipFieldEditor', () => {
  it('renders existing values as pills', () => {
    render(
      <RelationshipFieldEditor
        field={field}
        value={[{ itemId: 'a', issueKey: 'NIM-1' }]}
        onChange={() => {}}
      />,
    );
    screen.getByText('NIM-1');
  });

  it('adds a typed candidate and emits the multi-value array', () => {
    const onChange = vi.fn();
    render(
      <RelationshipFieldEditor
        field={field}
        value={null}
        onChange={onChange}
        candidates={[{ itemId: 'b', issueKey: 'NIM-2', title: 'Fix it', trackerType: 'bug' }]}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add link')); // open the collapsed add control
    const input = screen.getByPlaceholderText('Link an item…');
    fireEvent.change(input, { target: { value: 'NIM-2' } });
    fireEvent.click(screen.getByText('Add link'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0];
    expect(Array.isArray(arg)).toBe(true);
    expect(arg[0]).toMatchObject({ itemId: 'b', issueKey: 'NIM-2', trackerType: 'bug', direction: 'out', relationshipTypeKey: 'depends-on' });
  });

  it('removes a pill and emits the reduced array', () => {
    const onChange = vi.fn();
    render(
      <RelationshipFieldEditor
        field={field}
        value={[{ itemId: 'a', issueKey: 'NIM-1' }, { itemId: 'b', issueKey: 'NIM-2' }]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove NIM-1'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0];
    expect(arg).toEqual([{ itemId: 'b', issueKey: 'NIM-2' }]);
  });

  it('serializes single-value fields as one object (not an array)', () => {
    const onChange = vi.fn();
    const single: FieldDefinition = { ...field, multiValue: false };
    render(<RelationshipFieldEditor field={single} value={null} onChange={onChange} candidates={[{ itemId: 'b' }]} />);
    fireEvent.click(screen.getByLabelText('Add link')); // open the collapsed add control
    fireEvent.change(screen.getByPlaceholderText('Link an item…'), { target: { value: 'b' } });
    fireEvent.click(screen.getByText('Add link'));
    expect(onChange.mock.calls[0][0]).toMatchObject({ itemId: 'b' });
    expect(Array.isArray(onChange.mock.calls[0][0])).toBe(false);
  });

  it('keeps the add input collapsed until the "+" toggle is clicked', () => {
    render(<RelationshipFieldEditor field={field} value={null} onChange={() => {}} candidates={[{ itemId: 'b' }]} />);
    // Collapsed by default: only the toggle is shown, not the input.
    expect(screen.queryByPlaceholderText('Link an item…')).toBeNull();
    screen.getByLabelText('Add link');
    fireEvent.click(screen.getByLabelText('Add link'));
    screen.getByPlaceholderText('Link an item…');
  });

  it('does not add a hand-typed bare id that is not a resolved candidate', () => {
    const onChange = vi.fn();
    render(<RelationshipFieldEditor field={field} value={null} onChange={onChange} candidates={[{ itemId: 'b' }]} />);
    fireEvent.click(screen.getByLabelText('Add link'));
    fireEvent.change(screen.getByPlaceholderText('Link an item…'), { target: { value: 'not-a-candidate' } });
    fireEvent.click(screen.getByText('Add link'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('hides add/remove controls in readOnly mode', () => {
    render(<RelationshipFieldEditor field={field} value={[{ itemId: 'a', issueKey: 'NIM-1' }]} onChange={() => {}} readOnly />);
    expect(screen.queryByPlaceholderText('Link an item…')).toBeNull();
    expect(screen.queryByLabelText('Remove NIM-1')).toBeNull();
  });

  it('localizes empty state and add controls without changing user content', async () => {
    await testI18n.changeLanguage('ja');
    render(
      <RelationshipFieldEditor
        field={field}
        value={null}
        onChange={() => {}}
        candidates={[{ itemId: 'user_item', title: 'User supplied title' }]}
      />,
    );

    expect(screen.getByText('リンクはありません')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'リンクを追加' }));
    expect(screen.getByPlaceholderText('項目をリンク…')).toBeDefined();
    expect(screen.getByRole('combobox').getAttribute('list')).toBe('rel-cand-dependsOn');
    expect(screen.getByText('User supplied title').textContent).toBe('User supplied title');
  });
});
