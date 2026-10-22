import React from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import { useAtomValue } from 'jotai';
import type { CollabScope } from '@nimbalyst/collab-client/core';
import { EditorBreadcrumb } from '@nimbalyst/collab-client/docs-ui/EditorHeaderBar';
import { pageHeaderCrumbs } from '@nimbalyst/collab-client/trackers-ui/page';
import { useSharedPagePath } from '../CollabMode/useSharedPagePath';
import { openPageAncestor } from '../CollabMode/pageHeaderNavigation';
import {
  collabAwarenessAtom,
  collabProductStatusAtom,
} from '../../store/atoms/collabEditor';

function statusDotClass(severity: ReturnType<typeof useCollabStatus>['severity']): string {
  if (severity === 'success') return 'bg-[var(--nim-success)]';
  if (severity === 'info') return 'bg-[var(--nim-info)]';
  if (severity === 'warning') return 'bg-[var(--nim-warning)]';
  if (severity === 'error') return 'bg-[var(--nim-error)]';
  return 'bg-[var(--nim-text-faint)]';
}

function useCollabStatus(filePath: string) {
  return useAtomValue(collabProductStatusAtom(filePath));
}

const CollabAvatars: React.FC<{ filePath: string }> = ({ filePath }) => {
  const { t } = useTranslation('editor');
  const users = useAtomValue(collabAwarenessAtom(filePath));
  const status = useCollabStatus(filePath);
  if (!status.showPresence || users.size === 0) return null;

  return (
    <div
      className="collab-presence-avatars flex items-center -space-x-1.5"
      data-testid="collab-header-presence"
    >
      {[...users.entries()].map(([userId, user]) => {
        const displayName = user.nimbalystNameSource === 'system-default'
          ? t('collab.unnamed_collaborator')
          : user.name;
        const initials = displayName
          .split(/\s+/)
          .map(word => word[0])
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

export const CollabDocumentHeaderMeta: React.FC<{
  filePath: string;
  displayPath: string;
  /** With both, the crumb reads the page's place in the tree and each page above it opens. */
  scope?: CollabScope;
  documentId?: string;
}> = ({ filePath, displayPath, scope, documentId }) => {
  const { t } = useTranslation('editor');
  const status = useCollabStatus(filePath);
  const page = useSharedPagePath(scope ?? null, documentId ?? '');
  const statusLabel = t(`collab_status.${status.kind}.label`);
  const statusDetail = status.detail
    ? t(`collab_status.${status.kind}.detail`)
    : null;
  const statusDescription = statusDetail
    ? `${statusLabel}: ${statusDetail}`
    : statusLabel;
  // Until the session lists the page, the stored display path stands in.
  const segments = displayPath.split('/').filter(Boolean);
  const crumbs = page.title !== null && scope
    ? pageHeaderCrumbs(null, page.path, page.title, (ancestor) => openPageAncestor(ancestor, { personal: false, scope }))
    : segments.map((segment, index) => ({
      id: `${index}:${segment}`,
      label: segment,
      current: index === segments.length - 1,
    }));

  return (
    <div className="collab-header-meta flex min-w-0 flex-1 items-center gap-2" data-testid="shared-document-breadcrumb">
      <EditorBreadcrumb crumbs={crumbs} className="shared-document-breadcrumb flex-initial" />
      <span
        className={`collab-sync-dot h-2 w-2 shrink-0 rounded-full ${statusDotClass(status.severity)}`}
        data-testid="collab-sync-dot"
        data-status-kind={status.kind}
        role="status"
        aria-label={t('collab.sync_status', { status: statusDescription })}
        title={statusDescription}
      />
      <CollabAvatars filePath={filePath} />
    </div>
  );
};

/**
 * Shown when remote edits are arriving but cannot be rendered. The sync chip
 * alone was not enough: a healthy socket and a clean outbox made the document
 * read as fully synced while it silently stopped showing collaborators' text,
 * which is why this failure is normally only caught by comparing screens.
 */
export const CollabRenderFailureBanner: React.FC<{ filePath: string }> = ({ filePath }) => {
  const { t } = useTranslation('editor');
  const status = useCollabStatus(filePath);
  if (status.kind !== 'not-receiving-changes') return null;

  return (
    <div
      className="collab-render-failure-banner flex min-h-9 items-center gap-2 border-b border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] px-3 py-1 text-xs"
      data-testid="collab-render-failure-banner"
      role="alert"
    >
      <span className="min-w-0 flex-1 text-[var(--nim-error)]">
        {t(`collab_status.${status.kind}.label`)}{status.detail ? ` — ${t(`collab_status.${status.kind}.detail`)}` : ''}
      </span>
    </div>
  );
};

export const CollabRecoveryBanner: React.FC<{
  filePath: string;
  onCopyCurrentDocument: () => Promise<void>;
  onDiscardLocalCopy: () => Promise<void>;
}> = ({ filePath, onCopyCurrentDocument, onDiscardLocalCopy }) => {
  const { t } = useTranslation('editor');
  const status = useCollabStatus(filePath);
  if (!status.showRejectedActions) return null;

  return (
    <div
      className="collab-recovery-banner flex min-h-9 items-center gap-2 border-b border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] px-3 py-1 text-xs"
      data-testid="collab-recovery-banner"
    >
      <span className="min-w-0 flex-1 text-[var(--nim-error)]">
        {t(`collab_status.${status.kind}.label`)}{status.detail ? ` — ${t(`collab_status.${status.kind}.detail`)}` : ''}
      </span>
      <button
        type="button"
        className="collab-copy-unsent-edits rounded border border-[var(--nim-border)] px-2 py-1 text-[var(--nim-text)] hover:bg-[var(--nim-bg-hover)]"
        onClick={() => { void onCopyCurrentDocument(); }}
      >
        {t('collab.copy_current_document')}
      </button>
      <button
        type="button"
        className="collab-discard-local-copy rounded border border-[var(--nim-error)] px-2 py-1 text-[var(--nim-error)] hover:bg-[var(--nim-bg-hover)]"
        onClick={() => { void onDiscardLocalCopy(); }}
      >
        {t('collab.discard_local_copy')}
      </button>
    </div>
  );
};
