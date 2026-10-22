// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { loadBuiltinTrackers } from '@nimbalyst/runtime/plugins/TrackerPlugin/models';
import { TrackerSharingMigrationBanner } from '../TrackerSharingMigrationBanner';

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: () => null,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('explains the sharing migration in Japanese and records acknowledgement', async () => {
  loadBuiltinTrackers();
  const invoke = vi.fn(async (channel: string) => {
    if (channel === 'workspace:get-state') {
      return {
        trackerSharingMigration: {
          version: 1,
          migratedAt: 2000,
          entries: [],
          divergences: [{
            trackerType: 'plan',
            legacySchemaMode: 'shared',
            legacyItemMode: 'local',
            sharing: 'team',
            draftByDefault: true,
            diverged: true,
          }],
        },
      };
    }
    return undefined;
  });
  vi.stubGlobal('electronAPI', { invoke });
  const i18n = await createI18nInstance('ja');

  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <TrackerSharingMigrationBanner workspacePath="/workspace" teamName="チーム" />
    </UiLanguageProvider>,
  );

  expect(await screen.findByText('共有設定がトラッカー単位になりました')).toBeDefined();
  expect(screen.getByText(/各トラッカーは、フィールドと項目をまとめて/).textContent)
    .toContain('実際に使用していた設定が引き継がれました');
  expect(screen.getByText('チームトラッカーとして共有され、新しい項目は下書きで作成されます'))
    .toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: '確認しました' }));

  expect(invoke).toHaveBeenCalledWith('workspace:update-state', '/workspace', {
    trackerSharingMigrationSeenAt: 2000,
  });
  expect(screen.queryByTestId('tracker-sharing-migration-banner')).toBeNull();
});
