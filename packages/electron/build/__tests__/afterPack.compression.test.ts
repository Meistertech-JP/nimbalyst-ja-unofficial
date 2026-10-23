// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { configureWindowsNsisCompression } = require_('../afterPack.js');
const { compute7zCompressArgs } = require_('app-builder-lib/out/targets/archive.js');

afterEach(() => { vi.unstubAllEnvs(); });

describe('Windows x64 NSIS extraction-compatible compression', () => {
  it.each([undefined, 'ARM', 'BCJ2', 'off'])('uses BCJ even when the external filter is %s', (previousFilter) => {
    vi.stubEnv('ELECTRON_BUILDER_7Z_FILTER', previousFilter);
    expect(configureWindowsNsisCompression('win32', 'x64')).toBe(true);
    expect(process.env.ELECTRON_BUILDER_7Z_FILTER).toBe('BCJ');
    const args = compute7zCompressArgs('7z', { solid: false, compression: 'normal' });
    expect(args.filter((arg: string) => arg.startsWith('-mf='))).toEqual(['-mf=BCJ']);
    expect(args.some((arg: string) => arg.startsWith('-xr!'))).toBe(false);
  });

  it('does not add a 7z filter to the portable ZIP command', () => {
    vi.stubEnv('ELECTRON_BUILDER_7Z_FILTER', undefined);
    configureWindowsNsisCompression('win32', 'x64');
    const args = compute7zCompressArgs('zip', { compression: 'normal' });
    expect(args.some((arg: string) => arg.startsWith('-mf='))).toBe(false);
    expect(args).toContain('-mm=Deflate');
  });

  it.each([
    ['darwin', 'x64'], ['darwin', 'arm64'], ['linux', 'x64'], ['win32', 'arm64'], ['win32', 'ia32'],
  ])('leaves the environment unchanged for %s-%s', (platform, arch) => {
    const environment = { ELECTRON_BUILDER_7Z_FILTER: 'ARM', UNRELATED: 'preserved' };
    expect(configureWindowsNsisCompression(platform, arch, environment)).toBe(false);
    expect(environment).toEqual({ ELECTRON_BUILDER_7Z_FILTER: 'ARM', UNRELATED: 'preserved' });
    const unset = {};
    expect(configureWindowsNsisCompression(platform, arch, unset)).toBe(false);
    expect(unset).toEqual({});
  });
});
