// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { describe, expect, it } from 'vitest';
import { TrackerDuplicateStrip } from '../TrackerDuplicateStrip';
import type { DuplicateMatch } from '../scoreTrackerDuplicates';

describe('TrackerDuplicateStrip localization', () => {
  it('renders duplicate counts, kind and local-key tooltip in Japanese', async () => {
    const i18n = await createI18nInstance('ja');
    const match: DuplicateMatch = {
      entry: {
        id: 'item-1',
        title: '重複する項目',
        type: 'bug',
        displayKey: 'NIM-1',
        keyIsShared: false,
      },
      score: 0.9,
      arms: ['semantic'],
    };

    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <TrackerDuplicateStrip
          matches={[match]}
          expanded
          onToggleExpanded={() => {}}
          activeIndex={0}
          onOpenItem={() => {}}
          onHoverItem={() => {}}
        />
      </UiLanguageProvider>,
    );

    expect(screen.getByText('重複候補 1 件')).toBeDefined();
    expect(screen.getByText('内容が類似')).toBeDefined();
    expect(screen.getByTitle('ローカル番号 — チーム共有の課題キーではありません')).toBeDefined();
    expect(screen.queryByText('1 possible duplicate')).toBeNull();
  });
});
