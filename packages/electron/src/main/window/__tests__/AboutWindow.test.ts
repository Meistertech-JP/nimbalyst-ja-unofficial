// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMainI18nController, type MainI18nController } from '../../i18n/mainI18n';

const state = vi.hoisted(() => ({
  theme: 'light', resolvedTheme: 'light', osDark: true,
  constructor: vi.fn(), windows: [] as any[],
}));
vi.mock('electron', () => ({
  app: { getAppPath: () => '/application', isPackaged: true, getVersion: () => '0.82.4-ja.1', getLocale: () => 'en-US' },
  nativeTheme: { get shouldUseDarkColors() { return state.osDark; } },
  BrowserWindow: class {
    callbacks = new Map<string, () => void>();
    sent: Array<[string, any]> = [];
    destroyed = false;
    webContents = { send: (channel: string, value: any) => { this.sent.push([channel, value]); } };
    constructor(options: any) { state.constructor(options); state.windows.push(this); }
    on = (event: string, callback: () => void) => { this.callbacks.set(event, callback); };
    once = this.on;
    isDestroyed = () => this.destroyed;
    setTitle = vi.fn();
    setBackgroundColor = vi.fn();
    focus = vi.fn();
    show = vi.fn();
    loadURL = vi.fn();
    loadFile = vi.fn();
  },
}));
vi.mock('../../utils/store', () => ({
  getTheme: () => state.theme,
  getResolvedThemeSync: () => state.resolvedTheme,
}));
vi.mock('../../utils/appPaths', () => ({ getPreloadPath: () => '/preload.js' }));
import { createAboutWindow, updateAboutWindowTheme } from '../AboutWindow';

const html = readFileSync(resolve(process.cwd(), 'packages/electron/about.html'), 'utf8');
// jsdom is the existing test runtime dependency; no separate @types/jsdom is
// installed. Keep the narrow DOM contract local instead of adding a dependency.
const { JSDOM } = createRequire(import.meta.url)('jsdom');
let controller: MainI18nController;
const documents: Array<{ window: Window & typeof globalThis }> = [];
beforeEach(async () => {
  vi.clearAllMocks(); state.windows.length = 0; state.theme = 'light'; state.resolvedTheme = 'light'; state.osDark = true;
  controller = await createMainI18nController({ get: () => 'ja', subscribe: () => () => {} }, 'en-US', () => {});
});
afterEach(() => {
  for (const win of state.windows) { win.destroyed = true; win.callbacks.get('closed')?.(); }
  controller.dispose(); for (const dom of documents.splice(0)) dom.window.close();
});
function open() { createAboutWindow(); const win = state.windows[0]; win.callbacks.get('ready-to-show')?.(); return win; }
async function settle() { for (let n = 0; n < 5; n++) await Promise.resolve(); }
async function render(win: any, distinctId: string | null = 'test-support-id') {
  const handlers = new Map<string, (value: any) => void>();
  const external = vi.fn(), notices = vi.fn(async () => ({ success: true })), clipboard = vi.fn(async () => {});
  const query = win.loadFile.mock.calls[0]?.[1]?.query ?? {};
  const dom: { window: Window & typeof globalThis } = new JSDOM(html, { runScripts: 'dangerously', url: 'https://about.invalid/?' + new URLSearchParams(query), beforeParse(window: Window & typeof globalThis) {
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: clipboard } });
    (window as any).electronAPI = {
      on: (channel: string, callback: (value: any) => void) => { handlers.set(channel, callback); return () => handlers.delete(channel); },
      onThemeChange: (callback: (theme: string) => void) => { handlers.set('theme-change', callback); return () => handlers.delete('theme-change'); },
      getTheme: async () => state.theme, getResolvedThemeSync: () => state.resolvedTheme,
      settingsGetAll: async () => ({ 'app.uiLanguage': controller.i18n.resolvedLanguage }),
      onSettingsChanged: (callback: (payload: any) => void) => { handlers.set('settings:changed', callback); return () => handlers.delete('settings:changed'); },
      getAppVersion: async () => '0.82.4-ja.1', analytics: { getDistinctId: async () => distinctId },
      openExternal: external, openThirdPartyNotices: notices,
    };
  } });
  documents.push(dom); await settle();
  for (const [channel, value] of win.sent) handlers.get(channel)?.(value);
  return { dom, handlers, external, notices, clipboard };
}
describe('About window display language and identity', () => {
  it('renders actual Japanese About content with unofficial identity and preserves the original actions', async () => {
    const win = open(), { dom, external, notices, clipboard } = await render(win), doc = dom.window.document;
    expect(doc.documentElement.lang).toBe('ja');
    expect(doc.title).toContain('Nimbalyst 日本語版（非公式）');
    expect(doc.body.textContent).toContain('Nimbalyst 日本語版（非公式）');
    expect(doc.body.textContent).toContain('公式製品ではなく');
    expect(doc.getElementById('about-description')?.textContent).toContain('ビジュアルワークスペース');
    expect(doc.getElementById('feature-editors')?.textContent).toContain('エージェント連携');
    expect(doc.getElementById('feature-tracking')?.textContent).toContain('計画・不具合・タスク');
    expect(doc.getElementById('support-id')?.getAttribute('title')).toBe('クリックしてコピー');
    expect(doc.getElementById('support-id')?.getAttribute('aria-label')).toBe('サポートIDをコピー');
    expect(doc.getElementById('about-base')?.textContent).toBe('公式Nimbalyst 0.82.4をベースにしています。');
    expect(doc.querySelector('.about-version')?.textContent).toBe('バージョン 0.82.4-ja.1');
    expect(doc.querySelector('.about-copyright')?.textContent).toBe('© 2025-2026  Nimbalyst');
    expect(doc.querySelector('img')?.getAttribute('src')).toBe('nimbalyst-logo.png');
    (doc.getElementById('nimbalyst-link') as HTMLElement).click(); (doc.getElementById('third-party-notices-link') as HTMLElement).click();
    (doc.getElementById('support-id') as HTMLElement).click(); await settle();
    expect(external).toHaveBeenCalledWith('https://nimbalyst.com'); expect(notices).toHaveBeenCalledTimes(1);
    expect(clipboard).toHaveBeenCalledWith('test-support-id'); expect(doc.getElementById('copy-feedback')?.textContent).toBe('コピーしました');
  });
  it('updates already-open content and window title across Japanese → English → Japanese', async () => {
    const win = open(), { dom, handlers } = await render(win);
    const before = win.sent.length; await controller.i18n.changeLanguage('en');
    for (const [channel, value] of win.sent.slice(before)) handlers.get(channel)?.(value);
    handlers.get('settings:changed')?.({ key: 'app.uiLanguage', value: 'en' });
    expect(dom.window.document.documentElement.lang).toBe('en');
    expect(dom.window.document.body.textContent).toContain('Nimbalyst — Unofficial Japanese Edition');
    expect(dom.window.document.body.textContent).toContain('not affiliated with, endorsed by, or supported by Nimbalyst, Inc.');
    expect(dom.window.document.getElementById('about-version')?.textContent).toBe('Version 0.82.4-ja.1');
    expect(dom.window.document.getElementById('about-base')?.textContent).toBe('Based on official Nimbalyst 0.82.4.');
    expect(win.setTitle).toHaveBeenLastCalledWith('About Nimbalyst — Unofficial Japanese Edition');
    const second = win.sent.length; await controller.i18n.changeLanguage('ja');
    for (const [channel, value] of win.sent.slice(second)) handlers.get(channel)?.(value);
    handlers.get('settings:changed')?.({ key: 'app.uiLanguage', value: 'ja' });
    expect(dom.window.document.documentElement.lang).toBe('ja');
    expect(dom.window.document.getElementById('about-base')?.textContent).toBe('公式Nimbalyst 0.82.4をベースにしています。');
    expect(dom.window.document.getElementById('support-id-text')?.textContent).toBe('test-support-id');
  });
  it('keeps the standalone fallback baseline accurate without a Main text model', async () => {
    const dom: { window: Window & typeof globalThis } = new JSDOM(html, { runScripts: 'dangerously', url: 'https://about.invalid/' });
    documents.push(dom); await settle();
    expect(dom.window.document.getElementById('about-base')?.textContent).toBe('Based on official Nimbalyst 0.82.4.');
  });
  it('does not copy missing support IDs and retranslates unavailable state', async () => {
    const win = open(), { dom, clipboard, handlers } = await render(win, null);
    expect(dom.window.document.getElementById('support-id-text')?.textContent).toBe('利用できません');
    (dom.window.document.getElementById('support-id') as HTMLElement).click(); await settle(); expect(clipboard).not.toHaveBeenCalled();
    const before = win.sent.length; await controller.i18n.changeLanguage('en');
    for (const [channel, value] of win.sent.slice(before)) handlers.get(channel)?.(value);
    handlers.get('settings:changed')?.({ key: 'app.uiLanguage', value: 'en' });
    expect(dom.window.document.getElementById('support-id-text')?.textContent).toBe('Not available');
  });
  it('honors explicit light over OS-dark and re-resolves extension/system theme changes', async () => {
    const win = open(), { dom, handlers } = await render(win);
    expect(state.constructor.mock.calls[0][0].backgroundColor).toBe('#ffffff');
    expect(dom.window.document.body.classList.contains('light-theme')).toBe(true);
    state.theme = 'custom-dark'; state.resolvedTheme = 'dark'; const before = win.sent.length; updateAboutWindowTheme();
    for (const [channel, value] of win.sent.slice(before)) handlers.get(channel)?.(value);
    expect(win.setBackgroundColor).toHaveBeenLastCalledWith('#2d2d2d');
    expect(dom.window.document.body.classList.contains('dark-theme')).toBe(true);
    state.theme = 'system'; state.resolvedTheme = 'light'; const second = win.sent.length; updateAboutWindowTheme();
    for (const [channel, value] of win.sent.slice(second)) handlers.get(channel)?.(value);
    expect(dom.window.document.body.classList.contains('light-theme')).toBe(true);
    expect(dom.window.document.body.classList.contains('dark-theme')).toBe(false);
  });
  it('reuses the existing window and removes language subscriptions when it closes', async () => {
    const win = open(); const off = vi.spyOn(controller.i18n, 'off');
    createAboutWindow(); expect(state.constructor).toHaveBeenCalledTimes(1); expect(win.focus).toHaveBeenCalledTimes(1);
    const sent = win.sent.length; win.destroyed = true; win.callbacks.get('closed')?.();
    await controller.i18n.changeLanguage('en'); expect(win.sent).toHaveLength(sent);
    expect(off).toHaveBeenCalledWith('languageChanged', expect.any(Function));
  });
});
