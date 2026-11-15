import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as os from 'os';
import * as path from 'path';

const electronApp = vi.hoisted(() => ({
  getPath: vi.fn((name: string) => name),
  setName: vi.fn(),
  setPath: vi.fn(),
}));

vi.mock('electron', () => ({ app: electronApp }));

const originalUserDataDir = process.env.NIMBALYST_USER_DATA_DIR;
const originalTestDocumentsDir = process.env.NIMBALYST_TEST_DOCUMENTS_DIR;
const originalArgv = [...process.argv];
const originalDatabasePath = process.env.NIMBALYST_USER_DATA_PATH;

describe('bootstrap profile path selection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const paths: Record<string, string> = { appData: os.tmpdir(), userData: path.join(os.tmpdir(), 'mock-default') };
    electronApp.getPath.mockImplementation((name?: string) => paths[name ?? 'appData']);
    electronApp.setPath.mockImplementation((name: string, value: string) => { paths[name] = value; });
    electronApp.setName.mockClear();
    electronApp.setPath.mockClear();
    delete process.env.NIMBALYST_USER_DATA_DIR;
    delete process.env.NIMBALYST_TEST_DOCUMENTS_DIR;
    delete process.env.NIMBALYST_USER_DATA_PATH;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.argv = [...originalArgv];
    if (originalDatabasePath === undefined) delete process.env.NIMBALYST_USER_DATA_PATH;
    else process.env.NIMBALYST_USER_DATA_PATH = originalDatabasePath;
    if (originalUserDataDir === undefined) delete process.env.NIMBALYST_USER_DATA_DIR;
    else process.env.NIMBALYST_USER_DATA_DIR = originalUserDataDir;

    if (originalTestDocumentsDir === undefined) delete process.env.NIMBALYST_TEST_DOCUMENTS_DIR;
    else process.env.NIMBALYST_TEST_DOCUMENTS_DIR = originalTestDocumentsDir;
  });

  it('keeps the ordinary unofficial profile when no override is supplied', async () => {
    process.argv = ['app'];
    await import('../bootstrapProfile');
    expect(electronApp.getPath('userData')).toBe(path.join(os.tmpdir(), 'Nimbalyst 日本語版（非公式）'));
    expect(process.env.NIMBALYST_USER_DATA_DIR).toBeUndefined();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it.each(['split', 'equals'])('normalizes the %s CLI profile into the inherited environment', async (form) => {
    const profile = path.join(os.tmpdir(), 'bootstrap-isolated', 'profile');
    process.argv = ['app', ...(form === 'split' ? ['--user-data-dir', profile] : [`--user-data-dir=${profile}`])];
    await import('../bootstrapProfile');
    expect(process.env.NIMBALYST_USER_DATA_DIR).toBe(profile);
    expect(electronApp.getPath('userData')).toBe(profile);
    expect(process.argv).not.toContain(profile);
  });

  it('fails closed when Electron does not retain the selected profile', async () => {
    process.env.NIMBALYST_USER_DATA_DIR = path.join(os.tmpdir(), 'bootstrap-isolated', 'profile');
    electronApp.setPath.mockImplementation(() => {});
    await expect(import('../bootstrapProfile')).rejects.toThrow(/profile/i);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('rejects conflicting environment and CLI profiles', async () => {
    process.env.NIMBALYST_USER_DATA_DIR = path.join(os.tmpdir(), 'profile-a');
    process.argv = ['app', '--user-data-dir', path.join(os.tmpdir(), 'profile-b')];
    await expect(import('../bootstrapProfile')).rejects.toThrow(/profile/i);
  });

  it('retains an inherited profile on a second bootstrap and binds the database to it', async () => {
    const profile = path.join(os.tmpdir(), 'bootstrap-isolated', 'profile');
    process.argv = ['app', '--user-data-dir', profile];
    await import('../bootstrapProfile');
    vi.resetModules();
    process.argv = ['app']; // A child without CLI args still inherits the env.
    await import('../bootstrapProfile');
    const { resolveDatabaseUserDataPath } = await import('../database/userDataPath');
    expect(electronApp.getPath('userData')).toBe(profile);
    expect(resolveDatabaseUserDataPath()).toBe(profile);
    electronApp.getPath.mockReturnValue(path.join(os.tmpdir(), 'wrong-profile'));
    expect(resolveDatabaseUserDataPath).toThrow(/profile mismatch/i);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it.each([['--user-data-dir'], ['--user-data-dir='], ['--user-data-dir=relative-profile']])('aborts malformed profile arguments %j', async (arg) => {
    process.argv = ['app', arg];
    await expect(import('../bootstrapProfile')).rejects.toThrow(/absolute path/);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(electronApp.setPath).not.toHaveBeenCalled();
  });

  it('aborts an out-of-profile database override before later imports', async () => {
    process.env.NIMBALYST_USER_DATA_DIR = path.join(os.tmpdir(), 'isolated-profile');
    process.env.NIMBALYST_USER_DATA_PATH = path.join(os.tmpdir(), 'outside-database');
    await expect(import('../bootstrapProfile')).rejects.toThrow(/Database path escapes/);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('uses the test workspace as Documents only for an explicit isolated userData profile', async () => {
    const profileRoot = path.join(os.tmpdir(), 'profile-root');
    const profileDir = path.join(profileRoot, 'profile');
    const workspaceDir = path.join(profileRoot, 'workspace');
    process.env.NIMBALYST_USER_DATA_DIR = profileDir;
    process.env.NIMBALYST_TEST_DOCUMENTS_DIR = workspaceDir;

    await import('../bootstrapProfile');

    expect(electronApp.setPath).toHaveBeenCalledWith('userData', profileDir);
    expect(electronApp.setPath).toHaveBeenCalledWith('appData', profileRoot);
    expect(electronApp.setPath).toHaveBeenCalledWith('documents', workspaceDir);
  });

  it('rejects a Documents override outside the isolated profile workspace', async () => {
    const profileRoot = path.join(os.tmpdir(), 'profile-root');
    process.env.NIMBALYST_USER_DATA_DIR = path.join(profileRoot, 'profile');
    process.env.NIMBALYST_TEST_DOCUMENTS_DIR = path.join(os.homedir(), 'Documents');

    await expect(import('../bootstrapProfile')).rejects.toThrow(
      'NIMBALYST_TEST_DOCUMENTS_DIR must be the isolated profile workspace'
    );
  });

  it('rejects an otherwise matching workspace outside the operating-system temp directory', async () => {
    process.env.NIMBALYST_USER_DATA_DIR = path.join(os.homedir(), 'profile-root', 'profile');
    process.env.NIMBALYST_TEST_DOCUMENTS_DIR = path.join(os.homedir(), 'profile-root', 'workspace');

    await expect(import('../bootstrapProfile')).rejects.toThrow(
      'NIMBALYST_TEST_DOCUMENTS_DIR must be the isolated profile workspace'
    );
  });

  it('rejects the test Documents override without an explicit isolated userData profile', async () => {
    process.env.NIMBALYST_TEST_DOCUMENTS_DIR = path.join(os.tmpdir(), 'profile-root', 'workspace');

    await expect(import('../bootstrapProfile')).rejects.toThrow(
      'NIMBALYST_TEST_DOCUMENTS_DIR requires NIMBALYST_USER_DATA_DIR'
    );
  });

  it('does not override the operating-system Documents path for a normal launch', async () => {
    process.env.NIMBALYST_USER_DATA_DIR = path.join(os.tmpdir(), 'profile-root', 'profile');

    await import('../bootstrapProfile');

    expect(electronApp.setPath).not.toHaveBeenCalledWith('documents', expect.anything());
  });
});
