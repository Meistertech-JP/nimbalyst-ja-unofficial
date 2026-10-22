import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';

import { FilterChip } from '../FilterChip';

describe('FilterChip localization', () => {
  it('renders Japanese filter controls, headings, and placeholder', async () => {
    const i18n = await createI18nInstance('ja');
    render(
      <I18nextProvider i18n={i18n}>
        <FilterChip
          label="拡張子"
          value=".ts"
          onChange={vi.fn()}
          options={[{ value: '.ts', label: 'TypeScript' }]}
          history={['.tsx']}
          onRemoveFromHistory={vi.fn()}
          freeText
        />
      </I18nextProvider>,
    );

    expect(screen.getByTitle('フィルターをクリア')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /拡張子/ }));

    expect(screen.getByText('すべて')).toBeTruthy();
    expect(screen.getByText('候補')).toBeTruthy();
    expect(screen.getByText('最近使用')).toBeTruthy();
    expect(screen.getByTitle('履歴から削除')).toBeTruthy();
    expect(screen.getByText('カスタム')).toBeTruthy();
    expect(screen.getByPlaceholderText('絞り込み…')).toBeTruthy();
  });
});
