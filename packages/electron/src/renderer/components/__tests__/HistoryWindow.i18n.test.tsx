// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryWindow } from '../../windows/HistoryWindow';

vi.mock('@nimbalyst/runtime', () => ({ MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} /> }));
const listSnapshots = vi.fn(), loadSnapshot = vi.fn(), deleteSnapshot = vi.fn(), sendToMainWindow = vi.fn();
const snapshot = { timestamp: '2026-09-01T12:00:00Z', type: 'manual', size: 12, baseMarkdownHash: 'hash' };

describe('HistoryWindow Japanese presentation', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('ja');
    window.history.replaceState({}, '', '/?filePath=%2Frepo%2Fnote.md');
    listSnapshots.mockReset().mockResolvedValue([snapshot]);
    loadSnapshot.mockReset().mockResolvedValue('User document content');
    deleteSnapshot.mockReset().mockResolvedValue(undefined);
    sendToMainWindow.mockReset().mockResolvedValue(undefined);
    (window as any).electronAPI = { history: { listSnapshots, loadSnapshot, deleteSnapshot }, sendToMainWindow };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'close').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/');
    await i18next.changeLanguage('en');
  });

  it('renders Japanese labels and restores the exact original file payload', async () => {
    render(<HistoryWindow />);
    expect(await screen.findByText('User document content')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'ファイル履歴' })).toBeTruthy();
    expect(screen.getByText('手動')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'このバージョンを復元' }));
    await waitFor(() => expect(sendToMainWindow).toHaveBeenCalledWith('restore-from-history', { filePath: '/repo/note.md', content: 'User document content', timestamp: snapshot.timestamp }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('現在のファイル内容が置き換えられます。'));
    expect(window.close).toHaveBeenCalledTimes(1);
  });

  it('keeps load failure text out of the restorable document', async () => {
    loadSnapshot.mockRejectedValue(new Error('Disk read failed'));
    render(<HistoryWindow />);
    expect(await screen.findByText('スナップショットの内容を読み込めませんでした')).toBeTruthy();
    const restore = screen.getByRole('button', { name: 'このバージョンを復元' }) as HTMLButtonElement;
    expect(restore.disabled).toBe(true);
    fireEvent.click(restore);
    expect(sendToMainWindow).not.toHaveBeenCalled();
    await act(() => i18next.changeLanguage('en'));
    expect(screen.getByText('Failed to load snapshot content')).toBeTruthy();
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
  });

  it('translates missing-path and non-Error failures without launching new requests on locale changes', async () => {
    window.history.replaceState({}, '', '/');
    const view = render(<HistoryWindow />);
    expect(await screen.findByText('ファイルパスが指定されていません')).toBeTruthy();
    expect(listSnapshots).not.toHaveBeenCalled();
    view.unmount();
    window.history.replaceState({}, '', '/?filePath=%2Frepo%2Fnote.md');
    listSnapshots.mockRejectedValue('Unavailable');
    render(<HistoryWindow />);
    expect(await screen.findByText('履歴を読み込めませんでした')).toBeTruthy();
    await act(() => i18next.changeLanguage('en'));
    expect(screen.getByText('Failed to load history')).toBeTruthy();
    expect(listSnapshots).toHaveBeenCalledTimes(1);
  });

  it('preserves external error messages', async () => {
    listSnapshots.mockRejectedValue(new Error('E_HISTORY_17'));
    render(<HistoryWindow />);
    expect(await screen.findByText('E_HISTORY_17')).toBeTruthy();
  });
});
