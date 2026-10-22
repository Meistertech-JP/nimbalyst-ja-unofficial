/**
 * The Local section's Export action: copies the database Personal pages into
 * the wiki folder as files. Main does the copy, reads every page back and
 * leaves the database rows in place; this only asks and reports.
 */
import { requestConfirmation } from '../dialogs/requestConfirmation';
import { errorNotificationService } from './ErrorNotificationService';
import { localWikiText } from './localWikiUiText';

interface ExportReport {
  ok: boolean;
  root: string;
  exported: string[];
  alreadyInWiki: string[];
  skipped: Array<{ id: string; title: string; reason: string }>;
  reparentedToRoot: string[];
  itemPlacementsKept: string[];
  error?: string;
}

const pageCountLabel = (count: number) => localWikiText(
  count === 1 ? 'export.page_count_one' : 'export.page_count_other',
  `${count} page${count === 1 ? '' : 's'}`,
  { count },
);

const pluralizedText = (key: string, count: number, fallback: string) => localWikiText(
  key,
  fallback,
  { count },
);

export async function exportPersonalPagesToFiles(workspacePath: string, pageCount: number): Promise<void> {
  const confirmed = await requestConfirmation({
    title: localWikiText('export.title', 'Export pages to files'),
    message: localWikiText(
      'export.confirm_message',
      "Copy database pages into this project's wiki folder as Markdown files. The database copies are kept, and existing files are not overwritten.",
    ),
    confirmLabel: localWikiText('export.confirm_label', 'Export'),
  });
  if (!confirmed) return;
  let report: ExportReport;
  try {
    report = await window.electronAPI.invoke('local-wiki:export-personal-pages', workspacePath) as ExportReport;
  } catch (error) {
    errorNotificationService.showError(localWikiText('export.failed_title', 'Export failed'), error instanceof Error ? error.message : String(error));
    return;
  }
  if (!report.ok) {
    const exportedCount = report.exported.length;
    const errorMessage = report.error ?? localWikiText('export.unknown_error', 'Unknown error');
    errorNotificationService.showError(
      localWikiText('export.stopped_title', 'Export stopped'),
      localWikiText(
        'export.stopped_message',
        `${errorMessage}. ${pageCountLabel(exportedCount)} ${exportedCount === 1 ? 'was' : 'were'} copied before the export stopped; the database pages are unchanged. Run Export again to continue.`,
        { count: exportedCount, error: errorMessage },
      ),
    );
    return;
  }
  const notes = [
    report.skipped.length > 0 ? pluralizedText('export.skipped_message', report.skipped.length, `${report.skipped.length} non-Markdown page${report.skipped.length === 1 ? '' : 's'} stayed in the database.`) : '',
    report.reparentedToRoot.length > 0 ? pluralizedText('export.reparented_message', report.reparentedToRoot.length, `${report.reparentedToRoot.length} page${report.reparentedToRoot.length === 1 ? '' : 's'} under typed pages were moved to the top of the wiki.`) : '',
    report.itemPlacementsKept.length > 0 ? pluralizedText('export.kept_placement', report.itemPlacementsKept.length, `${report.itemPlacementsKept.length} typed page${report.itemPlacementsKept.length === 1 ? '' : 's'} were not exported and remain in the database.`) : '',
  ].filter(Boolean).join(localWikiText('export.note_separator', ' '));
  errorNotificationService.showInfo(
    localWikiText('export.success_title', 'Pages exported'),
    `${localWikiText('export.success_message', '{{countLabel}} copied to {{root}}.', { countLabel: pageCountLabel(report.exported.length), root: report.root })}${notes ? `${localWikiText('export.note_separator', ' ')}${notes}` : ''}`,
  );
}
