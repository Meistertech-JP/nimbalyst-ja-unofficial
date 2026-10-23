import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { getPreloadPath } from '../utils/appPaths';
import { getResolvedThemeSync } from '../utils/store';
import { getMainI18n } from '../i18n/mainI18n';
import { resolveSystemLocale } from '@nimbalyst/i18n/core';
import helpEn from '../../../../i18n/src/resources/en/help.json';
import helpJa from '../../../../i18n/src/resources/ja/help.json';

let aboutWindow: BrowserWindow | null = null;

/** The standalone page is copied verbatim, so supply its small, trusted text
 * model through loadFile/loadURL instead of introducing another IPC channel.
 * Language updates use the existing settings:changed subscription in the page.
 */
function getAboutPageModel() {
    const i18n = getMainI18n();
    const locales = Object.fromEntries((['en', 'ja'] as const).map((locale) => {
        const fallback = locale === 'ja' ? helpJa.about : helpEn.about;
        const t = i18n?.getFixedT(locale, 'help');
        const copy = Object.fromEntries(Object.entries(fallback).map(([key, value]) => [
            key, String(t?.(`about.${key}`, { defaultValue: value }) ?? value),
        ]));
        copy.title = String(t?.('about.title', { product: copy.product, defaultValue: fallback.title })
            ?? fallback.title.replace('{{product}}', copy.product));
        copy.base_version = String(t?.('about.base_version', { version: '0.81.7', defaultValue: fallback.base_version })
            ?? fallback.base_version.replace('{{version}}', '0.81.7'));
        return [locale, copy];
    }));
    const systemLocale = resolveSystemLocale(app.getLocale());
    const locale = i18n?.resolvedLanguage === 'ja' ? 'ja' : i18n ? 'en' : systemLocale;
    return { locale, systemLocale, locales };
}

export function createAboutWindow() {
    if (aboutWindow && !aboutWindow.isDestroyed()) {
        aboutWindow.focus();
        return;
    }

    const currentTheme = getResolvedThemeSync();
    const isDarkTheme = currentTheme === 'dark' || currentTheme === 'crystal-dark';
    const model = getAboutPageModel();
    const query = { about: JSON.stringify(model) };

    aboutWindow = new BrowserWindow({
        width: 650,
        height: 700,
        resizable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        title: model.locales[model.locale].title,
        show: false,
        backgroundColor: isDarkTheme ? '#2d2d2d' : '#ffffff',
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        webPreferences: {
            preload: getPreloadPath(),
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: false
        }
    });

    // Load the about.html file
    // In production, the file is copied to the renderer output directory
    // In development, it's served by the dev server
    if (process.env['ELECTRON_RENDERER_URL']) {
        const url = new URL(`${process.env['ELECTRON_RENDERER_URL']}/about.html`);
        url.searchParams.set('about', query.about);
        aboutWindow.loadURL(url.toString());
    } else {
        // Note: Due to code splitting, __dirname is out/main/chunks/, not out/main/
        // Use app.getAppPath() to reliably find the renderer
        const appPath = app.getAppPath();
        let htmlPath: string;
        if (app.isPackaged) {
            htmlPath = join(appPath, 'out/renderer/about.html');
        } else if (appPath.includes('/out/main') || appPath.includes('\\out\\main')) {
            htmlPath = join(appPath, '../renderer/about.html');
        } else {
            htmlPath = join(appPath, 'out/renderer/about.html');
        }
        aboutWindow.loadFile(htmlPath, { query });
    }

    aboutWindow.once('ready-to-show', () => {
        aboutWindow?.show();
        // Send initial theme
        aboutWindow?.webContents.send('theme-change', currentTheme);
    });

    const window = aboutWindow;
    const i18n = getMainI18n();
    const updateTitle = () => {
        if (!window.isDestroyed()) {
            const next = getAboutPageModel();
            window.setTitle(next.locales[next.locale].title);
        }
    };
    i18n?.on('languageChanged', updateTitle);
    aboutWindow.on('closed', () => {
        i18n?.off('languageChanged', updateTitle);
        aboutWindow = null;
    });
}

export function updateAboutWindowTheme() {
    if (aboutWindow && !aboutWindow.isDestroyed()) {
        const currentTheme = getResolvedThemeSync();
        const isDarkTheme = currentTheme === 'dark' || currentTheme === 'crystal-dark';
        aboutWindow.setBackgroundColor(isDarkTheme ? '#2d2d2d' : '#ffffff');
        aboutWindow.webContents.send('theme-change', currentTheme);
    }
}

export function getAboutWindow(): BrowserWindow | null {
    return aboutWindow;
}
