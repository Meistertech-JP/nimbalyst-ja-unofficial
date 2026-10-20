// @vitest-environment jsdom
import i18next from 'i18next';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCollabLocalOrigin, useLocalFileSharedDocLink, tryRendererHeadlessReupload } from '../useCollabLocalOrigin';

const mocks = vi.hoisted(() => ({ showError: vi.fn(), showInfo: vi.fn() }));
vi.mock('../../services/ErrorNotificationService', () => ({ errorNotificationService: mocks }));
vi.mock('../../store/atoms/collabDocuments', () => ({ getTeamSyncProvider: () => ({ getTeamState: () => ({ members: [{ userId: 'editor-id', email: 'editor@example.com' }] }) }) }));

const binding = { documentId: 'doc-id', documentType: 'markdown', resolvedPath: '/repo/source.md', relativePath: 'source.md', resolutionStatus: 'resolved' };
const getLocalOrigin = vi.fn(), findLocalOriginLink = vi.fn(), reuploadLocalOrigin = vi.fn(), relinkLocalOrigin = vi.fn(), clearLocalOrigin = vi.fn(), openFileDialog = vi.fn(), readFileContent = vi.fn();

describe('local shared-document origin notifications', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('ja');
    mocks.showError.mockReset();
    mocks.showInfo.mockReset();
    getLocalOrigin.mockReset().mockResolvedValue({ success: true, binding });
    findLocalOriginLink.mockReset().mockResolvedValue({ success: true, binding });
    reuploadLocalOrigin.mockReset().mockResolvedValue({ success: true, status: 'uploaded', binding });
    relinkLocalOrigin.mockReset().mockResolvedValue({ success: true, binding });
    clearLocalOrigin.mockReset().mockResolvedValue({ success: true });
    openFileDialog.mockReset().mockResolvedValue({ canceled: false, filePaths: ['/repo/new-source.md'] });
    readFileContent.mockReset().mockResolvedValue({ success: false });
    (window as any).electronAPI = { documentSync: { getLocalOrigin, findLocalOriginLink, reuploadLocalOrigin, relinkLocalOrigin, clearLocalOrigin }, openFileDialog, readFileContent };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    await i18next.changeLanguage('en');
  });

  it('localizes the file picker and relink notice while preserving paths and IDs', async () => {
    const { result } = renderHook(() => useCollabLocalOrigin('/repo', 'doc-id', 'markdown'));
    await waitFor(() => expect(result.current.binding).toEqual(binding));
    await act(async () => { expect(await result.current.relinkLocalSource()).toBe(true); });
    expect(openFileDialog).toHaveBeenCalledWith({ title: 'ローカルソースを再リンク', buttonLabel: '再リンク', defaultPath: '/repo/source.md' });
    expect(relinkLocalOrigin).toHaveBeenCalledWith({ workspacePath: '/repo', documentId: 'doc-id', documentType: 'markdown', sourceFilePath: '/repo/new-source.md' });
    expect(mocks.showInfo).toHaveBeenCalledWith('ローカルソースをリンクしました', 'source.md', { duration: 4000 });
  });

  it('honors cancellation of the translated clear confirmation', async () => {
    const { result } = renderHook(() => useCollabLocalOrigin('/repo', 'doc-id', 'markdown'));
    await waitFor(() => expect(result.current.binding).toEqual(binding));
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await act(async () => { expect(await result.current.clearLocalSource()).toBe(false); });
    expect(clearLocalOrigin).not.toHaveBeenCalled();
    expect(window.confirm).toHaveBeenCalledWith('この共有ドキュメントのローカルソースリンクを解除しますか？');
    await act(async () => { expect(await result.current.clearLocalSource()).toBe(true); });
    expect(clearLocalOrigin).toHaveBeenCalledWith('/repo', 'doc-id');
    expect(mocks.showInfo).toHaveBeenCalledWith('ローカルソースを解除しました', 'この共有ドキュメントにはローカルファイルがリンクされていません。', { duration: 3000 });
  });

  it('changes notification language without refreshing bindings or automatically reuploading', async () => {
    const { result, rerender } = renderHook(() => ({ shared: useCollabLocalOrigin('/repo', 'doc-id', 'markdown'), local: useLocalFileSharedDocLink('/repo', '/repo/source.md') }));
    await waitFor(() => expect(result.current.local.binding).toEqual(binding));
    const refresh = result.current.shared.refresh;
    const reupload = result.current.local.reuploadToSharedDoc;
    await act(() => i18next.changeLanguage('en'));
    rerender();
    expect(result.current.shared.refresh).toBe(refresh);
    expect(result.current.local.reuploadToSharedDoc).toBe(reupload);
    expect(getLocalOrigin).toHaveBeenCalledTimes(1);
    expect(findLocalOriginLink).toHaveBeenCalledTimes(1);
    expect(reuploadLocalOrigin).not.toHaveBeenCalled();
    await act(async () => { await result.current.local.reuploadToSharedDoc(); });
    expect(mocks.showInfo).toHaveBeenLastCalledWith('Shared document updated', 'Uploaded the current local file to the shared document.', { duration: 5000 });
    await act(() => i18next.changeLanguage('ja'));
    await act(async () => { await result.current.shared.reuploadFromLocalSource(); });
    expect(mocks.showInfo).toHaveBeenLastCalledWith('共有ドキュメントを更新しました', '現在のローカルファイルを共有ドキュメントにアップロードしました。', { duration: 5000 });
    expect(getLocalOrigin).toHaveBeenCalledTimes(1);
  });

  it('localizes conflict context and preserves the explicit overwrite gate', async () => {
    reuploadLocalOrigin.mockResolvedValueOnce({ success: false, status: 'conflict', conflictKind: 'diverged', lastEditorId: 'editor-id', lastEditedAt: Date.now() - 2 * 60000 }).mockResolvedValue({ success: true, status: 'uploaded', binding });
    const { result } = renderHook(() => useCollabLocalOrigin('/repo', 'doc-id', 'markdown'));
    await waitFor(() => expect(result.current.binding).toEqual(binding));
    await act(async () => { await result.current.reuploadFromLocalSource(); });
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('editor@example.comが2分前'));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('ローカルファイルと共有ドキュメントの両方が変更されています。'));
    expect(reuploadLocalOrigin).toHaveBeenNthCalledWith(2, { workspacePath: '/repo', documentId: 'doc-id', forceOverwriteShared: true });
  });

  it.each([{ language: 'en', count: 1, text: 'Uploaded 1 attachment.' }, { language: 'en', count: 2, text: 'Uploaded 2 attachments.' }, { language: 'ja', count: 2, text: '添付ファイルを2件アップロードしました.' }])('localizes attachment counts: $language / $count', async ({ language, count, text }) => {
    await i18next.changeLanguage(language);
    reuploadLocalOrigin.mockResolvedValue({ success: true, status: 'uploaded', binding, migration: { okCount: count, failedCount: 0 } });
    const { result } = renderHook(() => useLocalFileSharedDocLink('/repo', '/repo/source.md'));
    await waitFor(() => expect(result.current.binding).toEqual(binding));
    await act(async () => { await result.current.reuploadToSharedDoc(); });
    expect(mocks.showInfo.mock.calls[0][1]).toContain(text);
  });

  it('preserves external error messages', async () => {
    reuploadLocalOrigin.mockResolvedValue({ success: false, status: 'error', message: 'Service E_SYNC_42' });
    const { result } = renderHook(() => useLocalFileSharedDocLink('/repo', '/repo/source.md'));
    await waitFor(() => expect(result.current.binding).toEqual(binding));
    await act(async () => { await result.current.reuploadToSharedDoc(); });
    expect(mocks.showError).toHaveBeenCalledWith('再アップロードに失敗しました', 'Service E_SYNC_42');
  });

  it('localizes headless source fallbacks without attempting an upload', async () => {
    expect(await tryRendererHeadlessReupload('/repo', 'doc-id', { success: false, status: 'unsupported' })).toEqual({ status: 'error', message: 'リンクされたローカルソースを利用できません。' });
    const result = { success: false, status: 'unsupported', binding } as Parameters<typeof tryRendererHeadlessReupload>[2];
    expect(await tryRendererHeadlessReupload('/repo', 'doc-id', result)).toEqual({ status: 'error', message: 'リンクされたローカルソースを読み込めませんでした。' });
    readFileContent.mockResolvedValue({ success: true, content: null });
    expect(await tryRendererHeadlessReupload('/repo', 'doc-id', result)).toEqual({ status: 'error', message: 'リンクされたローカルソースはテキストとして読み取れません。' });
    expect(reuploadLocalOrigin).not.toHaveBeenCalled();
  });
});
