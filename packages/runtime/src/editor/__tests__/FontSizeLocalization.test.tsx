import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { LexicalEditor } from 'lexical';

import FontSize from '../plugins/ToolbarPlugin/fontSize';

describe('FontSize localization', () => {
  it('localizes accessible labels and title', async () => {
    const i18n = await createI18nInstance('ja');

    render(
      <I18nextProvider i18n={i18n}>
        <FontSize selectionFontSize="14" disabled={false} editor={{} as LexicalEditor} />
      </I18nextProvider>,
    );

    expect(screen.getByRole('button', {name: 'フォントサイズを小さく'})).toBeTruthy();
    expect(screen.getByRole('button', {name: 'フォントサイズを大きく'})).toBeTruthy();
    expect(screen.getByTitle('フォントサイズ')).toBeTruthy();
    expect(screen.getByTitle(/フォントサイズを小さく/)).toBeTruthy();
  });
});
