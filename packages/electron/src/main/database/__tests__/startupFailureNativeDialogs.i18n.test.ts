// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createMainI18nController } from '../../i18n/mainI18n';
const mocks = vi.hoisted(() => ({ showErrorBox: vi.fn(), restoreFailure: false }));
vi.mock('electron', () => ({ app: { getVersion: () => 'fixture', relaunch: vi.fn() }, clipboard: {}, shell: {}, dialog: { showErrorBox: mocks.showErrorBox, showMessageBoxSync: () => 0 } }));
vi.mock('../PGLiteDatabaseWorker', () => ({ database: { getEngine: () => 'pglite' } }));
vi.mock('../../utils/logger', () => ({ logger: { main: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } } }));
vi.mock('../initialize', () => ({ stopPeriodicBackupTimer: vi.fn() }));
vi.mock('../../services/analytics/AnalyticsService', () => ({ AnalyticsService: { getInstance: () => ({ sendEvent: vi.fn() }) } }));
vi.mock('../sqlite/recoveryArtifacts', () => ({ findRestorableBackups: () => [] }));
vi.mock('../sqlite/cutoverJournal', () => ({ readCutoverJournalStatus: () => ({ status: 'absent' }), writeCutoverJournal: vi.fn() }));
vi.mock('../recovery/preMigrationRecovery', () => ({ recordedPreMigrationSource: () => null, recoverPreMigrationDatabase: vi.fn(), restoreWithCutoverJournalEvidence: vi.fn() }));
vi.mock('../recovery/productionRecovery', () => ({ createCandidateProbe: vi.fn() }));
vi.mock('../recovery', () => ({ mayTryAnotherCandidate: vi.fn(), restoreFromNamedBackup: vi.fn() }));
vi.mock('../userDataPath', () => ({ resolveDatabaseUserDataPath: () => '/fixture-only-no-io' }));
vi.mock('../databaseFailureDialog', () => ({
  buildDatabaseFailureDiagnostics: () => 'fixture',
  buildDatabaseFailureDialog: () => ({ title: 'fixture', message: 'fixture', detail: 'fixture', buttons: ['fixture'], defaultId: 0, cancelId: 0 }),
  applyDatabaseFailureChoice: async (_content: unknown, _choice: unknown, handlers: { onRestoreFailed: (message: string) => void }) => {
    handlers.onRestoreFailed('backend fixture error');
    return { action: 'quit', reportedAction: 'quit', restored: false };
  },
}));
import { showDatabaseStartupFailure } from '../showDatabaseStartupFailure';

describe('database startup fallback dialog localization', () => {
  it('localizes the fallback and restore-failure frames without altering backend errors', async () => {
    const controller = await createMainI18nController({ get: () => 'ja', subscribe: () => () => undefined }, 'en-US', () => undefined);
    try {
      await showDatabaseStartupFailure(new Error('backend fixture error'));
      expect(mocks.showErrorBox).toHaveBeenLastCalledWith('Nimbalyst - データベースの初期化に失敗しました', 'データベースシステムを初期化できませんでした。\n\nエラー: backend fixture error\n\nデータベースがないため、Nimbalystを続行できません。');
      await showDatabaseStartupFailure(new Error('DATABASE_INIT_FAILED'));
      expect(mocks.showErrorBox).toHaveBeenLastCalledWith('Nimbalyst - 復元に失敗しました', 'backend fixture error');
      await controller.i18n.changeLanguage('en');
      await showDatabaseStartupFailure(new Error('backend fixture error'));
      expect(mocks.showErrorBox).toHaveBeenLastCalledWith('Nimbalyst - Database Initialization Failed', 'Failed to initialize the database system.\n\nError: backend fixture error\n\nNimbalyst cannot continue without the database.');
    } finally { controller.dispose(); }
  });
});
