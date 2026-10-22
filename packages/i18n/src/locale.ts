/** Display-locale policy without translation resources or a host-owned i18next instance. */
export type UiLanguagePreference = 'system' | 'en' | 'ja';
export type UiLocale = 'en' | 'ja';

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

export function resolveUiLocale(preference: unknown, systemLocale: string | undefined | null): UiLocale {
  const normalized = normalizeUiLanguage(preference);
  return normalized === 'system' ? resolveSystemLocale(systemLocale) : normalized;
}
