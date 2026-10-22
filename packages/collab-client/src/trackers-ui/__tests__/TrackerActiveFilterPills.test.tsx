// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { TrackerActiveFilterPills } from '../TrackerActiveFilterPills';

const fields = [{
  id: 'status',
  label: 'Status',
  type: 'select' as const,
  options: [
    { value: 'in-review', label: 'In Review' },
    { value: 'done', label: 'Done' },
  ],
}];

describe('TrackerActiveFilterPills', () => {
  it('opens filter management from the pill and removes from its close control', async () => {
    const i18n = await createI18nInstance('en');
    const onManage = vi.fn();
    const onRemove = vi.fn();
    render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <TrackerActiveFilterPills
          fields={fields}
          filters={{
            combinator: 'and',
            clauses: [{ field: 'status', op: '=', value: 'done' }],
          }}
          onManage={onManage}
          onRemove={onRemove}
        />
      </UiLanguageProvider>,
    );

    fireEvent.click(screen.getByTitle('Manage filters'));
    expect(onManage).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('Remove Status filter'));
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('localizes operator, relative-day, and accessibility labels', async () => {
    const i18n = await createI18nInstance('ja');
    const onManage = vi.fn();
    const onRemove = vi.fn();
    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <TrackerActiveFilterPills
          fields={fields}
          filters={{
            combinator: 'and',
            clauses: [{ field: 'status', op: 'in-last', value: 7 }],
          }}
          onManage={onManage}
          onRemove={onRemove}
        />
      </UiLanguageProvider>,
    );
    screen.getByTitle('フィルターを管理');
    screen.getByLabelText('Statusフィルターを削除');
    expect(screen.getByTestId('tracker-active-filter-pill-0').textContent).toContain('直近');
    expect(screen.getByTestId('tracker-active-filter-pill-0').textContent).toContain('7日');
  });
});
