// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
const mocks = vi.hoisted(() => ({ read: vi.fn(), realpath: vi.fn((v: string) => v), stat: vi.fn() }));
vi.mock('fs', () => ({ readFileSync: mocks.read, existsSync: () => true, realpathSync: { native: mocks.realpath }, lstatSync: mocks.stat }));
vi.mock('node:fs', () => ({ readFileSync: mocks.read, existsSync: () => true, realpathSync: { native: mocks.realpath }, lstatSync: mocks.stat }));
import { readRecoveryJournalStatus } from '../recovery/recoveryJournal';
import { readCutoverJournalStatus } from '../sqlite/cutoverJournal';
import { readBackendState } from '../sqlite/BackendSelector';
const root = path.resolve('synthetic-profile');
const outside = path.resolve('synthetic-outside');
beforeEach(() => {
  vi.stubEnv('NIMBALYST_USER_DATA_DIR', root);
  vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.realpath.mockImplementation((v: string) => v);
  mocks.stat.mockReturnValue({ nlink: 1, isSymbolicLink: () => false, isDirectory: () => false });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('persisted database references (all filesystem IO mocked)', () => {
  it.each([{ reference: [] }, { reference: {} }, { reference: 123 }, { reference: null }])('rejects a non-string backend path $reference', ({ reference }) => {
    mocks.read.mockReturnValue(JSON.stringify({ backend: 'pglite', pgliteMigratedDir: reference }));
    readBackendState(root);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
  it('rejects a recovery record missing its source artifact path', () => {
    mocks.read.mockReturnValue(JSON.stringify({ version: 1, phase: 'prepared', paths: { livePath: path.join(root, 'pglite-db'), stagingPath: path.join(root, 'stage'), displacedPath: path.join(root, 'old') } }));
    try { readRecoveryJournalStatus(root); } catch { /* exit stub */ }
    expect(process.exit).toHaveBeenCalledWith(1);
  });
  it('allows normal POSIX directory link counts for preserved database directories', () => {
    const preserved = path.join(root, 'pglite-db.old');
    mocks.stat.mockImplementation((v: string) => ({ nlink: v === preserved ? 2 : 1, isSymbolicLink: () => false, isDirectory: () => v === preserved }));
    mocks.read.mockReturnValue(JSON.stringify({ backend: 'pglite', pgliteMigratedDir: preserved }));
    expect(readBackendState(root)?.pgliteMigratedDir).toBe(preserved);
    expect(process.exit).not.toHaveBeenCalled();
  });
  it('retains valid paths and nullable snapshots in a recovery journal', () => {
    mocks.read.mockReturnValue(JSON.stringify({ version: 1, phase: 'prepared', paths: { livePath: path.join(root, 'pglite-db'), stagingPath: path.join(root, 'stage'), displacedPath: path.join(root, 'old'), preRestoreSnapshotPath: null, sourceArtifactPath: path.join(root, 'backup') } }));
    expect(readRecoveryJournalStatus(root).status).toBe('ok');
    expect(process.exit).not.toHaveBeenCalled();
  });
  it.each(['../outside', ''])('aborts a relative or empty persisted path %j', reference => {
    mocks.read.mockReturnValue(JSON.stringify({ backend: 'pglite', pgliteMigratedDir: reference }));
    readBackendState(root);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
  it('checks the active DB root, not just the wider isolated profile', () => {
    mocks.read.mockReturnValue(JSON.stringify({ backend: 'pglite', pgliteMigratedDir: path.join(root, 'another-db') }));
    readBackendState(path.join(root, 'active-db'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
  it('does not read a control file that resolves outside the profile', () => {
    const file = path.join(root, 'database-recovery.json');
    mocks.realpath.mockImplementation((v: string) => v === file ? outside : v);
    expect(() => readRecoveryJournalStatus(root)).toThrow(/escapes/);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('preserves ordinary no-override backend behavior', () => {
    vi.stubEnv('NIMBALYST_USER_DATA_DIR', undefined);
    mocks.read.mockReturnValue(JSON.stringify({ backend: 'pglite', pgliteMigratedDir: outside }));
    expect(readBackendState(root)?.pgliteMigratedDir).toBe(outside);
    expect(process.exit).not.toHaveBeenCalled();
  });
  it.each(['recovery', 'cutover', 'backend'])('aborts a foreign path in %s control data', kind => {
    const data = kind === 'recovery'
      ? { version: 1, phase: 'prepared', paths: { livePath: path.join(root, 'pglite-db'), stagingPath: outside, displacedPath: path.join(root, 'old') } }
      : kind === 'cutover'
        ? { version: 1, phase: 'prepared', source: { livePath: path.join(root, 'pglite-db'), preservedPath: path.join(root, 'old') }, target: { livePath: path.join(root, 'sqlite-db') }, rollback: { stateBefore: { pgliteMigratedDir: outside } } }
        : { backend: 'pglite', pgliteMigratedDir: outside };
    mocks.read.mockReturnValue(JSON.stringify(data));
    try {
      if (kind === 'recovery') readRecoveryJournalStatus(root);
      else if (kind === 'cutover') readCutoverJournalStatus(root);
      else readBackendState(root);
    } catch { /* Unit-test exit stub lets the guard throw instead. */ }
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
