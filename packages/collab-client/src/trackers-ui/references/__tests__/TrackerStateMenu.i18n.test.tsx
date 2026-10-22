// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { item, fakeDataSource, fakeSchema } from './referenceFixtures';
import { createTrackerReferenceResolver } from '../trackerReferenceResolver';
import { TrackerStateMenu } from '../TrackerStateMenu';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('TrackerStateMenu localization', () => {
  it('renders the shared-change footer in Japanese with the issue key', () => {
    const data = fakeDataSource();
    const resolver = createTrackerReferenceResolver(data.source, {
      schema: fakeSchema(),
      onOpenItem: () => {},
    });
    const trackerItem = item({ id: 'd-ja', issueKey: 'KW-26', type: 'wiki-decision', title: 'Keep files?', status: 'proposed' });

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <TrackerStateMenu resolver={resolver} item={trackerItem} />
      </UiLanguageProvider>,
    );

    const trigger = document.querySelector('[data-status="proposed"]');
    expect(trigger).not.toBeNull();
    fireEvent.click(trigger!);
    expect(screen.getByText('KW-26の変更は全員に反映されます。')).toBeTruthy();
  });
});
