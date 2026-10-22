type TranslationOptions = Record<string, string | number>;

type LocalWikiTranslator = (key: string, options?: TranslationOptions) => string;

let translate: LocalWikiTranslator | null = null;

/** Set by the renderer after its UI language has been initialized. */
export function setLocalWikiTranslator(translator: LocalWikiTranslator | null): void {
  translate = translator;
}

/** Translate fixed Local wiki UI copy while preserving a usable startup fallback. */
export function localWikiText(
  key: string,
  fallback: string,
  options?: TranslationOptions,
): string {
  return translate?.(`local_wiki.${key}`, options) || fallback;
}
