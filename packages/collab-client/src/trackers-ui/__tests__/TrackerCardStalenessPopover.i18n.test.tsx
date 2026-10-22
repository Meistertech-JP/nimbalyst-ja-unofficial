// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import { TrackerCardStalenessPopover } from '../board/TrackerCardStalenessPopover';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('TrackerCardStalenessPopover localization', () => {
  it('renders fixed guidance in Japanese and preserves dynamic evidence', () => {
    const item = {
      id: 'plan_1',
      primaryType: 'plan',
      typeTags: ['plan'],
      source: 'frontmatter',
      archived: false,
      syncStatus: 'local',
      system: {
        workspace: '/w',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        linkedCommits: [{ sha: 'abc1234567890def', message: 'feat: land it', sessionId: 'ses_42', timestamp: '2026-08-10T00:00:00.000Z' }],
      },
      fields: { title: 'A plan', status: 'draft' },
    } as unknown as TrackerRecord;

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <TrackerCardStalenessPopover item={item} reference={document.createElement('button')} onClose={() => {}} />
      </UiLanguageProvider>,
    );

    expect(screen.getByText('変更は行われていません。コミットを確認して判断してください。リンクされたセッションのコミットだけでは、このプランがリリースされた証拠にはなりません。')).toBeTruthy();
    expect(screen.getByText('abc12345')).toBeTruthy();
    expect(screen.getByText('ses_42')).toBeTruthy();
  });
});
