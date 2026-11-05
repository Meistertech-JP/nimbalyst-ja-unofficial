// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMainI18nController } from '../../i18n/mainI18n';
import { closeSplashScreen, showSplashScreen } from '../SplashScreen';

const loadURL = vi.hoisted(() => vi.fn());
vi.mock('electron', () => ({
  app: { getAppPath: () => '/missing-r22-test-icon' },
  nativeTheme: { shouldUseDarkColors: true },
  BrowserWindow: class {
    loadURL = loadURL;
    once() {}
    on() {}
    isDestroyed() { return false; }
    close() {}
  },
}));
vi.mock('../../theme/ThemeManager', () => ({ getBackgroundColor: () => '#1a1a1a' }));
vi.mock('../../utils/store', () => ({ getTheme: () => 'dark', getThemeIsDark: () => true }));
afterEach(() => { closeSplashScreen(); loadURL.mockClear(); });

describe('startup splash language', () => {
  it.each([
    ['ja', '初期化中', 'ローカルデータベースを更新しています', '準備中…', '完了すると自動的に再起動します'],
    ['en', 'Initializing', 'Upgrading your local database', 'Preparing…', 'it will restart itself when finished'],
  ])('renders startup and migration copy in %s', async (language, status, headline, preparing, note) => {
    const controller = await createMainI18nController({ get: () => language, subscribe: () => () => {} }, 'en-US', () => {});
    try {
      showSplashScreen();
      const url = loadURL.mock.calls.at(-1)![0] as string;
      const dom = new DOMParser().parseFromString(decodeURIComponent(url.substring(url.indexOf(',') + 1)), 'text/html');
      expect(dom.querySelector('.status')?.textContent).toBe(status);
      expect(dom.querySelector('#migration-headline')?.textContent).toBe(headline);
      expect(dom.querySelector('#migration-primary')?.textContent).toBe(preparing);
      expect(dom.querySelector('#migration-note')?.textContent).toContain(note);
    } finally { controller.dispose(); }
  });
});
