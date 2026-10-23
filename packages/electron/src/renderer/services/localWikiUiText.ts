type TranslationOptions = Record<string, string | number>;

type LocalWikiTranslator = (key: string, options?: TranslationOptions) => string;
type RendererUiTranslator = (namespace: string, key: string, fallback: string, options?: TranslationOptions) => string;

let translate: LocalWikiTranslator | null = null;
let translateUi: RendererUiTranslator | null = null;

/** Set by the renderer after its UI language has been initialized. */
export function setLocalWikiTranslator(translator: LocalWikiTranslator | null): void {
  translate = translator;
}

/** Set by the renderer after its UI language has been initialized. */
export function setRendererUiTranslator(translator: RendererUiTranslator | null): void {
  translateUi = translator;
}

/** Translate UI strings used by non-React renderer services. */
export function rendererUiText(
  namespace: string,
  key: string,
  fallback: string,
  options?: TranslationOptions,
): string {
  return translateUi?.(namespace, key, fallback, options) || fallback;
}

/** Translate fixed Local wiki UI copy while preserving a usable startup fallback. */
export function localWikiText(
  key: string,
  fallback: string,
  options?: TranslationOptions,
): string {
  return translate?.(`local_wiki.${key}`, options) || fallback;
}
