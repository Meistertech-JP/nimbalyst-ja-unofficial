import './base.css';
import '@nimbalyst/collab-bundle/styles.css';
import './styles.css';
import { createRoot } from 'react-dom/client';
import { Suspense } from 'react';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { loadTrackerPage } from '@nimbalyst/collab-bundle/trackers-ui';
import { WIKI_API_VERSION, wikiApi } from './api/client';
import { isStaticSite, loadStaticSite, staticConfig } from './api/staticSite';
import { LocalTrackerDataSource } from './host/LocalTrackerDataSource';
import { applyWikiTypes, loadWikiSchema } from './host/schema';
import { initializeTheme } from './theme';
import { App } from './app/App';
import { registerWikiEditors } from './editors/wikiEditors';
import { initializeWikiI18n } from './i18n';

initializeTheme();
// Before any page body is read: embed links only load as embeds once their file types are known.
registerWikiEditors();

const container = document.getElementById('root')!;
const root = createRoot(container);
const preference = staticConfig?.uiLanguage ?? 'system';
const systemLocale = navigator.language;
const language = initializeWikiI18n(preference, systemLocale);

function fatal(message: string): void {
  root.render(<div className="flex h-full items-center justify-center p-8 text-sm text-nim-muted" role="alert">{message}</div>);
}

async function boot(): Promise<void> {
  const i18n = await language;
  // A static export resolves routes and file links from its manifest, so it loads first.
  if (isStaticSite()) await loadStaticSite();
  const info = await wikiApi.info();
  if (info.apiVersion !== WIKI_API_VERSION) {
    fatal(i18n.t('wiki_web.api_mismatch', { browserApi: WIKI_API_VERSION, nimVersion: info.version, serverApi: info.apiVersion }));
    return;
  }
  const [types, module] = await Promise.all([wikiApi.types(), loadTrackerPage()]);
  const schema = await loadWikiSchema(types);
  const trackers = new LocalTrackerDataSource(info.root, types, (previous, next) => applyWikiTypes(schema, previous, next));
  root.render(<UiLanguageProvider i18n={i18n} preference={preference} systemLocale={systemLocale}><Suspense fallback={<div className="wiki-web-loading flex h-full items-center justify-center text-sm text-nim-muted" role="status">{i18n.t('wiki_web.opening')}</div>}><App root={info.root} projectRoot={info.projectRoot} trackers={trackers} module={module} /></Suspense></UiLanguageProvider>);
}

boot().catch(async (error: unknown) => {
  const i18n = await language.catch(() => null);
  const message = error instanceof Error ? error.message : String(error);
  // A failed common-resource download has no translator; show the actual failure, not an unhandled rejection.
  if (!i18n) { fatal(message); return; }
  fatal(!isStaticSite() && /401|unauthorized/i.test(message) ? i18n.t('wiki_web.access_link') : i18n.t('wiki_web.load_failed', { error: message }));
});
