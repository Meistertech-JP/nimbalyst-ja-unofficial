// @vitest-environment jsdom
import React from 'react';
import { act, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { ALL_TRACKERS_NAV_MODEL, TrackerNavTypeRow } from '../TrackerNavTypeRow';
import { globalRegistry } from '@nimbalyst/tracker-schema';
import { parseBuiltinTrackers } from '@nimbalyst/runtime/plugins/TrackerPlugin/models/ModelLoader';

afterEach(cleanup);

describe('tracker navigation labels', () => {
  it('updates builtin names with the language while preserving customized names and type identities', async () => {
    const plan = parseBuiltinTrackers().find(model => model.type === 'plan')!;
    globalRegistry.register(plan, true);
    const i18n = await createI18nInstance('ja');
    const { container } = render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja">
        <TrackerNavTypeRow tracker={plan} selected />
        <TrackerNavTypeRow tracker={{ ...plan, displayNamePlural: 'Release plans' }} selected={false} />
        <TrackerNavTypeRow tracker={{ type: 'custom-plan', displayNamePlural: 'Plans' }} selected={false} />
      </UiLanguageProvider>,
    );
    for (const [language, label] of [['ja', 'プラン'], ['en', 'Plans'], ['ja', 'プラン']]) {
      await act(() => i18n.changeLanguage(language));
      const rows = container.querySelectorAll('button');
      expect(rows[0].querySelector('.text-left')?.textContent).toBe(label);
      expect(rows[0].getAttribute('data-tracker-type')).toBe('plan');
      expect(rows[1].querySelector('.text-left')?.textContent).toBe('Release plans');
      expect(rows[2].querySelector('.text-left')?.textContent).toBe('Plans');
    }
    expect(plan.displayNamePlural).toBe('Plans');
  });

  it.each([['ja', 'すべて'], ['en', 'All']] as const)(
    'localizes the synthetic all row in %s without translating user-defined names',
    async (locale, expected) => {
      const i18n = await createI18nInstance(locale);
      render(
        <UiLanguageProvider i18n={i18n} preference={locale} systemLocale={locale}>
          <TrackerNavTypeRow tracker={ALL_TRACKERS_NAV_MODEL} selected />
          <TrackerNavTypeRow tracker={{ type: 'custom', displayNamePlural: 'Plans' }} selected={false} />
        </UiLanguageProvider>,
      );
      expect(screen.getByText(expected)).toBeTruthy();
      expect(screen.getByText('Plans')).toBeTruthy();
    },
  );

  it('does not translate a user model even when its values match the synthetic model', async () => {
    const i18n = await createI18nInstance('ja');
    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
        <TrackerNavTypeRow tracker={ALL_TRACKERS_NAV_MODEL} selected />
        <TrackerNavTypeRow tracker={{ ...ALL_TRACKERS_NAV_MODEL }} selected={false} />
      </UiLanguageProvider>,
    );
    expect(screen.getByText('すべて')).toBeTruthy();
    expect(screen.getByText(ALL_TRACKERS_NAV_MODEL.displayNamePlural || ALL_TRACKERS_NAV_MODEL.displayName || ALL_TRACKERS_NAV_MODEL.type)).toBeTruthy();
  });
});
