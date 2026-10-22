import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';

import { TrackerReferenceRelationMenu } from '../TrackerReferenceRelationMenu';

describe('TrackerReferenceRelationMenu localization', () => {
  it('localizes the plain-link choice and relation label', async () => {
    const i18n = await createI18nInstance('ja');

    render(
      <I18nextProvider i18n={i18n}>
        <TrackerReferenceRelationMenu
          options={[{ predicateId: 'relates_to', label: 'Related', inverseLabel: 'Related', direction: 'symmetric' }]}
          relation={null}
          onChoose={vi.fn()}
        />
      </I18nextProvider>,
    );

    expect(screen.getByRole('radiogroup', {name: 'リンクの種類'})).toBeTruthy();
    expect(screen.getByRole('radio', {name: /通常のリンク/})).toBeTruthy();
    expect(screen.getByText('関係なし')).toBeTruthy();
  });

  it('localizes the read-only linked-as label', async () => {
    const i18n = await createI18nInstance('ja');

    render(
      <I18nextProvider i18n={i18n}>
        <TrackerReferenceRelationMenu options={[]} relation="depends_on" relationLabel="依存先" />
      </I18nextProvider>,
    );

    expect(screen.getByText(/関連付け/)).toBeTruthy();
    expect(screen.getByText('依存先')).toBeTruthy();
  });
});
