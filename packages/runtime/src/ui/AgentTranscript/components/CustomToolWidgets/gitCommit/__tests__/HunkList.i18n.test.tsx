import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { HunkList } from '../HunkList';

it('localizes the hunk exclusion summary and checkbox labels', async () => {
  const i18n = await createI18nInstance('ja');
  const state = {
    hunks: [
      { index: 0, oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, section: '', lines: [] },
      { index: 1, oldStart: 3, oldLines: 1, newStart: 3, newLines: 1, section: '', lines: [] },
    ],
    selected: new Set([0]),
    sessionOwned: new Set([0]),
    selectable: true,
  } as any;

  render(
    <I18nextProvider i18n={i18n}>
      <HunkList
        filePath="src/example.ts"
        state={state}
        siblingSessionLabel="別のセッション"
        onToggleHunk={() => {}}
        onSelectAll={() => {}}
      />
    </I18nextProvider>,
  );

  expect(screen.getByTestId('git-commit-hunk-exclusion-banner').textContent)
    .toContain('1件の差分を除外（セッション「別のセッション」で編集された可能性があります）。');
  expect(screen.getByRole('button', { name: 'この差分を除外' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'この差分を含める' })).toBeTruthy();
});
