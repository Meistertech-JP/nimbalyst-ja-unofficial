// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

vi.mock('jotai', () => ({
  atom: (initialValue: unknown) => ({ key: 'version', initialValue }),
  useAtomValue: (target: { key?: string }) => target.key === 'theme' ? 'dark' : 0,
}));
vi.mock('@nimbalyst/runtime/store', () => ({ themeIdAtom: { key: 'theme' } }));
vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: ({ icon, title }: { icon: string; title?: string }) => <span aria-hidden="true" title={title}>{icon}</span>,
}));
vi.mock('../../hooks/useTheme', () => ({
  getAllAvailableThemesAsync: vi.fn(() => new Promise<never[]>(() => {})),
}));
vi.mock('../../help', () => ({ HelpTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { DiffPreview } from '../DiffPreview/DiffPreview';
import { WorkspaceHistoryFileTree } from '../WorkspaceHistoryDialog/WorkspaceHistoryFileTree';
import { TerminalTab } from '../TerminalBottomPanel/TerminalTab';
import { ThemeToggleButton } from '../ThemeToggleButton/ThemeToggleButton';

afterEach(cleanup);

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

function renderJapanese(ui: React.ReactElement) {
  return render(
    <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
      {ui}
    </UiLanguageProvider>,
  );
}

describe('focused UI component localization', () => {
  it('localizes diff preview actions and keeps their callbacks', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    renderJapanese(<DiffPreview original="old" modified="new" onAccept={onAccept} onReject={onReject} />);

    expect(screen.getByRole('heading', { name: '提案された変更' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '変更を承認' }));
    fireEvent.click(screen.getByRole('button', { name: '却下' }));
    expect(onAccept).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();
  });

  it('localizes workspace history empty and deleted file labels', () => {
    const props = {
      workspacePath: 'C:/workspace',
      selectedFilePath: null,
      selectedDeletedFiles: new Set<string>(),
      onFileSelect: vi.fn(),
      onDeletedFileToggle: vi.fn(),
    };
    const { rerender } = renderJapanese(<WorkspaceHistoryFileTree {...props} files={[]} />);
    expect(screen.getByText('このワークスペースには履歴のあるファイルがありません')).toBeTruthy();

    rerender(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <WorkspaceHistoryFileTree
          {...props}
          files={[{ path: 'C:/workspace/removed.md', latestTimestamp: 1, snapshotCount: 1, exists: false }]}
        />
      </UiLanguageProvider>,
    );
    expect(screen.getByText('（削除済み）')).toBeTruthy();
  });

  it('localizes terminal tab titles and close tooltip without changing the tab name', () => {
    const onClose = vi.fn();
    renderJapanese(
      <TerminalTab
        terminal={{
          id: 'terminal-1', title: 'Terminal 1', shellName: 'PowerShell', shellPath: 'pwsh.exe',
          cwd: 'C:/workspace', worktreeId: 'worktree-1', worktreeName: 'feature/task',
          createdAt: 1, lastActiveAt: 1,
        }}
        isActive isActiveWorktree terminalIndex={0} terminalCount={1} isCommandRunning
        onSelect={vi.fn()} onClose={onClose} onCloseOthers={vi.fn()} onCloseAll={vi.fn()} onCloseToRight={vi.fn()}
      />,
    );

    expect(screen.getByTitle(/シェル: PowerShell/)).toBeTruthy();
    expect(screen.getByTitle('現在のワークツリーのターミナル')).toBeTruthy();
    expect(screen.getByTitle('コマンド実行中')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'ターミナルを閉じる' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByRole('tab').textContent).toContain('feature/task');
  });

  it('localizes theme control accessibility names', () => {
    renderJapanese(<ThemeToggleButton />);
    fireEvent.click(screen.getByRole('button', { name: 'テーマを変更' }));
    expect(screen.getByRole('menu', { name: 'テーマの選択' })).toBeTruthy();
  });
});
