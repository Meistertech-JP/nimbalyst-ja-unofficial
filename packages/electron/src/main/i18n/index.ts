import i18next, { type t as tType } from 'i18next';
import { app } from 'electron';
import { type AppLocalePreference, fallbackLng, defaultNS, supportedLngs, normalizeLocale, resolveSystemLocale } from '../../shared/i18n/types';
import { resources } from '../../shared/i18n/resources';
import { getAppSetting } from '../utils/store';
import { logger } from '../utils/logger';

let initialized = false;

function determineLocale(preference?: AppLocalePreference): 'en' | 'ja' {
  const setting = normalizeLocale(
    preference ?? getAppSetting<string>('uiLanguage'),
  );
  if (setting === 'system') {
    return resolveSystemLocale(app.getLocale());
  }
  return setting;
}

export async function initI18n(): Promise<void> {
  if (initialized) return;

  const lng = determineLocale();

  try {
    await i18next.init({
      lng,
      fallbackLng,
      ns: ['common', 'settings', 'menu'],
      defaultNS,
      resources,
      supportedLngs,
      returnEmptyString: false,
      returnNull: false,
      interpolation: {
        escapeValue: false, // Node.js doesn't need XSS protection here
      },
    });
    initialized = true;
    logger.main.info(`[i18n] Initialized Main Process with language: ${lng}`);
  } catch (error) {
    logger.main.error('[i18n] Failed to initialize Main Process i18n:', error);
  }
}

export async function handleLanguageChange(
  preference?: AppLocalePreference,
): Promise<boolean> {
  if (!initialized) return false;
  const newLng = determineLocale(preference);
  if (i18next.language !== newLng) {
    logger.main.info(`[i18n] Main Process language changing to: ${newLng}`);
    await i18next.changeLanguage(newLng);
    return true;
  }
  return false;
}

export const t = i18next.t.bind(i18next);
