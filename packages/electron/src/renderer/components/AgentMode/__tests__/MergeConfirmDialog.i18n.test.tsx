// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { MergeConfirmDialog } from '../MergeConfirmDialog';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(cleanup);

function renderDialog(i18n: typeof englishI18n) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MergeConfirmDialog
        worktreePath="C:/projects/app/.worktrees/feature"
        workspacePath="C:/projects/app"
        hasUncommittedChanges
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </I18nextProvider>
  );
}

describe('MergeConfirmDialog localization', () => {
  it('renders localized copy and preserves dynamic worktree and project names', () => {
    const { rerender } = renderDialog(englishI18n);
    expect(screen.getByRole('heading', { name: 'Merge to Main' })).toBeDefined();
    expect(screen.getByText('Are you sure you want to merge feature into the main branch of app?')).toBeDefined();
    expect(screen.getByText('Your uncommitted changes will be preserved. Only committed work will be merged.')).toBeDefined();
    expect(screen.getByText('Merge')).toBeDefined();

    rerender(
      <I18nextProvider i18n={japaneseI18n}>
        <MergeConfirmDialog
          worktreePath="C:/projects/app/.worktrees/feature"
          workspacePath="C:/projects/app"
          hasUncommittedChanges
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole('heading', { name: 'メインへマージ' })).toBeDefined();
    expect(screen.getByText('featureをappのメインブランチにマージしますか？')).toBeDefined();
    expect(screen.getByText('未コミットの変更は保持されます。マージされるのはコミット済みの作業だけです。')).toBeDefined();
    expect(screen.getByText('マージ')).toBeDefined();
  });
});
