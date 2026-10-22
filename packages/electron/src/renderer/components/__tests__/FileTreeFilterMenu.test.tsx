// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { FileTreeFilterMenu } from '../FileTreeFilterMenu';

afterEach(cleanup);

it('shows the file filters in Japanese', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <FileTreeFilterMenu
        x={0}
        y={0}
        currentFilter="all"
        showIcons
        showGitStatus
        enableAutoScroll
        onFilterChange={vi.fn()}
        onShowIconsChange={vi.fn()}
        onShowGitStatusChange={vi.fn()}
        onEnableAutoScrollChange={vi.fn()}
        hasActiveClaudeSession={false}
        claudeSessionFileCounts={{ read: 2, written: 1 }}
        isGitRepo={false}
        gitUncommittedCount={3}
        isGitWorktree
        gitWorktreeCount={4}
        onClose={vi.fn()}
      />
    </UiLanguageProvider>
  );

  for (const label of [
    '表示するファイル',
    'すべてのファイル',
    'Markdownのみ',
    '既知のファイル形式',
    '未コミットの変更',
    'ワークツリーの変更',
    'Gitリポジトリではありません。',
    'Claude Agentセッション',
    '読み取ったファイル',
    '変更したファイル',
    'これらのフィルターを使用するには、Claude Agentセッションを開いてください。',
    'アイコンを表示',
    'Gitステータスを表示',
    '使用中のファイルへ自動スクロール',
  ]) {
    expect(screen.getByText(label)).toBeDefined();
  }
});
