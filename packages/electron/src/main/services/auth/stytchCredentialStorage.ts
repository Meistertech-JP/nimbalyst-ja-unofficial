import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'node:crypto';

export type StytchCredentialFile = 'stytch-credentials.enc' | 'stytch-accounts.enc';

export interface StytchCredentialWrite {
  name: StytchCredentialFile;
  /** Null removes this file (logout), without requiring an encryption key. */
  value: unknown | null;
}

export class StytchCredentialStorageError extends Error {
  constructor(readonly code: 'encryption-unavailable' | 'encrypt-failed' | 'read-failed' | 'write-failed' | 'recovery-required') {
    // Never retain native error messages/causes, serialized values, or file contents.
    super(`Credential storage: ${code}`);
    this.name = 'StytchCredentialStorageError';
  }
}

function credentialPath(name: StytchCredentialFile): string {
  if (name !== 'stytch-credentials.enc' && name !== 'stytch-accounts.enc') {
    throw new StytchCredentialStorageError('write-failed');
  }
  return path.join(app.getPath('userData'), name);
}

/** A preflight is useful before opening sign-in, but every write checks again. */
export function requireStytchCredentialEncryption(): void {
  try {
    if (safeStorage.isEncryptionAvailable()) return;
  } catch { /* Treat an unavailable OS key service exactly like false. */ }
  throw new StytchCredentialStorageError('encryption-unavailable');
}

export function readStytchCredentialFile<T>(name: StytchCredentialFile): T | null {
  const target = credentialPath(name);
  if (!fs.existsSync(target)) return null;
  requireStytchCredentialEncryption();
  try {
    return JSON.parse(safeStorage.decryptString(fs.readFileSync(target))) as T;
  } catch {
    // Preserve unreadable data for recovery. Never reinterpret it as plaintext.
    throw new StytchCredentialStorageError('read-failed');
  }
}

/**
 * Encrypt and stage the whole snapshot before replacing any existing file.
 * Same-directory renames avoid truncating live credentials on a failed write.
 * Rollback copies contain only the previous on-disk bytes; on rollback failure
 * they remain available for recovery. This is not a crash-atomic two-file DB.
 * No auth initialization, network, analytics, settings, or event publication.
 */
export function persistStytchCredentialFiles(entries: readonly StytchCredentialWrite[]): void {
  if (new Set(entries.map(entry => entry.name)).size !== entries.length) {
    throw new StytchCredentialStorageError('write-failed');
  }
  if (entries.some(entry => entry.value !== null)) requireStytchCredentialEncryption();
  const transaction = randomUUID();
  const prepared = entries.map(entry => {
    const target = credentialPath(entry.name);
    let data: Buffer | null = null;
    if (entry.value !== null) {
      try { data = safeStorage.encryptString(JSON.stringify(entry.value)); }
      catch { throw new StytchCredentialStorageError('encrypt-failed'); }
    }
    return { target, data, stage: `${target}.${transaction}.tmp`, backup: `${target}.${transaction}.rollback`, existed: false, committed: false };
  });
  let retainRecovery = false;
  try {
    for (const entry of prepared) {
      entry.existed = fs.existsSync(entry.target);
      if (entry.data !== null) fs.writeFileSync(entry.stage, entry.data, { flag: 'wx', mode: 0o600 });
      if (entry.existed) {
        fs.writeFileSync(entry.backup, fs.readFileSync(entry.target), { flag: 'wx', mode: 0o600 });
      }
    }
    for (const entry of prepared) {
      if (entry.data !== null) fs.renameSync(entry.stage, entry.target);
      else if (entry.existed) fs.unlinkSync(entry.target);
      entry.committed = true;
    }
  } catch {
    for (const entry of [...prepared].reverse()) {
      if (!entry.committed) continue;
      try {
        if (entry.existed) fs.renameSync(entry.backup, entry.target);
        else if (fs.existsSync(entry.target)) fs.unlinkSync(entry.target);
      } catch { retainRecovery = true; }
    }
    throw new StytchCredentialStorageError(retainRecovery ? 'recovery-required' : 'write-failed');
  } finally {
    let cleanupIncomplete = false;
    for (const entry of prepared) {
      for (const temporary of [entry.stage, ...(!retainRecovery ? [entry.backup] : [])]) {
        try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
        catch { cleanupIncomplete = true; }
      }
    }
    if (cleanupIncomplete) console.warn('[CredentialStorage] Encrypted temporary cleanup incomplete');
  }
}
