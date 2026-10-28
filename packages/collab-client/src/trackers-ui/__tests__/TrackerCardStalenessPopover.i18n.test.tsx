// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import { TrackerCardStalenessPopover } from '../board/TrackerCardStalenessPopover';
import { TrackerCardStalenessChip } from '../board/TrackerCardStalenessChip';

afterEach(cleanup);

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
        <TrackerCardStalenessChip item={item} />
        <TrackerCardStalenessPopover item={item} reference={document.createElement('button')} onClose={() => {}} />
      </UiLanguageProvider>,
    );

    expect(screen.getByText('変更は行われていません。コミットを確認して判断してください。リンクされたセッションのコミットだけでは、このプランがリリースされた証拠にはなりません。')).toBeTruthy();
    expect(screen.getByText('下書きですが、リンクされたセッションでコミットが作成されています。')).toBeTruthy();
    expect(screen.getByText('下書きですがコミット済み？')).toBeTruthy();
    expect(screen.getByTestId('tracker-card-staleness-chip').getAttribute('aria-label')).toBe('下書きですが、リンクされたセッションでコミットが作成されています。');
    expect(screen.getByText('コミット')).toBeTruthy();
    expect(screen.getByText('セッション')).toBeTruthy();
    expect(screen.getByText('abc12345')).toBeTruthy();
    expect(screen.getByText('ses_42')).toBeTruthy();
  });

  it('updates plural evidence and chip accessibility labels on language changes', async () => {
    const i18n = await createI18nInstance('en');
    const item = {
      id: 'plan_2', primaryType: 'plan', typeTags: ['plan'], source: 'frontmatter', archived: false, syncStatus: 'local',
      system: {
        workspace: '/w', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
        linkedCommits: [
          { sha: 'abc1234567890def', message: 'first', sessionId: 'ses_42', timestamp: '2026-08-10T00:00:00.000Z' },
          { sha: 'def1234567890abc', message: 'second', sessionId: 'ses_43', timestamp: '2026-08-11T00:00:00.000Z' },
        ],
      },
      fields: { title: 'A plan', status: 'ready-for-development' },
    } as unknown as TrackerRecord;
    render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <TrackerCardStalenessChip item={item} />
        <TrackerCardStalenessPopover item={item} reference={document.createElement('button')} onClose={() => {}} />
      </UiLanguageProvider>,
    );
    expect(screen.getByText('Commits (2)')).toBeTruthy();
    expect(screen.getByText('Sessions (2)')).toBeTruthy();
    expect(screen.getByTestId('tracker-card-staleness-chip').getAttribute('aria-label')).toBe('Marked ready for development, but a linked session committed.');
    await act(async () => { await i18n.changeLanguage('ja'); });
    expect(screen.getByText('コミット（2件）')).toBeTruthy();
    expect(screen.getByText('セッション（2件）')).toBeTruthy();
    expect(screen.getByTestId('tracker-card-staleness-chip').getAttribute('aria-label')).toBe('開発着手可能ですが、リンクされたセッションでコミットが作成されています。');
    expect(screen.getByTestId('tracker-card-staleness-chip').getAttribute('title')).toBe('開発着手可能ですが、リンクされたセッションでコミットが作成されています。');
    expect(screen.getByText('abc12345')).toBeTruthy();
    expect(screen.getByText('ses_42')).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByText('Commits (2)')).toBeTruthy();
  });
});
