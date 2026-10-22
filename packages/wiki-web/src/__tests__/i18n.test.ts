// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWikiResourceReader, initializeWikiI18n, wikiResourceLoaders } from '../i18n';

afterEach(() => document.documentElement.removeAttribute('lang'));

describe('wiki display locale', () => {
  it('resolves system Japanese and updates the document language', async () => {
    const i18n = await initializeWikiI18n('system', 'ja-JP');
    expect(i18n.language).toBe('ja');
    expect(document.documentElement.lang).toBe('ja');
    expect(i18n.t('cancel')).toBe('キャンセル');
  });

  it('honors explicit English/Japanese independently of the system and falls back to English', async () => {
    expect((await initializeWikiI18n('en', 'ja-JP')).language).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect((await initializeWikiI18n('ja', 'en-US')).language).toBe('ja');
    expect(document.documentElement.lang).toBe('ja');
    expect((await initializeWikiI18n('system', 'fr-FR')).language).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('retains an independently loadable resource for every namespace in both languages', async () => {
    const namespaces = ['agents', 'aichat', 'cloudflareSandboxes', 'collabSidebar', 'common', 'dialogs', 'editor', 'errors', 'extensionMarketplace', 'extensions', 'feedback', 'file_edits_sidebar', 'files', 'git', 'mcp', 'menu', 'notifications', 'onboarding', 'orgSharing', 'project', 'sessions', 'settings', 'sqliteBrowser', 'terminal', 'tracker', 'voice'];
    const expected = ['en', 'ja'].flatMap((language) => namespaces.map((namespace) => `${language}/${namespace}`)).sort();
    expect(Object.keys(wikiResourceLoaders).sort()).toEqual(expected);
    for (const key of expected) {
      const resource = await wikiResourceLoaders[key]();
      expect(typeof resource).toBe('object');
      expect(Object.keys(resource).length).toBeGreaterThan(0);
    }
  });

  it('boots only common, then loads requested namespaces and the active language with English fallback', async () => {
    const loaders = {
      'en/common': vi.fn(async () => ({ cancel: 'Cancel', welcome: 'Hello {{name}}' })),
      'ja/common': vi.fn(async () => ({ cancel: 'キャンセル', welcome: 'こんにちは、{{name}}' })),
      'en/settings': vi.fn(async () => ({ label: 'Interface language', empty: 'Empty fallback', nullValue: 'Null fallback', absent: 'Missing fallback' })),
      'ja/settings': vi.fn(async () => ({ label: '表示言語', empty: '', nullValue: null })),
      'en/editor': vi.fn(async () => ({ unused: 'Unused editor' })),
      'ja/editor': vi.fn(async () => ({ unused: '未使用のエディター' })),
    };
    const i18n = await initializeWikiI18n('en', 'ja-JP', createWikiResourceReader(loaders));
    expect(loaders['en/common']).toHaveBeenCalledTimes(1);
    for (const key of ['ja/common', 'en/settings', 'ja/settings', 'en/editor', 'ja/editor'] as const) expect(loaders[key]).not.toHaveBeenCalled();

    await i18n.loadNamespaces('settings');
    expect(i18n.t('label', { ns: 'settings' })).toBe('Interface language');
    expect(loaders['en/settings']).toHaveBeenCalledTimes(1);
    expect(loaders['ja/settings']).not.toHaveBeenCalled();
    await i18n.changeLanguage('ja');
    expect(i18n.t('label', { ns: 'settings' })).toBe('表示言語');
    expect(i18n.t('welcome', { name: 'Customer' })).toBe('こんにちは、Customer');
    expect(i18n.t('empty', { ns: 'settings' })).toBe('Empty fallback');
    expect(i18n.t('nullValue', { ns: 'settings' })).toBe('Null fallback');
    expect(i18n.t('absent', { ns: 'settings' })).toBe('Missing fallback');
    expect(loaders['ja/common']).toHaveBeenCalledTimes(1);
    expect(loaders['ja/settings']).toHaveBeenCalledTimes(1);
    expect(loaders['en/editor']).not.toHaveBeenCalled();
    expect(loaders['ja/editor']).not.toHaveBeenCalled();

    await i18n.changeLanguage('en');
    expect(i18n.t('label', { ns: 'settings' })).toBe('Interface language');
    expect(loaders['en/settings']).toHaveBeenCalledTimes(1);
  });

  it('shares in-flight/successful loads and discards failed cached imports', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('temporary network failure')).mockResolvedValue({ label: 'Loaded' });
    const read = createWikiResourceReader({ 'en/settings': load });
    const first = read('en', 'settings');
    expect(read('en', 'settings')).toBe(first);
    await expect(first).rejects.toThrow('temporary network failure');
    const retry = read('en', 'settings');
    expect(retry).not.toBe(first);
    await expect(retry).resolves.toEqual({ label: 'Loaded' });
    expect(read('en', 'settings')).toBe(retry);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('retries a transient namespace import failure through the actual i18next backend', async () => {
    const settings = vi.fn().mockRejectedValueOnce(new Error('temporary network failure')).mockResolvedValue({ label: 'Recovered settings' });
    const i18n = await initializeWikiI18n('en', 'en-US', createWikiResourceReader({
      'en/common': async () => ({ cancel: 'Cancel' }),
      'en/settings': settings,
    }));
    await i18n.loadNamespaces('settings');
    expect(settings).toHaveBeenCalledTimes(2);
    expect(i18n.t('label', { ns: 'settings' })).toBe('Recovered settings');
  });
});
