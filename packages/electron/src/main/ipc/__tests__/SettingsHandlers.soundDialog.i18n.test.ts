// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createMainI18nController } from '../../i18n/mainI18n';
const mocks = vi.hoisted(() => ({ handlers: new Map<string, (...args: any[]) => any>(), showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }) }));
vi.mock('electron', async () => ({
  app: (await import('../../../../test-stubs/privateUserData')).testApp,
  BrowserWindow: { fromWebContents: () => null, getAllWindows: () => [] },
  safeStorage: {}, session: {}, dialog: { showOpenDialog: mocks.showOpenDialog },
}));
vi.mock('../../utils/ipcRegistry', () => ({ safeHandle: (name: string, handler: (...args: any[]) => any) => mocks.handlers.set(name, handler), safeOn: vi.fn() }));
vi.mock('../ProviderCredentialHandlers', () => ({ registerProviderCredentialHandlers: vi.fn() }));
vi.mock('../CloudflareSandboxHandlers', () => ({ registerCloudflareSandboxHandlers: vi.fn() }));
vi.mock('../../services/SettingsService', () => ({ getSettingsService: () => ({ init: vi.fn() }), isSettingKey: () => true }));
vi.mock('../../services/SyncManager', () => ({ onSyncStatusChange: vi.fn(), isSyncProviderReady: () => false, projectConfigSync: {}, triggerIncrementalSync: vi.fn(), updateSleepPrevention: vi.fn() }));
vi.mock('../../services/StytchAuthService', () => ({}));
vi.mock('../../services/CredentialService', () => ({ getCredentials: vi.fn(), resetCredentials: vi.fn(), generateQRPairingPayload: vi.fn(), isUsingSecureStorage: () => false }));
vi.mock('../../services/RepositoryManager', () => ({ repositoryManager: {} }));
vi.mock('../../services/autoUpdater', () => ({ autoUpdaterService: {} }));
vi.mock('../../utils/dialogPaths', () => ({ getDialogDefaultPath: () => '/fixture-only-audio', rememberDialogSelection: vi.fn() }));
import { registerSettingsHandlers } from '../SettingsHandlers';

describe('completion sound native picker', () => {
  it('localizes title/button/filter and retains file selection and cancellation semantics', async () => {
    registerSettingsHandlers();
    const controller = await createMainI18nController({ get: () => 'ja', subscribe: () => () => undefined }, 'en-US', () => undefined);
    try {
      const handler = mocks.handlers.get('completion-sound:choose-custom')!;
      expect(await handler({ sender: {} })).toBeNull();
      expect(mocks.showOpenDialog).toHaveBeenLastCalledWith({ title: '完了通知音を選択', buttonLabel: 'この音を使用', properties: ['openFile'], filters: [{ name: '音声ファイル', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] }], defaultPath: '/fixture-only-audio' });
      await controller.i18n.changeLanguage('en');
      await handler({ sender: {} });
      expect(mocks.showOpenDialog).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Choose Completion Sound', buttonLabel: 'Use Sound', filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] }] }));
    } finally { controller.dispose(); }
  });
});
