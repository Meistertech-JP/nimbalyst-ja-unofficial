// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { createReadySavedView } from '../../trackers/trackerReadyQueue';
import { TrackerSavedViewsSection } from '../TrackerSavedViewsSection';

afterEach(cleanup);

describe('saved view product labels', () => {
  it('switches only the generated Ready label and passes the unchanged view when applied', async () => {
    const ready = createReadySavedView();
    const user = { ...ready, id: 'user-ready', builtIn: false };
    const renamed = { ...ready, id: 'user-custom', name: 'Ready for release', builtIn: false };
    const apply = vi.fn();
    const i18n = await createI18nInstance('ja');
    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja">
        <TrackerSavedViewsSection savedViews={[ready, user, renamed]} activeSavedViewId={null} isSharedLayout={false} onApplyView={apply} />
      </UiLanguageProvider>,
    );
    for (const language of ['ja', 'en', 'ja']) {
      await act(() => i18n.changeLanguage(language));
      const label = i18n.t('placed_filter_fields.ready', { ns: 'tracker' });
      const buttons = screen.getAllByRole('button');
      expect(buttons[0].querySelector('.truncate')?.textContent).toBe(label);
      expect(buttons[0].title).toBe(i18n.t('ui.apply_view', { ns: 'tracker', name: label }));
      expect(buttons[1].querySelector('.truncate')?.textContent).toBe('Ready');
      expect(buttons[2].querySelector('.truncate')?.textContent).toBe('Ready for release');
      fireEvent.click(buttons[0]);
      expect(apply).toHaveBeenLastCalledWith(ready);
    }
    expect(ready.name).toBe('Ready');
    expect(ready.id).toBe('builtin:ready');
    expect(ready.definition.columnFilters!.clauses[0].value).toBe('ready');
  });
});
