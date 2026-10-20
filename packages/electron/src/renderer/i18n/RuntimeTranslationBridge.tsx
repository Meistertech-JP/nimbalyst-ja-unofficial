import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RuntimeTranslationProvider, runtimeEnglishTranslation, type RuntimeTranslation } from '@nimbalyst/runtime/ui';
import { rendererI18n } from './index';

/** Each independent editor root subscribes here without remounting its editor. */
export function RuntimeTranslationBridge({ children }: { children: ReactNode }) {
  const { t } = useTranslation(undefined, { i18n: rendererI18n, useSuspense: false });
  const locale = rendererI18n.resolvedLanguage || 'en';
  const value = useMemo<RuntimeTranslation>(() => ({
    locale,
    t: (key, defaultValue, params) => rendererI18n.isInitialized
      ? t(key, { ...params, defaultValue })
      : runtimeEnglishTranslation(key, defaultValue, params),
  }), [t, locale]);
  return <RuntimeTranslationProvider value={value}>{children}</RuntimeTranslationProvider>;
}

export function withRuntimeTranslations(children: ReactNode) {
  // Capture windows intentionally skip i18n initialization. Do not start
  // namespace loading there; runtime components retain their English defaults.
  if (!rendererI18n.isInitialized) return children;
  return <RuntimeTranslationBridge>{children}</RuntimeTranslationBridge>;
}
