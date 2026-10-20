import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import { getCollabStatusPresentation } from '../../utils/collabStatusPresentation';
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
  const users = useAtomValue(collabAwarenessAtom(filePath));
  const status = useCollabStatus(filePath);
  if (!status.showPresence || users.size === 0) return null;

  return (
    <div
      className="collab-presence-avatars flex items-center -space-x-1.5"
      data-testid="collab-header-presence"
    >
      {[...users.entries()].map(([userId, user]) => {
        const initials = user.name
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
            title={user.name}
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
}> = ({ filePath, displayPath }) => {
  const { t } = useTranslation('editor');
  const status = useCollabStatus(filePath);
  const presentation = getCollabStatusPresentation(status, t);
  const segments = displayPath.split('/').filter(Boolean);
  const statusDescription = presentation.detail
    ? `${presentation.label}: ${presentation.detail}`
    : presentation.label;

  return (
    <div className="collab-header-meta flex min-w-0 items-center gap-2">
      <div
        className="shared-document-breadcrumb flex min-w-0 items-center gap-1.5 overflow-hidden text-[13px]"
        data-testid="shared-document-breadcrumb"
        title={displayPath}
      >
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          return (
            <React.Fragment key={`${segment}-${index}`}>
              <span className={`breadcrumb-segment flex items-center gap-1 whitespace-nowrap ${
                isLast
                  ? 'breadcrumb-filename text-[var(--nim-text)] font-medium'
                  : 'text-[var(--nim-text-muted)]'
              }`}>
                <span
                  className="material-symbols-outlined breadcrumb-icon shrink-0 opacity-75"
                  style={{ fontSize: '14px' }}
                  aria-hidden="true"
                >
                  {isLast ? 'description' : 'folder'}
                </span>
                {segment}
              </span>
              {!isLast && (
                <span className="breadcrumb-separator text-[var(--nim-text-faint)] text-[11px]">/</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
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

export const CollabRecoveryBanner: React.FC<{
  filePath: string;
  onCopyCurrentDocument: () => Promise<void>;
  onDiscardLocalCopy: () => Promise<void>;
}> = ({ filePath, onCopyCurrentDocument, onDiscardLocalCopy }) => {
  const { t } = useTranslation('editor');
  const status = useCollabStatus(filePath);
  const presentation = getCollabStatusPresentation(status, t);
  if (!status.showRejectedActions) return null;

  return (
    <div
      className="collab-recovery-banner flex min-h-9 items-center gap-2 border-b border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] px-3 py-1 text-xs"
      data-testid="collab-recovery-banner"
    >
      <span className="min-w-0 flex-1 text-[var(--nim-error)]">
        {presentation.label}{presentation.detail ? ` — ${presentation.detail}` : ''}
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
