import { afterEach, describe, expect, it, vi } from 'vitest';
import * as path from 'node:path';

const mocks = vi.hoisted(() => ({ getPath: vi.fn(), realpath: vi.fn() }));
vi.mock('electron', () => ({ app: { getPath: mocks.getPath } }));
vi.mock('node:fs', () => ({ realpathSync: { native: mocks.realpath } }));
import { assertIsolatedProfilePath } from '../utils/profileBoundary';

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
  }
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
