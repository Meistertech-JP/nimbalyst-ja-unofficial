/**
 * Shows deep links main could not route (see `shared/deepLinkNotices.ts`).
 *
 * Main queues the notice and sends a bare nudge; the notice is only read
 * through the consuming IPC, so a nudge racing the mount-time drain shows it
 * once. Project windows mount this through `initDeepLinkListeners`; the
 * Project Manager mounts it on its own, since it is the only window when no
 * project is open.
 */
import {
  DEEP_LINK_CONSUME_NOTICES_CHANNEL,
  DEEP_LINK_NOTICE_AVAILABLE_CHANNEL,
  type DeepLinkNotice,
} from '../../../shared/deepLinkNotices';
import { feedbackRequestConsoleUrl } from '../../../shared/feedbackRequestLinks';
import { errorNotificationService } from '../../services/ErrorNotificationService';

function showNotice(notice: DeepLinkNotice): void {
  if (!['shared-document', 'shared-folder', 'feedback-request'].includes(notice.kind)) {
    throw new Error(`Unknown deep-link notice kind: ${(notice as { kind?: string }).kind}`);
  }
  if (notice.reason === 'not-authenticated') {
    errorNotificationService.showWarning(
      errorNotificationService.getLocalizedText('common', 'deep_links.sign_in_required', 'Sign in required'),
      errorNotificationService.getLocalizedText(
        'common',
        notice.kind === 'shared-document'
          ? 'deep_links.document_sign_in'
          : notice.kind === 'shared-folder'
            ? 'deep_links.folder_sign_in'
            : 'deep_links.invite_feedback_sign_in',
        notice.kind === 'shared-document'
          ? 'Sign in to your Nimbalyst team account to open this shared document.'
          : notice.kind === 'shared-folder'
            ? 'Sign in to your Nimbalyst team account to open this shared folder.'
            : 'Sign in to your Nimbalyst team account to open this feedback request.',
      ),
      { duration: 8000 },
    );
  } else if (notice.kind === 'feedback-request') {
    const consoleUrl = feedbackRequestConsoleUrl(notice.orgId, notice.requestId);
    errorNotificationService.showWarning(
      errorNotificationService.getLocalizedText('common', 'deep_links.no_matching_project', 'No matching project'),
      errorNotificationService.getLocalizedText(
        'common', 'deep_links.invite_feedback_no_project_message',
        'None of your projects belongs to the team that sent this feedback request. You can answer it in the web console.',
      ),
      {
        duration: 10000,
        action: {
          label: errorNotificationService.getLocalizedText('common', 'deep_links.invite_open_browser_action', 'Open in browser'),
          onClick: () => { void window.electronAPI.openInBrowser(consoleUrl); },
        },
      },
    );
  } else {
    errorNotificationService.showWarning(
      errorNotificationService.getLocalizedText('common', 'deep_links.no_matching_project', 'No matching project'),
      errorNotificationService.getLocalizedText(
        'common', notice.kind === 'shared-folder' ? 'deep_links.invite_shared_folder_project_missing' : 'deep_links.invite_shared_document_project_missing',
        notice.kind === 'shared-folder'
          ? 'None of your projects belongs to the team that owns this folder.'
          : 'None of your projects belongs to the team that owns this document.',
      ),
      { duration: 8000 },
    );
  }
  console.warn('[DeepLink] Could not open link:', notice);
}

async function drainNotices(): Promise<void> {
  try {
    const notices = await window.electronAPI.invoke(DEEP_LINK_CONSUME_NOTICES_CHANNEL) as DeepLinkNotice[];
    for (const notice of notices ?? []) showNotice(notice);
  } catch (err) {
    console.error('[DeepLink] Failed to consume deep-link notices:', err);
  }
}

export function initDeepLinkNoticeListeners(): () => void {
  const unsubscribe = window.electronAPI.on(DEEP_LINK_NOTICE_AVAILABLE_CHANNEL, () => {
    void drainNotices();
  });
  void drainNotices();
  return unsubscribe;
}
