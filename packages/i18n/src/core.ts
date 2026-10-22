import { createInstance, type i18n } from 'i18next';
import { resources } from './resources';

export type UiLanguagePreference = 'system' | 'en' | 'ja';
export type UiLocale = 'en' | 'ja';
export type I18nInstance = i18n;

export const fallbackLocale: UiLocale = 'en';
export const defaultNamespace = 'common';
export const supportedLocales: readonly UiLocale[] = ['en', 'ja'];
export const uiLanguagePreferences: readonly UiLanguagePreference[] = ['system', 'en', 'ja'];

export function normalizeUiLanguage(value: unknown): UiLanguagePreference {
  return value === 'en' || value === 'ja' ? value : 'system';
}

export function resolveSystemLocale(systemLocale: string | undefined | null): UiLocale {
  return systemLocale?.toLowerCase().startsWith('ja') ? 'ja' : fallbackLocale;
}

export function resolveUiLocale(
  preference: unknown,
  systemLocale: string | undefined | null,
): UiLocale {
  const normalized = normalizeUiLanguage(preference);
  return normalized === 'system' ? resolveSystemLocale(systemLocale) : normalized;
}

export async function createI18nInstance(locale: UiLocale): Promise<i18n> {
  const instance = createInstance();
  await instance.init({
    lng: locale,
    fallbackLng: fallbackLocale,
    supportedLngs: [...supportedLocales],
    ns: Object.keys(resources.en),
    defaultNS: defaultNamespace,
    resources,
    returnEmptyString: false,
    returnNull: false,
    interpolation: { escapeValue: false },
  });
  return instance;
}

export { resources } from './resources';
export type { TranslationNamespace } from './resources';
