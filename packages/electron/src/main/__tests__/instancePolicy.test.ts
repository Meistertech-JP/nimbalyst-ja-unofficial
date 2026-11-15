// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { allowsMultipleInstances, forwardedStartupArgv, startupInstanceContext } from '../utils/instancePolicy';
import path from 'node:path';
import { resolveLaunchTarget } from '../shellCommand/launchTarget';
describe('instance lock policy', () => {
  it('keeps the lock for both default and explicitly selected profiles', () => {
    expect(allowsMultipleInstances({})).toBe(false);
    expect(allowsMultipleInstances({ NIMBALYST_USER_DATA_DIR: '/isolated/profile' })).toBe(false);
  });
  it('preserves the explicit Playwright harness bypass', () => {
    expect(allowsMultipleInstances({ PLAYWRIGHT: '1' })).toBe(true);
  });
  it('does not open the profile when Electron reorders native switch values', () => {
    const profile = path.resolve('isolated-profile');
    const native = ['app.exe', '--user-data-dir', '--allow-file-access-from-files', profile];
    const normalized = ['app.exe', `--user-data-dir=${profile}`];
    const forwarded = forwardedStartupArgv(native, { version: 1, profile, argv: normalized }, profile);
    expect(resolveLaunchTarget(forwarded.slice(1), process.cwd(), () => 'directory')).toBeNull();
  });
  it('keeps the real workspace target from the normalized sender', () => {
    const profile = path.resolve('isolated-profile');
    const workspace = path.resolve('workspace');
    const argv = ['app.exe', `--user-data-dir=${profile}`, workspace];
    expect(forwardedStartupArgv(['app.exe'], { version: 1, profile, argv }, profile)).toEqual(argv);
  });
  it.each([null, {}, { version: 1, profile: 'different', argv: ['app.exe'] },
    { version: 1, profile: 'isolated', argv: [1] }])('rejects missing or malformed isolated forwarding context %#', (data) => {
    expect(forwardedStartupArgv(['app.exe', 'untrusted-positional'], data, 'isolated')).toEqual([]);
  });
  it('preserves native compatibility for default-profile legacy launches', () => {
    expect(forwardedStartupArgv(['app.exe', 'notes.md'], null)).toEqual(['app.exe', 'notes.md']);
  });
  it('copies sender arguments and preserves default-profile file forwarding', () => {
    const argv = ['app.exe', 'notes.md'];
    const context = startupInstanceContext(argv);
    argv.push('later.md');
    expect(forwardedStartupArgv(['app.exe'], context)).toEqual(['app.exe', 'notes.md']);
  });
});
