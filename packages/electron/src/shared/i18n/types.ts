export type AppLocalePreference = 'system' | 'en' | 'ja';

export const fallbackLng = 'en';

export const defaultNS = 'common';

export const supportedLngs = ['en', 'ja'];

// To safely initialize the default locale from string before loading
export function normalizeLocale(locale: string | undefined | null): AppLocalePreference {
  if (locale === 'en' || locale === 'ja') {
    return locale;
  }
  return 'system';
}

export function resolveSystemLocale(systemLocale: string): 'en' | 'ja' {
  if (systemLocale.toLowerCase().startsWith('ja')) {
    return 'ja';
  }
  return 'en';
}
export function resolveLocalePreference(
  preference: string | undefined | null,
  systemLocale: string,
): 'en' | 'ja' {
  const normalized = normalizeLocale(preference);
  return normalized === 'system' ? resolveSystemLocale(systemLocale) : normalized;
}
