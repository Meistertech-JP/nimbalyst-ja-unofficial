import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dialog: vi.fn(), quit: vi.fn(), unlink: vi.fn(), remove: vi.fn(), analytics: vi.fn(),
}));
vi.mock('electron', () => ({
  app: { isPackaged: true, quit: mocks.quit },
  dialog: { showMessageBox: mocks.dialog },
}));
vi.mock('fs', async (importOriginal) => ({
  ...await importOriginal<typeof import('fs')>(),
  unlinkSync: mocks.unlink, rmSync: mocks.remove,
}));
vi.mock('worker_threads', async (importOriginal) => ({
  ...await importOriginal<typeof import('worker_threads')>(),
  Worker: vi.fn(() => { throw new Error('Real worker forbidden in dialog tests'); }),
}));
vi.mock('../../utils/logger', () => ({ logger: { main: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } } }));
vi.mock('../../utils/store', () => ({ getAppSetting: vi.fn() }));
vi.mock('../../services/analytics/AnalyticsService', () => ({ AnalyticsService: { getInstance: () => ({ sendEvent: mocks.analytics }) } }));
vi.mock('../../services/database/DatabaseBackupService', () => ({ DatabaseBackupService: vi.fn() }));

import { PGLiteDatabaseWorker } from '../PGLiteDatabaseWorker';

let database: PGLiteDatabaseWorker;
let internal: any;
let backups: { hasBackups: ReturnType<typeof vi.fn>; getBackupStatus: ReturnType<typeof vi.fn>; restoreFromBackup: ReturnType<typeof vi.fn> };

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv('PLAYWRIGHT', '');
  await i18next.changeLanguage('ja');
  mocks.dialog.mockResolvedValue({ response: 0 });
  database = new PGLiteDatabaseWorker();
  internal = database;
  vi.spyOn(internal, 'createWorker').mockImplementation(() => {});
  vi.spyOn(internal, 'sendMessage').mockResolvedValue({ recovered: false });
  vi.spyOn(internal, 'recreateWorkerAndReinit').mockResolvedValue(undefined);
  vi.spyOn(internal, 'deleteDatabaseDirectory').mockResolvedValue(undefined);
  backups = {
    hasBackups: vi.fn(() => true), getBackupStatus: vi.fn(() => ({})),
    restoreFromBackup: vi.fn(async () => ({ success: true, source: 'current' })),
  };
  internal.backupService = backups;
});

afterEach(async () => {
  expect(mocks.remove).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await i18next.changeLanguage('en');
});

describe('localized database recovery dialogs', () => {
  it('keeps restore/start-fresh/quit response indices and safe defaults in both languages', async () => {
    expect(internal.getRecoveryDialogOptions(true)).toMatchObject({
      title: 'Nimbalyst - データを復元', message: 'ファイルのデータは失われていません。',
      buttons: ['復元（推奨）', '初期化', '終了'], defaultId: 0, cancelId: 2,
    });
    await i18next.changeLanguage('en');
    expect(internal.getRecoveryDialogOptions(false)).toMatchObject({
      title: 'Nimbalyst - Restore Your Data', buttons: ['Restore (Recommended)', 'Start Fresh'],
      defaultId: 0, cancelId: 1,
    });
  });

  it.each([0, 1])('keeps start-fresh confirmation response %s semantics', async response => {
    mocks.dialog.mockResolvedValue({ response });
    expect(await internal.showStartFreshConfirmation()).toBe(response === 1);
    expect(mocks.dialog).toHaveBeenCalledWith(expect.objectContaining({
      message: 'AIチャットセッションが消去されます。',
      detail: expect.stringContaining('完全に削除'),
      buttons: ['キャンセル', 'はい、初期化します'], defaultId: 0, cancelId: 0,
    }));
  });

  it('does not delete or restore when start-fresh is cancelled after initialization failure', async () => {
    internal.sendMessage.mockRejectedValue(new Error('DATABASE_INIT_FAILED'));
    mocks.dialog.mockResolvedValueOnce({ response: 1 }).mockResolvedValueOnce({ response: 0 });
    await database.initialize();
    expect(mocks.dialog.mock.calls[1][0].buttons).toEqual(['キャンセル', 'はい、初期化します']);
    expect(internal.deleteDatabaseDirectory).not.toHaveBeenCalled();
    expect(backups.restoreFromBackup).not.toHaveBeenCalled();
    expect(mocks.quit).toHaveBeenCalledOnce();
  });

  it('preserves lock diagnostics and never unlinks on cancel', async () => {
    internal.sendMessage.mockRejectedValue(Object.assign(new Error('DATABASE_LOCKED_AMBIGUOUS'), {
      code: 'DATABASE_LOCKED_AMBIGUOUS', lockPid: 7319,
      lockHostname: 'User-PC', lockTimestamp: '2026-09-18T01:02:03Z', lockFilePath: '/mock/db.lock',
    }));
    await expect(database.initialize()).rejects.toThrow('DATABASE_LOCKED_AMBIGUOUS');
    const options = mocks.dialog.mock.calls[0][0];
    expect(options.title).toBe('Nimbalyst - データベースのロック状態が不明');
    expect(options.detail).toContain('7319');
    expect(options.detail).toContain('User-PC');
    expect(options.detail).toContain('2026-09-18T01:02:03Z');
    expect(options.detail).toContain('破損');
    expect(options.buttons).toEqual(['キャンセル', 'ロックを解除して開く']);
    expect(options.defaultId).toBe(0);
    expect(options.cancelId).toBe(0);
    expect(mocks.unlink).not.toHaveBeenCalled();
    expect(internal.recreateWorkerAndReinit).not.toHaveBeenCalled();
  });

  it('translates restore results without translating analytics identifiers', async () => {
    internal.sendMessage.mockResolvedValue({ recovered: true });
    await database.initialize();
    expect(mocks.dialog.mock.calls[1][0]).toMatchObject({
      title: 'Nimbalyst - データベースを復元しました',
      message: '最新のバックアップからデータベースを正常に復元しました。',
    });
    expect(mocks.analytics).toHaveBeenCalledWith('database_corruption_restore_result', { success: true, source: 'current' });
  });

  it('preserves the backup path and suffix in the automatic-recovery warning', async () => {
    backups.hasBackups.mockReturnValue(false);
    internal.sendMessage.mockResolvedValue({ recovered: true, dataDir: 'F:\\User Data\\pglite-db' });
    await database.initialize();
    expect(mocks.dialog.mock.calls[0][0]).toMatchObject({
      title: 'Nimbalyst - データベースを修復しました',
      detail: expect.stringContaining('F:\\User Data\\pglite-db.backup-[timestamp]'),
    });
  });
});
