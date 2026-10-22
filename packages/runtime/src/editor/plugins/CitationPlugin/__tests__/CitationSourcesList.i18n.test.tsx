import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { LexicalEditor } from 'lexical';

import CitationSourcesList from '../CitationSourcesList';

describe('CitationSourcesList localization', () => {
  it('renders the Japanese empty state', async () => {
    const i18n = await createI18nInstance('ja');

    render(
      <I18nextProvider i18n={i18n}>
        <CitationSourcesList editor={null as unknown as LexicalEditor} />
      </I18nextProvider>,
    );

    expect(screen.getByText('このページには引用元がありません。')).toBeTruthy();
  });
});
