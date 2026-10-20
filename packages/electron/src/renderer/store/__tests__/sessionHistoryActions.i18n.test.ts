import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '@nimbalyst/runtime/store';
import { activeWorkspacePathAtom } from '../atoms/openProjects';
import { sessionRegistryAtom, sessionStoreAtom, sessionTitleAtom, workstreamTitleAtom } from '../atoms/sessions';
import { developerFeatureSettingsAtom } from '../atoms/appSettings';
import { initWorkstreamState } from '../atoms/workstreamState';
import { errorNotificationService } from '../../services/ErrorNotificationService';
import {
  addSessionToWorktreeActionAtom, branchSessionActionAtom,
  createNewSessionActionAtom, createNewWorktreeSessionActionAtom, deleteSessionActionAtom,
  isGitRepoAtom, openSessionInTabActionAtom,
} from '../actions/sessionHistoryActions';

vi.mock('../../services/ErrorNotificationService', () => ({
  errorNotificationService: { showError: vi.fn() },
}));

const invoke = vi.fn();
beforeEach(async () => {
  vi.clearAllMocks();
  store.set(activeWorkspacePathAtom, '/session-actions-i18n');
  initWorkstreamState('/session-actions-i18n');
  vi.stubGlobal('window', { electronAPI: { invoke } });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await i18next.changeLanguage('ja');
});
afterEach(async () => {
  store.set(sessionRegistryAtom, new Map());
  store.set(sessionStoreAtom('new-session-i18n'), null);
  store.set(sessionStoreAtom('untitled-session-i18n'), null);
  store.set(sessionStoreAtom('worktree-session-i18n'), null);
  store.set(developerFeatureSettingsAtom, { ...store.get(developerFeatureSettingsAtom), developerMode: false });
  store.set(isGitRepoAtom('/session-actions-i18n'), false);
  store.set(activeWorkspacePathAtom, null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await i18next.changeLanguage('en');
});

describe('session action notifications', () => {
  it.each([
    [deleteSessionActionAtom, 'セッションの削除に失敗しました'],
    [branchSessionActionAtom, '会話の分岐に失敗しました'],
  ] as const)('translates failure titles and fallbacks while preserving external errors', async (action, title) => {
    invoke.mockResolvedValueOnce({ success: false });
    await store.set(action, 'source-session');
    expect(errorNotificationService.showError).toHaveBeenLastCalledWith(title, '不明なエラー');
    invoke.mockResolvedValueOnce({ success: false, error: 'External server error' });
    await store.set(action, 'source-session');
    expect(errorNotificationService.showError).toHaveBeenLastCalledWith(title, 'External server error');
    invoke.mockRejectedValueOnce(new Error('External exception'));
    await store.set(action, 'source-session');
    expect(errorNotificationService.showError).toHaveBeenLastCalledWith(title, 'Error: External exception');
  });

  it('translates the missing-worktree failure without attempting session creation', async () => {
    invoke.mockResolvedValueOnce({ worktree: null });
    await store.set(addSessionToWorktreeActionAtom, 'missing-worktree');
    expect(errorNotificationService.showError).toHaveBeenCalledWith('セッションの作成に失敗しました', 'ワークツリーが見つかりません', { duration: 5000 });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('worktree:get', 'missing-worktree');
  });

  it('translates failed worktree-session creation and its generated title', async () => {
    invoke.mockResolvedValueOnce({ worktree: { id: 'worktree-id' } }).mockResolvedValueOnce({ success: false });
    await store.set(addSessionToWorktreeActionAtom, 'worktree-id');
    expect(errorNotificationService.showError).toHaveBeenCalledWith('セッションの作成に失敗しました', 'セッションの作成に失敗しました', { duration: 5000 });
    expect(invoke).toHaveBeenCalledWith('sessions:create', expect.objectContaining({ session: expect.objectContaining({ title: '新しいセッション', worktreeId: 'worktree-id' }) }));
  });

  it('localizes a missing persisted session title when opening a session', async () => {
    invoke.mockResolvedValueOnce({ success: true, sessions: [{ id: 'untitled-session-i18n', title: '' }] })
      .mockResolvedValue({ success: true });
    await store.set(openSessionInTabActionAtom, 'untitled-session-i18n');
    expect(store.get(sessionStoreAtom('untitled-session-i18n'))?.title).toBe('無題のセッション');
  });

  it('localizes derived session and workstream title fallbacks', () => {
    expect(store.get(sessionTitleAtom('missing-session-title-i18n'))).toBe('無題のセッション');
    expect(store.get(workstreamTitleAtom('missing-workstream-title-i18n'))).toBe('無題のワークストリーム');
  });

  it('localizes generated worktree session titles while preserving the worktree name', async () => {
    store.set(developerFeatureSettingsAtom, { ...store.get(developerFeatureSettingsAtom), developerMode: true });
    store.set(isGitRepoAtom('/session-actions-i18n'), true);
    invoke.mockResolvedValueOnce({ success: true, worktree: { id: 'worktree-id', name: 'feature-auth' } })
      .mockResolvedValueOnce({ success: true, id: 'worktree-session-i18n' });
    await store.set(createNewWorktreeSessionActionAtom);
    expect(invoke).toHaveBeenNthCalledWith(2, 'sessions:create', expect.objectContaining({
      session: expect.objectContaining({ title: 'ワークツリー: feature-auth', worktreeId: 'worktree-id' }),
    }));
    expect(store.get(sessionStoreAtom('worktree-session-i18n'))?.title).toBe('ワークツリー: feature-auth');
  });

  it('uses the Japanese generic message for a non-Error failure', async () => {
    invoke.mockRejectedValueOnce('non-Error rejection');
    await store.set(addSessionToWorktreeActionAtom, 'worktree-id');
    expect(errorNotificationService.showError).toHaveBeenCalledWith('セッションの作成に失敗しました', 'ワークツリーへのセッション追加中に予期しないエラーが発生しました。', { duration: 5000 });
  });

  it('localizes the generated new-session title while preserving user metadata in Japanese', async () => {
    invoke.mockResolvedValueOnce({ success: true, id: 'new-session-i18n' });
    await store.set(createNewSessionActionAtom, { sessionId: 'new-session-i18n', selectSession: false, metadata: { userValue: 'User value' } });
    expect(invoke).toHaveBeenCalledWith('sessions:create', expect.objectContaining({ session: expect.objectContaining({ title: '新しいセッション', metadata: { userValue: 'User value' } }) }));
    expect(store.get(sessionStoreAtom('new-session-i18n'))?.title).toBe('新しいセッション');
  });
});
