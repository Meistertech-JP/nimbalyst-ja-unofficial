import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as os from 'os';
import * as path from 'path';

const electronApp = vi.hoisted(() => ({
  getPath: vi.fn(() => 'C:\\Users\\test\\AppData\\Roaming'),
  setName: vi.fn(),
  setPath: vi.fn(),
}));

vi.mock('electron', () => ({ app: electronApp }));

const originalUserDataDir = process.env.NIMBALYST_USER_DATA_DIR;
const originalTestDocumentsDir = process.env.NIMBALYST_TEST_DOCUMENTS_DIR;

describe('bootstrap profile path selection', () => {
  beforeEach(() => {
    vi.resetModules();
    electronApp.getPath.mockClear();
    electronApp.setName.mockClear();
    electronApp.setPath.mockClear();
    delete process.env.NIMBALYST_USER_DATA_DIR;
    delete process.env.NIMBALYST_TEST_DOCUMENTS_DIR;
  });

  afterEach(() => {
    if (originalUserDataDir === undefined) delete process.env.NIMBALYST_USER_DATA_DIR;
    else process.env.NIMBALYST_USER_DATA_DIR = originalUserDataDir;

    if (originalTestDocumentsDir === undefined) delete process.env.NIMBALYST_TEST_DOCUMENTS_DIR;
    else process.env.NIMBALYST_TEST_DOCUMENTS_DIR = originalTestDocumentsDir;
  });

  it('uses the test workspace as Documents only for an explicit isolated userData profile', async () => {
    const profileRoot = path.join(os.tmpdir(), 'profile-root');
    const profileDir = path.join(profileRoot, 'profile');
    const workspaceDir = path.join(profileRoot, 'workspace');
    process.env.NIMBALYST_USER_DATA_DIR = profileDir;
    process.env.NIMBALYST_TEST_DOCUMENTS_DIR = workspaceDir;

    await import('./bootstrapProfile');

    expect(electronApp.setPath).toHaveBeenCalledWith('userData', profileDir);
    expect(electronApp.setPath).toHaveBeenCalledWith('appData', profileRoot);
    expect(electronApp.setPath).toHaveBeenCalledWith('documents', workspaceDir);
  });

  it('rejects a Documents override outside the isolated profile workspace', async () => {
    const profileRoot = path.join(os.tmpdir(), 'profile-root');
    process.env.NIMBALYST_USER_DATA_DIR = path.join(profileRoot, 'profile');
    process.env.NIMBALYST_TEST_DOCUMENTS_DIR = path.join(os.homedir(), 'Documents');

    await expect(import('./bootstrapProfile')).rejects.toThrow(
      'NIMBALYST_TEST_DOCUMENTS_DIR must be the isolated profile workspace'
    );
  });

  it('rejects an otherwise matching workspace outside the operating-system temp directory', async () => {
    process.env.NIMBALYST_USER_DATA_DIR = path.join(os.homedir(), 'profile-root', 'profile');
    process.env.NIMBALYST_TEST_DOCUMENTS_DIR = path.join(os.homedir(), 'profile-root', 'workspace');

    await expect(import('./bootstrapProfile')).rejects.toThrow(
      'NIMBALYST_TEST_DOCUMENTS_DIR must be the isolated profile workspace'
    );
  });

  it('rejects the test Documents override without an explicit isolated userData profile', async () => {
    process.env.NIMBALYST_TEST_DOCUMENTS_DIR = path.join(os.tmpdir(), 'profile-root', 'workspace');

    await expect(import('./bootstrapProfile')).rejects.toThrow(
      'NIMBALYST_TEST_DOCUMENTS_DIR requires NIMBALYST_USER_DATA_DIR'
    );
  });

  it('does not override the operating-system Documents path for a normal launch', async () => {
    process.env.NIMBALYST_USER_DATA_DIR = path.join(os.tmpdir(), 'profile-root', 'profile');

    await import('./bootstrapProfile');

    expect(electronApp.setPath).not.toHaveBeenCalledWith('documents', expect.anything());
  });
});
