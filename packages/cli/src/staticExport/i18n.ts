import { createI18nInstance, resolveUiLocale, type UiLanguagePreference } from '@nimbalyst/i18n/core';

export type ExportTranslator = (key: string, values?: Record<string, string | number>) => string;

/** Programmatic exports remain English by default; the CLI opts into the host locale. */
export async function createStaticExportI18n(
  preference: UiLanguagePreference = 'en',
  systemLocale = Intl.DateTimeFormat().resolvedOptions().locale,
) {
  const language = resolveUiLocale(preference, systemLocale);
  const i18n = await createI18nInstance(language);
  const t: ExportTranslator = (key, values) => i18n.t(key, { ...values, ns: 'common' });
  return { language, t };
}
