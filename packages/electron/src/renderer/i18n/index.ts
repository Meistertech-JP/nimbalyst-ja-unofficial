import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  fallbackLng,
  defaultNS,
  supportedLngs,
  resolveLocalePreference,
  type AppLocalePreference,
} from '../../shared/i18n/types';
import { resources } from '../../shared/i18n/resources';
import { onSettingChanged } from '../store/atoms/settingAtomFamily';

let initialized = false;
let listenerRegistered = false;

function effectiveLocale(preference: AppLocalePreference): 'en' | 'ja' {
  return resolveLocalePreference(preference, navigator.language);
}

function applyDocumentLanguage(language: 'en' | 'ja'): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
}

export async function initRendererI18n(
  initialPreference?: AppLocalePreference,
): Promise<void> {
  if (initialized) return;

  try {
    const storedPreference = initialPreference
      ?? await window.electronAPI.invoke('app-settings:get', 'uiLanguage');
    const lng = effectiveLocale(storedPreference as AppLocalePreference);

    await i18next
      .use(initReactI18next)
      .init({
        lng,
        fallbackLng,
        ns: Object.keys(resources.en),
        defaultNS,
        resources,
        supportedLngs,
        returnEmptyString: false,
        returnNull: false,
        interpolation: {
          escapeValue: false,
        },
      });

    initialized = true;
    applyDocumentLanguage(lng);

    if (!listenerRegistered) {
      listenerRegistered = true;
      onSettingChanged('uiLanguage', (preference) => {
        const nextLanguage = effectiveLocale(preference);
        if (i18next.language !== nextLanguage) {
          void i18next.changeLanguage(nextLanguage).then(() => applyDocumentLanguage(nextLanguage));
        } else {
          applyDocumentLanguage(nextLanguage);
        }
      });
    }
  } catch (error) {
    console.error('[i18n] Failed to initialize Renderer i18n:', error);
    throw error;
  }
}

export { i18next as rendererI18n };
