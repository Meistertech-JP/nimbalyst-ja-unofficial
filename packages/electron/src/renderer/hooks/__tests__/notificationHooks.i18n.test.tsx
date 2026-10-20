import i18next from 'i18next';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useArchiveWorktreeDialog } from '../useArchiveWorktreeDialog';
import { useWindowLifecycle } from '../useWindowLifecycle';

const mocks = vi.hoisted(() => ({ showError: vi.fn(), dirty: false }));
vi.mock('../../services/ErrorNotificationService', () => ({ errorNotificationService: mocks }));
vi.mock('@nimbalyst/runtime/store', () => ({
  store: { get: () => mocks.dirty },
  editorDirtyAtom: (key: string) => key,
  makeEditorKey: (key: string) => key,
}));
vi.mock('../../store/atoms/collabEditor', () => ({
  collabConnectionStatusAtom: (key: string) => key,
  hasCollabUnsyncedChanges: () => false,
}));
vi.mock('../../utils/logger', () => ({ logger: { ui: { info: vi.fn() } } }));

const worktreeGetStatus = vi.fn(), worktreeArchive = vi.fn(), saveFile = vi.fn();
const params = { worktreeId: 'worktree-1', worktreeName: 'feature/UI', worktreePath: '/repo/wt', workspacePath: '/repo' };

describe('renderer notification hooks in Japanese', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('ja');
    mocks.showError.mockReset();
    mocks.dirty = false;
    worktreeGetStatus.mockReset().mockResolvedValue({ success: true, status: { hasUncommittedChanges: false, modifiedFileCount: 0, isMerged: true } });
    worktreeArchive.mockReset().mockResolvedValue({ success: false });
    saveFile.mockReset().mockResolvedValue({ success: true });
    (window as any).electronAPI = { worktreeGetStatus, worktreeArchive, saveFile };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    await i18next.changeLanguage('en');
  });

  it('localizes auto-archive rejection and still offers confirmation', async () => {
    const { result } = renderHook(() => useArchiveWorktreeDialog());
    await act(async () => { expect(await result.current.showDialog(params)).toBe(false); });
    expect(worktreeGetStatus).toHaveBeenCalledWith('/repo/wt', { fetchFirst: true });
    expect(worktreeArchive).toHaveBeenCalledWith('worktree-1', '/repo');
    expect(mocks.showError).toHaveBeenCalledWith('「feature/UI」のアーカイブに失敗しました', 'バックエンドが自動アーカイブを拒否しました。');
    expect(result.current.dialogState?.worktreeId).toBe('worktree-1');
  });

  it('keeps the conservative merge gate and localizes explicit rejection', async () => {
    worktreeGetStatus.mockResolvedValue({ success: true, status: { hasUncommittedChanges: false, modifiedFileCount: 0, commitsAhead: 0 } });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useArchiveWorktreeDialog());
    await act(async () => { await result.current.showDialog(params); });
    expect(worktreeArchive).not.toHaveBeenCalled();
    expect(result.current.dialogState?.hasUnmergedChanges).toBe(true);
    await act(async () => { await result.current.confirmArchive('/repo', onSuccess); });
    expect(mocks.showError).toHaveBeenCalledWith('「feature/UI」のアーカイブに失敗しました', 'バックエンドがアーカイブを拒否しました。');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.dialogState).toBeNull();
  });

  it('preserves external error details', async () => {
    worktreeArchive.mockRejectedValue(new Error('E_ARCHIVE: /repo/wt'));
    const { result } = renderHook(() => useArchiveWorktreeDialog());
    await act(async () => { await result.current.showDialog(params); });
    expect(mocks.showError).toHaveBeenCalledWith('「feature/UI」のアーカイブに失敗しました', 'E_ARCHIVE: /repo/wt');
  });

  it('translates the quit warning at event time without saving on language change', async () => {
    mocks.dirty = true;
    const tab = { id: 'tab-1', filePath: '/repo/file.md' };
    const updateTab = vi.fn();
    const refs = {
      tabsRef: { current: { getSnapshot: () => ({ tabOrder: [tab.id], tabs: new Map([[tab.id, tab]]), activeTabId: tab.id }), updateTab } },
      getContentRef: { current: () => 'unchanged user content' },
      currentFilePathRef: { current: tab.filePath },
    };
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const { rerender } = renderHook(() => useWindowLifecycle(refs));
    const listener = addListener.mock.calls.find(([type]) => type === 'beforeunload')?.[1] as (event: BeforeUnloadEvent) => void;
    const event = { preventDefault: vi.fn(), returnValue: '' };
    listener(event as unknown as BeforeUnloadEvent);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.returnValue).toBe('未保存の変更があります。終了してもよろしいですか？');
    expect(saveFile).toHaveBeenCalledWith('unchanged user content', '/repo/file.md');
    saveFile.mockClear();
    await act(() => i18next.changeLanguage('en'));
    rerender();
    expect(saveFile).not.toHaveBeenCalled();
    expect(removeListener.mock.calls.filter(([type]) => type === 'beforeunload')).toHaveLength(0);
    listener(event as unknown as BeforeUnloadEvent);
    expect(event.returnValue).toBe('You have unsaved changes. Are you sure you want to quit?');
  });
});
