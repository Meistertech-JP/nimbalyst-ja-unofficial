import { useEffect, type ReactNode } from 'react';
import type { i18n } from 'i18next';
import { I18nextProvider, Trans, useTranslation } from 'react-i18next';
import { resolveUiLocale, type UiLanguagePreference } from './locale';

export interface UiLanguageProviderProps {
  i18n: i18n;
  preference: UiLanguagePreference;
  systemLocale: string;
  children: ReactNode;
}

/**
 * Provides the host-owned i18next instance to shared React surfaces and keeps
 * its active language and the document language synchronized with app settings.
 * Persistence remains the host application's responsibility.
 */
export function UiLanguageProvider({
  i18n,
  preference,
  systemLocale,
  children,
}: UiLanguageProviderProps) {
  const locale = resolveUiLocale(preference, systemLocale);

  useEffect(() => {
    let active = true;
    const updateDocumentLanguage = () => {
      if (active && typeof document !== 'undefined') document.documentElement.lang = locale;
    };
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale).then(updateDocumentLanguage);
    } else updateDocumentLanguage();
    return () => { active = false; };
  }, [i18n, locale]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export { Trans, useTranslation };
