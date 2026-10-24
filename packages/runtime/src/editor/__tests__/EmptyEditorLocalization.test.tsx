// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { NimbalystEditor } from '../NimbalystEditor';

afterEach(cleanup);

it('updates the empty editor input hint and accessible placeholder when the language changes', async () => {
  const i18n = await createI18nInstance('ja');
  render(<I18nextProvider i18n={i18n}><NimbalystEditor config={{ emptyEditor: true }} /></I18nextProvider>);
  expect(await screen.findByText('リッチテキストを入力…')).toBeDefined();
  expect(screen.getByRole('textbox').getAttribute('aria-placeholder')).toBe('リッチテキストを入力…');
  await act(() => i18n.changeLanguage('en'));
  expect(screen.getByText('Enter some rich text...').textContent).toBe('Enter some rich text...');
  expect(screen.getByRole('textbox').getAttribute('aria-placeholder')).toBe('Enter some rich text...');
});
