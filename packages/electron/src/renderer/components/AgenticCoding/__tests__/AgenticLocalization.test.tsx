// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatAttachment } from '@nimbalyst/runtime';
import { WorktreeBaseBranchPicker } from '../WorktreeBaseBranchPicker';
import { IndexBuildDialog } from '../IndexBuildDialog';
import { AttachmentPreview, ProcessingAttachmentPreview } from '../AttachmentPreview';
import { ArchiveProgress } from '../ArchiveProgress';
import { SessionContextMenu } from '../SessionContextMenu';

vi.mock('../../../hooks/useFloatingMenu', () => ({
  useFloatingMenu: () => ({
    refs: { setFloating: () => {}, setReference: () => {} },
    floatingStyles: {}, getFloatingProps: () => ({}),
  }),
  virtualElement: () => ({}),
  FloatingPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

beforeEach(async () => { await i18next.changeLanguage('ja'); });
afterEach(async () => { cleanup(); await i18next.changeLanguage('en'); });

describe('agentic localized presentation', () => {
  it('validates names in Japanese without changing branch identifiers or refetching on language changes', async () => {
    const invoke = vi.fn(async (channel: string) => channel === 'git:branches'
      ? { branches: ['main', 'feature/keep-me', 'remotes/origin/main'], current: 'main' }
      : { success: true });
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke } });
    const onCreate = vi.fn(async () => {});
    render(<WorktreeBaseBranchPicker isOpen workspacePath="/workspace" onCreate={onCreate} onCancel={() => {}} />);
    expect(await screen.findByRole('group', { name: 'ローカルブランチ' })).toBeTruthy();
    expect(screen.getByText('現在')).toBeTruthy();
    const input = screen.getByTestId('worktree-name-input');
    expect(document.querySelector('label[for="worktree-name-input"]')?.textContent).toBe('ワークツリー名');
    fireEvent.change(input, { target: { value: 'bad..name' } });
    expect(screen.getByTestId('worktree-name-error').textContent).toBe('ワークツリー名に .. を含めることはできません');
    expect((screen.getByTestId('worktree-base-branch-create') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'topic/keep-me' } });
    const requestCount = invoke.mock.calls.length;
    await act(async () => { await i18next.changeLanguage('en'); });
    expect(screen.getByRole('group', { name: 'Local branches' }).getAttribute('aria-labelledby')).toBe('worktree-branch-section-local-branches');
    expect(invoke).toHaveBeenCalledTimes(requestCount);
    await act(async () => { await i18next.changeLanguage('ja'); });
    fireEvent.click(screen.getByTestId('worktree-base-branch-create'));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({ baseBranch: 'main', name: 'topic/keep-me' }));
  });

  it('keeps the index message count emphasized and preserves skip/build actions', () => {
    const onBuild = vi.fn();
    const onSkip = vi.fn();
    const { container } = render(<IndexBuildDialog isOpen messageCount={12345} isBuilding={false} onBuild={onBuild} onSkip={onSkip} />);
    expect(screen.getByText('検索インデックスを作成しますか？')).toBeTruthy();
    expect(container.querySelector('strong')?.textContent).toBe('12,345');
    expect(container.querySelector('p')?.textContent).toContain('件のメッセージがあります');
    fireEvent.click(screen.getByRole('button', { name: 'インデックスを作成' }));
    fireEvent.click(screen.getByRole('button', { name: '今回はスキップ' }));
    expect(onBuild).toHaveBeenCalledOnce();
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('localizes attachment affordances and preserves the user filename and attachment ID', () => {
    const onRemove = vi.fn();
    const attachment = { id: 'attachment-original', type: 'image', filename: 'User Picture.png', filepath: '/workspace/image.png', size: 1024 } as ChatAttachment;
    render(<><ProcessingAttachmentPreview filename="User Document.txt" /><AttachmentPreview attachment={attachment} onRemove={onRemove} /></>);
    expect(screen.getByText('User Document.txt')).toBeTruthy();
    expect(screen.getByText(i18next.t('aichat:attachments.processing'))).toBeTruthy();
    expect(screen.getByAltText('User Picture.png')).toBeTruthy();
    expect(screen.getByTitle(i18next.t('aichat:attachments.enlarge'))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: i18next.t('aichat:attachments.remove') }));
    expect(onRemove).toHaveBeenCalledWith('attachment-original');
  });

  it('renders archive statuses in Japanese without replacing backend error details', async () => {
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: {
      archive: {
        getTasks: vi.fn(async () => ({ success: true, tasks: [
          { worktreeId: 'one', worktreeName: 'User worktree', status: 'removing-worktree', startTime: new Date() },
          { worktreeId: 'two', worktreeName: 'Failed worktree', status: 'failed', error: 'ELOCK: custom detail', startTime: new Date() },
        ] })),
        onProgress: vi.fn(() => () => {}),
      },
    } });
    render(<ArchiveProgress />);
    fireEvent.click(await screen.findByRole('button', { name: /アーカイブ処理/ }));
    expect(screen.getByText(i18next.t('dialogs:archive.removing'))).toBeTruthy();
    expect(screen.getByText('ELOCK: custom detail')).toBeTruthy();
    expect(screen.getByText('User worktree')).toBeTruthy();
  });

  it('uses natural Japanese multi-selection archive labels and invokes the same action', () => {
    const onArchive = vi.fn();
    const onClose = vi.fn();
    render(<Provider store={createStore()}><SessionContextMenu
      sessionId="session-original" title="User title" position={{ x: 0, y: 0 }}
      onClose={onClose} onArchive={onArchive} selectedCount={3}
    /></Provider>);
    fireEvent.click(screen.getByText('3件のセッションをアーカイブ'));
    expect(onArchive).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
