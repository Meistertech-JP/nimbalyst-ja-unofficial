// @vitest-environment node
/**
 * `nim wiki export --static` over a real temp wiki: what the site holds, what
 * it leaves out, and that links point where a reader can follow them.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { initWiki, openWiki, type LocalWiki, type ReadBodyResult, type StaticSiteLink, type StaticSiteManifest } from '@nimbalyst/local-wiki';
import { exportStaticSite, type CarriedTrackerItem } from '../exportSite.js';
import { gatewayTrackerSource, runWikiExport } from '../../commands/wikiExport.js';
import { parseArgs } from '../../cli/parse.js';
import { createStaticExportI18n } from '../i18n.js';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { renderBodyHtml, renderShell } from '../prerender.js';
import type { TrackerGateway } from '../../gateway/types.js';

// Real filesystem operations remain the default; only swap/copy fault tests override these calls.
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, cp: vi.fn(actual.cp), rename: vi.fn(actual.rename) };
});

const cleanups: Array<() => void> = [];
afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(fsPromises.cp).mockReset();
  vi.mocked(fsPromises.rename).mockReset();
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

async function fixture(): Promise<{ root: string; wiki: LocalWiki; assets: string }> {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'nim-export-')));
  cleanups.push(() => rmSync(root, { recursive: true, force: true }));
  const assets = path.join(root, 'app');
  mkdirSync(path.join(assets, 'assets'), { recursive: true });
  mkdirSync(path.join(assets, 'models'), { recursive: true });
  writeFileSync(path.join(assets, 'index.html'), '<!doctype html><html lang="en"><head><title>Local wiki</title></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>');
  writeFileSync(path.join(assets, 'assets', 'app.js'), 'console.log(1)');
  writeFileSync(path.join(assets, 'models', 'editor-models.mjs'), '');
  await initWiki(path.join(root, 'wiki'));
  const wiki = await openWiki(path.join(root, 'wiki'), { repair: true });
  cleanups.push(() => wiki.close());
  return { root, wiki, assets };
}

const read = (file: string) => readFileSync(file, 'utf8');
const json = <T>(file: string) => JSON.parse(read(file)) as T;

// Finite call-site contract for ExportTranslator's common-default namespace.
// Keep identifiers literal so resource additions cannot silently add unchecked dynamic candidates.
const EXPORT_TRANSLATION_KEYS = [
  'wiki_export.wiki_title',
  'wiki_export.editor_page',
  'wiki_export.no_items',
  'wiki_export.search_loading',
  'wiki_export.no_pages',
  'wiki_export.not_found',
  'wiki_export.made_with',
  'wiki_export.callout.note',
  'wiki_export.callout.tip',
  'wiki_export.callout.important',
  'wiki_export.callout.warning',
  'wiki_export.callout.caution',
  'wiki_export.error.target_file',
  'wiki_export.error.target_not_empty',
  'wiki_export.error.previous_collision',
  'wiki_export.error.assets_unbuilt',
  'wiki_export.error.unknown_type',
  'wiki_export.error.unknown_page',
  'wiki_export.error.invalid_language',
  'wiki_export.error.missing_target',
  'wiki_export.error.outside_refs',
  'wiki_export.error.tracker_items',
  'wiki_export.summary',
  'wiki_export.previous',
  'wiki_export.excluded',
  'wiki_export.stripped_fields',
  'wiki_export.tracker_unavailable',
  'wiki_export.serve_hint',
  'wiki_export.link.excluded_page',
  'wiki_export.link.missing_page',
  'wiki_export.link.outside_wiki',
  'wiki_export.link.app_only',
  'wiki_export.link.outside_handling',
  'wiki_export.link.missing_file',
  'wiki_export.link.kept',
  'wiki_export.link.as_text',
  'wiki_export.link.inside_items',
  'wiki_export.assets.required',
  'wiki_export.assets.reinstall',
  'wiki_export.assets.build',
  'wiki_export.assets.flag',
  'wiki_export.assets.detail_incompatible',
  'wiki_export.assets.detail_unbuilt',
  'wiki_export.assets.detail_missing',
  'search',
  'collab.untitled',
  'collabSidebar:pages_section.types',
  'tracker:type_map_inspector.linked_from',
] as const;

describe('exportStaticSite', () => {
  it('writes a page per folder, leaves out export: false pages and person fields, and keeps links followable', async () => {
    const { root, wiki, assets } = await fixture();
    await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, sortOrder: 0, body: 'Welcome.' });
    const home = (await wiki.snapshot()).pages.find((page) => page.title === 'Home')!;
    const competitors = await wiki.command({ type: 'register-document', title: 'Competitors', parentFolderId: null, body: '' });
    const secret = await wiki.command({ type: 'register-document', title: 'Secret', parentFolderId: null, fields: { export: false }, body: 'Do not publish.' });
    await wiki.command({ type: 'register-document', title: 'Under secret', parentFolderId: secret.id!, body: 'Also hidden.' });
    const acme = await wiki.command({
      type: 'register-document',
      title: 'Acme',
      parentFolderId: competitors.id!,
      fields: { status: 'active', owner: 'Dana', contact: 'dana@example.com' },
      body: 'placeholder',
    });
    const attachment = await wiki.storeAttachment(acme.id!, 'logo.png', new Uint8Array([1, 2, 3]));
    const snapshot = await wiki.snapshot();
    const acmePage = snapshot.pages.find((page) => page.id === acme.id)!;
    const secretPage = snapshot.pages.find((page) => page.id === secret.id)!;
    const homeRel = path.posix.relative(path.posix.dirname(acmePage.path!), home.path!);
    const secretRel = path.posix.relative(path.posix.dirname(acmePage.path!), secretPage.path!);
    await wiki.writeBody(acme.id!, [
      `Acme competes with us. See [Home](${encodeURI(homeRel)} "id=${home.id}").`,
      '',
      `Notes are in [the secret page](${encodeURI(secretRel)} "id=${secret.id}") and [NIM-12](nimbalyst://NIM-12).`,
      '',
      `![Logo](${attachment.link})`,
    ].join('\n'), null);

    const out = path.join(root, 'site');
    const report = await exportStaticSite({ wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9', now: () => new Date('2026-10-20T00:00:00Z') });

    // Left out: the opted-out page and its child, by reason.
    expect(report.excluded.map((entry) => [entry.title, entry.reason]).sort()).toEqual([['Secret', 'export-false'], ['Under secret', 'under-excluded']]);
    const manifest = json<StaticSiteManifest>(path.join(out, '_wiki', 'manifest.json'));
    expect(manifest.pages[acme.id!]).toBe('competitors/acme');
    expect(manifest.pages[secret.id!]).toBeUndefined();
    expect(manifest.homeId).toBe(home.id);
    expect(existsSync(path.join(out, '_wiki', 'bodies', `${secret.id}.json`))).toBe(false);
    expect(read(path.join(out, '_wiki', 'search.json'))).not.toContain('Do not publish');

    // Person fields are gone from every file a reader can fetch; other fields stay.
    const exportedAcme = json<{ pages: Array<{ id: string; fields: Record<string, unknown> }> }>(path.join(out, '_wiki', 'snapshot.json')).pages.find((page) => page.id === acme.id)!;
    expect(exportedAcme.fields).toEqual({ status: 'active' });
    expect(report.strippedFields).toBe(2);

    // A link to a left-out page and an app-only reference become their labels; the Home link stays.
    const body = json<ReadBodyResult>(path.join(out, '_wiki', 'bodies', `${acme.id}.json`)).markdown;
    expect(body).toContain(`[Home](${encodeURI(homeRel)} "id=${home.id}")`);
    expect(body).toContain('Notes are in the secret page and NIM-12.');
    expect(report.links.map((issue) => issue.kind).sort()).toEqual(['app-only', 'excluded-page']);

    // Home lists Acme under "Linked from"; the attachment is copied where the app looks for it.
    const links = json<Record<string, StaticSiteLink[]>>(path.join(out, '_wiki', 'links.json'));
    expect(links[home.id].map((link) => [link.direction, link.otherItemId])).toEqual([['in', acme.id]]);
    expect(existsSync(path.join(out, '_wiki', 'files', ...path.posix.join(path.posix.dirname(acmePage.path!), attachment.link).split('/')))).toBe(true);

    // The prerendered page: real HTML with links relative to its folder, and the app's boot config.
    const html = read(path.join(out, 'competitors', 'acme', 'index.html'));
    expect(html).toContain('<title>Acme · Home</title>');
    expect(html).toContain('href="../../">Home</a>');
    expect(html).not.toContain('Do not publish');
    expect(html).toContain('window.__NIMBALYST_WIKI_STATIC__={"format":1,"dataPath":"/_wiki/","uiLanguage":"en"}');
    expect(read(path.join(out, 'index.html'))).toContain('<h2>Linked from</h2><ul><li><a href="./competitors/acme/">Acme</a>');
    // The app build is copied without its Node-only models or its unrendered shell.
    expect(existsSync(path.join(out, 'assets', 'app.js'))).toBe(true);
    expect(existsSync(path.join(out, 'models'))).toBe(false);
  });

  it('exports typed pages and table rows with their relations, leaves out excluded types, and never writes over a folder it did not make', async () => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'nim-export-types-')));
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    const { assets } = await fixture();
    const typesDir = path.join(root, 'types');
    mkdirSync(typesDir);
    writeFileSync(path.join(typesDir, 'competitor.yaml'), 'type: competitor\ndisplayName: Competitor\ndisplayNamePlural: Competitors\nstorage: pages\nfields:\n  - name: title\n    type: string\n  - name: lead\n    type: user\n  - name: partner\n    type: relationship\n    itemType: partner\n');
    writeFileSync(path.join(typesDir, 'partner.yaml'), 'type: partner\ndisplayName: Partner\ndisplayNamePlural: Partners\nstorage: table\nfields:\n  - name: title\n    type: string\n');
    writeFileSync(path.join(typesDir, 'memo.yaml'), 'type: memo\ndisplayName: Memo\ndisplayNamePlural: Memos\nstorage: pages\nfields:\n  - name: title\n    type: string\n');
    await initWiki(path.join(root, 'wiki'));
    writeFileSync(path.join(root, 'wiki', 'Partners.csv'), 'id,title\nP1,Globex\n');
    const wiki = await openWiki(path.join(root, 'wiki'), { typesDir });
    cleanups.push(() => wiki.close());
    await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, sortOrder: 0, body: 'Welcome.' });
    const acme = await wiki.trackerCommand('competitor', { type: 'create-item', item: { title: 'Acme', fields: { lead: 'Dana Lee', partner: 'P1' }, body: 'A competitor.' } });
    const memo = await wiki.trackerCommand('memo', { type: 'create-item', item: { title: 'Board memo', body: 'Private.' } });

    const out = path.join(root, 'site');
    await exportStaticSite({ wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9', excludeTypes: ['memo'] });
    const manifest = json<StaticSiteManifest>(path.join(out, '_wiki', 'manifest.json'));
    expect(manifest.pages[acme.id!]).toBe('acme');
    expect(manifest.pages.P1).toBe('items/p1');
    expect(manifest.pages[memo.id!]).toBeUndefined();
    expect(Object.keys(manifest.types).sort()).toEqual(['competitor', 'partner']);
    // The relationship field links Acme to the row both ways; the person field is gone.
    const links = json<Record<string, StaticSiteLink[]>>(path.join(out, '_wiki', 'links.json'));
    expect(links.P1).toEqual([expect.objectContaining({ direction: 'in', otherItemId: acme.id, sourceFieldId: 'partner' })]);
    const tracker = json<{ items: Array<{ id: string; fields: Record<string, unknown> }> }>(path.join(out, '_wiki', 'trackers', 'competitor.json'));
    expect(tracker.items.map((item) => [item.id, item.fields])).toEqual([[acme.id, expect.not.objectContaining({ lead: expect.anything() })]]);
    expect(read(path.join(out, 'types', 'partner', 'index.html'))).toContain('href="../../items/p1/">Globex</a>');

    // Re-exporting keeps the earlier site beside the new one; a folder with other files is refused untouched.
    const again = await exportStaticSite({ wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9' });
    expect(again.previous).toBe(`${out}.previous`);
    expect(existsSync(path.join(out, '_wiki', 'manifest.json'))).toBe(true);
    const busy = path.join(root, 'busy');
    mkdirSync(busy);
    writeFileSync(path.join(busy, 'notes.txt'), 'mine');
    await expect(exportStaticSite({ wiki, assetsDir: assets, outDir: busy, nimVersion: '9.9.9' })).rejects.toThrow(/not empty/);
    expect(read(path.join(busy, 'notes.txt'))).toBe('mine');
  });

  it('carries the app tracker items a page links to, with their own page, and leaves the rest as text', async () => {
    const { root, wiki, assets } = await fixture();
    const item = (overrides: Partial<CarriedTrackerItem>): CarriedTrackerItem => ({
      id: 'q1', issueKey: 'USR.64', type: 'question', title: 'Which plan?', fields: { title: 'Which plan?', status: 'open', owner: 'Dana' },
      body: 'Depends on [USR.65](nimbalyst://USR.65) and [USR.99](nimbalyst://USR.99).', createdAt: 1, updatedAt: 2, ...overrides,
    });
    const items = new Map([['USR.64', item({})], ['USR.65', item({ id: 'q2', issueKey: 'USR.65', title: 'Unreferenced', body: '' })]]);
    const asked: string[] = [];
    const trackerItems = { find: async (ref: string) => (asked.push(ref), items.get(ref) ?? null) };
    await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, sortOrder: 0, body: 'See [the plan question](nimbalyst://USR.64) and [gone](nimbalyst://USR.7).' });

    const out = path.join(root, 'site');
    const report = await exportStaticSite({ wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9', trackerItems });
    // Only what the exported pages link to is looked up: not USR.65, which only the item links to.
    expect(asked.sort()).toEqual(['USR.64', 'USR.7']);
    expect(report.trackerItems).toBe(1);
    const manifest = json<StaticSiteManifest>(path.join(out, '_wiki', 'manifest.json'));
    expect(manifest.pages.q1).toBe('items/q1');
    expect(manifest.types.question).toBe('types/question');
    const home = Object.keys(manifest.pages).find((id) => manifest.pages[id] === '')!;
    expect(json<ReadBodyResult>(path.join(out, '_wiki', 'bodies', `${home}.json`)).markdown).toBe('See [the plan question](/items/q1/) and gone.');
    // The item: its fields without the person, its body with the uncarried reference as text, and who links to it.
    const tracker = json<{ items: Array<{ id: string; fields: Record<string, unknown> }> }>(path.join(out, '_wiki', 'trackers', 'question.json'));
    expect(tracker.items).toEqual([expect.objectContaining({ id: 'q1', fields: { title: 'Which plan?', status: 'open' } })]);
    expect(json<ReadBodyResult>(path.join(out, '_wiki', 'bodies', 'q1.json')).markdown).toBe('Depends on USR.65 and USR.99.');
    const links = json<Record<string, StaticSiteLink[]>>(path.join(out, '_wiki', 'links.json'));
    expect(links.q1).toEqual([expect.objectContaining({ direction: 'in', otherItemId: home })]);
    // Prerendered: Home links to the item page relatively; the item page shows its key and body.
    expect(read(path.join(out, 'index.html'))).toContain('<a href="./items/q1/">the plan question</a>');
    const page = read(path.join(out, 'items', 'q1', 'index.html'));
    expect(page).toContain('USR.64');
    expect(page).toContain('Depends on USR.65 and USR.99.');
  });

  it('reads a carried item from the app without the field header the running app puts on its body', async () => {
    const record = { id: 'q1', primaryType: 'question', typeTags: [], localKey: 'USR.84', source: 'native', archived: false, system: { createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z' }, fields: { title: 'Q3', status: 'open', description: 'x' } };
    const live = '# Q3\n\n**Type**: question\n**Issue Key**: USR.84\n**Status**: open\n**ID**: q1\n\n---\n\nSpike plan question Q3.';
    const gateway = (body: string, archived = false) => ({
      getTracker: async () => ({ ...record, archived }),
      getTrackerBody: async () => body,
    }) as unknown as TrackerGateway;
    expect(await gatewayTrackerSource(gateway(live), '/ws').find('USR.84')).toEqual({
      id: 'q1', issueKey: 'USR.84', type: 'question', title: 'Q3', fields: { title: 'Q3', status: 'open' },
      body: 'Spike plan question Q3.', createdAt: Date.parse('2026-10-01T00:00:00.000Z'), updatedAt: Date.parse('2026-10-02T00:00:00.000Z'),
    });
    // The database path returns the description as stored; a live item with no description has only the header.
    expect((await gatewayTrackerSource(gateway('Stored body.'), '/ws').find('USR.84'))?.body).toBe('Stored body.');
    expect((await gatewayTrackerSource(gateway('# Q3\n\n**Type**: question\n**ID**: q1'), '/ws').find('USR.84'))?.body).toBe('');
    expect(await gatewayTrackerSource(gateway('', true), '/ws').find('USR.84')).toBeNull();
  });

  it('exports Japanese prerendered UI without translating document content, schema names or data', async () => {
    const { root, wiki, assets } = await fixture();
    await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, sortOrder: 0, body: '> [!NOTE] User heading\n> English content.\n\n[Question](nimbalyst://USR.64)' });
    const home = (await wiki.snapshot()).pages.find((page) => page.title === 'Home')!;
    await wiki.command({ type: 'register-document', title: 'Source', parentFolderId: null, body: `[Home](${home.path} "id=${home.id}")` });
    const item: CarriedTrackerItem = {
      id: 'q1', issueKey: 'USR.64', type: 'question', title: 'User title',
      fields: { custom_field: 'Ready' }, body: 'User-authored body.', createdAt: 1, updatedAt: 2,
    };
    const options = {
      wiki, assetsDir: assets, nimVersion: '9.9.9',
      trackerItems: { find: async () => item },
      now: () => new Date('2026-10-20T00:00:00Z'),
    };
    const ja = path.join(root, 'ja');
    const en = path.join(root, 'en');
    const localeOptions = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...localeOptions, locale: 'ja-JP' });
    const japaneseReport = await exportStaticSite({ ...options, outDir: ja, uiLanguage: 'ja' });
    const englishReport = await exportStaticSite({ ...options, outDir: en });

    const japaneseHtml = read(path.join(ja, 'index.html'));
    expect(japaneseHtml).toContain('<html lang="ja">');
    expect(japaneseHtml).not.toContain('lang="en"');
    expect(japaneseHtml).toContain('"uiLanguage":"ja"');
    expect(japaneseHtml).toContain('<h2>リンク元</h2>');
    expect(japaneseHtml).toContain('<strong>補足: User heading</strong>');
    expect(japaneseHtml).toContain('English content.');
    expect(japaneseHtml).toContain('Nimbalystで作成');
    expect(read(path.join(ja, 'search', 'index.html'))).toContain('<h1>検索</h1>');
    expect(read(path.join(ja, 'search', 'index.html'))).toContain('スクリプトが読み込まれると、このページで検索できます。');
    expect(read(path.join(ja, 'types', 'index.html'))).toContain('<h1>種類</h1>');
    expect(read(path.join(ja, '404.html'))).toContain('<title>見つかりません · Home</title>');
    const carriedHtml = read(path.join(ja, 'items', 'q1', 'index.html'));
    expect(carriedHtml).toContain('<th>custom_field</th><td>Ready</td>');
    expect(carriedHtml).toContain('User-authored body.');
    expect(carriedHtml).toContain('Questions');

    const englishHtml = read(path.join(en, 'index.html'));
    expect(englishHtml).toContain('<html lang="en">');
    expect(englishHtml).toContain('"uiLanguage":"en"');
    expect(englishHtml).toContain('<h2>Linked from</h2>');
    expect(englishHtml).toContain('<strong>Note: User heading</strong>');
    expect(englishHtml).toContain('Made with Nimbalyst');
    expect({ ...japaneseReport, outDir: '' }).toEqual({ ...englishReport, outDir: '' });
    for (const file of ['manifest.json', 'snapshot.json', 'types.json', 'search.json', 'links.json', 'trackers/question.json']) {
      expect(json(path.join(ja, '_wiki', file))).toEqual(json(path.join(en, '_wiki', file)));
    }
  });

  it('resolves system locales, uses them for CLI output, and honors English and JSON overrides', async () => {
    expect((await createStaticExportI18n('system', 'ja-JP')).language).toBe('ja');
    expect((await createStaticExportI18n('system', 'fr-FR')).language).toBe('en');
    expect((await createStaticExportI18n('en', 'ja-JP')).language).toBe('en');
    const { root, wiki, assets } = await fixture();
    await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, body: 'Unchanged text.' });
    await wiki.command({ type: 'register-document', title: 'Hidden', parentFolderId: null, fields: { export: false }, body: 'Private.' });
    const localeOptions = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...localeOptions, locale: 'ja-JP' });
    const opened = { wiki, projectRoot: root, dir: wiki.root, source: 'flag' as const };
    let output = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => ((output += String(chunk)), true));
    const run = async (name: string, flags: string[]) => {
      output = '';
      const outDir = path.join(root, name);
      const code = await runWikiExport(parseArgs(['wiki', 'export', '--static', outDir, '--assets', assets, '--tracker-items', 'none', ...flags]), opened, '9.9.9');
      expect(code).toBe(0);
      return { text: output, html: read(path.join(outDir, 'index.html')) };
    };
    const system = await run('system', []);
    expect(system.text).toContain('エクスポートしました');
    expect(system.text).toContain('除外: Hidden (export-false)');
    expect(system.html).toContain('<html lang="ja">');
    const english = await run('english', ['--ui-language', 'en']);
    expect(english.text).toContain('Exported 1 pages');
    expect(english.text).toContain('Left out: Hidden (export-false)');
    expect(english.html).toContain('<html lang="en">');
    const machine = await run('json', ['--ui-language', 'ja', '--json']);
    const report = JSON.parse(machine.text);
    expect(report.excluded).toEqual([expect.objectContaining({ title: 'Hidden', reason: 'export-false' })]);
    expect(Object.keys(report).sort()).toEqual(['excluded', 'files', 'links', 'outDir', 'pages', 'previous', 'rows', 'strippedFields', 'trackerItems', 'typedPages', 'types']);
    expect(machine.html).toContain('<html lang="ja">');
    await expect(runWikiExport(parseArgs(['wiki', 'export', '--ui-language', 'de']), opened, '9.9.9')).rejects.toThrow('--ui-language には system、en、ja');
  });

  it('localizes validation errors without changing the target or its existing files', async () => {
    const { root, wiki, assets } = await fixture();
    const busy = path.join(root, 'busy-ja');
    mkdirSync(busy);
    writeFileSync(path.join(busy, 'notes.txt'), 'mine');
    await expect(exportStaticSite({ wiki, assetsDir: assets, outDir: busy, nimVersion: '9.9.9', uiLanguage: 'ja' })).rejects.toThrow('空ではなく');
    expect(read(path.join(busy, 'notes.txt'))).toBe('mine');
    const missingRoot = path.join(root, 'no-root');
    await expect(exportStaticSite({ wiki, assetsDir: assets, outDir: missingRoot, nimVersion: '9.9.9', uiLanguage: 'ja', rootPageId: 'unknown-id' })).rejects.toThrow('Wikiにページ unknown-id はありません。');
    expect(existsSync(missingRoot)).toBe(false);
    const opened = { wiki, projectRoot: root, dir: wiki.root, source: 'flag' as const };
    const absentAssets = path.join(root, 'absent-app');
    await expect(runWikiExport(parseArgs(['wiki', 'export', '--static', path.join(root, 'no-assets'), '--assets', absentAssets, '--ui-language', 'ja']), opened, '9.9.9')).rejects.toThrow(`${absentAssets} に index.html がありません`);
    expect(existsSync(path.join(root, 'no-assets'))).toBe(false);
    const empty = path.join(root, 'empty-ja');
    await exportStaticSite({ wiki, assetsDir: assets, outDir: empty, nimVersion: '9.9.9', uiLanguage: 'ja' });
    expect(read(path.join(empty, 'index.html'))).toContain('<p>このWikiにはページがありません。</p>');
  });

  it('refuses an existing file and invalid output path without changing surrounding files', async () => {
    const { root, wiki, assets } = await fixture();
    const occupied = path.join(root, 'existing-file');
    const sentinel = path.join(root, 'outside-sentinel.txt');
    writeFileSync(occupied, 'existing target');
    writeFileSync(sentinel, 'outside stays unchanged');
    await expect(exportStaticSite({ wiki, assetsDir: assets, outDir: occupied, nimVersion: '9.9.9', uiLanguage: 'ja' })).rejects.toThrow('ファイルです');
    const invalid = path.join(root, 'invalid\u0000-output');
    await expect(exportStaticSite({ wiki, assetsDir: assets, outDir: invalid, nimVersion: '9.9.9', uiLanguage: 'en' })).rejects.toThrow();
    expect(read(occupied)).toBe('existing target');
    expect(read(sentinel)).toBe('outside stays unchanged');
    expect(existsSync(invalid)).toBe(false);
    expect(readdirSync(root).filter((name) => name.includes('.export-'))).toEqual([]);
  });

  it('keeps hostile tracker identifiers, type paths and attachment traversal inside the output boundary', async () => {
    const { root, wiki, assets } = await fixture();
    const sentinel = path.join(root, 'outside-sentinel.txt');
    writeFileSync(sentinel, 'outside stays unchanged');
    await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, body: '[Question](nimbalyst://USR.64)\n\n[Outside](../outside-sentinel.txt)\n\n![Outside](%2e%2e/outside-sentinel.txt)' });
    const item: CarriedTrackerItem = {
      id: '../../escaped-item', issueKey: 'USR.64', type: '../../escaped-type', title: 'Original user title',
      fields: {}, body: 'Original user body.', createdAt: 1, updatedAt: 2,
    };
    const before = readdirSync(root).sort();
    const out = path.join(root, 'safe-site');
    const report = await exportStaticSite({ wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9', trackerItems: { find: async () => item } });
    const manifest = json<StaticSiteManifest>(path.join(out, '_wiki', 'manifest.json'));
    expect(manifest.pages[item.id]).toBe('items/escaped-item');
    expect(manifest.types[item.type]).toBe('types/escaped-type');
    expect(read(path.join(out, '_wiki', 'bodies', `${encodeURIComponent(item.id)}.json`))).toContain('Original user body.');
    for (const sitePath of [...Object.values(manifest.pages), ...Object.values(manifest.types)]) {
      expect(path.resolve(out, sitePath, 'index.html').startsWith(out + path.sep)).toBe(true);
      expect(existsSync(path.join(out, sitePath, 'index.html'))).toBe(true);
    }
    expect(report.files).toBe(0);
    expect(read(sentinel)).toBe('outside stays unchanged');
    expect(readdirSync(root).sort()).toEqual([...before, 'safe-site'].sort());
    expect(existsSync(path.join(out, '_wiki', 'files', 'outside-sentinel.txt'))).toBe(false);
    expect(report.links.some((issue) => issue.kind === 'missing-file')).toBe(true);
  });

  it('escapes user-provided titles, fields and script-closing config values in exported HTML', async () => {
    const { root, wiki, assets } = await fixture();
    await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, body: '[Question](nimbalyst://USR.64)\n\n<script>unsafeBody()</script>\n\n[Unsafe](javascript:alert%281%29)' });
    const hostile = '</title><script>unsafeTitle()</script>&"\'';
    const item: CarriedTrackerItem = {
      id: 'question-id', issueKey: 'USR.64', type: 'question', title: hostile,
      fields: { '<field>': '<img src=x onerror=unsafeField()>' }, body: 'Unchanged body.', createdAt: 1, updatedAt: 2,
    };
    const out = path.join(root, 'escaped-site');
    await exportStaticSite({ wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9', title: hostile, uiLanguage: 'ja', trackerItems: { find: async () => item } });
    const home = read(path.join(out, 'index.html'));
    const question = read(path.join(out, 'items', 'question-id', 'index.html'));
    expect(home).not.toContain('<script>unsafeBody()</script>');
    expect(home).not.toContain('href="javascript:');
    expect(home).toContain('Unsafe');
    expect(question).toContain('&lt;/title&gt;&lt;script&gt;unsafeTitle()&lt;/script&gt;&amp;&quot;&#39;');
    expect(question).toContain('<th>&lt;field&gt;</th><td>&lt;img src=x onerror=unsafeField()&gt;</td>');
    expect(question).not.toContain('<script>unsafeTitle()');
    expect(question).not.toContain('<img src=x');
    const config = { format: 1, custom: '</script><script>unsafeConfig()</script>' };
    const shell = renderShell(read(path.join(assets, 'index.html')), 'Wiki', { sitePath: '', title: 'Page', description: hostile, content: '' }, config, 'ja');
    const encoded = /window\.__NIMBALYST_WIKI_STATIC__=(.*?)<\/script>/.exec(shell)![1];
    expect(JSON.parse(encoded)).toEqual(config);
    expect(encoded).not.toContain('<');
    expect(shell).not.toContain('<script>unsafeConfig()');
  });

  it('refuses a re-export collision with an unrelated previous directory without deleting it', async () => {
    const { root, wiki, assets } = await fixture();
    await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, body: 'Current exported content.' });
    const out = path.join(root, 'site');
    await exportStaticSite({ wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9' });
    const current = read(path.join(out, 'index.html'));
    const previous = `${out}.previous`;
    mkdirSync(previous);
    writeFileSync(path.join(previous, 'unrelated-notes.txt'), 'keep this unrelated file');

    let failure: unknown;
    try { await exportStaticSite({ wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9' }); }
    catch (error) { failure = error; }
    expect(existsSync(path.join(previous, 'unrelated-notes.txt')), 'an unrelated sibling backup must not be deleted').toBe(true);
    expect(failure).toBeInstanceOf(Error);
    expect(read(path.join(previous, 'unrelated-notes.txt'))).toBe('keep this unrelated file');
    expect(read(path.join(out, 'index.html'))).toBe(current);
    expect(readdirSync(root).filter((name) => name.includes('.export-'))).toEqual([]);
  });

  it.each(['file', 'empty'] as const)('refuses an existing %s backup before modifying the current export', async (kind) => {
    const { root, wiki, assets } = await fixture();
    await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, body: 'Current exported content.' });
    const out = path.join(root, 'site');
    await exportStaticSite({ wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9' });
    const current = read(path.join(out, 'index.html'));
    const previous = `${out}.previous`;
    if (kind === 'file') writeFileSync(previous, 'unrelated backup file');
    else mkdirSync(previous);
    await expect(exportStaticSite({ wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9' })).rejects.toThrow('is not a previous wiki export');
    expect(read(path.join(out, 'index.html'))).toBe(current);
    if (kind === 'file') expect(read(previous)).toBe('unrelated backup file');
    else expect(readdirSync(previous)).toEqual([]);
    expect(readdirSync(root).filter((name) => name.includes('.export-'))).toEqual([]);
  });

  it('retains earlier backups on third and later exports while reporting the newly displaced export', async () => {
    const { root, wiki, assets } = await fixture();
    const home = await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, body: 'First version.' });
    const out = path.join(root, 'site');
    const options = { wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9' };
    const bodyAt = (dir: string) => json<ReadBodyResult>(path.join(dir, '_wiki', 'bodies', `${home.id}.json`)).markdown;
    expect((await exportStaticSite(options)).previous).toBeNull();
    await wiki.writeBody(home.id!, 'Second version.', null);
    expect((await exportStaticSite(options)).previous).toBe(`${out}.previous`);
    await wiki.writeBody(home.id!, 'Third version.', null);
    expect((await exportStaticSite(options)).previous).toBe(`${out}.previous.1`);
    expect(bodyAt(out)).toBe('Third version.');
    expect(bodyAt(`${out}.previous`)).toBe('First version.');
    expect(bodyAt(`${out}.previous.1`)).toBe('Second version.');

    writeFileSync(`${out}.previous.2`, 'unrelated numbered backup');
    await wiki.writeBody(home.id!, 'Fourth version.', null);
    expect((await exportStaticSite(options)).previous).toBe(`${out}.previous.3`);
    expect(bodyAt(out)).toBe('Fourth version.');
    expect(bodyAt(`${out}.previous`)).toBe('First version.');
    expect(bodyAt(`${out}.previous.1`)).toBe('Second version.');
    expect(read(`${out}.previous.2`)).toBe('unrelated numbered backup');
    expect(bodyAt(`${out}.previous.3`)).toBe('Third version.');
  });

  it('rechecks a backup collision introduced during staging before moving the output', async () => {
    const { root, wiki, assets } = await fixture();
    await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, body: 'Current exported content.' });
    const out = path.join(root, 'site');
    const options = { wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9' };
    await exportStaticSite(options);
    const current = read(path.join(out, 'index.html'));
    const previous = `${out}.previous`;
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    vi.mocked(fsPromises.cp).mockImplementation(async (source, destination, options) => {
      await actual.cp(source, destination, options);
      if (String(source) === assets) {
        mkdirSync(previous);
        writeFileSync(path.join(previous, 'intervening.txt'), 'created during staging');
      }
    });
    await expect(exportStaticSite(options)).rejects.toThrow('is not a previous wiki export');
    expect(read(path.join(previous, 'intervening.txt'))).toBe('created during staging');
    expect(read(path.join(out, 'index.html'))).toBe(current);
    expect(readdirSync(root).filter((name) => name.includes('.export-'))).toEqual([]);
  });

  it('preserves an intervening nonempty backup when the filesystem rename reports a collision', async () => {
    const { root, wiki, assets } = await fixture();
    await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, body: 'Current exported content.' });
    const out = path.join(root, 'site');
    const options = { wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9' };
    await exportStaticSite(options);
    const current = read(path.join(out, 'index.html'));
    const previous = `${out}.previous`;
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    vi.mocked(fsPromises.rename).mockImplementation(async (source, destination) => {
      if (String(source) === out && String(destination) === previous) {
        mkdirSync(previous);
        writeFileSync(path.join(previous, 'intervening.txt'), 'created at rename');
      }
      await actual.rename(source, destination);
    });
    await expect(exportStaticSite(options)).rejects.toThrow();
    expect(read(path.join(previous, 'intervening.txt'))).toBe('created at rename');
    expect(read(path.join(out, 'index.html'))).toBe(current);
    expect(readdirSync(root).filter((name) => name.includes('.export-'))).toEqual([]);
  });

  it('restores the original output if publishing the completed stage fails', async () => {
    const { root, wiki, assets } = await fixture();
    const home = await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, body: 'Original exported version.' });
    const out = path.join(root, 'site');
    const options = { wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9' };
    await exportStaticSite(options);
    const current = read(path.join(out, 'index.html'));
    await wiki.writeBody(home.id!, 'New version.', null);
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    vi.mocked(fsPromises.rename).mockImplementation(async (source, destination) => {
      if (String(source).startsWith(`${out}.export-`) && String(destination) === out) throw Object.assign(new Error('publish denied'), { code: 'EACCES' });
      await actual.rename(source, destination);
    });
    await expect(exportStaticSite(options)).rejects.toMatchObject({ code: 'EACCES' });
    expect(read(path.join(out, 'index.html'))).toBe(current);
    expect(existsSync(`${out}.previous`)).toBe(false);
    expect(readdirSync(root).filter((name) => name.includes('.export-'))).toEqual([]);
  });

  it('keeps the old backup and complete stage if an intervening output blocks rollback', async () => {
    const { root, wiki, assets } = await fixture();
    const home = await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, body: 'Original exported version.' });
    const out = path.join(root, 'site');
    const options = { wiki, assetsDir: assets, outDir: out, nimVersion: '9.9.9' };
    await exportStaticSite(options);
    await wiki.writeBody(home.id!, 'New staged version.', null);
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fsPromises.rename).mockImplementation(async (source, destination) => {
      if (String(source).startsWith(`${out}.export-`) && String(destination) === out) {
        mkdirSync(out);
        writeFileSync(path.join(out, 'intervening.txt'), 'unrelated output');
        throw Object.assign(new Error('output occupied'), { code: 'EEXIST' });
      }
      await actual.rename(source, destination);
    });
    await expect(exportStaticSite(options)).rejects.toMatchObject({ code: 'EEXIST' });
    const stages = readdirSync(root).filter((name) => name.startsWith('site.export-'));
    expect(stages).toHaveLength(1);
    const bodyAt = (dir: string) => json<ReadBodyResult>(path.join(dir, '_wiki', 'bodies', `${home.id}.json`)).markdown;
    expect(read(path.join(out, 'intervening.txt'))).toBe('unrelated output');
    expect(bodyAt(`${out}.previous`)).toBe('Original exported version.');
    expect(bodyAt(path.join(root, stages[0]))).toBe('New staged version.');
    expect(diagnostic).toHaveBeenCalledWith(expect.stringContaining('backup and staged export retained'), expect.objectContaining({ outDir: out, previous: `${out}.previous`, stage: path.join(root, stages[0]) }));
  });

  it('resolves every finite translator candidate from its own locale without fallback or leftover interpolation', async () => {
    const values = {
      path: '/export/site', type: 'custom_type', id: 'page-id',
      pages: 2, typedPages: 3, rows: 4, trackerItems: 5, types: 6, files: 7,
      entries: 'Hidden (export-false)', count: 8, reason: 'technical-reason',
      handling: 'handling-value', package: '@nimbalyst/wiki-web', actual: 1, expected: 2,
    };
    expect(new Set(EXPORT_TRANSLATION_KEYS).size).toBe(48);
    for (const locale of ['en', 'ja'] as const) {
      const ownResources = await createI18nInstance(locale);
      const { language, t } = await createStaticExportI18n(locale);
      expect(language).toBe(locale);
      for (const key of EXPORT_TRANSLATION_KEYS) {
        const separator = key.indexOf(':');
        const namespace = separator < 0 ? 'common' : key.slice(0, separator);
        const path = separator < 0 ? key : key.slice(separator + 1);
        // getResource reads only the named locale, so an English fallback cannot satisfy this.
        const own = ownResources.getResource(locale, namespace, path);
        expect(typeof own, `${locale}:${key}`).toBe('string');
        expect(own.length, `${locale}:${key}`).toBeGreaterThan(0);
        const expected = (own as string).replace(/{{(\w+)}}/g, (_token, name: string) => {
          expect(name in values, `${locale}:${key}:${name}`).toBe(true);
          return String(values[name as keyof typeof values]);
        });
        const actual = t(key, values);
        expect(actual, `${locale}:${key}`).toBe(expected);
        expect(actual, `${locale}:${key}`).not.toBe(path);
        expect(actual, `${locale}:${key}`).not.toContain('{{');
      }
    }
  });

  it('uses every finite callout label in both languages and leaves custom document labels outside translation', async () => {
    const callouts = [
      ['NOTE', 'note', 'Note', '補足'],
      ['TIP', 'tip', 'Tip', 'ヒント'],
      ['IMPORTANT', 'important', 'Important', '重要'],
      ['WARNING', 'warning', 'Warning', '警告'],
      ['CAUTION', 'caution', 'Caution', '注意'],
    ];
    const markdown = [...callouts.map(([kind]) => `> [!${kind}] User ${kind}\n> Unchanged body.`), '> [!CUSTOM] User CUSTOM\n> Custom body.'].join('\n\n');
    for (const locale of ['en', 'ja'] as const) {
      const { t } = await createStaticExportI18n(locale);
      const translate = vi.fn(t);
      const html = renderBodyHtml(markdown, { path: 'Home.md', dir: '' }, { pages: new Map(), included: new Set(), sitePaths: {} }, './', translate);
      for (const [kind, _key, en, ja] of callouts) {
        expect(html).toContain(`<strong>${locale === 'ja' ? ja : en}: User ${kind}</strong>`);
      }
      expect(translate.mock.calls.map(([key]) => key).sort()).toEqual(callouts.map(([, key]) => `wiki_export.callout.${key}`).sort());
      expect(html).toContain('<strong>Custom: User CUSTOM</strong>');
      expect(html).toContain('Unchanged body.');
      expect(html).not.toContain('wiki_export.');
    }
  });

  it('uses every dynamic link-issue label in English and Japanese CLI output', async () => {
    const { root, wiki, assets } = await fixture();
    await wiki.command({ type: 'register-document', title: 'Hidden', parentFolderId: null, fields: { export: false }, body: 'Private.' });
    const hidden = (await wiki.snapshot()).pages.find((page) => page.title === 'Hidden')!;
    await wiki.command({ type: 'register-document', title: 'Home', parentFolderId: null, body: [
      `[Hidden](${hidden.path} "id=${hidden.id}")`,
      '[Missing page](missing.md)',
      '[Outside wiki](../outside.md)',
      '[App item](nimbalyst://USR.19)',
      '[Missing file](missing.txt)',
      '[Console item](https://console.nimbalyst.com/app/item/USR.19)',
    ].join('\n') });
    const expectedLabels = {
      en: [
        'links to a page left out (shown as text)',
        'links to a page the wiki does not have (shown as text)',
        'links to files outside the wiki folder, such as repository docs (shown as text)',
        'nimbalyst:// or collab:// references (shown as text)',
        'links to files that do not exist',
        'links to the Nimbalyst console (kept as links)',
      ],
      ja: [
        '除外したページへのリンク（テキストとして表示）',
        'Wikiに存在しないページへのリンク（テキストとして表示）',
        'リポジトリ内の文書など、Wikiフォルダー外のファイルへのリンク（テキストとして表示）',
        'nimbalyst:// または collab:// の参照（テキストとして表示）',
        '存在しないファイルへのリンク',
        'Nimbalystコンソールへのリンク（テキストとして表示）',
      ],
    };
    const opened = { wiki, projectRoot: root, dir: wiki.root, source: 'flag' as const };
    let output = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => ((output += String(chunk)), true));
    for (const locale of ['en', 'ja'] as const) {
      output = '';
      expect(await runWikiExport(parseArgs([
        'wiki', 'export', '--static', path.join(root, `issues-${locale}`), '--assets', assets,
        '--tracker-items', 'none', '--ui-language', locale,
        '--outside-refs', locale === 'en' ? 'console' : 'text',
      ]), opened, '9.9.9')).toBe(0);
      for (const label of expectedLabels[locale]) expect(output).toContain(`  1 ${label}`);
      expect(output).toContain('Hidden (export-false)');
      expect(output).not.toContain('wiki_export.');
    }
  });
});
