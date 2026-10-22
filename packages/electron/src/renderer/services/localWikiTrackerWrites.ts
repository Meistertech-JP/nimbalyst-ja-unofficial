/**
 * Tracker mode's writes to Local wiki records: field edits from the table,
 * board and detail pane, delete, and the refusal of archive. Each one either
 * reaches the item's file through the library or tells the user why not.
 */
import type { TrackerRecord } from '@nimbalyst/tracker-core';
import { setTrackerHostWriter } from '@nimbalyst/runtime/plugins/TrackerPlugin/trackerHostWriter';
import { errorNotificationService } from './ErrorNotificationService';
import { localWikiText } from './localWikiUiText';
import { isLocalWikiRecord, updateLocalWikiItem } from './localWikiTrackerRecords';

/** Board position: kept by the board for database items, but a wiki file has no place for it. */
const BOARD_ORDER_FIELD = 'kanbanSortOrder';

function itemLabel(record: TrackerRecord): string {
  return String(record.fields.title ?? '') || record.id;
}

/**
 * Every Tracker mode edit of a Local wiki record ends here: the fields go to
 * the item's file through the library. A failure, or a change the file cannot
 * hold, is shown to the user; the result says whether anything was written.
 */
export async function saveLocalWikiItemFields(record: TrackerRecord, updates: Record<string, unknown>): Promise<boolean> {
  const { [BOARD_ORDER_FIELD]: boardOrder, ...fields } = updates;
  if (boardOrder !== undefined) {
    errorNotificationService.showInfo(
      localWikiText('tracker.order_title', 'Order not saved'),
      localWikiText(
        'tracker.order_message',
        `"${itemLabel(record)}" is a file in the Local wiki, which does not store its position on the board.`,
        { title: itemLabel(record) },
      ),
    );
  }
  if (Object.keys(fields).length === 0) return false;
  try {
    await updateLocalWikiItem(record.system.workspace, record, fields);
    return true;
  } catch (error) {
    console.error('[localWikiTrackerRecords] Failed to save a Local wiki item:', error);
    errorNotificationService.showError(
      localWikiText('tracker.change_title', 'Change not saved'),
      localWikiText(
        'tracker.change_message',
        `Could not write "${itemLabel(record)}" to its file in the Local wiki: ${error instanceof Error ? error.message : String(error)}`,
        { title: itemLabel(record), error: error instanceof Error ? error.message : String(error) },
      ),
    );
    return false;
  }
}

export const LOCAL_WIKI_NO_ARCHIVE = 'Local wiki files have no archive. Delete the item to move its file to the wiki trash.';

export function getLocalWikiNoArchiveMessage(): string {
  return localWikiText('tracker.no_archive', LOCAL_WIKI_NO_ARCHIVE);
}

export function getLocalWikiArchiveFallback(archive: boolean): string {
  return localWikiText(
    archive ? 'tracker.archive_failed' : 'tracker.restore_failed',
    `Could not ${archive ? 'archive' : 'restore'} this page.`,
  );
}

/**
 * Archive does not exist for Local wiki files. Shows why and returns the
 * records it refused, so a bulk archive can carry on with the rest.
 */
export function refuseLocalWikiArchive(records: readonly (TrackerRecord | null | undefined)[]): TrackerRecord[] {
  const refused = records.filter((record): record is TrackerRecord => isLocalWikiRecord(record));
  if (refused.length > 0) {
    errorNotificationService.showWarning(
      localWikiText(
        refused.length === 1 ? 'tracker.cannot_archive_one' : 'tracker.cannot_archive_other',
        refused.length === 1 ? `Can't archive "${itemLabel(refused[0])}"` : `Can't archive ${refused.length} Local wiki items`,
        { count: refused.length, title: itemLabel(refused[0]) },
      ),
      getLocalWikiNoArchiveMessage(),
      { allowDuplicate: true },
    );
  }
  return refused;
}

/** Moves a Local wiki item's file (or CSV row) to the wiki trash; shows a failure. */
export async function deleteLocalWikiItem(record: TrackerRecord): Promise<boolean> {
  try {
    await window.electronAPI.invoke('local-wiki:tracker-command', record.system.workspace, record.primaryType, {
      type: 'delete-item',
      itemId: record.id,
    });
    return true;
  } catch (error) {
    console.error('[localWikiTrackerRecords] Failed to delete a Local wiki item:', error);
    errorNotificationService.showError(
      localWikiText('tracker.delete_title', 'Not deleted'),
      localWikiText(
        'tracker.delete_message',
        `Could not move "${itemLabel(record)}" to the wiki trash: ${error instanceof Error ? error.message : String(error)}`,
        { title: itemLabel(record), error: error instanceof Error ? error.message : String(error) },
      ),
    );
    return false;
  }
}

/** Routes the tracker table's and board's edits of Local wiki records to their files. */
export function installLocalWikiTrackerWriter(): () => void {
  setTrackerHostWriter({ handles: isLocalWikiRecord, write: saveLocalWikiItemFields });
  return () => setTrackerHostWriter(null);
}
