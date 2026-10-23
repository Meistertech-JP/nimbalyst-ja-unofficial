// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { safeStorage } from 'electron';
import { persistStytchCredentialFiles, readStytchCredentialFile } from '../stytchCredentialStorage';

const fixture = vi.hoisted(() => ({
  files: new Map<string, Buffer>(), writes: 0, renames: 0, failWriteAt: 0, failRenameAt: 0, failRollback: false,
}));
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/dummy-profile') },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    // This reversible unit double is NOT evidence of DPAPI/native encryption.
    encryptString: vi.fn((text: string) => Buffer.from([...Buffer.from(text)].map(byte => byte ^ 0xa5))),
    decryptString: vi.fn((data: Buffer) => Buffer.from([...data].map(byte => byte ^ 0xa5)).toString()),
  },
}));
vi.mock('fs', () => {
  const key = (name: string) => name.replaceAll('\\', '/');
  return {
    existsSync: (name: string) => fixture.files.has(key(name)),
    readFileSync: (name: string) => {
      const data = fixture.files.get(key(name));
      if (!data) throw new Error('missing dummy file');
      return Buffer.from(data);
    },
    writeFileSync: (name: string, data: Buffer, options: { flag: string; mode: number }) => {
      if (++fixture.writes === fixture.failWriteAt) throw new Error('dummy write failure');
      expect(options).toEqual({ flag: 'wx', mode: 0o600 });
      if (fixture.files.has(key(name))) throw new Error('exclusive create required');
      fixture.files.set(key(name), Buffer.from(data));
    },
    renameSync: (from: string, to: string) => {
      if (++fixture.renames === fixture.failRenameAt || (fixture.failRollback && from.endsWith('.rollback'))) throw new Error('dummy rename failure');
      const value = fixture.files.get(key(from));
      if (!value) throw new Error('missing dummy rename source');
      fixture.files.set(key(to), value);
      fixture.files.delete(key(from));
    },
    unlinkSync: (name: string) => { fixture.files.delete(key(name)); },
  };
});

const single = 'stytch-credentials.enc' as const;
const multiple = 'stytch-accounts.enc' as const;
const dummy = { sessionToken: 'dummy-secret-storage-only', sessionJwt: 'dummy.jwt.value', userId: 'dummy-member' };
const snapshot = () => [
  { name: single, value: dummy },
  { name: multiple, value: { version: 3, syncAccountId: 'dummy-org', accounts: [dummy] } },
];

describe('Stytch production credential storage boundary', () => {
  beforeEach(() => {
    fixture.files.clear();
    fixture.writes = fixture.renames = fixture.failWriteAt = fixture.failRenameAt = 0;
    fixture.failRollback = false;
    vi.clearAllMocks();
  });

  it('roundtrips both unchanged schemas via encryption without retaining temporary copies', () => {
    persistStytchCredentialFiles(snapshot());
    expect(safeStorage.encryptString).toHaveBeenCalledTimes(2);
    expect([...fixture.files.keys()].sort()).toEqual([`/dummy-profile/${multiple}`, `/dummy-profile/${single}`].sort());
    for (const bytes of fixture.files.values()) expect(bytes.includes(Buffer.from(dummy.sessionToken))).toBe(false);
    expect(readStytchCredentialFile(single)).toEqual(dummy);
    expect(readStytchCredentialFile(multiple)).toEqual(snapshot()[1].value);
    expect(safeStorage.decryptString).toHaveBeenCalledTimes(2);
  });

  it.each(['false', 'throws'] as const)('fails closed before any write when availability %s', failure => {
    if (failure === 'false') vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValueOnce(false);
    else vi.mocked(safeStorage.isEncryptionAvailable).mockImplementationOnce(() => { throw new Error(dummy.sessionToken); });
    expect(() => persistStytchCredentialFiles(snapshot())).toThrow('encryption-unavailable');
    expect(fixture.writes).toBe(0);
    expect(fixture.files.size).toBe(0);
    expect(safeStorage.encryptString).not.toHaveBeenCalled();
  });

  it('does not touch existing bytes or disclose native error data if encryption fails', () => {
    persistStytchCredentialFiles(snapshot());
    const before = new Map(fixture.files);
    fixture.writes = 0;
    vi.mocked(safeStorage.encryptString).mockImplementationOnce(() => { throw new Error(dummy.sessionToken); });
    expect(() => persistStytchCredentialFiles(snapshot())).toThrow('Credential storage: encrypt-failed');
    expect(fixture.writes).toBe(0);
    expect(fixture.files).toEqual(before);
  });

  it('preserves both original files when staging the second file fails', () => {
    persistStytchCredentialFiles(snapshot());
    const before = new Map(fixture.files);
    fixture.writes = 0;
    fixture.failWriteAt = 3; // first stage + first rollback copy, then second stage
    expect(() => persistStytchCredentialFiles(snapshot())).toThrow('write-failed');
    expect(fixture.files).toEqual(before);
  });

  it('restores the first replacement if the second rename fails', () => {
    persistStytchCredentialFiles(snapshot());
    const before = new Map(fixture.files);
    fixture.renames = 0;
    fixture.failRenameAt = 2;
    expect(() => persistStytchCredentialFiles([
      { name: single, value: { ...dummy, sessionToken: 'new-dummy' } },
      { name: multiple, value: { version: 3, syncAccountId: '', accounts: [] } },
    ])).toThrow('write-failed');
    expect(fixture.files).toEqual(before);
  });

  it('preserves unreadable ciphertext and never treats it as plaintext JSON', () => {
    persistStytchCredentialFiles(snapshot());
    const before = new Map(fixture.files);
    vi.mocked(safeStorage.decryptString).mockImplementationOnce(() => { throw new Error(dummy.sessionToken); });
    expect(() => readStytchCredentialFile(single)).toThrow('Credential storage: read-failed');
    expect(fixture.files).toEqual(before);
    expect(readStytchCredentialFile(single)).toEqual(dummy);
  });

  it('retains encrypted rollback copies and signals recovery-required if restoring a replacement also fails', () => {
    persistStytchCredentialFiles(snapshot());
    const original = new Map(fixture.files);
    fixture.renames = 0;
    fixture.failRenameAt = 2;
    fixture.failRollback = true;
    expect(() => persistStytchCredentialFiles([
      { name: single, value: { ...dummy, sessionToken: 'new-dummy' } },
      { name: multiple, value: { version: 3, syncAccountId: '', accounts: [] } },
    ])).toThrow('Credential storage: recovery-required');
    const backups = [...fixture.files].filter(([name]) => name.endsWith('.rollback'));
    expect(backups).toHaveLength(2);
    for (const [name, bytes] of backups) {
      const previous = name.includes(single) ? original.get(`/dummy-profile/${single}`) : original.get(`/dummy-profile/${multiple}`);
      expect(bytes).toEqual(previous);
      expect(bytes.includes(Buffer.from(dummy.sessionToken))).toBe(false);
    }
    expect([...fixture.files.keys()].some(name => name.endsWith('.tmp'))).toBe(false);
  });

  it('does not read a plaintext file when encryption is unavailable', () => {
    fixture.files.set(`/dummy-profile/${single}`, Buffer.from(JSON.stringify(dummy)));
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValueOnce(false);
    expect(() => readStytchCredentialFile(single)).toThrow('encryption-unavailable');
    expect(safeStorage.decryptString).not.toHaveBeenCalled();
    expect(fixture.files.size).toBe(1);
  });

  it('removes both credential files on explicit logout without needing a key', () => {
    persistStytchCredentialFiles(snapshot());
    vi.mocked(safeStorage.isEncryptionAvailable).mockClear();
    persistStytchCredentialFiles([{ name: single, value: null }, { name: multiple, value: null }]);
    expect(safeStorage.isEncryptionAvailable).not.toHaveBeenCalled();
    expect(fixture.files.size).toBe(0);
    expect(readStytchCredentialFile(single)).toBeNull();
  });
});
