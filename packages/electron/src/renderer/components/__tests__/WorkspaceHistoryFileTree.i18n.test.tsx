// @vitest-environment jsdom

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceHistoryFileTree } from '../WorkspaceHistoryDialog/WorkspaceHistoryFileTree';

vi.mock('@nimbalyst/runtime', () => ({
  getFileIcon: vi.fn(() => 'description'),
}));

describe('WorkspaceHistoryFileTree localization', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('en');
  });

  afterEach(async () => {
    cleanup();
    await i18next.changeLanguage('en');
  });

  it('updates the empty state when the UI language changes', async () => {
    render(
      <WorkspaceHistoryFileTree
        files={[]}
        workspacePath="/workspace"
        selectedFilePath={null}
        selectedDeletedFiles={new Set()}
        onFileSelect={vi.fn()}
        onDeletedFileToggle={vi.fn()}
      />,
    );

    expect(screen.getByText('No files with history in this workspace')).toBeTruthy();

    await act(async () => {
      await i18next.changeLanguage('ja');
    });

    expect(
      screen.getByText('このワークスペースには履歴のあるファイルがありません'),
    ).toBeTruthy();
    expect(screen.queryByText('No files with history in this workspace')).toBeNull();
  });

  it('auto-expands the selected file path and localizes the deleted label', async () => {
    const onFileSelect = vi.fn();
    const onDeletedFileToggle = vi.fn();
    const deletedFilePath = '/workspace/docs/deleted.md';
    const { container } = render(
      <WorkspaceHistoryFileTree
        files={[
          {
            path: deletedFilePath,
            latestTimestamp: 1,
            snapshotCount: 2,
            exists: false,
          },
        ]}
        workspacePath="/workspace"
        selectedFilePath={deletedFilePath}
        selectedDeletedFiles={new Set()}
        onFileSelect={onFileSelect}
        onDeletedFileToggle={onDeletedFileToggle}
      />,
    );

    expect(await screen.findByText('deleted.md')).toBeTruthy();
    expect(screen.getByText('(deleted)')).toBeTruthy();

    fireEvent.click(screen.getByText('deleted.md'));
    expect(onFileSelect).toHaveBeenCalledWith(deletedFilePath);

    const checkbox = container.querySelector('.workspace-history-deleted-checkbox');
    expect(checkbox).not.toBeNull();
    fireEvent.click(checkbox!);
    expect(onDeletedFileToggle).toHaveBeenCalledWith(deletedFilePath, true);

    await act(async () => {
      await i18next.changeLanguage('ja');
    });

    expect(screen.getByText('（削除済み）')).toBeTruthy();
    expect(screen.queryByText('(deleted)')).toBeNull();
  });
});
