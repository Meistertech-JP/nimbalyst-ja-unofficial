/**
 * Archive or restore a tracker item through the tracker's own archive. A
 * typed page is archived this way rather than moved to Pages Trash: it keeps
 * its comments and sessions, and Tracker mode's Archived view restores it.
 */
import { isLocalWikiItemId } from './localWikiTrackerRecords';
import { getLocalWikiArchiveFallback, getLocalWikiNoArchiveMessage } from './localWikiTrackerWrites';

export async function setTrackerItemArchived(itemId: string, archive: boolean): Promise<void> {
  if (isLocalWikiItemId(itemId)) throw new Error(getLocalWikiNoArchiveMessage());
  const result = await window.electronAPI.documentService.archiveTrackerItem({ itemId, archive });
  if (!result.success) {
    throw new Error(result.error || getLocalWikiArchiveFallback(archive));
  }
}

export const archiveTrackerItem = (itemId: string): Promise<void> => setTrackerItemArchived(itemId, true);
