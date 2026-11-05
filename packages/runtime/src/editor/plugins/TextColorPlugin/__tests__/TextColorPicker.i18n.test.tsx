import React from 'react';
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { LexicalEditor } from 'lexical';
import { TextColorPicker } from '../TextColorPicker';

const actions = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock('../textColorActions', () => ({
  $getSelectionTextColor: () => ({}),
  $setSelectionTextColor: actions.set,
}));

describe('text color picker language switching', () => {
  it('updates the open picker and retains palette identifiers when applying a color', async () => {
    const i18n = await createI18nInstance('ja');
    const editor = {
      getEditorState: () => ({ read: (fn: () => unknown) => fn() }),
      update: (fn: () => void) => fn(),
    } as unknown as LexicalEditor;
    render(<I18nextProvider i18n={i18n}><div className="nimbalyst-editor"><TextColorPicker editor={editor} buttonClassName="test" /></div></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: '文字色' }));
    expect(await screen.findByTitle('赤の文字')).toBeVisible();
    expect(screen.getByTitle('背景なし')).toBeVisible();
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByRole('button', { name: 'text color' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Red text' }));
    expect(actions.set).toHaveBeenLastCalledWith('color', '#f03e3e');
  });
});
