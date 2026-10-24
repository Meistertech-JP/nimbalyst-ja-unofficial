/**
 * `nim wiki export --static <dir> [--title T] [--base /docs/] [--subtree <page>] [--outside-refs text|console]
 * [--exclude-type <type>,...] [--keep-identity] [--tracker-items linked|none] [--assets <dir>] [--json]`:
 * the local wiki as a static website. See staticExport/exportSite.ts.
 *
 * Tracker items the app keeps, such as `nimbalyst://USR.64`, are looked up
 * the way `nim tracker get` does (the running app, or its database read-only)
 * and carried when a page links to them. Without the app they stay text.
 */
import * as path from 'node:path';
import type { ParsedArgs } from '../cli/parse.js';
import { flagBool, flagStr } from '../cli/parse.js';
import type { TrackerGateway } from '../gateway/types.js';
import { selectGateway } from '../gateway/select.js';
import { CliError, ExitCode, usageError } from '../cli/exitCodes.js';
import { safeText } from '../cli/output.js';
import type { OpenedWiki } from '../localWiki/open.js';
import { findPage } from '../localWiki/tree.js';
import { installHint, resolveWikiWebAssets } from '../serve/assets.js';
import { exportStaticSite, StaticExportError, type CarriedTrackerItem, type StaticExportReport, type TrackerItemSource } from '../staticExport/exportSite.js';
import { createStaticExportI18n, type ExportTranslator } from '../staticExport/i18n.js';
import { normalizeBasePath } from '../staticExport/sitePaths.js';

const ISSUE_LABEL: Record<string, string> = {
  'excluded-page': 'wiki_export.link.excluded_page',
  'missing-page': 'wiki_export.link.missing_page',
  'outside-wiki': 'wiki_export.link.outside_wiki',
  'app-only': 'wiki_export.link.app_only',
  'missing-file': 'wiki_export.link.missing_file',
};

function time(value: unknown): number {
  const parsed = typeof value === 'string' ? Date.parse(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The description alone. With the app running, the body comes back as
 * `tracker_get` shows it: a header of the title and every field, then `---`,
 * then the description. The page shows the fields itself, so the header goes.
 */
export function descriptionOnly(body: string): string {
  if (!/^# [^\n]*\n\n\*\*Type\*\*:/.test(body)) return body;
  const rule = body.indexOf('\n\n---\n\n');
  return rule < 0 ? '' : body.slice(rule + 7).trim();
}

/** Items from the app's tracker, as the exporter carries them. Archived items are not carried. */
export function gatewayTrackerSource(gateway: TrackerGateway, workspace: string): TrackerItemSource {
  return {
    async find(ref) {
      const record = await gateway.getTracker(workspace, ref);
      if (!record || record.archived) return null;
      const body = descriptionOnly((await gateway.getTrackerBody(workspace, record)) ?? '');
      // The body is the description; it shows as the page, not again as a field.
      const { description: _description, ...fields } = record.fields;
      const item: CarriedTrackerItem = {
        id: record.id,
        issueKey: record.issueKey ?? record.localKey ?? null,
        type: record.primaryType,
        title: typeof record.fields.title === 'string' ? record.fields.title : ref,
        fields,
        body,
        createdAt: time(record.system.createdAt),
        updatedAt: time(record.system.updatedAt),
      };
      return item;
    },
  };
}

/** The app's tracker, when this machine has one; the export goes ahead without it. */
function openTrackerGateway(): { gateway: TrackerGateway | null; reason: string | null } {
  try {
    return { gateway: selectGateway({}), reason: null };
  } catch (error) {
    return { gateway: null, reason: error instanceof Error ? error.message : String(error) };
  }
}

function describe(report: StaticExportReport, outsideRefs: string, trackerNote: string | null, t: ExportTranslator, base: string): string {
  const lines = [
    t('wiki_export.summary', { pages: report.pages, typedPages: report.typedPages, rows: report.rows, trackerItems: report.trackerItems, types: report.types, files: report.files, path: safeText(report.outDir) }),
  ];
  if (trackerNote) lines.push(trackerNote);
  if (report.previous) lines.push(t('wiki_export.previous', { path: safeText(report.previous) }));
  if (report.excluded.length) {
    lines.push(t('wiki_export.excluded', { entries: report.excluded.map((entry) => `${safeText(entry.title || entry.id)} (${entry.reason})`).join(', ') }));
  }
  if (report.strippedFields) lines.push(t('wiki_export.stripped_fields', { count: report.strippedFields }));
  const counts = new Map<string, number>();
  let inItems = 0;
  for (const issue of report.links) {
    if (issue.inTrackerItem) inItems++;
    else counts.set(issue.kind, (counts.get(issue.kind) ?? 0) + 1);
  }
  for (const [kind, count] of counts) {
    const label = kind === 'outside'
      ? t('wiki_export.link.outside_handling', { handling: t(outsideRefs === 'console' ? 'wiki_export.link.kept' : 'wiki_export.link.as_text') })
      : ISSUE_LABEL[kind] ? t(ISSUE_LABEL[kind]) : kind;
    lines.push(`  ${count} ${label}`);
  }
  if (inItems) lines.push(`  ${t('wiki_export.link.inside_items', { count: inItems })}`);
  lines.push('', base === '/' ? t('wiki_export.serve_hint') : t('wiki_export.serve_base_hint', { base }));
  return lines.join('\n');
}

export async function runWikiExport(args: ParsedArgs, opened: OpenedWiki, version: string): Promise<number> {
  const preference = flagStr(args, 'ui-language') ?? 'system';
  const validLanguage = preference === 'system' || preference === 'en' || preference === 'ja';
  const { language, t } = await createStaticExportI18n(validLanguage ? preference : 'system');
  if (!validLanguage) throw usageError(t('wiki_export.error.invalid_language'));
  const outDir = flagStr(args, 'static') ?? args.positionals[0];
  if (!outDir) throw usageError(t('wiki_export.error.missing_target'));
  const outsideRefs = flagStr(args, 'outside-refs') ?? 'text';
  if (outsideRefs !== 'text' && outsideRefs !== 'console') throw usageError(t('wiki_export.error.outside_refs'));
  const rootRef = flagStr(args, 'subtree');
  const rootPageId = rootRef ? findPage(await opened.wiki.snapshot(), rootRef).id : undefined;
  const trackerItems = flagStr(args, 'tracker-items') ?? 'linked';
  if (trackerItems !== 'linked' && trackerItems !== 'none') throw usageError(t('wiki_export.error.tracker_items'));
  const resolution = resolveWikiWebAssets({ flag: flagStr(args, 'assets'), projectRoot: opened.projectRoot, translate: t });
  if (!resolution.ok) throw new CliError(ExitCode.NOT_FOUND, installHint(version, resolution, t).trimEnd());
  const tracker = trackerItems === 'linked' && opened.projectRoot ? openTrackerGateway() : { gateway: null, reason: null };
  const trackerNote = tracker.reason ? t('wiki_export.tracker_unavailable', { reason: tracker.reason }) : null;
  let report: StaticExportReport;
  try {
    report = await exportStaticSite({
      wiki: opened.wiki,
      assetsDir: resolution.assets.dir,
      outDir,
      nimVersion: version,
      uiLanguage: language,
      base: flagStr(args, 'base'),
      // A site is named for its project, not its Home page (which every wiki calls Home).
      title: flagStr(args, 'title') ?? (opened.projectRoot ? path.basename(opened.projectRoot) : undefined),
      outsideRefs,
      keepIdentity: flagBool(args, 'keep-identity'),
      rootPageId,
      trackerItems: tracker.gateway && opened.projectRoot ? gatewayTrackerSource(tracker.gateway, opened.projectRoot) : undefined,
      excludeTypes: (flagStr(args, 'exclude-type') ?? '').split(',').map((typeId) => typeId.trim()).filter(Boolean),
    });
  } catch (error) {
    if (error instanceof StaticExportError) throw usageError(error.message);
    throw error;
  } finally {
    tracker.gateway?.close();
  }
  process.stdout.write((flagBool(args, 'json') ? JSON.stringify(report, null, 2) : describe(report, outsideRefs, trackerNote, t, normalizeBasePath(flagStr(args, 'base')))) + '\n');
  return ExitCode.OK;
}
