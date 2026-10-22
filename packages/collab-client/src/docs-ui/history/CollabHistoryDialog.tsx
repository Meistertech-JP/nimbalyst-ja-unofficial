/**
 * CollabHistoryDialog
 *
 * Shared-document revision history, for the desktop app and the web console.
 * Parallel to the desktop's local-file `HistoryDialog`, but driven by the REST
 * API exposed by the document's room and a host-supplied controller.
 *
 * Behavior:
 *   - List newest-first; one click selects, shows metadata, enables restore.
 *   - The selection is compared with the revision before it (default) or with
 *     the page as it is now, or shown in full -- see `collabHistoryCompare`.
 *   - Restore goes through `restoreCollabRevision`: a `restore-pre`
 *     checkpoint, the snapshot applied through the live editor, and a
 *     `restore-head` revision.
 *   - Restore is blocked while sync state is `offline-unsynced`, `replaying`,
 *     or `disconnected` -- the live document may not reflect peer changes yet.
 *
 * What differs per host is injected: how a revision's bytes become text
 * (`previewRevision`), how two texts render as a diff (`renderDiff`, which
 * carries the editor graph), and the editor theme.
 *
 * Out of scope: deletion, manual save-version button (host-driven).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { DocRevisionMetadata } from '@nimbalyst/collab-protocol';
import { CollabHistoryError } from '@nimbalyst/runtime/sync/collabHistoryClient';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import {
  loadCollabHistoryCompare,
  planCollabHistoryCompare,
  type CollabHistoryCompareContent,
  type CollabHistoryCompareMode,
} from './collabHistoryCompare';
import {
  canRestoreCollabRevisions,
  isCollabRestoreSafe,
  restoreCollabRevision,
  type CollabHistoryController,
} from './collabHistoryController';

export interface CollabHistoryDiffNavigationState {
  currentIndex: number;
  totalGroups: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export interface CollabHistoryDiffProps {
  /** Changes whenever the compared pair changes; remount on it. */
  diffKey: string;
  oldText: string;
  newText: string;
  /** Markdown renders as a rich diff; everything else as a text diff. */
  isMarkdown: boolean;
  onNavigationStateChange: (state: CollabHistoryDiffNavigationState) => void;
}

export interface CollabHistoryDialogProps {
  /** Null until the document is open and connected. */
  controller: CollabHistoryController | null;
  onClose: () => void;
  /** A stored revision as text, or null when the format has no text projection. */
  previewRevision: (contentFormat: string, bytes: Uint8Array) => string | null;
  renderDiff: (props: CollabHistoryDiffProps) => ReactNode;
  formatRelativeTime?: (timestamp: number) => string;
}

const REVISION_LABEL_KEYS: Record<string, string> = {
  manual: 'revision_saved',
  auto: 'revision_auto_snapshot',
  bootstrap: 'revision_first',
  'restore-pre': 'revision_before_restore',
  'restore-head': 'revision_restored',
};

const REVISION_ICONS: Record<string, string> = {
  manual: 'push_pin',
  auto: 'schedule',
  bootstrap: 'flag',
  'restore-pre': 'history',
  'restore-head': 'restart_alt',
};

const COMPARE_MODES: Array<{ mode: CollabHistoryCompareMode; labelKey: string; titleKey: string }> = [
  { mode: 'previous', labelKey: 'compare_changes', titleKey: 'compare_previous_title' },
  { mode: 'current', labelKey: 'compare_current', titleKey: 'compare_current_title' },
  { mode: 'full', labelKey: 'compare_full', titleKey: 'compare_full_title' },
];

const ICON_BUTTON = 'nim-btn-icon flex items-center justify-center rounded border-none bg-transparent cursor-pointer text-[var(--nim-text-muted)] hover:not-disabled:bg-[var(--nim-bg-hover)] hover:not-disabled:text-[var(--nim-text)] disabled:opacity-40 disabled:cursor-not-allowed';
const PLAIN_BUTTON = 'nim-btn py-1.5 px-3 rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[13px] text-[var(--nim-text)] cursor-pointer hover:bg-[var(--nim-bg-hover)]';

function describeError(err: unknown): string {
  return err instanceof CollabHistoryError
    ? `${err.code}: ${err.message}`
    : err instanceof Error ? err.message : String(err);
}

export const CollabHistoryDialog: React.FC<CollabHistoryDialogProps> = ({
  controller,
  onClose,
  previewRevision,
  renderDiff,
  formatRelativeTime,
}) => {
  const { t, i18n } = useTranslation('dialogs');
  const supportsRestore = canRestoreCollabRevisions(controller);

  const [revisions, setRevisions] = useState<DocRevisionMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreSafe, setRestoreSafe] = useState(false);
  const [compareMode, setCompareMode] = useState<CollabHistoryCompareMode>('previous');
  const [compare, setCompare] = useState<CollabHistoryCompareContent>({ kind: 'none' });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [navigationState, setNavigationState] = useState<CollabHistoryDiffNavigationState | null>(null);
  // Revision bytes never change; decoding them again on every mode switch is waste.
  const revisionTextCache = useRef(new Map<string, string | null>());
  // Brief grace period before declaring the document not open. This covers
  // the sidebar "View History" entry point where the document is mounting
  // concurrently with the dialog open.
  const [graceExpired, setGraceExpired] = useState(false);
  const revisionLabel = (kind: string) => {
    const key = REVISION_LABEL_KEYS[kind];
    return key ? t(`collab_history.${key}`) : kind;
  };
  const relativeTime = formatRelativeTime ?? ((timestamp: number) => {
    const delta = Math.max(0, Date.now() - timestamp);
    if (delta < 60_000) return t('collab_history.just_now');
    const minutes = Math.floor(delta / 60_000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const formatter = new Intl.RelativeTimeFormat(i18n.resolvedLanguage || i18n.language, { numeric: 'auto' });
    if (minutes < 60) return formatter.format(-minutes, 'minute');
    if (hours < 24) return formatter.format(-hours, 'hour');
    if (days < 7) return formatter.format(-days, 'day');
    return new Date(timestamp).toLocaleDateString(i18n.resolvedLanguage || i18n.language);
  });

  useEffect(() => {
    if (controller) return;
    const id = window.setTimeout(() => setGraceExpired(true), 2000);
    return () => window.clearTimeout(id);
  }, [controller]);

  // Poll status -- the controller exposes a getter; we re-read on a low
  // interval rather than wiring another subscription path.
  useEffect(() => {
    if (!controller) return;
    const tick = () => setRestoreSafe(isCollabRestoreSafe(controller.getStatus()));
    tick();
    const id = window.setInterval(tick, 750);
    return () => window.clearInterval(id);
  }, [controller]);

  // Initial load.
  useEffect(() => {
    if (!controller) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    controller.client.listRevisions({ limit: 100 })
      .then((response) => { if (!cancelled) setRevisions(response.revisions); })
      .catch((err: unknown) => { if (!cancelled) setError(describeError(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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

  const comparePlan = useMemo(
    () => planCollabHistoryCompare(revisions, selectedId, compareMode, !!controller?.exportSnapshot),
    [revisions, selectedId, compareMode, controller],
  );

  // Load what the selection is compared with so the user can see what a
  // version changed before restoring it. The stored bytes are opaque, so both
  // sides go through the host's projection rather than being shown directly.
  useEffect(() => {
    setNavigationState(null);
    setPreviewError(null);
    if (!controller || comparePlan.kind === 'none') {
      setCompare({ kind: 'none' });
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setCompare({ kind: 'none' });
    const cache = revisionTextCache.current;
    void (async () => {
      try {
        const content = await loadCollabHistoryCompare(comparePlan, {
          revision: async (revisionId, contentFormat) => {
            if (cache.has(revisionId)) return cache.get(revisionId)!;
            const loaded = await controller.client.loadRevision(revisionId);
            // Prefer the revision's own recorded format -- an old revision can
            // predate a change in editor type, and the live controller's
            // format would then decode it as the wrong document type.
            const text = previewRevision(contentFormat || controller.contentFormat, loaded.plaintext);
            cache.set(revisionId, text);
            return text;
          },
          current: async () => {
            const snapshot = await controller.exportSnapshot!();
            const bytes = snapshot instanceof Uint8Array ? snapshot : new Uint8Array(snapshot);
            return previewRevision(controller.contentFormat, bytes);
          },
        });
        if (!cancelled) setCompare(content);
      } catch (err) {
        if (!cancelled) setPreviewError(describeError(err));
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [controller, comparePlan, previewRevision]);

  const isMarkdown = (selectedRevision?.contentFormat || controller?.contentFormat) === 'markdown';
  // The diff viewers publish their navigation on window (see DiffPreviewEditor).
  const navigatePrevious = useCallback(() => {
    (window as any)[isMarkdown ? '__richDiffNavigatePrevious' : '__textDiffNavigatePrevious']?.();
  }, [isMarkdown]);
  const navigateNext = useCallback(() => {
    (window as any)[isMarkdown ? '__richDiffNavigateNext' : '__textDiffNavigateNext']?.();
  }, [isMarkdown]);

  const handleRestore = useCallback(async () => {
    if (!controller || !selectedRevision) return;
    setRestoring(true);
    setError(null);
    try {
      if (await restoreCollabRevision(controller, selectedRevision.revisionId)) onClose();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setRestoring(false);
    }
  }, [controller, selectedRevision, onClose]);

  if (!controller) {
    return (
      <div className="collab-history-overlay fixed inset-0 flex items-center justify-center z-[10000] bg-black/50" onClick={onClose}>
        <div className="collab-history-empty bg-[var(--nim-bg)] border border-[var(--nim-border)] rounded-xl p-6 max-w-md text-sm text-[var(--nim-text)]" onClick={(e) => e.stopPropagation()}>
          {graceExpired ? (
            <>
              <div className="font-semibold mb-1">{t('collab_history.open_document_first')}</div>
              <div className="text-[var(--nim-text-muted)]">
                {t('collab_history.open_document_description')}
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold mb-1">{t('collab_history.loading_history')}</div>
              <div className="text-[var(--nim-text-muted)]">
                {t('collab_history.waiting_for_connection')}
              </div>
            </>
          )}
          <div className="mt-4 text-right">
            <button className={PLAIN_BUTTON} onClick={onClose}>{t('collab_history.close')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="collab-history-overlay fixed inset-0 flex items-center justify-center z-[10000] bg-black/50" onClick={onClose}>
      <div role="dialog" aria-label={t('history.document_title')} className="collab-history-dialog flex flex-col overflow-hidden rounded-xl bg-[var(--nim-bg)] border border-[var(--nim-border)] shadow-[0_20px_60px_rgba(0,0,0,0.3)] w-[90vw] max-w-[1200px] h-[80vh] max-h-[800px]" onClick={(e) => e.stopPropagation()}>
        <div className="collab-history-header flex items-center justify-between py-3 px-4 border-b border-[var(--nim-border)]">
          <div>
            <h2 className="m-0 text-base font-semibold text-[var(--nim-text)]">{t('history.document_title')}</h2>
            <div className="text-[11px] text-[var(--nim-text-muted)]">{t('collab_history.subtitle')}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="collab-history-compare-mode view-mode-toggle flex bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] rounded-md p-0.5 gap-0.5">
              {COMPARE_MODES.map(({ mode, labelKey, titleKey }) => (
                <button
                  key={mode}
                  data-testid={`collab-history-mode-${mode}`}
                  className={`view-mode-button py-1 px-3 text-[11px] font-medium border-none rounded cursor-pointer transition-all duration-200 ${compareMode === mode ? 'text-white bg-[var(--nim-primary)]' : 'text-[var(--nim-text-muted)] bg-transparent hover:text-[var(--nim-text)] hover:bg-[var(--nim-bg-hover)]'}`}
                  onClick={() => setCompareMode(mode)}
                  disabled={mode === 'current' && !controller.exportSnapshot}
                  title={t(`collab_history.${titleKey}`)}
                >
                  {t(`collab_history.${labelKey}`)}
                </button>
              ))}
            </div>
            <button className={`${ICON_BUTTON} w-7 h-7`} onClick={onClose} aria-label={t('collab_history.close_history')}>
              <MaterialSymbol icon="close" size={20} />
            </button>
          </div>
        </div>

        <div className="collab-history-content flex-1 flex overflow-hidden">
          <div className="collab-history-list w-[320px] border-r border-[var(--nim-border)] flex flex-col">
            <div className="py-2 px-3 border-b border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-xs font-semibold text-[var(--nim-text-muted)] uppercase tracking-wider">
              {t('collab_history.revisions', { count: revisions.length })}
              {loading && <span className="ml-2 normal-case text-[var(--nim-text-muted)]">{t('collab_history.loading')}</span>}
            </div>
            {revisions.length === 0 && !loading ? (
              <div className="p-6 text-center text-sm text-[var(--nim-text-muted)]">
                {t('collab_history.no_revisions')}
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
                      <MaterialSymbol
                        icon={REVISION_ICONS[rev.revisionKind] ?? 'description'}
                        size={18}
                        className={`shrink-0 ${isSelected ? 'text-white' : 'text-[var(--nim-text-muted)]'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {revisionLabel(rev.revisionKind)}
                        </div>
                        <div className={`text-[11px] truncate ${isSelected ? 'text-white/80' : 'text-[var(--nim-text-faint)]'}`}>
                          {relativeTime(rev.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="collab-history-detail flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="py-2 px-3 border-b border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                <div className="text-xs font-semibold text-[var(--nim-text-muted)] uppercase tracking-wider whitespace-nowrap">
                  {compare.kind === 'diff' ? t('history.diff_preview') : t('history.preview')}
                </div>
                {compare.kind === 'diff' && comparePlan.kind === 'diff' && (
                  <div className="diff-version-labels flex items-center gap-2 text-[11px] text-[var(--nim-text-muted)] whitespace-nowrap">
                    <span className="diff-version-label diff-version-old py-0.5 px-2 rounded bg-[var(--nim-bg-tertiary)] font-medium text-[var(--nim-error)]">
                      {comparePlan.selected === 'old' ? t('collab_history.this_version') : t('collab_history.version_before')}
                    </span>
                    <span className="font-semibold text-[var(--nim-text-faint)]">{t('history.vs')}</span>
                    <span className="diff-version-label diff-version-new py-0.5 px-2 rounded bg-[var(--nim-bg-tertiary)] font-medium text-[var(--nim-success)]">
                      {comparePlan.selected === 'old' ? t('collab_history.current_page') : t('collab_history.this_version')}
                    </span>
                  </div>
                )}
                {compare.kind === 'diff' && navigationState && navigationState.totalGroups > 0 && (
                  <div className="diff-navigation-controls flex items-center gap-2">
                    <button
                      className={`diff-nav-button ${ICON_BUTTON} w-6 h-6`}
                      onClick={navigatePrevious}
                      disabled={!navigationState.canGoPrevious}
                      title={t('history.previous_change')}
                    >
                      <MaterialSymbol icon="chevron_left" size={16} />
                    </button>
                    <span className="diff-change-counter text-[11px] font-medium text-[var(--nim-text-muted)] min-w-[50px] text-center">
                      {navigationState.currentIndex + 1} / {navigationState.totalGroups}
                    </span>
                    <button
                      className={`diff-nav-button ${ICON_BUTTON} w-6 h-6`}
                      onClick={navigateNext}
                      disabled={!navigationState.canGoNext}
                      title={t('history.next_change')}
                    >
                      <MaterialSymbol icon="chevron_right" size={16} />
                    </button>
                  </div>
                )}
              </div>
              <button
                className="history-restore-button shrink-0 whitespace-nowrap py-1.5 px-4 bg-[var(--nim-primary)] text-white border-none rounded-md text-[13px] font-medium cursor-pointer transition-all duration-200 hover:not-disabled:bg-[var(--nim-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleRestore}
                disabled={!selectedRevision || restoring || !restoreSafe || !supportsRestore}
                title={
                  !supportsRestore
                    ? controller.isReadOnly?.()
                      ? t('collab_history.read_only_restore_title')
                      : t('collab_history.restore_not_supported_title')
                    : !restoreSafe
                    ? t('collab_history.restore_blocked_title')
                    : t('collab_history.restore_title')
                }
              >
                {restoring ? t('collab_history.restoring') : t('collab_history.restore_as_current')}
              </button>
            </div>

            <div className="collab-history-notices px-4 pt-3 text-sm text-[var(--nim-text)] empty:hidden">
              {error && (
                <div className="mb-3 p-2 border border-[var(--nim-error)] rounded text-[var(--nim-error)] bg-[var(--nim-error-light)]">
                  {error}
                </div>
              )}
              {!supportsRestore && !controller.isReadOnly?.() && (
                <div className="mb-3 p-2 border border-[var(--nim-border)] rounded text-[var(--nim-text-muted)] bg-[var(--nim-bg-secondary)] text-xs">
                  {t('collab_history.restore_not_supported_notice')}
                </div>
              )}
              {!restoreSafe && supportsRestore && (
                <div className="mb-3 p-2 border border-[var(--nim-warning)] rounded text-[var(--nim-warning)] bg-[var(--nim-warning-light)] text-xs">
                  {t('collab_history.restore_unsynced_notice')}
                </div>
              )}
            </div>

            {selectedRevision ? (
              <>
                <div
                  className="collab-history-meta px-4 py-2 text-xs text-[var(--nim-text-muted)] border-b border-[var(--nim-border)]"
                  title={t('collab_history.revision_metadata_title', {
                    editorType: selectedRevision.editorType,
                    contentFormat: selectedRevision.contentFormat,
                    payloadBytes: selectedRevision.payloadBytes,
                    hash: selectedRevision.contentHash.slice(0, 16),
                  })}
                >
                  <span className="text-[var(--nim-text)] font-medium">
                    {revisionLabel(selectedRevision.revisionKind)}
                  </span>
                  {t('collab_history.created_by', {
                    name: selectedRevision.createdBy,
                    date: new Date(selectedRevision.createdAt).toLocaleString(i18n.resolvedLanguage || i18n.language),
                  })}
                  {supportsRestore && (
                    <span className="ml-2 text-[var(--nim-text-faint)]">
                      {t('collab_history.restore_preserves_history')}
                    </span>
                  )}
                </div>
                <div className="collab-history-preview nim-scrollbar flex-1 overflow-auto [&:has(.diff-preview-editor-container)]:p-0 p-4">
                  {previewLoading ? (
                    <div className="text-xs text-[var(--nim-text-muted)]">{t('collab_history.loading_contents')}</div>
                  ) : previewError ? (
                    <div className="text-xs text-[var(--nim-error)]">
                      {t('collab_history.preview_load_failed', { error: previewError })}
                    </div>
                  ) : compare.kind === 'diff' ? (
                    compare.oldText === compare.newText ? (
                      <div className="text-xs text-[var(--nim-text-muted)]">{t('collab_history.no_changes')}</div>
                    ) : renderDiff({
                      diffKey: `${selectedId}-${compareMode}`,
                      oldText: compare.oldText,
                      newText: compare.newText,
                      isMarkdown,
                      onNavigationStateChange: setNavigationState,
                    })
                  ) : compare.kind === 'single' && compare.text === null ? (
                    <div className="text-xs text-[var(--nim-text-muted)]">
                      {supportsRestore
                        ? t('collab_history.text_preview_unavailable')
                        : t('collab_history.snapshot_preview_unavailable')}
                    </div>
                  ) : compare.kind === 'single' && compare.text === '' ? (
                    <div className="text-xs text-[var(--nim-text-muted)]">{t('collab_history.empty_version')}</div>
                  ) : compare.kind === 'single' ? (
                    <pre className="collab-history-preview-body select-text whitespace-pre-wrap break-words m-0 p-2 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-xs font-mono">
                      {compare.text}
                    </pre>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="p-4 text-[var(--nim-text-muted)] text-sm">
                {t('collab_history.select_revision')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
