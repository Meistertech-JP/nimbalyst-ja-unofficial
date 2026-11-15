import { afterEach, describe, expect, it, vi } from 'vitest';
import * as path from 'node:path';

const mocks = vi.hoisted(() => ({ getPath: vi.fn(), realpath: vi.fn(), readdir: vi.fn(), lstat: vi.fn() }));
vi.mock('electron', () => ({ app: { getPath: mocks.getPath } }));
vi.mock('node:fs', () => ({ realpathSync: { native: mocks.realpath }, readdirSync: mocks.readdir, lstatSync: mocks.lstat }));
import { assertIsolatedProfilePath } from '../utils/profileBoundary';
import { resolveDatabaseUserDataPath } from '../database/userDataPath';

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.resetAllMocks(); });

describe('isolated storage boundary (no real filesystem or Electron)', () => {
  it('does not impose an isolation boundary on an ordinary launch', () => {
    vi.stubEnv('NIMBALYST_USER_DATA_DIR', undefined);
    expect(() => assertIsolatedProfilePath(path.resolve('ordinary-profile', 'settings.json'))).not.toThrow();
    expect(mocks.getPath).not.toHaveBeenCalled();
    expect(mocks.realpath).not.toHaveBeenCalled();
  });
  const root = path.resolve('isolated-profile');
  function prepare() {
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NIMBALYST_USER_DATA_DIR', root);
    mocks.getPath.mockReturnValue(root);
    mocks.realpath.mockImplementation((value: string) => value);
    mocks.readdir.mockReturnValue([]);
  }
  it('rejects a database child junction before returning a usable DB root', () => {
    prepare();
    mocks.readdir.mockReturnValue(['pglite-db']);
    mocks.realpath.mockImplementation((value: string) => value === path.join(root, 'pglite-db') ? path.resolve('outside-db') : value);
    expect(resolveDatabaseUserDataPath).toThrow(/escapes/);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
  it('checks nested SQLite sidecars, not just the sqlite-db directory', () => {
    prepare();
    const db = path.join(root, 'sqlite-db');
    const wal = path.join(db, 'nimbalyst.sqlite-wal');
    mocks.readdir.mockImplementation((value: string) => value === root ? ['sqlite-db'] : ['nimbalyst.sqlite-wal']);
    mocks.lstat.mockReturnValue({ isSymbolicLink: () => false, isDirectory: () => true });
    mocks.realpath.mockImplementation((value: string) => value === wal ? path.resolve('outside-wal') : value);
    expect(resolveDatabaseUserDataPath).toThrow(/escapes/);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
  it('checks mixed-case database directory names on Windows too', () => {
    prepare();
    const db = path.join(root, 'SQLITE-DB');
    const wal = path.join(db, 'nimbalyst.sqlite-wal');
    mocks.readdir.mockImplementation((value: string) => value === root ? ['SQLITE-DB'] : ['nimbalyst.sqlite-wal']);
    mocks.lstat.mockReturnValue({ isSymbolicLink: () => false, isDirectory: () => true });
    mocks.realpath.mockImplementation((value: string) => value === wal ? path.resolve('outside-wal') : value);
    expect(resolveDatabaseUserDataPath).toThrow(/escapes/);
  });
  it('rejects a multiply-linked database file', () => {
    prepare();
    const db = path.join(root, 'sqlite-db');
    mocks.readdir.mockImplementation((value: string) => value === root ? ['sqlite-db'] : ['nimbalyst.sqlite']);
    mocks.lstat.mockImplementation((value: string) => ({ isSymbolicLink: () => false, isDirectory: () => value === db, nlink: value === db ? 1 : 2 }));
    expect(resolveDatabaseUserDataPath).toThrow(/linked/i);
  });
  it('accepts an ordinary isolated database tree without reading its contents', () => {
    prepare();
    const db = path.join(root, 'sqlite-db');
    mocks.readdir.mockImplementation((value: string) => value === root ? ['sqlite-db'] : ['nimbalyst.sqlite']);
    mocks.lstat.mockImplementation((value: string) => ({ isSymbolicLink: () => false, isDirectory: () => value === db }));
    expect(resolveDatabaseUserDataPath()).toBe(root);
    expect(process.exit).not.toHaveBeenCalled();
  });
  it('accepts settings and database descendants', () => {
    prepare();
    expect(() => assertIsolatedProfilePath(path.join(root, 'app-settings.json'))).not.toThrow();
    expect(() => assertIsolatedProfilePath(path.join(root, 'sqlite-db'))).not.toThrow();
  });
  it('rejects a changed Main profile before accessing the target', () => {
    prepare();
    mocks.getPath.mockReturnValue(path.resolve('other-profile'));
    expect(() => assertIsolatedProfilePath(path.join(root, 'app-settings.json'))).toThrow(/mismatch/);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(mocks.realpath).not.toHaveBeenCalled();
  });
  it('rejects an explicit cwd outside the profile', () => {
    prepare();
    expect(() => assertIsolatedProfilePath(path.resolve('other-profile', 'app-settings.json'))).toThrow(/escapes/);
  });
  it('rejects a junction ancestor even for a file that does not exist yet', () => {
    prepare();
    const junction = path.join(root, 'linked');
    const file = path.join(junction, 'settings.json');
    mocks.realpath.mockImplementation((value: string) => {
      if (value === file) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return value === junction ? path.resolve('outside-profile') : value;
    });
    expect(() => assertIsolatedProfilePath(file)).toThrow(/escapes/);
  });
  it('does not ignore access failures', () => {
    prepare();
    mocks.realpath.mockImplementation(() => { throw Object.assign(new Error('denied'), { code: 'EACCES' }); });
    expect(() => assertIsolatedProfilePath(root)).toThrow('denied');
  });
});
