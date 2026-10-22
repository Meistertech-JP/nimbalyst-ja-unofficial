// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createRequire } from 'module';

const require_ = createRequire(import.meta.url);
const {
  removeProbeExecutable,
  sha256FileSync,
  withElectronAbiProbeExecutable,
} = require_('../electron-abi-probe.js');

const created: string[] = [];
afterEach(() => {
  while (created.length) fs.rmSync(created.pop()!, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function makeExecutable(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nim-electron-abi-probe-'));
  created.push(directory);
  const executable = path.join(directory, 'Nimbalyst.exe');
  fs.writeFileSync(executable, crypto.randomBytes(4096));
  return executable;
}

describe('withElectronAbiProbeExecutable', () => {
  it('runs the Windows ABI probe against an exact adjacent copy and leaves the packaged executable untouched', () => {
    const executable = makeExecutable();
    const originalHash = sha256FileSync(executable);
    let probePath = '';

    const result = withElectronAbiProbeExecutable(executable, (copy: string) => {
      probePath = copy;
      expect(copy).not.toBe(executable);
      expect(path.dirname(copy)).toBe(path.dirname(executable));
      expect(path.extname(copy)).toBe('.exe');
      expect(sha256FileSync(copy)).toBe(originalHash);
      // Mutate only the probe image to prove the production target is not the
      // file passed to the ABI validation callback.
      fs.writeFileSync(copy, 'probe-only mutation');
      return 'probe-result';
    }, { platform: 'win32' });

    expect(result).toBe('probe-result');
    expect(probePath).not.toBe('');
    expect(fs.existsSync(probePath)).toBe(false);
    expect(sha256FileSync(executable)).toBe(originalHash);
  });

  it('does not copy the Electron executable on non-Windows targets', () => {
    const executable = makeExecutable();
    const runProbe = vi.fn((file: string) => file);

    expect(withElectronAbiProbeExecutable(executable, runProbe, { platform: 'linux' })).toBe(executable);
    expect(runProbe).toHaveBeenCalledExactlyOnceWith(executable);
    expect(fs.readdirSync(path.dirname(executable))).toEqual(['Nimbalyst.exe']);
  });

  it('retries transient Windows image-release failures while removing the probe copy', () => {
    const remove = vi.fn(() => {
      if (remove.mock.calls.length < 3) {
        const error = new Error('image still mapped') as NodeJS.ErrnoException;
        error.code = 'EPERM';
        throw error;
      }
    });
    const wait = vi.fn();

    removeProbeExecutable('probe.exe', { remove, wait });

    expect(remove).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenNthCalledWith(1, 250);
    expect(wait).toHaveBeenNthCalledWith(2, 250);
  });

  it('fails closed if the probe copy cannot be removed after the bounded retries', () => {
    const remove = vi.fn(() => {
      const error = new Error('still mapped') as NodeJS.ErrnoException;
      error.code = 'EBUSY';
      throw error;
    });
    const wait = vi.fn();

    expect(() => removeProbeExecutable('probe.exe', { remove, wait })).toThrow(
      /Could not remove temporary Electron ABI probe executable/,
    );
    expect(remove).toHaveBeenCalledTimes(25);
    expect(wait).toHaveBeenCalledTimes(24);
  });
});
