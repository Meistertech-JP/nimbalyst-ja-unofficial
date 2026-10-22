// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { TeamTypesNotSyncingNotice } from '../TeamTypesNotSyncingNotice';

vi.mock('../teamTypeSharing', () => ({
  useTeamTypesNotSyncing: () => true,
}));

afterEach(cleanup);

it('renders the disconnected team-types status in Japanese', async () => {
  const i18n = await createI18nInstance('ja');

  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <TeamTypesNotSyncingNotice workspacePath="/workspace" />
    </UiLanguageProvider>,
  );

  expect(screen.getByRole('status').textContent)
    .toBe('チームタイプを同期できていません。このプロジェクトのトラッカー同期が接続されていません。');
});
