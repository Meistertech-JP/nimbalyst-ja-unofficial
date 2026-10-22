// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { Readiness } from '../../models/trackerReadiness';
import { TrackerBlockedChip } from '../TrackerBlockedChip';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

function renderChip(readiness: Readiness) {
  return render(
    <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
      <TrackerBlockedChip readiness={readiness} />
    </UiLanguageProvider>,
  );
}

describe('TrackerBlockedChip localization', () => {
  it('localizes the blocker count accessible label', () => {
    renderChip({
      state: 'blocked',
      blockedBy: [{ itemId: 'blocker-1', ref: 'NIM-1', refStatus: 'assigned', title: 'Setup', type: 'task', status: 'In Progress', statusCategory: 'started' }],
      unresolvedBlockerIds: [],
      unblocks: 0,
      inCycle: false,
      trackId: 'track-1',
    });

    expect(screen.getByTestId('tracker-blocked-chip').getAttribute('aria-label')).toBe('1件の項目にブロックされています');
  });

  it('localizes the unresolved dependency accessible label', () => {
    renderChip({
      state: 'ready',
      blockedBy: [],
      unresolvedBlockerIds: ['missing-1'],
      unblocks: 0,
      inCycle: false,
      trackId: 'track-2',
    });

    expect(screen.getByTestId('tracker-broken-link-chip').getAttribute('aria-label')).toContain('依存関係が1件あります');
  });
});
