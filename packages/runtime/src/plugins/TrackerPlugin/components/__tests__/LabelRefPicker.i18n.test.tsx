import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';

import { LabelRefPicker } from '../LabelRefPicker';

describe('LabelRefPicker localization', () => {
  it('localizes the empty state in Japanese', async () => {
    const i18n = await createI18nInstance('ja');

    render(
      <I18nextProvider i18n={i18n}>
        <LabelRefPicker value={[]} onChange={() => {}} registry={{ labels: [] } as never} />
      </I18nextProvider>,
    );

    expect(screen.getByText('このプロジェクトにはラベルがありません。')).toBeTruthy();
  });
});
