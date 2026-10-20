// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';
import { ArchiveWorktreeDialog } from '../ArchiveWorktreeDialog';

vi.mock('@nimbalyst/runtime', () => ({ MaterialSymbol: () => null }));

describe('archive worktree localization', () => {
  afterEach(async () => { cleanup(); await i18next.changeLanguage('en'); });

  it.each([1, 2])('formats %s unmerged commits and leaves archive confirmation callbacks intact', async count => {
    const archive = vi.fn();
    const keep = vi.fn();
    render(<ArchiveWorktreeDialog worktreeName="User worktree" hasUnmergedChanges unmergedCommitCount={count} onArchive={archive} onKeep={keep} />);
    expect(screen.getByText(count === 1
      ? "This branch has 1 commit that hasn't been merged to the base branch."
      : "This branch has 2 commits that haven't been merged to the base branch.")).toBeTruthy();
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText(`このブランチにはベースブランチにマージされていないコミットが${count}件あります。`)).toBeTruthy();
    expect(archive).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'ワークツリーを保持' }));
    expect(keep).toHaveBeenCalledOnce();
    expect(archive).not.toHaveBeenCalled();
  });

  it('localizes bulk commit totals and file counters', async () => {
    await i18next.changeLanguage('ja');
    render(<ArchiveWorktreeDialog worktreeCount={3} hasUnmergedChanges unmergedCommitCount={4} unmergedWorktreeCount={2} hasUncommittedChanges uncommittedFileCount={5} uncommittedWorktreeCount={1} onArchive={vi.fn()} onKeep={vi.fn()} />);
    expect(screen.getByText('2件のワークツリーに未マージのコミットがあります（合計4件のコミット）。')).toBeTruthy();
    expect(screen.getByText(/合計5件/)).toBeTruthy();
    expect(screen.queryByText(/total/)).toBeNull();
  });
});
