import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '@nimbalyst/runtime/store';
import { errorNotificationService } from '../../../services/ErrorNotificationService';
import { collabKeyRotationEpochAtom } from '../collabEditor';
import { destroyTeamSync, initSharedDocuments } from '../collabDocuments';

const sync = vi.hoisted(() => ({
  options: [] as Array<{ onOrgKeyRotated: (fingerprint: string) => void }>,
  connect: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn(),
}));
vi.mock('@nimbalyst/runtime/sync', () => ({
  TeamSyncProvider: class {
    constructor(options: { onOrgKeyRotated: (fingerprint: string) => void }) { sync.options.push(options); }
    connect = sync.connect;
    destroy = sync.destroy;
  },
}));
vi.mock('../../../services/ErrorNotificationService', () => ({
  errorNotificationService: { showInfo: vi.fn(), showWarning: vi.fn() },
}));
vi.mock('../../../utils/teamAnalytics', () => ({ trackTeamAnalyticsEvent: vi.fn() }));

const invoke = vi.fn();
const resolveIndexConfig = vi.fn();
const workspacePath = '/collab-key-rotation-i18n';

beforeEach(async () => {
  vi.clearAllMocks();
  sync.options.length = 0;
  resolveIndexConfig.mockResolvedValue({ success: true, config: {
    orgId: 'org-id', teamProjectId: 'project-id', keyCustody: 'server-managed',
    orgKeyBase64: '', serverUrl: 'https://example.invalid', userId: 'user-id',
  } });
  vi.stubGlobal('window', { electronAPI: { invoke, documentSync: { resolveIndexConfig } } });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await i18next.changeLanguage('en');
  await initSharedDocuments(workspacePath);
  expect(sync.options).toHaveLength(1);
  await i18next.changeLanguage('ja');
  expect(resolveIndexConfig).toHaveBeenCalledTimes(1);
});

afterEach(async () => {
  destroyTeamSync(workspacePath);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await i18next.changeLanguage('en');
});

describe('key rotation notifications at event time', () => {
  it('translates successful reconnection without changing the key refresh or provider lifecycle', async () => {
    const previousEpoch = store.get(collabKeyRotationEpochAtom);
    invoke.mockResolvedValue({ success: true, keyRefreshed: true });
    sync.options[0].onOrgKeyRotated('new-key-fingerprint');
    expect(errorNotificationService.showInfo).toHaveBeenCalledWith('チームの暗号鍵が更新されました', '新しい鍵で再接続しています…', { duration: 5000 });
    await vi.waitFor(() => expect(errorNotificationService.showInfo).toHaveBeenCalledWith('暗号鍵が更新されました', 'すべての同期プロバイダーが新しい鍵で再接続しました。', { duration: 5000 }));
    expect(invoke).toHaveBeenCalledWith('team:handle-org-key-rotated', 'org-id', 'new-key-fingerprint');
    expect(invoke).toHaveBeenCalledWith('tracker-sync:restart-for-workspace', workspacePath);
    expect(resolveIndexConfig).toHaveBeenCalledTimes(2);
    expect(sync.connect).toHaveBeenCalledTimes(2);
    expect(sync.destroy).toHaveBeenCalledTimes(1);
    expect(store.get(collabKeyRotationEpochAtom)).toBe(previousEpoch + 1);
  });

  it('explains the missing key in Japanese without reconnecting early', async () => {
    invoke.mockResolvedValue({ success: true, keyRefreshed: false });
    sync.options[0].onOrgKeyRotated('waiting-key-fingerprint');
    await vi.waitFor(() => expect(errorNotificationService.showWarning).toHaveBeenCalledWith('更新された鍵を待っています', '管理者が更新された暗号鍵を共有する必要があります。一部の項目は一時的に読み取れない場合があります。', { duration: 10000 }));
    expect(resolveIndexConfig).toHaveBeenCalledTimes(1);
    expect(sync.destroy).not.toHaveBeenCalled();
  });

  it('translates the key-fetch failure without changing the retry guidance', async () => {
    invoke.mockRejectedValue(new Error('External transport failure'));
    sync.options[0].onOrgKeyRotated('failed-key-fingerprint');
    await vi.waitFor(() => expect(errorNotificationService.showWarning).toHaveBeenCalledWith('暗号鍵のローテーションに失敗しました', '更新された暗号鍵を取得できませんでした。ワークスペースを開き直してください。', { duration: 10000 }));
    expect(resolveIndexConfig).toHaveBeenCalledTimes(1);
    expect(sync.destroy).not.toHaveBeenCalled();
  });
});
