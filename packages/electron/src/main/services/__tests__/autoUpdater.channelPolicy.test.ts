// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';

const settings = vi.hoisted(() => ({
  channel: 'stable',
  handlers: new Map<string, (...args: any[]) => any>(),
  listeners: new Map<string, (...args: any[]) => any>(),
}));
vi.mock('../../utils/store', () => ({ getReleaseChannel: () => settings.channel, store: {} }));
vi.mock('../../utils/ipcRegistry', () => ({
  safeHandle: vi.fn((channel: string, handler: (...args: any[]) => any) => settings.handlers.set(channel, handler)),
  safeOn: vi.fn((channel: string, handler: (...args: any[]) => any) => settings.listeners.set(channel, handler)),
}));
vi.mock('electron', () => ({ app: {}, BrowserWindow: {}, dialog: {} }));
vi.mock('electron-log/main', () => ({ default: { transports: { file: {} }, info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../analytics/AnalyticsService', () => ({ AnalyticsService: {} }));
vi.mock('../../ipc/SessionStateHandlers', () => ({ hasActiveStreamingSessions: vi.fn() }));
vi.mock('@nimbalyst/runtime/ai/server/SessionStateManager', () => ({ getSessionStateManager: vi.fn() }));
vi.mock('../../database/initialize', () => ({ getDatabase: vi.fn() }));
vi.mock('../electronUpdaterPatch', () => ({ installAtomFeedFilter: vi.fn() }));
vi.mock('electron-updater', async () => {
  // Keep the dependency's REAL channel setter and semver admission logic.
  const { AppUpdater } = await import('electron-updater/out/AppUpdater');
  class TestUpdater extends AppUpdater {
    constructor() {
      super(undefined, { version: '0.78.1', name: 'test', isPackaged: true } as never);
    }
    protected async doDownloadUpdate(): Promise<string[]> { return []; }
    quitAndInstall(): void { throw new Error('This test must never install an update'); }
  }
  const updater = new TestUpdater();
  updater.setFeedURL = vi.fn();
  updater.isUpdateSupported = async () => true;
  updater.isUserWithinRollout = async () => true;
  return { autoUpdater: updater };
});

import { autoUpdater } from 'electron-updater';
import log from 'electron-log/main';
import { AutoUpdaterService } from '../autoUpdater';

beforeEach(() => {
  autoUpdater.removeAllListeners();
  settings.channel = 'stable';
  settings.handlers.clear();
  settings.listeners.clear();
  (autoUpdater.setFeedURL as ReturnType<typeof vi.fn>).mockClear();
});

it('refuses older releases through launch, repeated checks, and channel changes', async () => {
  const dependency = autoUpdater as unknown as { isUpdateAvailable(info: { version: string }): Promise<boolean> };
  for (let launch = 0; launch < 2; launch++) {
    const service = new AutoUpdaterService(true);
    expect(service.updatesEnabled).toBe(true);
    expect(autoUpdater.autoDownload).toBe(true);
    expect(autoUpdater.autoInstallOnAppQuit).toBe(true);
    for (const channel of ['stable', 'alpha', 'stable', 'stable']) {
      settings.channel = channel;
      service.reconfigureFeedURL();
      expect(autoUpdater.allowDowngrade).toBe(false);
      expect(await dependency.isUpdateAvailable({ version: '0.77.5' })).toBe(false);
      expect(await dependency.isUpdateAvailable({ version: '0.78.2' })).toBe(true);
    }
    autoUpdater.removeAllListeners();
  }
});

it('disables every update path in non-official builds', async () => {
  const service = new AutoUpdaterService(false);
  const check = vi.spyOn(autoUpdater, 'checkForUpdatesAndNotify');
  const manualCheck = vi.spyOn(autoUpdater, 'checkForUpdates');
  const download = vi.spyOn(autoUpdater, 'downloadUpdate');
  const install = vi.spyOn(autoUpdater, 'quitAndInstall');
  const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
  const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

  expect(service.updatesEnabled).toBe(false);
  expect(autoUpdater.autoDownload).toBe(false);
  expect(autoUpdater.autoInstallOnAppQuit).toBe(false);
  expect(autoUpdater.setFeedURL).not.toHaveBeenCalled();

  await service.checkForUpdates();
  await service.checkForUpdatesWithUI();
  service.startAutoUpdateCheck();
  service.reconfigureFeedURL();
  expect(await settings.handlers.get('check-for-updates')?.()).toEqual({ checking: false, disabled: true });
  expect(await settings.handlers.get('download-update')?.()).toEqual({ success: false, disabled: true });
  settings.handlers.get('quit-and-install')?.();
  await settings.listeners.get('update-toast:download')?.();
  settings.listeners.get('update-toast:install')?.();
  settings.listeners.get('update-toast:install-when-idle')?.();

  expect(check).not.toHaveBeenCalled();
  expect(manualCheck).not.toHaveBeenCalled();
  expect(download).not.toHaveBeenCalled();
  expect(install).not.toHaveBeenCalled();
  expect(setTimeoutSpy).not.toHaveBeenCalled();
  expect(setIntervalSpy).not.toHaveBeenCalled();
});

it('keeps the default updater disabled even when OFFICIAL_BUILD is true', () => {
  const originalOfficialBuild = process.env.OFFICIAL_BUILD;
  process.env.OFFICIAL_BUILD = 'true';

  try {
    const service = new AutoUpdaterService();
    expect(service.updatesEnabled).toBe(false);
    expect(autoUpdater.setFeedURL).not.toHaveBeenCalled();
  } finally {
    if (originalOfficialBuild === undefined) {
      delete process.env.OFFICIAL_BUILD;
    } else {
      process.env.OFFICIAL_BUILD = originalOfficialBuild;
    }
  }
});

it.each([false, 'error', 'info', 'debug'] as const)(
  'preserves the configured shared file logging level %s for disabled and enabled updaters',
  (level) => {
    for (const updatesEnabled of [false, true]) {
      log.transports.file.level = level;

      const service = new AutoUpdaterService(updatesEnabled);

      expect(service.updatesEnabled).toBe(updatesEnabled);
      expect(autoUpdater.logger).toBe(log);
      expect(log.transports.file.level).toBe(level);
      autoUpdater.removeAllListeners();
    }
  },
);
