import { createContext, useContext } from 'react';

export type RuntimeTranslationParams = Record<string, string | number | boolean>;
export type RuntimeTranslate = (key: string, defaultValue: string, params?: RuntimeTranslationParams) => string;

/** English remains the default for hosts that do not supply translations. */
export const runtimeEnglishTranslation: RuntimeTranslate = (_key, defaultValue, params) =>
  defaultValue.replace(/\{\{(\w+)\}\}/g, (placeholder, name: string) =>
    params && Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder);

export interface RuntimeTranslation {
  t: RuntimeTranslate;
  locale: string;
}

const RuntimeTranslationContext = createContext<RuntimeTranslation>({
  t: runtimeEnglishTranslation,
  locale: 'en',
});

export const RuntimeTranslationProvider = RuntimeTranslationContext.Provider;

/** Only call at component top level; document content and protocol IDs stay untouched. */
export function useRuntimeTranslation(): RuntimeTranslation {
  return useContext(RuntimeTranslationContext);
}
