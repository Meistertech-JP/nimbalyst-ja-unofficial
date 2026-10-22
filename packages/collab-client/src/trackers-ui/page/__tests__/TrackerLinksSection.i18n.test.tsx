// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { TrackerLinksSection } from '../TrackerLinksSection';

afterEach(cleanup);

test('the page links heading is Japanese', async () => {
  const i18n = await createI18nInstance('ja');
  const linksSource = {
    linksFor: async () => [{
      direction: 'out' as const,
      otherItemId: 'other',
      otherTitle: 'Another page',
      otherIssueKey: null,
      otherTypeId: 'unknown-type',
      predicateId: null,
      relationshipTypeKey: null,
      sourceFieldId: 'body:link',
      sentence: 'See another page.',
    }],
  };

  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja">
      <TrackerLinksSection linksSource={linksSource} itemId="current" />
    </UiLanguageProvider>,
  );

  expect(await screen.findByRole('heading', { name: 'リンク' })).toBeDefined();
});
