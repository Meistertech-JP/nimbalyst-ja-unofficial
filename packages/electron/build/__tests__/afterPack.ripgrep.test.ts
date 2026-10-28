// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require_ = createRequire(import.meta.url);
const { validatePackagedRipgrep } = require_('../afterPack.js');
const directories: string[] = [];

function resourcesWithRipgrep() {
  const resources = fs.mkdtempSync(path.join(os.tmpdir(), 'r20-rg-validation-'));
  directories.push(resources);
  const binary = path.join(resources, 'app.asar.unpacked', 'node_modules', '@vscode', 'ripgrep', 'bin', 'rg.exe');
  fs.mkdirSync(path.dirname(binary), { recursive: true });
  fs.writeFileSync(binary, 'fixture');
  return { resources, binary };
}

afterEach(() => {
  for (const dir of directories.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('packaged Windows ripgrep validation', () => {
  it('rejects a missing executable', () => {
    const { resources, binary } = resourcesWithRipgrep();
    fs.unlinkSync(binary);
    expect(() => validatePackagedRipgrep(resources, 'win32', 'x64')).toThrow(/ripgrep/i);
  });

  it('rejects an executable that cannot start, even when the file exists', () => {
    const { resources } = resourcesWithRipgrep();
    const spawn = vi.fn(() => ({ status: null, error: new Error('spawn EFTYPE'), stdout: '' }));
    expect(() => validatePackagedRipgrep(resources, 'win32', 'x64', { platform: 'win32', arch: 'x64', spawn })).toThrow(/EFTYPE/);
  });

  it.each([
    { status: 1, stdout: 'ripgrep 15.0.0\n', stderr: 'failed' },
    { status: 0, stdout: 'unexpected output', stderr: '' },
    { status: null, error: new Error('timed out'), stdout: '' },
  ])('rejects an invalid execution result %#', (result) => {
    const { resources } = resourcesWithRipgrep();
    const spawn = vi.fn(() => result);
    expect(() => validatePackagedRipgrep(resources, 'win32', 'x64', { platform: 'win32', arch: 'x64', spawn })).toThrow(/ripgrep failed/i);
  });

  it('runs and checks the packaged executable on a matching host', () => {
    const { resources, binary } = resourcesWithRipgrep();
    const spawn = vi.fn(() => ({ status: 0, stdout: 'ripgrep 15.0.0\n' }));
    expect(validatePackagedRipgrep(resources, 'win32', 'x64', { platform: 'win32', arch: 'x64', spawn })).toBe('executed');
    expect(spawn).toHaveBeenCalledWith(binary, ['--version'], expect.objectContaining({ timeout: expect.any(Number) }));
  });

  it('does not claim execution on a cross-platform host', () => {
    const { resources } = resourcesWithRipgrep();
    const spawn = vi.fn();
    expect(validatePackagedRipgrep(resources, 'win32', 'x64', { platform: 'linux', arch: 'x64', spawn })).toBe('not-executed');
    expect(spawn).not.toHaveBeenCalled();
  });
});
