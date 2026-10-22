import { errorNotificationService } from '../services/ErrorNotificationService';

/**
 * Archive or unarchive one session through the main process.
 * Returns true when the change was saved. When it was not, shows an error
 * so the click is never silent, and returns false. See #282.
 */
export async function saveSessionArchived(sessionId: string, isArchived: boolean): Promise<boolean> {
  const verb = isArchived ? 'archive' : 'unarchive';
  const title = errorNotificationService.getLocalizedText(
    'notifications',
    isArchived ? 'session.archive_failed' : 'session.unarchive_failed',
    `Failed to ${verb} session`,
  );
  try {
    const result = await window.electronAPI.invoke('sessions:update-metadata', sessionId, { isArchived });
    if (result?.success === false) {
      errorNotificationService.showError(
        title,
        result.error
          ? String(result.error)
          : errorNotificationService.getLocalizedText(
              'notifications',
              isArchived ? 'session.archive_rejected' : 'session.unarchive_rejected',
              `The backend rejected the ${verb} request.`,
            ),
      );
      return false;
    }
    return true;
  } catch (err) {
    errorNotificationService.showError(title, err instanceof Error ? err.message : String(err));
    return false;
  }
}
