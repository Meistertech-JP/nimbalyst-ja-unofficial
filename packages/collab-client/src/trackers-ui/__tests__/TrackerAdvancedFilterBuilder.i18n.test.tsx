// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { TrackerAdvancedFilterBuilder } from '../TrackerAdvancedFilterBuilder';

afterEach(cleanup);

test('localizes the remove-clause accessibility label', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja">
      <TrackerAdvancedFilterBuilder
        filterFields={[{ id: 'status', label: 'Status', type: 'select', options: [{ value: 'open', label: 'Open' }] }]}
        filters={{ combinator: 'and', clauses: [{ field: 'status', op: '=', value: 'open' }] }}
        onFiltersChange={() => {}}
        onBack={() => {}}
        onClose={() => {}}
      />
    </UiLanguageProvider>,
  );

  expect(screen.getByRole('button', { name: 'フィルター1を削除' })).toBeDefined();
});
