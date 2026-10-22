/**
 * Connection state and presence for a tracker item's body document.
 *
 * Lives apart from `TrackerItemDetail` on purpose: the detail pulls in the
 * whole editor stack, and both the detail header and the document header bar
 * need only these two small readers. Keeping them here lets either host -- and
 * a test -- mount them without that graph.
 *
 * The markup mirrors `CollabDocumentHeaderMeta`, because a tracker body in
 * document view is the same kind of collaborative document.
 */

import React from 'react';
import { useAtomValue } from 'jotai';
import { useTranslation } from '@nimbalyst/i18n/react';
import {
  collabAwarenessAtom,
  collabProductStatusAtom,
} from '../../store/atoms/collabEditor';
import { trackerContentCollabKey } from '../../hooks/trackerContentCollabKey';

export const TrackerCollabAvatars: React.FC<{ itemId: string }> = ({ itemId }) => {
  const { t } = useTranslation('editor');
  const collabKey = trackerContentCollabKey(itemId);
  const users = useAtomValue(collabAwarenessAtom(collabKey));
  const status = useAtomValue(collabProductStatusAtom(collabKey));
  if (!status.showPresence || users.size === 0) return null;

  return (
    <div
      className="tracker-collab-presence-avatars flex items-center -space-x-1.5"
      data-testid="tracker-collab-presence"
    >
      {[...users.entries()].map(([userId, user]) => {
        const displayName = user.nimbalystNameSource === 'system-default'
          ? t('collab.unnamed_collaborator')
          : user.name;
        const initials = displayName
          .split(/\s+/)
          .map((word) => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || '?';
        return (
          <div
            key={userId}
            className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-medium"
            style={{
              backgroundColor: user.color,
              color: '#fff',
              border: '1.5px solid var(--nim-bg)',
            }}
            title={displayName}
          >
            {initials}
          </div>
        );
      })}
    </div>
  );
};

function trackerCollabStatusDotClass(
  severity: 'neutral' | 'info' | 'success' | 'warning' | 'error',
): string {
  if (severity === 'success') return 'bg-[var(--nim-success)]';
  if (severity === 'info') return 'bg-[var(--nim-info)]';
  if (severity === 'warning') return 'bg-[var(--nim-warning)]';
  if (severity === 'error') return 'bg-[var(--nim-error)]';
  return 'bg-[var(--nim-text-faint)]';
}

export const TrackerCollabSyncDot: React.FC<{ itemId: string }> = ({ itemId }) => {
  const { t } = useTranslation('editor');
  const status = useAtomValue(
    collabProductStatusAtom(trackerContentCollabKey(itemId)),
  );
  const statusLabel = t(`collab_status.${status.kind}.label`);
  const statusDetail = status.detail
    ? t(`collab_status.${status.kind}.detail`)
    : null;
  const description = statusDetail
    ? `${statusLabel}: ${statusDetail}`
    : statusLabel;
  return (
    <span
      className={`collab-sync-dot h-2 w-2 shrink-0 rounded-full ${trackerCollabStatusDotClass(status.severity)}`}
      data-testid="tracker-collab-sync-dot"
      data-status-kind={status.kind}
      role="status"
      aria-label={t('collab.sync_status', { status: description })}
      title={description}
    />
  );
};
