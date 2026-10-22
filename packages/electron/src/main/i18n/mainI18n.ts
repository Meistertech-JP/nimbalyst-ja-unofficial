import {
  createI18nInstance,
  resolveUiLocale,
  type I18nInstance,
  type UiLocale,
} from '@nimbalyst/i18n/core';
import type { SettingKey } from '../../shared/settings/keys';

export interface UiLanguageSettings {
  get(key: 'app.uiLanguage'): unknown;
  subscribe(listener: (key: SettingKey, value: unknown) => void): () => void;
}

export interface MainI18nController {
  i18n: I18nInstance;
  dispose(): void;
}

let activeMainI18n: I18nInstance | null = null;

export function getMainI18n(): I18nInstance | null {
  return activeMainI18n;
}

export function translateMainMenuLabel(key: string, fallback: string): string {
  return String(activeMainI18n?.t(key, { ns: 'menu', defaultValue: fallback }) ?? fallback);
}

export function translateMainNotification(
  key: string,
  fallback: string,
  values?: Record<string, string | number>,
): string {
  return String(activeMainI18n?.t(key, {
    ns: 'notifications',
    defaultValue: fallback,
    ...values,
  }) ?? fallback);
}

export function translateMainDialogLabel(
  key: string,
  fallback: string,
  values?: Record<string, string | number>,
): string {
  return String(activeMainI18n?.t(key, {
    ns: 'dialogs',
    defaultValue: fallback,
    ...values,
  }) ?? fallback);
}

export async function createMainI18nController(
  settings: UiLanguageSettings,
  systemLocale: string,
  onLanguageChanged: (locale: UiLocale) => void | Promise<void>,
): Promise<MainI18nController> {
  const initialLocale = resolveUiLocale(settings.get('app.uiLanguage'), systemLocale);
  const i18n = await createI18nInstance(initialLocale);
  activeMainI18n = i18n;

  let disposed = false;
  let changeRevision = 0;
  const unsubscribe = settings.subscribe((key, value) => {
    if (key !== 'app.uiLanguage') return;

    const nextLocale = resolveUiLocale(value, systemLocale);
    if (nextLocale === i18n.resolvedLanguage) return;

    const revision = ++changeRevision;
    void i18n.changeLanguage(nextLocale).then(async () => {
      if (disposed || revision !== changeRevision) return;
      await onLanguageChanged(nextLocale);
    }).catch((error: unknown) => {
      console.error('[i18n] Failed to change the main-process language', error);
    });
  });

  return {
    i18n,
    dispose() {
      disposed = true;
      unsubscribe();
      if (activeMainI18n === i18n) activeMainI18n = null;
    },
  };
}
