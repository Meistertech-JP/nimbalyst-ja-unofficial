// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryDialog } from '../HistoryDialog/HistoryDialog';
import { WorkspaceHistoryDialog } from '../WorkspaceHistoryDialog/WorkspaceHistoryDialog';

const historyMocks = vi.hoisted(() => ({
  snapshots: [] as Array<{
    timestamp: string;
    type: 'manual';
    size: number;
    baseMarkdownHash: string;
  }>,
  refreshSnapshots: vi.fn(),
  loadSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
}));

vi.mock('../../hooks/useHistory', () => ({
  useHistory: () => ({
    snapshots: historyMocks.snapshots,
    loading: false,
    refreshSnapshots: historyMocks.refreshSnapshots,
    loadSnapshot: historyMocks.loadSnapshot,
    deleteSnapshot: historyMocks.deleteSnapshot,
  }),
}));

vi.mock('posthog-js/react', () => ({
  usePostHog: () => undefined,
}));

vi.mock('@nimbalyst/runtime', () => ({
  ProviderIcon: () => null,
  MarkdownEditor: () => <div data-testid="history-markdown-preview" />,
  MonacoEditor: () => <div data-testid="history-monaco-preview" />,
}));

vi.mock('../HistoryDialog/DiffPreviewEditor', () => ({
  DiffPreviewEditor: () => <div data-testid="history-rich-diff" />,
}));

vi.mock('../HistoryDialog/TextDiffViewer', () => ({
  TextDiffViewer: () => <div data-testid="history-text-diff" />,
}));

vi.mock('../HistoryDialog/MonacoDiffViewer', () => ({
  MonacoDiffViewer: () => <div data-testid="history-monaco-diff" />,
}));

vi.mock('../HistoryDialog/ImageDiffViewer', () => ({
  ImageDiffViewer: () => <div data-testid="history-image-diff" />,
}));

vi.mock('../WorkspaceHistoryDialog/WorkspaceHistoryFileTree', () => ({
  WorkspaceHistoryFileTree: ({
    files,
    onFileSelect,
  }: {
    files: Array<{ path: string }>;
    onFileSelect: (path: string) => void;
  }) => (
    <button type="button" onClick={() => onFileSelect(files[0].path)}>
      Select history file
    </button>
  ),
}));

describe('empty history snapshots', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('en');
    historyMocks.snapshots = [];
    historyMocks.refreshSnapshots.mockReset();
    historyMocks.loadSnapshot.mockReset();
    historyMocks.deleteSnapshot.mockReset();
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    await i18next.changeLanguage('en');
  });

  it('clears a prior HistoryDialog load error when a snapshot successfully returns an empty string', async () => {
    historyMocks.snapshots = [
      {
        timestamp: '2026-08-12T02:00:00.000Z',
        type: 'manual',
        size: 10,
        baseMarkdownHash: 'newer',
      },
      {
        timestamp: '2026-08-12T01:00:00.000Z',
        type: 'manual',
        size: 0,
        baseMarkdownHash: 'empty',
      },
    ];
    historyMocks.loadSnapshot
      .mockRejectedValueOnce(new Error('snapshot unavailable'))
      .mockResolvedValueOnce('');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <HistoryDialog
        isOpen
        onClose={vi.fn()}
        filePath="/workspace/notes.md"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Full' }));
    fireEvent.click(screen.getByTestId('history-item-0'));

    expect(await screen.findByText('Failed to load snapshot')).toBeTruthy();

    fireEvent.click(screen.getByTestId('history-item-1'));

    await waitFor(() => {
      expect(screen.queryByText('Failed to load snapshot')).toBeNull();
      expect(screen.getByTestId('history-markdown-preview')).toBeTruthy();
    });
    expect(historyMocks.loadSnapshot).toHaveBeenLastCalledWith('2026-08-12T01:00:00.000Z');
  });

  it('clears a prior WorkspaceHistoryDialog load error when reloading an empty snapshot succeeds', async () => {
    const filePath = '/workspace/empty.txt';
    historyMocks.snapshots = [
      {
        timestamp: '2026-08-12T01:00:00.000Z',
        type: 'manual',
        size: 0,
        baseMarkdownHash: 'empty',
      },
    ];
    historyMocks.loadSnapshot
      .mockRejectedValueOnce(new Error('snapshot unavailable'))
      .mockResolvedValueOnce('');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const invoke = vi.fn(async (channel: string) => {
      if (channel === 'history:list-workspace-files') {
        return [{
          path: filePath,
          latestTimestamp: Date.parse('2026-08-12T01:00:00.000Z'),
          snapshotCount: 1,
        }];
      }
      if (channel === 'history:check-files-exist') {
        return { [filePath]: true };
      }
      throw new Error(`Unexpected IPC channel: ${channel}`);
    });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { invoke },
    });

    const { container } = render(
      <WorkspaceHistoryDialog
        isOpen
        onClose={vi.fn()}
        workspacePath="/workspace"
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Select history file' }));
    const snapshotItem = await waitFor(() => {
      const item = container.querySelector('.workspace-history-snapshot-item');
      expect(item).not.toBeNull();
      return item!;
    });

    fireEvent.click(snapshotItem);
    expect(await screen.findByText('Failed to load snapshot')).toBeTruthy();

    fireEvent.click(snapshotItem);

    await waitFor(() => {
      expect(screen.queryByText('Failed to load snapshot')).toBeNull();
      expect(container.querySelector('.workspace-history-preview-text')).not.toBeNull();
    });
    expect(historyMocks.loadSnapshot).toHaveBeenLastCalledWith('2026-08-12T01:00:00.000Z');
  });
});
