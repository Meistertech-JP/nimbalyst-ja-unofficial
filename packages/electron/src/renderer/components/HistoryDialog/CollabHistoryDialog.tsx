/**
 * CollabHistoryDialog
 *
 * Shared-document revision history. Parallel to the local-file
 * `HistoryDialog`, but driven by the REST API exposed by the
 * TeamDocumentRoom DurableObject and a per-tab controller atom rather
 * than the local PGLite history manager.
 *
 * MVP behavior:
 *   - List newest-first; one click selects, shows metadata, enables restore.
 *   - Restore creates a `restore-pre` checkpoint, applies the snapshot
 *     through the collab path, and records a `restore-head` revision.
 *   - Restore is blocked while sync state is `offline-unsynced`, `replaying`,
 *     or `disconnected` -- the live Y.Doc may not reflect peer changes yet.
 *
 * Out of MVP: diff view, deletion, manual save-version button (host-driven).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import type { DocRevisionMetadata } from '@nimbalyst/collab-protocol';
import {
  CollabHistoryError,
  type CollabHistoryClient,
} from '@nimbalyst/runtime/sync';
import { collabHistoryControllerAtom } from '../../store/atoms/collabHistoryControllers';

interface CollabHistoryDialogProps {
  collabUri: string;
  onClose: () => void;
}

const REVISION_ICONS: Record<string, string> = {
  manual: 'push_pin',
  auto: 'schedule',
  bootstrap: 'flag',
  'restore-pre': 'history',
  'restore-head': 'restart_alt',
};

function isRestoreSafe(status: string): boolean {
  // Only restore from a fully synced state. `replaying` and
  // `offline-unsynced` mean the local Y.Doc has writes the server has not
  // yet acknowledged; replacing content now would lose them.
  return status === 'connected';
}

export const CollabHistoryDialog: React.FC<CollabHistoryDialogProps> = ({
  collabUri,
  onClose,
}) => {
  const { t, i18n } = useTranslation(['common']);
  const getController = useAtomValue(collabHistoryControllerAtom);
  const controller = getController(collabUri);
  const supportsRestore = !!controller?.exportSnapshot && !!controller?.applySnapshot;

  const [revisions, setRevisions] = useState<DocRevisionMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreSafe, setRestoreSafe] = useState(false);
  // Brief grace period before declaring the document not open. This covers
  // the sidebar "View History" entry point where the document tab is
  // mounting concurrently with the dialog open.
  const [graceExpired, setGraceExpired] = useState(false);

  useEffect(() => {
    if (controller) return;
    const id = window.setTimeout(() => setGraceExpired(true), 2000);
    return () => window.clearTimeout(id);
  }, [controller]);

  // Poll status -- the controller exposes a getter; we re-read on a low
  // interval rather than wiring another subscription path.
  useEffect(() => {
    if (!controller) return;
    const tick = () => setRestoreSafe(isRestoreSafe(controller.getStatus()));
    tick();
    const id = window.setInterval(tick, 750);
    return () => window.clearInterval(id);
  }, [controller]);

  // Initial load.
  useEffect(() => {
    if (!controller) return;
    void loadFirstPage(controller.client, setRevisions, setLoading, setError);
  }, [controller]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selectedRevision = useMemo(
    () => revisions.find(r => r.revisionId === selectedId) ?? null,
    [revisions, selectedId]
  );

  const handleRestore = useCallback(async () => {
    if (!controller || !selectedRevision || !controller.exportSnapshot || !controller.applySnapshot) return;
    setRestoring(true);
    setError(null);
    try {
      if (!isRestoreSafe(controller.getStatus())) {
        // If the controller can wait for pending writes (markdown + extension
        // collab editors after the history fix), block on it and re-check.
        // Older controllers without the method fall back to a silent dismiss
        // -- the prior behavior before waitForPendingWrites existed -- so we
        // don't surface a user-facing error against a code path that simply
        // hasn't been upgraded.
        if (!controller.waitForPendingWrites) return;
        const settled = await controller.waitForPendingWrites(5_000);
        if (!settled || !isRestoreSafe(controller.getStatus())) {
          throw new Error(t('common:collab_history.unsynced_error'));
        }
      }

      // 1. Capture a restore-pre checkpoint from the current head.
      const currentSnapshot = await controller.exportSnapshot();
      const currentSnapshotBytes = currentSnapshot instanceof Uint8Array
        ? currentSnapshot
        : new Uint8Array(currentSnapshot);
      await controller.client.createRevision({
        revisionKind: 'restore-pre',
        editorType: controller.editorType,
        contentFormat: controller.contentFormat,
        plaintext: currentSnapshotBytes,
        basisSequence: controller.getBasisSequence(),
      });

      // 2. Load and apply the selected revision through the collab path.
      const loaded = await controller.client.loadRevision(selectedRevision.revisionId);
      await controller.applySnapshot(loaded.plaintext);

      // 3. Record a restore-head revision pointing back at the source.
      await controller.client.createRevision({
        revisionKind: 'restore-head',
        editorType: controller.editorType,
        contentFormat: controller.contentFormat,
        plaintext: loaded.plaintext,
        basisSequence: controller.getBasisSequence(),
        restoredFromRevisionId: selectedRevision.revisionId,
      });

      onClose();
    } catch (err) {
      const message = err instanceof CollabHistoryError
        ? `${err.code}: ${err.message}`
        : err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setRestoring(false);
    }
  }, [controller, selectedRevision, onClose, t]);

  const getRevisionLabel = (kind: string) => {
    switch (kind) {
      case 'manual':
        return t('common:collab_history.saved_version');
      case 'auto':
        return t('common:collab_history.auto_snapshot');
      case 'bootstrap':
        return t('common:collab_history.first_version');
      case 'restore-pre':
        return t('common:collab_history.before_restore');
      case 'restore-head':
        return t('common:collab_history.restored_version');
      default:
        return kind;
    }
  };

  const formatRevisionTime = (createdAt: number) => {
    const elapsed = Date.now() - createdAt;
    const formatter = new Intl.RelativeTimeFormat(i18n.resolvedLanguage ?? 'en', {
      numeric: 'auto',
    });

    if (elapsed < 60_000) {
      return formatter.format(0, 'second');
    }
    if (elapsed < 3_600_000) {
      return formatter.format(-Math.floor(elapsed / 60_000), 'minute');
    }
    if (elapsed < 86_400_000) {
      return formatter.format(-Math.floor(elapsed / 3_600_000), 'hour');
    }
    if (elapsed < 604_800_000) {
      return formatter.format(-Math.floor(elapsed / 86_400_000), 'day');
    }

    return new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(createdAt));
  };

  if (!controller) {
    return (
      <div className="collab-history-overlay fixed inset-0 flex items-center justify-center z-[10000] bg-black/50" onClick={onClose}>
        <div className="collab-history-empty bg-[var(--nim-bg)] border border-[var(--nim-border)] rounded-xl p-6 max-w-md text-sm text-[var(--nim-text)]" onClick={(e) => e.stopPropagation()}>
          {graceExpired ? (
            <>
              <div className="font-semibold mb-1">
                {t('common:collab_history.open_first')}
              </div>
              <div className="text-[var(--nim-text-muted)]">
                {t('common:collab_history.open_first_desc')}
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold mb-1">
                {t('common:collab_history.loading_history')}
              </div>
              <div className="text-[var(--nim-text-muted)]">
                {t('common:collab_history.waiting_connect')}
              </div>
            </>
          )}
          <div className="mt-4 text-right">
            <button className="nim-btn" onClick={onClose}>
              {t('common:collab_history.close_dialog')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="collab-history-overlay fixed inset-0 flex items-center justify-center z-[10000] bg-black/50" onClick={onClose}>
      <div className="collab-history-dialog flex flex-col overflow-hidden rounded-xl bg-[var(--nim-bg)] border border-[var(--nim-border)] shadow-[0_20px_60px_rgba(0,0,0,0.3)] w-[80vw] max-w-[900px] h-[70vh] max-h-[700px]" onClick={(e) => e.stopPropagation()}>
        <div className="collab-history-header flex items-center justify-between py-3 px-4 border-b border-[var(--nim-border)]">
          <div>
            <h2 className="m-0 text-base font-semibold text-[var(--nim-text)]">
              {t('common:collab_history.document_history')}
            </h2>
            <div className="text-[11px] text-[var(--nim-text-muted)]">
              {t('common:collab_history.shared_revisions')}
            </div>
          </div>
          <button
            className="nim-btn-icon"
            onClick={onClose}
            aria-label={t('common:collab_history.close_history_aria')}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="collab-history-content flex-1 flex overflow-hidden">
          <div className="collab-history-list w-[320px] border-r border-[var(--nim-border)] flex flex-col">
            <div className="py-2 px-3 border-b border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-xs font-semibold text-[var(--nim-text-muted)] uppercase tracking-wider">
              {t('common:collab_history.revisions', { count: revisions.length })}
              {loading && (
                <span className="ml-2 normal-case text-[var(--nim-text-muted)]">
                  {t('common:collab_history.loading_short')}
                </span>
              )}
            </div>
            {revisions.length === 0 && !loading ? (
              <div className="p-6 text-center text-sm text-[var(--nim-text-muted)]">
                {t('common:collab_history.no_revisions')}
              </div>
            ) : (
              <div className="nim-scrollbar flex-1 overflow-y-auto p-1">
                {revisions.map(rev => {
                  const isSelected = rev.revisionId === selectedId;
                  return (
                    <div
                      key={rev.revisionId}
                      data-testid={`collab-revision-${rev.revisionId}`}
                      className={`collab-history-item flex items-center gap-2 py-1.5 px-2 mb-0.5 rounded cursor-pointer ${isSelected ? 'bg-[var(--nim-primary)] text-white' : 'text-[var(--nim-text)] hover:bg-[var(--nim-bg-hover)]'}`}
                      onClick={() => setSelectedId(rev.revisionId)}
                    >
                      <span className={`material-symbols-outlined text-lg shrink-0 ${isSelected ? 'text-white' : 'text-[var(--nim-text-muted)]'}`}>
                        {REVISION_ICONS[rev.revisionKind] ?? 'description'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {getRevisionLabel(rev.revisionKind)}
                        </div>
                        <div className={`text-[11px] truncate ${isSelected ? 'text-white/80' : 'text-[var(--nim-text-faint)]'}`}>
                          {formatRevisionTime(rev.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="collab-history-detail flex-1 flex flex-col">
            <div className="py-2 px-3 border-b border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] flex items-center justify-between">
              <div className="text-xs font-semibold text-[var(--nim-text-muted)] uppercase tracking-wider">
                {t('common:collab_history.details')}
              </div>
              <button
                className="history-restore-button py-1.5 px-4 bg-[var(--nim-primary)] text-white border-none rounded-md text-[13px] font-medium cursor-pointer transition-all duration-200 hover:not-disabled:bg-[var(--nim-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleRestore}
                disabled={!selectedRevision || restoring || !restoreSafe || !supportsRestore}
                title={
                  !supportsRestore
                    ? t('common:collab_history.restore_unsupported_title')
                    : !restoreSafe
                    ? t('common:collab_history.restore_blocked_title')
                    : t('common:collab_history.apply_title')
                }
              >
                {restoring
                  ? t('common:collab_history.restoring')
                  : t('common:collab_history.restore_current')}
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 text-sm text-[var(--nim-text)]">
              {error && (
                <div className="mb-3 p-2 border border-[var(--nim-error)] rounded text-[var(--nim-error)] bg-[var(--nim-error-light)]">
                  {error}
                </div>
              )}
              {!supportsRestore && (
                <div className="mb-3 p-2 border border-[var(--nim-border)] rounded text-[var(--nim-text-muted)] bg-[var(--nim-bg-secondary)] text-xs">
                  {t('common:collab_history.restore_unsupported')}
                </div>
              )}
              {!restoreSafe && supportsRestore && (
                <div className="mb-3 p-2 border border-[var(--nim-warning)] rounded text-[var(--nim-warning)] bg-[var(--nim-warning-light)] text-xs">
                  {t('common:collab_history.restore_unsynced')}
                </div>
              )}
              {selectedRevision ? (
                <div className="space-y-2">
                  <DetailRow
                    label={t('common:collab_history.created')}
                    value={new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(selectedRevision.createdAt))}
                  />
                  <DetailRow
                    label={t('common:collab_history.author')}
                    value={selectedRevision.createdBy}
                  />
                  <DetailRow
                    label={t('common:collab_history.kind')}
                    value={getRevisionLabel(selectedRevision.revisionKind)}
                  />
                  <DetailRow
                    label={t('common:collab_history.editor')}
                    value={selectedRevision.editorType}
                  />
                  <DetailRow
                    label={t('common:collab_history.format')}
                    value={selectedRevision.contentFormat}
                  />
                  <DetailRow
                    label={t('common:collab_history.size')}
                    value={t('common:collab_history.encrypted_bytes', {
                      bytes: selectedRevision.payloadBytes,
                    })}
                  />
                  <DetailRow
                    label={t('common:collab_history.hash')}
                    value={selectedRevision.contentHash.slice(0, 16) + '...'}
                  />
                  <div className="pt-3 text-xs text-[var(--nim-text-muted)]">
                    {supportsRestore
                      ? t('common:collab_history.restoring_preserved')
                      : t('common:collab_history.preview_unavailable')}
                  </div>
                </div>
              ) : (
                <div className="text-[var(--nim-text-muted)] text-sm">
                  {t('common:collab_history.select_revision')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex gap-3 text-xs">
    <div className="w-20 shrink-0 text-[var(--nim-text-muted)]">{label}</div>
    <div className="flex-1 break-all">{value}</div>
  </div>
);

async function loadFirstPage(
  client: CollabHistoryClient,
  setRevisions: (r: DocRevisionMetadata[]) => void,
  setLoading: (b: boolean) => void,
  setError: (s: string | null) => void
): Promise<void> {
  setLoading(true);
  setError(null);
  try {
    const response = await client.listRevisions({ limit: 100 });
    setRevisions(response.revisions);
  } catch (err) {
    const message = err instanceof CollabHistoryError
      ? `${err.code}: ${err.message}`
      : err instanceof Error ? err.message : String(err);
    setError(message);
  } finally {
    setLoading(false);
  }
}
