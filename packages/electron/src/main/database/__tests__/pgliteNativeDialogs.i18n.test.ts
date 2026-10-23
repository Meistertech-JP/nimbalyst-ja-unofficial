// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMainI18nController } from '../../i18n/mainI18n';

const mocks = vi.hoisted(() => ({ showMessageBox: vi.fn().mockResolvedValue({ response: 0 }), quit: vi.fn() }));
vi.mock('electron', async () => ({
  app: { ...(await import('../../../../test-stubs/privateUserData')).testApp, quit: mocks.quit },
  dialog: { showMessageBox: mocks.showMessageBox },
}));
vi.mock('../../services/analytics/AnalyticsService', () => ({ AnalyticsService: { getInstance: () => ({ sendEvent: vi.fn() }) } }));
import { PGLiteDatabaseWorker } from '../PGLiteDatabaseWorker';

afterEach(() => { vi.clearAllMocks(); });

describe('PGLite native dialog display copy', () => {
  it('localizes recovery options without changing button positions, defaults, or cancel behavior', async () => {
    const controller = await createMainI18nController({ get: () => 'ja', subscribe: () => () => undefined }, 'en-US', () => undefined);
    const worker = new PGLiteDatabaseWorker();
    try {
      const options = (worker as any).getRecoveryDialogOptions(true);
      expect(options).toMatchObject({ title: 'Nimbalyst - データを復元', message: 'ファイルのデータは失われていません。', buttons: ['復元（推奨）', '新しく開始', '終了'], defaultId: 0, cancelId: 2 });
      expect(options.detail).toBe('ファイルは保持されており、AIチャットセッションを最近のバックアップから復元できます。');
      expect((worker as any).getRecoveryDialogOptions(false)).toMatchObject({ buttons: ['復元（推奨）', '新しく開始'], defaultId: 0, cancelId: 1 });
      await controller.i18n.changeLanguage('en');
      expect((worker as any).getRecoveryDialogOptions(true)).toMatchObject({ title: 'Nimbalyst - Restore Your Data', buttons: ['Restore (Recommended)', 'Start Fresh', 'Quit'], defaultId: 0, cancelId: 2 });
    } finally { controller.dispose(); }
  });

  it('translates fixed error/info frames but retains backend diagnostics', async () => {
    const controller = await createMainI18nController({ get: () => 'ja', subscribe: () => () => undefined }, 'en-US', () => undefined);
    const worker = new PGLiteDatabaseWorker();
    try {
      (worker as any).showErrorAndQuit('Database Locked', 'Another instance of Nimbalyst is already running.', 'fixture-only backend detail');
      expect(mocks.showMessageBox).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Nimbalyst - データベースがロックされています', message: '別のNimbalystがすでに実行されています。', detail: 'fixture-only backend detail', buttons: ['終了'] }));
      await Promise.resolve();
      expect(mocks.quit).toHaveBeenCalledOnce();
      (worker as any).showInfoDialog('Database Reset', 'A fresh database has been created.', 'Your previous AI chat sessions could not be recovered, but your document files are safe.');
      expect(mocks.showMessageBox).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Nimbalyst - データベースをリセットしました', message: '新しいデータベースを作成しました。', detail: '以前のAIチャットセッションは復旧できませんでしたが、文書ファイルは保持されています。', buttons: ['OK'] }));
    } finally { controller.dispose(); }
  });
});
