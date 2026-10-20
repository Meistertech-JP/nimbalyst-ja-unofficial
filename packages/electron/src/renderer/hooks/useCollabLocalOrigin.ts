import { useCallback, useEffect, useMemo, useState } from 'react';
import { rendererI18n } from '../i18n';
import { errorNotificationService } from '../services/ErrorNotificationService';
import { getTeamSyncProvider } from '../store/atoms/collabDocuments';

export type CollabLocalOriginBinding = NonNullable<
  Awaited<ReturnType<typeof window.electronAPI.documentSync.getLocalOrigin>>['binding']
>;

type ReuploadResult = Awaited<
  ReturnType<typeof window.electronAPI.documentSync.reuploadLocalOrigin>
>;

type RendererReuploadResult =
  | { status: 'uploaded'; binding: CollabLocalOriginBinding | null }
  | { status: 'noop'; binding: CollabLocalOriginBinding | null }
  | { status: 'conflict'; result: ReuploadResult }
  | { status: 'error'; message: string };

async function hashText(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 0) return rendererI18n.t('common:collab_local_origin.just_now');
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return rendererI18n.t('common:collab_local_origin.just_now');
  if (minutes < 60) return rendererI18n.t('common:collab_local_origin.minutes_ago', { count: minutes });
  if (hours < 24) return rendererI18n.t('common:collab_local_origin.hours_ago', { count: hours });
  if (days < 7) return rendererI18n.t('common:collab_local_origin.days_ago', { count: days });
  return new Date(ms).toLocaleDateString(rendererI18n.resolvedLanguage ?? rendererI18n.language);
}

/**
 * Resolve a room-authed userId to a human label. The team member list carries
 * email (no separate display name), so email is the best "who" we have; falls
 * back to null when the editor isn't in the roster (e.g. it was the local user
 * on another device, or a since-removed member).
 */
function resolveEditorLabel(workspacePath: string, userId: string | null | undefined): string | null {
  if (!userId) return null;
  try {
    const members = getTeamSyncProvider(workspacePath)?.getTeamState()?.members ?? [];
    return members.find((m) => m.userId === userId)?.email || null;
  } catch {
    return null;
  }
}

/**
 * Describe who/when last edited the shared copy so the overwrite confirm can
 * tell the user what their push is about to clobber. Sourced from the
 * DocumentRoom's last *content* update (NIM-953 / NIM-955), delivered on the
 * conflict result. Returns null when neither who nor when is known.
 */
function describeSharedChange(result: ReuploadResult, workspacePath: string): string | null {
  const at = result.lastEditedAt ?? null;
  const who = resolveEditorLabel(workspacePath, result.lastEditorId);
  const when = at ? `${formatRelativeTime(at)} (${new Date(at).toLocaleString(rendererI18n.resolvedLanguage ?? rendererI18n.language)})` : null;
  if (who && when) return rendererI18n.t('common:collab_local_origin.shared_last_edited_by_when', { who, when });
  if (who) return rendererI18n.t('common:collab_local_origin.shared_last_edited_by', { who });
  if (when) return rendererI18n.t('common:collab_local_origin.shared_last_edited_when', { when });
  return null;
}

function buildConflictPrompt(result: ReuploadResult, workspacePath: string): string {
  let kind: string;
  switch (result.conflictKind) {
    case 'missing-baseline':
      kind = rendererI18n.t('common:collab_local_origin.conflict_missing_baseline');
      break;
    case 'shared-ahead':
      kind = rendererI18n.t('common:collab_local_origin.conflict_shared_ahead');
      break;
    case 'diverged':
      kind = rendererI18n.t('common:collab_local_origin.conflict_diverged');
      break;
    default:
      kind = '';
      break;
  }
  const context = describeSharedChange(result, workspacePath);
  const action = rendererI18n.t('common:collab_local_origin.conflict_action');
  return [context, kind, action].filter(Boolean).join(' ');
}

/**
 * Fallback when main reports 'unsupported' (no main-process collab adapter for
 * this document type): external structured editors (mindmap) register a
 * RENDERER codec instead, so read the linked local file here and push it into
 * the room headlessly (wipe-and-reseed via the codec + flush-with-ack).
 * Performs the same baseline/noop/conflict checks as the main adapter path
 * before writing, then refreshes the saved local-origin hashes.
 */
export async function tryRendererHeadlessReupload(
  workspacePath: string,
  documentId: string,
  result: ReuploadResult,
  forceOverwriteShared = false,
): Promise<RendererReuploadResult> {
  const resolvedPath = result.binding?.resolvedPath;
  const documentType = result.binding?.documentType;
  if (!resolvedPath || !documentType || !window.electronAPI?.readFileContent) {
    return { status: 'error', message: result.message || rendererI18n.t('common:collab_local_origin.linked_source_unavailable') };
  }
  try {
    const fileRes = await window.electronAPI.readFileContent(resolvedPath);
    if (!fileRes?.success) {
      return { status: 'error', message: fileRes?.error || rendererI18n.t('common:collab_local_origin.read_source_failed') };
    }
    if (typeof fileRes.content !== 'string') {
      return { status: 'error', message: rendererI18n.t('common:collab_local_origin.source_not_text') };
    }

    const sourceHash = await hashText(fileRes.content);
    const baselineLocal = result.binding?.lastLocalContentHash ?? null;
    const baselineShared = result.binding?.lastCollabContentHash ?? null;
    const { exportSharedDocument, reuploadSharedDocument } = await import('../utils/documentSeedOrchestrator');
    const sharedRead = await exportSharedDocument({
      workspacePath,
      documentId,
      documentType,
    });
    if (!sharedRead.ok || typeof sharedRead.content !== 'string') {
      console.warn('[useCollabLocalOrigin] renderer-headless shared export failed:', sharedRead.error);
      return {
        status: 'error',
        message: sharedRead.error || rendererI18n.t('common:collab_local_origin.read_shared_failed'),
      };
    }

    const sharedHash = await hashText(sharedRead.content);

    let conflictKind: ReuploadResult['conflictKind'] | null = null;
    if (!baselineLocal || !baselineShared) {
      conflictKind = 'missing-baseline';
    } else if (sourceHash === baselineLocal && sharedHash === baselineShared) {
      return { status: 'noop', binding: result.binding ?? null };
    } else if (sourceHash === baselineLocal && sharedHash !== baselineShared) {
      conflictKind = 'shared-ahead';
    } else if (sourceHash !== baselineLocal && sharedHash !== baselineShared) {
      conflictKind = 'diverged';
    }

    if (conflictKind && !forceOverwriteShared) {
      return {
        status: 'conflict',
        result: {
          ...result,
          success: false,
          status: 'conflict',
          conflictKind,
        },
      };
    }

    const headless = await reuploadSharedDocument({
      workspacePath,
      documentId,
      documentType,
      content: fileRes.content,
    });
    if (!headless.ok) {
      console.warn('[useCollabLocalOrigin] renderer-headless reupload failed:', headless.error);
      return {
        status: 'error',
        message: headless.error || rendererI18n.t('common:collab_local_origin.write_shared_failed'),
      };
    }

    if (window.electronAPI?.documentSync?.saveLocalOrigin) {
      const saveResult = await window.electronAPI.documentSync.saveLocalOrigin({
        workspacePath,
        documentId,
        documentType,
        sourceFilePath: resolvedPath,
        lastLocalContentHash: sourceHash,
        lastCollabContentHash: sourceHash,
      });
      if (saveResult?.success) {
        return { status: 'uploaded', binding: saveResult.binding ?? null };
      }
      console.warn('[useCollabLocalOrigin] renderer-headless baseline save failed:', saveResult?.error);
    }

    return { status: 'uploaded', binding: result.binding ?? null };
  } catch (err) {
    console.warn('[useCollabLocalOrigin] renderer-headless reupload threw:', err);
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}

export function useCollabLocalOrigin(
  workspacePath: string,
  documentId: string | null | undefined,
  documentType?: string,
) {
  const [binding, setBinding] = useState<CollabLocalOriginBinding | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspacePath || !documentId || !window.electronAPI?.documentSync?.getLocalOrigin) {
      setBinding(null);
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.documentSync.getLocalOrigin(workspacePath, documentId);
      if (result.success) {
        setBinding(result.binding ?? null);
      } else {
        setBinding(null);
      }
    } finally {
      setLoading(false);
    }
  }, [documentId, workspacePath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasResolvedBinding = binding?.resolvedPath && binding.resolutionStatus !== 'missing';

  const openLocalSource = useCallback(async () => {
    if (!workspacePath || !binding?.resolvedPath) return false;
    await window.electronAPI.invoke('workspace:open-file', {
      workspacePath,
      filePath: binding.resolvedPath,
    });
    return true;
  }, [binding?.resolvedPath, workspacePath]);

  const relinkLocalSource = useCallback(async () => {
    if (!workspacePath || !documentId || !documentType || !window.electronAPI?.documentSync?.relinkLocalOrigin) {
      return false;
    }

    const result = await window.electronAPI.openFileDialog({
      title: rendererI18n.t('common:collab_local_origin.relink_title'),
      defaultPath: binding?.resolvedPath ?? workspacePath,
      buttonLabel: rendererI18n.t('common:collab_local_origin.relink_button'),
    });
    const selectedPath = result?.filePaths?.[0];
    if (result?.canceled || !selectedPath) {
      return false;
    }

    setBusyAction('relink');
    try {
      const relinkResult = await window.electronAPI.documentSync.relinkLocalOrigin({
        workspacePath,
        documentId,
        documentType,
        sourceFilePath: selectedPath,
      });
      if (!relinkResult.success) {
        errorNotificationService.showError(
          rendererI18n.t('common:collab_local_origin.relink_failed'),
          relinkResult.error || rendererI18n.t('common:collab_local_origin.relink_failed_message'),
        );
        return false;
      }

      setBinding(relinkResult.binding ?? null);
      errorNotificationService.showInfo(
        rendererI18n.t('common:collab_local_origin.linked_title'),
        relinkResult.binding?.relativePath || rendererI18n.t('common:collab_local_origin.linked_message'),
        { duration: 4000 },
      );
      return true;
    } finally {
      setBusyAction(null);
    }
  }, [binding?.resolvedPath, documentId, documentType, workspacePath]);

  const clearLocalSource = useCallback(async () => {
    if (!workspacePath || !documentId || !window.electronAPI?.documentSync?.clearLocalOrigin) {
      return false;
    }
    if (!window.confirm(rendererI18n.t('common:collab_local_origin.clear_confirm'))) {
      return false;
    }

    setBusyAction('clear');
    try {
      const result = await window.electronAPI.documentSync.clearLocalOrigin(workspacePath, documentId);
      if (!result.success) {
        errorNotificationService.showError(
          rendererI18n.t('common:collab_local_origin.clear_failed'),
          result.error || rendererI18n.t('common:collab_local_origin.clear_failed_message'),
        );
        return false;
      }
      setBinding(null);
      errorNotificationService.showInfo(
        rendererI18n.t('common:collab_local_origin.cleared_title'),
        rendererI18n.t('common:collab_local_origin.cleared_message'),
        { duration: 3000 },
      );
      return true;
    } finally {
      setBusyAction(null);
    }
  }, [documentId, workspacePath]);

  const reuploadFromLocalSource = useCallback(async () => {
    if (!workspacePath || !documentId || !window.electronAPI?.documentSync?.reuploadLocalOrigin) {
      return false;
    }

    setBusyAction('reupload');
    try {
      let result = await window.electronAPI.documentSync.reuploadLocalOrigin({
        workspacePath,
        documentId,
      });

      if (result.status === 'conflict') {
        const confirmed = window.confirm(buildConflictPrompt(result, workspacePath));
        if (!confirmed) return false;
        result = await window.electronAPI.documentSync.reuploadLocalOrigin({
          workspacePath,
          documentId,
          forceOverwriteShared: true,
        });
      }

      if (result.success && result.binding !== undefined) {
        setBinding(result.binding ?? null);
      }

      if (result.status === 'unsupported' && documentId) {
        let rendererResult = await tryRendererHeadlessReupload(workspacePath, documentId, result);
        if (rendererResult.status === 'conflict') {
          const confirmed = window.confirm(buildConflictPrompt(rendererResult.result, workspacePath));
          if (!confirmed) return false;
          rendererResult = await tryRendererHeadlessReupload(workspacePath, documentId, result, true);
        }
        if (rendererResult.status === 'uploaded') {
          setBinding(rendererResult.binding ?? null);
          errorNotificationService.showInfo(
            rendererI18n.t('common:collab_local_origin.updated_title'),
            rendererI18n.t('common:collab_local_origin.updated_message'),
            { duration: 5000 },
          );
          return true;
        }
        if (rendererResult.status === 'noop') {
          setBinding(rendererResult.binding ?? null);
          errorNotificationService.showInfo(
            rendererI18n.t('common:collab_local_origin.nothing_to_upload'),
            rendererI18n.t('common:collab_local_origin.nothing_to_upload_baseline'),
            { duration: 3500 },
          );
          return true;
        }
        if (rendererResult.status === 'error') {
          result = {
            ...result,
            status: 'error',
            message: rendererResult.message,
          };
        }
      }

      switch (result.status) {
        case 'uploaded': {
          const migrationSummary = result.migration && (result.migration.okCount > 0 || result.migration.failedCount > 0)
            ? ` ${rendererI18n.t('common:collab_local_origin.attachments_uploaded', { count: result.migration.okCount })}${result.migration.failedCount > 0 ? `; ${rendererI18n.t('common:collab_local_origin.attachments_failed', { count: result.migration.failedCount })}.` : '.'}`
            : '';
          errorNotificationService.showInfo(
            rendererI18n.t('common:collab_local_origin.updated_title'),
            `${result.message || rendererI18n.t('common:collab_local_origin.uploaded_message')}${migrationSummary}`,
            { duration: 5000 },
          );
          return true;
        }
        case 'noop':
          errorNotificationService.showInfo(
            rendererI18n.t('common:collab_local_origin.nothing_to_upload'),
            result.message || rendererI18n.t('common:collab_local_origin.nothing_to_upload_file'),
            { duration: 3500 },
          );
          return true;
        case 'missing-source':
        case 'unsupported':
        case 'error':
        default:
          errorNotificationService.showError(
            rendererI18n.t('common:collab_local_origin.reupload_failed'),
            result.message || rendererI18n.t('common:collab_local_origin.reupload_failed_message'),
          );
          return false;
      }
    } finally {
      setBusyAction(null);
    }
  }, [documentId, workspacePath]);

  return useMemo(() => ({
    binding,
    busyAction,
    hasResolvedBinding: !!hasResolvedBinding,
    loading,
    refresh,
    openLocalSource,
    relinkLocalSource,
    clearLocalSource,
    reuploadFromLocalSource,
  }), [
    binding,
    busyAction,
    hasResolvedBinding,
    loading,
    refresh,
    openLocalSource,
    relinkLocalSource,
    clearLocalSource,
    reuploadFromLocalSource,
  ]);
}

export function useLocalFileSharedDocLink(
  workspacePath: string,
  sourceFilePath: string | null | undefined,
) {
  const [binding, setBinding] = useState<CollabLocalOriginBinding | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspacePath || !sourceFilePath || !window.electronAPI?.documentSync?.findLocalOriginLink) {
      setBinding(null);
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.documentSync.findLocalOriginLink(workspacePath, sourceFilePath);
      if (result.success) {
        setBinding(result.binding ?? null);
      } else {
        setBinding(null);
      }
    } finally {
      setLoading(false);
    }
  }, [sourceFilePath, workspacePath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reuploadToSharedDoc = useCallback(async () => {
    if (!workspacePath || !binding?.documentId || !window.electronAPI?.documentSync?.reuploadLocalOrigin) {
      return false;
    }

    setBusyAction('reupload');
    try {
      let result = await window.electronAPI.documentSync.reuploadLocalOrigin({
        workspacePath,
        documentId: binding.documentId,
      });

      if (result.status === 'conflict') {
        const confirmed = window.confirm(buildConflictPrompt(result, workspacePath));
        if (!confirmed) return false;
        result = await window.electronAPI.documentSync.reuploadLocalOrigin({
          workspacePath,
          documentId: binding.documentId,
          forceOverwriteShared: true,
        });
      }

      if (result.success && result.binding !== undefined) {
        setBinding(result.binding ?? null);
      }

      if (result.status === 'unsupported') {
        let rendererResult = await tryRendererHeadlessReupload(workspacePath, binding.documentId, result);
        if (rendererResult.status === 'conflict') {
          const confirmed = window.confirm(buildConflictPrompt(rendererResult.result, workspacePath));
          if (!confirmed) return false;
          rendererResult = await tryRendererHeadlessReupload(workspacePath, binding.documentId, result, true);
        }
        if (rendererResult.status === 'uploaded') {
          setBinding(rendererResult.binding ?? null);
          errorNotificationService.showInfo(
            rendererI18n.t('common:collab_local_origin.updated_title'),
            rendererI18n.t('common:collab_local_origin.updated_message'),
            { duration: 5000 },
          );
          return true;
        }
        if (rendererResult.status === 'noop') {
          setBinding(rendererResult.binding ?? null);
          errorNotificationService.showInfo(
            rendererI18n.t('common:collab_local_origin.nothing_to_upload'),
            rendererI18n.t('common:collab_local_origin.nothing_to_upload_baseline'),
            { duration: 3500 },
          );
          return true;
        }
        if (rendererResult.status === 'error') {
          result = {
            ...result,
            status: 'error',
            message: rendererResult.message,
          };
        }
      }

      switch (result.status) {
        case 'uploaded': {
          const migrationSummary = result.migration && (result.migration.okCount > 0 || result.migration.failedCount > 0)
            ? ` ${rendererI18n.t('common:collab_local_origin.attachments_uploaded', { count: result.migration.okCount })}${result.migration.failedCount > 0 ? `; ${rendererI18n.t('common:collab_local_origin.attachments_failed', { count: result.migration.failedCount })}.` : '.'}`
            : '';
          errorNotificationService.showInfo(
            rendererI18n.t('common:collab_local_origin.updated_title'),
            `${result.message || rendererI18n.t('common:collab_local_origin.uploaded_message')}${migrationSummary}`,
            { duration: 5000 },
          );
          return true;
        }
        case 'noop':
          errorNotificationService.showInfo(
            rendererI18n.t('common:collab_local_origin.nothing_to_upload'),
            result.message || rendererI18n.t('common:collab_local_origin.nothing_to_upload_file'),
            { duration: 3500 },
          );
          return true;
        case 'missing-source':
        case 'unsupported':
        case 'error':
        default:
          errorNotificationService.showError(
            rendererI18n.t('common:collab_local_origin.reupload_failed'),
            result.message || rendererI18n.t('common:collab_local_origin.reupload_failed_message'),
          );
          return false;
      }
    } finally {
      setBusyAction(null);
    }
  }, [binding?.documentId, workspacePath]);

  return useMemo(() => ({
    binding,
    busyAction,
    loading,
    refresh,
    reuploadToSharedDoc,
  }), [
    binding,
    busyAction,
    loading,
    refresh,
    reuploadToSharedDoc,
  ]);
}
