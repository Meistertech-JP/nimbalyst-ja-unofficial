// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
const mocks = vi.hoisted(() => ({ root: vi.fn(), remove: vi.fn(), exists: vi.fn(() => true) }));
vi.mock('fs', () => ({ existsSync: mocks.exists, rmSync: mocks.remove }));
vi.mock('electron', () => ({ app: { getPath: () => 'wrong-profile' }, dialog: {} }));
vi.mock('../userDataPath', () => ({ resolveDatabaseUserDataPath: mocks.root }));
vi.mock('../../utils/appPaths', () => ({ getPackageRoot: vi.fn() }));
vi.mock('../../utils/logger', () => ({ getLoggerConfig: () => ({}), logger: { main: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } } }));
vi.mock('../../services/analytics/AnalyticsService', () => ({ AnalyticsService: { getInstance: () => ({ sendEvent: vi.fn() }) } }));
vi.mock('../../services/database/DatabaseBackupService', () => ({ DatabaseBackupService: class {} }));
vi.mock('../sqlite/migrationSourceRead', () => ({ MigrationSourceReader: class {} }));
vi.mock('../../i18n/mainI18n', () => ({ translateMainDialogLabel: (_key: string, fallback: string) => fallback }));
import { PGLiteDatabaseWorker } from '../PGLiteDatabaseWorker';
afterEach(() => vi.resetAllMocks());
describe('PGLite deletion uses the validated database location (all IO mocked)', () => {
  it('removes only the selected backend directory', async () => {
    const root = path.resolve('selected-fixture-db');
    mocks.root.mockReturnValue(root);
    mocks.exists.mockReturnValue(true);
    await (new PGLiteDatabaseWorker() as any).deleteDatabaseDirectory();
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(path.join(root, 'pglite-db'), { recursive: true, force: true });
  });
  it('does not inspect or delete files when profile validation rejects', async () => {
    mocks.root.mockImplementation(() => { throw new Error('profile rejected'); });
    await expect((new PGLiteDatabaseWorker() as any).deleteDatabaseDirectory()).rejects.toThrow('profile rejected');
    expect(mocks.exists).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
