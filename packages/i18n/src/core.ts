import { createInstance, type i18n } from 'i18next';
import { resources } from './resources';
import { defaultNamespace, fallbackLocale, supportedLocales, type UiLocale } from './locale';

export type I18nInstance = i18n;
export { defaultNamespace, fallbackLocale, supportedLocales, uiLanguagePreferences, normalizeUiLanguage, resolveSystemLocale, resolveUiLocale } from './locale';
export type { UiLanguagePreference, UiLocale } from './locale';

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
