// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PlanFilters } from '../PlanFilters';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => cleanup());

describe('PlanFilters localization', () => {
  it('translates filter options, search, and completed toggle', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <PlanFilters
          searchTerm=""
          onSearchChange={() => undefined}
          statusFilter="all"
          onStatusChange={() => undefined}
          priorityFilter="all"
          onPriorityChange={() => undefined}
          hideCompleted={false}
          onHideCompletedChange={() => undefined}
        />
      </I18nextProvider>,
    );

    expect(screen.getByPlaceholderText('プランを検索…')).toBeDefined();
    expect(within(screen.getAllByRole('combobox')[0]).getByRole('option', { name: 'すべてのステータス' })).toBeDefined();
    expect(within(screen.getAllByRole('combobox')[1]).getByRole('option', { name: 'すべての優先度' })).toBeDefined();
    expect(screen.getByLabelText('完了を非表示')).toBeDefined();
  });
});
