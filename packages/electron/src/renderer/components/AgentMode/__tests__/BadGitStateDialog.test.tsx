// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { BadGitStateDialog } from '../BadGitStateDialog';

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
      <BadGitStateDialog
        worktreePath="C:/projects/app/.worktrees/feature"
        errorMessage="merge command failed: exit code 1"
        conflictedFiles={['src/file.ts']}
        agentModels={[]}
        selectedModel="model-1"
        isLoadingModels={false}
        onModelChange={() => {}}
        onResolveWithAgent={() => {}}
        onCancel={() => {}}
      />
    </I18nextProvider>
  );
}

describe('BadGitStateDialog localization', () => {
  it('renders the localized title, body, file label, suggestion, and actions', () => {
    const { rerender } = renderDialog(englishI18n);
    expect(screen.getByRole('heading', { name: 'Git Operation Failed' })).toBeDefined();
    expect(screen.getByText('Cannot perform git operation on feature.')).toBeDefined();
    expect(screen.getByText('Conflicted Files:')).toBeDefined();
    expect(screen.getByText('An AI agent can help you resolve these conflicts automatically, or you can resolve them manually.')).toBeDefined();
    expect(screen.getByText('Worktree location:')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
    expect(screen.getByText('Resolve with Agent')).toBeDefined();

    rerender(
      <I18nextProvider i18n={japaneseI18n}>
        <BadGitStateDialog
          worktreePath="C:/projects/app/.worktrees/feature"
          errorMessage="merge command failed: exit code 1"
          conflictedFiles={['src/file.ts']}
          agentModels={[]}
          selectedModel="model-1"
          isLoadingModels={false}
          onModelChange={() => {}}
          onResolveWithAgent={() => {}}
          onCancel={() => {}}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole('heading', { name: 'Git操作に失敗しました' })).toBeDefined();
    expect(screen.getByText('featureでGit操作を実行できません。')).toBeDefined();
    expect(screen.getByText('競合ファイル：')).toBeDefined();
    expect(screen.getByText('AIエージェントに競合を自動解決させることも、手動で解決することもできます。')).toBeDefined();
    expect(screen.getByText('ワークツリーの場所：')).toBeDefined();
    expect(screen.getByRole('button', { name: '閉じる' })).toBeDefined();
    expect(screen.getByText('エージェントで解決')).toBeDefined();
    expect(screen.getByText('merge command failed: exit code 1')).toBeDefined();
    expect(screen.getByText('src/file.ts')).toBeDefined();
    expect(screen.getByText('C:/projects/app/.worktrees/feature')).toBeDefined();
  });
});
