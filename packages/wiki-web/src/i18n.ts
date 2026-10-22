import { createInstance, type BackendModule, type i18n, type ResourceKey } from 'i18next';
import { defaultNamespace, fallbackLocale, resolveUiLocale, supportedLocales, type UiLanguagePreference } from '@nimbalyst/i18n/locale';

export type WikiResourceLoaders = Readonly<Record<string, () => Promise<ResourceKey>>>;
export type WikiResourceReader = (language: string, namespace: string) => Promise<ResourceKey>;

/** A loader for every locale/namespace, not its contents; Vite emits separate lazy chunks. */
export const wikiResourceLoaders: WikiResourceLoaders = Object.fromEntries(
  Object.entries(import.meta.glob<ResourceKey>('../../i18n/src/resources/{en,ja}/*.json', { import: 'default' }))
    .map(([path, loader]) => [path.slice(path.lastIndexOf('/resources/') + '/resources/'.length, -'.json'.length), loader]),
);

/** Share concurrent/successful reads, but never retain a rejected import promise. */
export function createWikiResourceReader(loaders: WikiResourceLoaders = wikiResourceLoaders): WikiResourceReader {
  const cache = new Map<string, Promise<ResourceKey>>();
  return (language, namespace) => {
    const key = `${language}/${namespace}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const loader = loaders[key];
    if (!loader) return Promise.reject(new Error(`Unknown wiki translation resource: ${key}`));
    const pending = Promise.resolve().then(loader);
    cache.set(key, pending);
    void pending.catch(() => { if (cache.get(key) === pending) cache.delete(key); });
    return pending;
  };
}

const readWikiResource = createWikiResourceReader();
let activeWikiI18n: Promise<i18n> | undefined;

/** The browser host follows its own display locale, not the agent's response language. */
export function initializeWikiI18n(preference: UiLanguagePreference = 'system', systemLocale?: string, readResource: WikiResourceReader = readWikiResource): Promise<i18n> {
  const locale = resolveUiLocale(preference, systemLocale);
  const backend: BackendModule = {
    type: 'backend',
    init() {},
    read(language, namespace, callback) {
      void readResource(language, namespace).then(
        (resource) => callback(null, resource),
        (error: unknown) => callback(error instanceof Error ? error : new Error(String(error)), true),
      );
    },
  };
  const instance = createInstance();
  instance.use(backend);
  activeWikiI18n = new Promise<i18n>((resolve, reject) => {
    void instance.init({
      lng: locale,
      fallbackLng: fallbackLocale,
      supportedLngs: [...supportedLocales],
      load: 'languageOnly',
      ns: [defaultNamespace],
      defaultNS: defaultNamespace,
      returnEmptyString: false,
      returnNull: false,
      interpolation: { escapeValue: false },
      react: { useSuspense: true },
    }, (error) => {
      if (error) reject(error);
      else resolve(instance);
    });
  }).then((i18n) => {
    if (typeof document !== 'undefined') document.documentElement.lang = locale;
    return i18n;
  });
  return activeWikiI18n;
}

/** Non-React API failures share the host's instance; command-line fixtures default to English. */
export function getWikiI18n() {
  return activeWikiI18n ?? initializeWikiI18n('system', typeof navigator === 'undefined' ? undefined : navigator.language);
}
