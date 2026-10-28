// @vitest-environment jsdom
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { ALL_TRACKERS_NAV_MODEL, TrackerNavTypeRow } from '../TrackerNavTypeRow';

afterEach(cleanup);

describe('tracker navigation labels', () => {
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
