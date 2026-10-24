// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testApp = vi.hoisted(() => ({
  isPackaged: true,
  getPath: vi.fn(() => '/isolated-test-profile'),
  commandLine: { appendSwitch: vi.fn() },
}));
vi.mock('electron', () => ({ app: testApp }));
vi.mock('../bootstrapProfile', () => ({}));
vi.mock('../hostEnvironment', () => ({}));
vi.mock('../index.js', () => ({}));
vi.mock('../uncaughtException', () => ({ createUncaughtExceptionHandler: vi.fn(() => vi.fn()) }));
vi.mock('../utils/privateSettingsStore', () => ({
  default: class { get() { return 4096; } },
  hardenExistingSettings: vi.fn(),
}));

describe('bootstrap development debugging boundary', () => {
  beforeEach(() => {
    vi.resetModules();
    testApp.commandLine.appendSwitch.mockClear();
    vi.spyOn(process, 'on').mockReturnValue(process);
    vi.stubEnv('NIMBALYST_CDP_PORT', '19414');
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it.each([undefined, 'development', 'production'])('never enables CDP for packaged apps when NODE_ENV=%s', async nodeEnv => {
    testApp.isPackaged = true;
    vi.stubEnv('NODE_ENV', nodeEnv);
    await import('../bootstrap');
    expect(testApp.commandLine.appendSwitch.mock.calls.filter(([name]) => name === 'remote-debugging-port')).toEqual([]);
    expect(testApp.commandLine.appendSwitch).toHaveBeenCalledWith('js-flags', '--max-old-space-size=4096');
  });

  it('retains the configured CDP port for unpackaged development', async () => {
    testApp.isPackaged = false;
    vi.stubEnv('NODE_ENV', 'development');
    await import('../bootstrap');
    expect(testApp.commandLine.appendSwitch).toHaveBeenCalledWith('remote-debugging-port', '19414');
  });

  it('does not enable CDP for an unpackaged production invocation', async () => {
    testApp.isPackaged = false;
    vi.stubEnv('NODE_ENV', 'production');
    await import('../bootstrap');
    expect(testApp.commandLine.appendSwitch.mock.calls.filter(([name]) => name === 'remote-debugging-port')).toEqual([]);
  });
});
