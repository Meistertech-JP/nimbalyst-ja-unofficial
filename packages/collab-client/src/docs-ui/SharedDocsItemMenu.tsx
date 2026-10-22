/**
 * The context menu for a row in `SharedDocsListView`: a document or a folder.
 *
 * The folder tree (`CollabSidebar`) has carried these actions since shared
 * folders existed. A host that shows the list without the tree -- the browser
 * console, where folders are rows -- had no way to rename, move or trash
 * anything, so the actions live here too, against the same session calls and
 * the same name-collision rules the tree applies. A document stores its bare
 * name (no folder path, no ".md" on a page); where it sits is its parent.
 * Names compare as they show, so an older "Folder/Child.md" and a new "Child"
 * under the same parent collide.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslation } from '@nimbalyst/i18n/react';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import {
  type SharedDocument,
  type SharedFolder,
  collectFolderSubtree,
  flattenCollabFolderOptions,
  getCollabNodeName,
  getSharedDocumentDisplayPath,
  joinCollabPath,
  pageDisplayName,
} from '@nimbalyst/collab-client/docs';
import { useCollabDocsUI } from './CollabDocsUIProvider';
import { applySharedDocumentRenameSuffix, getSharedDocumentRenameParts } from './documentPresentation';
import { InputModal } from './primitives/InputModal';
import { confirmDestructive } from './primitives/confirmDestructive';
import { FloatingPortal, useFloatingMenu, virtualElement } from '../ui-primitives/useFloatingMenu';
import { stableCategory } from './analytics';

export type SharedDocsMenuTarget =
  | { kind: 'document'; document: SharedDocument }
  | { kind: 'folder'; folder: SharedFolder };

/** Where the menu opens and for what. `null` closes it. */
export interface SharedDocsMenuState {
  x: number;
  y: number;
  target: SharedDocsMenuTarget;
}

const ITEM = 'w-full flex items-center gap-2.5 px-3 py-1.5 rounded border-none bg-transparent cursor-pointer transition-colors text-left hover:bg-nim-hover disabled:opacity-50 disabled:cursor-not-allowed';

function MenuItem({
  icon,
  label,
  onClick,
  danger,
  disabled,
  fill,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  fill?: boolean;
}) {
  return (
    <button
      type="button"
      className={`shared-docs-menu-item ${ITEM} ${danger ? 'text-nim-error' : 'text-nim'}`}
      disabled={disabled}
      onClick={onClick}
    >
      <MaterialSymbol icon={icon} size={18} fill={fill} />
      <span>{label}</span>
    </button>
  );
}

/** Each folder's breadcrumb path, for the title dual-write and collision checks. */
function buildFolderPaths(folders: readonly SharedFolder[]): Map<string, string> {
  const byId = new Map(folders.map((folder) => [folder.folderId, folder]));
  const paths = new Map<string, string>();
  const resolve = (folderId: string, guard: Set<string>): string => {
    const cached = paths.get(folderId);
    if (cached !== undefined) return cached;
    const folder = byId.get(folderId);
    if (!folder || guard.has(folderId)) return '';
    guard.add(folderId);
    const parentPath = folder.parentFolderId ? resolve(folder.parentFolderId, guard) : '';
    const path = joinCollabPath(parentPath, folder.name);
    paths.set(folderId, path);
    return path;
  };
  for (const folder of folders) resolve(folder.folderId, new Set());
  return paths;
}

function targetName(target: SharedDocsMenuTarget, untitled: string): string {
  return target.kind === 'document'
    ? getCollabNodeName(target.document.title) || target.document.title || untitled
    : target.folder.name;
}

/** Pick a destination folder for a move. Flat, indented by depth. */
function MoveDialog({
  target,
  folders,
  onConfirm,
  onCancel,
}: {
  target: SharedDocsMenuTarget;
  folders: SharedFolder[];
  onConfirm: (folderId: string | null) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('common');
  const currentParentId = target.kind === 'document'
    ? target.document.parentFolderId ?? null
    : target.folder.parentFolderId ?? null;
  const [selected, setSelected] = useState<string | null>(currentParentId);
  // A folder cannot move into itself or any of its descendants.
  const excluded = useMemo(
    () => (target.kind === 'folder' ? new Set(collectFolderSubtree(folders, target.folder.folderId)) : new Set<string>()),
    [folders, target],
  );
  const options = useMemo(
    () => flattenCollabFolderOptions(folders).filter((option) => !option.folderId || !excluded.has(option.folderId)),
    [excluded, folders],
  );
  const unchanged = selected === currentParentId;
  const displayName = targetName(target, t('collab.untitled'));
  return (
    <div
      className="shared-docs-move-overlay fixed inset-0 z-[10000] flex items-center justify-center bg-black/60"
      onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <div
        className="shared-docs-move-dialog w-[420px] max-w-[92%] bg-[var(--nim-bg)] border border-[var(--nim-border)] rounded-xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={t('collab.move_dialog_title', { name: displayName })}
        onKeyDown={(event) => { if (event.key === 'Escape') onCancel(); }}
      >
        <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-[var(--nim-border)]">
          <div className="w-7 h-7 rounded-md bg-[var(--nim-primary)]/15 text-[var(--nim-primary)] flex items-center justify-center shrink-0 mt-0.5">
            <MaterialSymbol icon="drive_file_move" size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-semibold text-[var(--nim-text)] m-0 leading-tight truncate">
              {t('collab.move_dialog_title', { name: displayName })}
            </h2>
            <p className="text-[12px] text-[var(--nim-text-faint)] m-0 mt-0.5 leading-snug">
              {t('collab.move_dialog_hint')}
            </p>
          </div>
        </div>
        <div
          className="shared-docs-move-options nim-scrollbar m-4 max-h-[260px] overflow-y-auto rounded-md border border-[var(--nim-border-subtle,var(--nim-border))] bg-[var(--nim-bg-secondary)] p-1"
          role="listbox"
          aria-label={t('collab.destination_folder')}
        >
          {options.map((option) => {
            const isRoot = option.folderId === null;
            const isSelected = option.folderId === selected;
            return (
              <div
                key={option.folderId ?? 'root'}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                className={`shared-docs-move-option flex items-center gap-1.5 rounded px-2 py-1.5 text-[13px] cursor-pointer select-none ${
                  isSelected ? 'bg-[var(--nim-primary)]/20 text-[var(--nim-text)]' : 'text-[var(--nim-text)] hover:bg-[var(--nim-bg-tertiary)]'
                }`}
                style={{ paddingLeft: isRoot ? 8 : 8 + option.depth * 18 }}
                data-folder-option={option.folderId ?? 'root'}
                onClick={() => setSelected(option.folderId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelected(option.folderId);
                  }
                }}
              >
                <MaterialSymbol icon={isRoot ? 'workspaces' : 'folder'} size={18} className={isSelected ? 'text-[var(--nim-primary)]' : 'text-[var(--nim-text-muted)]'} />
                <span className="flex-1 truncate">{isRoot ? t('collab.team_root') : option.name}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--nim-border)]">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 bg-transparent rounded-md text-[var(--nim-text-muted)] text-[13px] hover:bg-[var(--nim-bg-tertiary)] hover:text-[var(--nim-text)]"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            className={`shared-docs-move-confirm px-3.5 py-1.5 rounded-md text-[13px] font-medium bg-[var(--nim-primary)] text-[#0f1115] ${unchanged ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--nim-primary-hover)] hover:text-white cursor-pointer'}`}
            disabled={unchanged}
            onClick={() => onConfirm(selected)}
          >
            {t('collab.move')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SharedDocsItemMenu({
  state,
  onClose,
  onOpenFolder,
}: {
  state: SharedDocsMenuState | null;
  onClose: () => void;
  /**
   * How the host opens a folder. Only a host that browses folders in the list
   * shows folder rows, so a folder target without this falls back to the
   * host's artifact opener.
   */
  onOpenFolder?: (folderId: string) => void;
}) {
  const { t } = useTranslation('common');
  const { scope, host, session } = useCollabDocsUI();
  const documents = useAtomValue(session.atoms.allSharedDocuments);
  const folders = useAtomValue(session.atoms.sharedFolders);
  const favorites = useAtomValue(session.atoms.favorites);
  const syncStatus = useAtomValue(session.atoms.syncStatus);
  const { personalState: personalStateAvailable } = session.uiCapabilities;
  const [renaming, setRenaming] = useState<SharedDocsMenuTarget | null>(null);
  const [moving, setMoving] = useState<SharedDocsMenuTarget | null>(null);

  const reference = useMemo(() => (state ? virtualElement(state.x, state.y) : null), [state]);
  const floating = useFloatingMenu({
    placement: 'right-start',
    reference,
    open: state !== null,
    onOpenChange: (open) => { if (!open) onClose(); },
  });

  const folderPathById = useMemo(() => buildFolderPaths(folders), [folders]);
  // Each row's location as it shows: its parents' path plus its shown name.
  const shownPath = useCallback((document: SharedDocument): string => {
    const path = getSharedDocumentDisplayPath(document, folders);
    const leaf = getCollabNodeName(path);
    return joinCollabPath(path.slice(0, Math.max(0, path.length - leaf.length - 1)), pageDisplayName(leaf, document.documentType));
  }, [folders]);
  const existingPaths = useMemo(() => {
    const paths = new Set<string>(folderPathById.values());
    for (const document of documents) paths.add(shownPath(document));
    return paths;
  }, [documents, folderPathById, shownPath]);

  const warn = useCallback((title: string, message: string) => {
    host.notify?.({ level: 'warning', title, message, duration: 5000 });
  }, [host]);

  // Same gate as the tree: metadata mutations need the team room, and a change
  // made while disconnected would sit in no queue and simply vanish.
  const canMutate = useCallback((actionLabel: string) => {
    if (syncStatus === 'connected') return true;
    host.notify?.({
      level: 'warning',
      title: t('warning.shared_documents_offline_title', { ns: 'collabSidebar' }),
      message: t('collab.cannot_mutate_metadata', {
        action: actionLabel,
        status: t(`status.${syncStatus}`, { ns: 'collabSidebar' }),
      }),
      duration: 5000,
    });
    return false;
  }, [host, syncStatus, t]);

  const track = useCallback((action: string, document?: SharedDocument) => {
    host.trackEvent?.('collab_document_action', {
      surface: host.surface ?? 'desktop',
      action,
      actorType: 'user',
      documentType: stableCategory(document?.documentType),
      entryPoint: 'home',
    });
  }, [host]);

  const open = useCallback((target: SharedDocsMenuTarget) => {
    if (target.kind === 'document') {
      host.openArtifact({ kind: 'document', scope, documentId: target.document.documentId, teamProjectId: target.document.teamProjectId }, 'home');
    } else if (onOpenFolder) {
      onOpenFolder(target.folder.folderId);
    } else {
      host.openArtifact({ kind: 'folder', scope, folderId: target.folder.folderId }, 'home');
    }
  }, [host, onOpenFolder, scope]);

  const copyLink = useCallback(async (target: SharedDocsMenuTarget) => {
    const url = target.kind === 'document'
      ? host.artifactUrl?.({ kind: 'document', scope, documentId: target.document.documentId, teamProjectId: target.document.teamProjectId })
      : host.artifactUrl?.({ kind: 'folder', scope, folderId: target.folder.folderId });
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      if (target.kind === 'document') track('link_copied', target.document);
      else host.trackEvent?.('collab_folder_link_copied', { actorType: 'user', entryPoint: 'home' });
      host.notify?.({
        level: 'info',
        title: t(target.kind === 'document' ? 'collab.link_copied_title' : 'collab.folder_link_copied_title'),
        message: t(target.kind === 'document' ? 'collab.link_copied_message' : 'collab.folder_link_copied_message'),
        duration: 3000,
      });
    } catch (error) {
      console.error('[SharedDocsItemMenu] Failed to copy link:', error);
      host.notify?.({ level: 'error', title: t('collab.copy_failed_title'), message: t('collab.copy_failed_message') });
    }
  }, [host, scope, t, track]);

  const remove = useCallback(async (target: SharedDocsMenuTarget) => {
    if (target.kind === 'document') {
      if (!canMutate(t('action.move_document_to_trash', { ns: 'collabSidebar' }))) return;
      session.trashDocument(target.document.documentId);
      track('trashed', target.document);
      return;
    }
    if (!canMutate(t('action.delete_folder', { ns: 'collabSidebar' }))) return;
    const subtree = new Set(collectFolderSubtree(folders, target.folder.folderId));
    const folderCount = subtree.size - 1;
    const docCount = documents.filter((document) => document.parentFolderId && subtree.has(document.parentFolderId)).length;
    const parts: string[] = [];
    if (docCount > 0) parts.push(t('confirmation.documents_count', { ns: 'collabSidebar', count: docCount }));
    if (folderCount > 0) parts.push(t('confirmation.subfolders_count', { ns: 'collabSidebar', count: folderCount }));
    const detail = parts.length > 0
      ? t('confirmation.folder_contents', {
        ns: 'collabSidebar',
        items: parts.join(t('confirmation.list_separator', { ns: 'collabSidebar' })),
      })
      : '';
    // In the page tree a folder is a page, and removing it moves its subtree to Trash.
    const confirmed = session.isPageTree()
      ? await confirmDestructive(
        t('confirmation.move_page_to_trash_title', { ns: 'collabSidebar' }),
        t('collab.move_folder_to_trash_confirm', { name: target.folder.name, details: detail }),
        t('delete', { ns: 'common' }),
        t('cancel', { ns: 'common' }),
      )
      : await confirmDestructive(
        t('confirmation.delete_shared_folder_title', { ns: 'collabSidebar' }),
        t('confirmation.delete_shared_folder_message', { ns: 'collabSidebar', name: target.folder.name, detail }),
        t('delete', { ns: 'common' }),
        t('cancel', { ns: 'common' }),
      );
    if (!confirmed) return;
    session.removeFolder(target.folder.folderId);
    host.trackEvent?.('collab_folder_deleted', { actorType: 'user', source: 'home' });
  }, [canMutate, documents, folders, host, session, t, track]);

  const descriptors = host.documents?.documentTypes() ?? [];
  const renameParts = renaming?.kind === 'document'
    ? getSharedDocumentRenameParts(renaming.document, descriptors)
    : null;

  const rename = useCallback(async (requested: string) => {
    if (!renaming) return;
    const target = renaming;
    setRenaming(null);
    if (target.kind === 'folder') {
      if (!canMutate(t('action.rename_folder', { ns: 'collabSidebar' }))) return;
      const name = requested.trim();
      if (!name || name === target.folder.name) return;
      const parentPath = target.folder.parentFolderId ? folderPathById.get(target.folder.parentFolderId) ?? '' : '';
      if (existingPaths.has(joinCollabPath(parentPath, name))) {
        warn(
          t('warning.name_in_use_title', { ns: 'collabSidebar' }),
          t('warning.name_in_use_message', { ns: 'collabSidebar', name: joinCollabPath(parentPath, name) }),
        );
        return;
      }
      await session.renameFolder(target.folder.folderId, name);
      host.trackEvent?.('collab_folder_renamed', { actorType: 'user', source: 'home' });
      return;
    }
    if (!canMutate(t('action.rename_document', { ns: 'collabSidebar' }))) return;
    const parts = getSharedDocumentRenameParts(target.document, descriptors);
    const requestedName = getCollabNodeName(requested.trim()) || requested.trim();
    const name = pageDisplayName(applySharedDocumentRenameSuffix(requestedName, parts.suffix), target.document.documentType);
    if (!name || name === target.document.title) return;
    const parentId = target.document.parentFolderId ?? null;
    const parentPath = parentId ? folderPathById.get(parentId) ?? '' : '';
    const nextPath = joinCollabPath(parentPath, name);
    if (nextPath !== shownPath(target.document) && existingPaths.has(nextPath)) {
      warn(
        t('warning.name_in_use_title', { ns: 'collabSidebar' }),
        t('warning.name_in_use_message', { ns: 'collabSidebar', name: nextPath }),
      );
      return;
    }
    await session.updateDocumentTitle(target.document.documentId, name);
    track('renamed', target.document);
  }, [canMutate, descriptors, existingPaths, folderPathById, host, renaming, session, shownPath, t, track, warn]);

  const move = useCallback(async (targetFolderId: string | null) => {
    if (!moving) return;
    const target = moving;
    setMoving(null);
    const targetPath = targetFolderId ? folderPathById.get(targetFolderId) ?? '' : '';
    if (target.kind === 'folder') {
      if (!canMutate(t('action.move_folder', { ns: 'collabSidebar' }))) return;
      if (targetFolderId && collectFolderSubtree(folders, target.folder.folderId).includes(targetFolderId)) return;
      if (existingPaths.has(joinCollabPath(targetPath, target.folder.name))) {
        warn(
          t('warning.name_in_use_title', { ns: 'collabSidebar' }),
          t('warning.name_in_use_message', { ns: 'collabSidebar', name: joinCollabPath(targetPath, target.folder.name) }),
        );
        return;
      }
      session.moveFolder(target.folder.folderId, targetFolderId);
      host.trackEvent?.('collab_folder_moved', { actorType: 'user', source: 'home', toRoot: targetFolderId === null });
      return;
    }
    if (!canMutate(t('action.move_document', { ns: 'collabSidebar' }))) return;
    // Unchanged means the same parent (a page parent here), whatever the title holds.
    const { document } = target;
    if ((document.parentFolderId ?? null) === targetFolderId && (document.parentKind ?? 'page') === 'page') return;
    const name = pageDisplayName(document.title, document.documentType);
    const nextPath = joinCollabPath(targetPath, name);
    if (existingPaths.has(nextPath)) {
      warn(
        t('warning.name_in_use_title', { ns: 'collabSidebar' }),
        t('warning.name_in_use_message', { ns: 'collabSidebar', name: nextPath }),
      );
      return;
    }
    session.moveDocument(document.documentId, targetFolderId);
    // An older title still carrying a folder path or ".md" is stored bare.
    if (name !== document.title) await session.updateDocumentTitle(document.documentId, name);
    track('moved', document);
  }, [canMutate, existingPaths, folderPathById, folders, host, moving, session, t, track, warn]);

  const target = state?.target ?? null;
  const favorited = target?.kind === 'document' && favorites.includes(target.document.documentId);
  const choose = (action: () => void) => () => { onClose(); action(); };

  return (
    <>
      {state && target && (
        <FloatingPortal>
          <div
            ref={floating.refs.setFloating}
            style={floating.floatingStyles}
            {...floating.getFloatingProps()}
            className="shared-docs-item-menu min-w-[180px] rounded-md z-[10000] text-[13px] p-1 bg-nim-secondary border border-nim text-nim backdrop-blur-[10px] shadow-lg"
            data-target-kind={target.kind}
          >
            <MenuItem icon="open_in_new" label={t('collab.open')} onClick={choose(() => open(target))} />
            {target.kind === 'document' && personalStateAvailable && (
              <MenuItem
                icon="star"
                fill={favorited}
                label={favorited ? t('collab.unfavorite') : t('collab.favorite')}
                onClick={choose(() => session.toggleFavorite(target.document.documentId))}
              />
            )}
            <MenuItem icon="link" label={t('collab.copy_link')} onClick={choose(() => { void copyLink(target); })} />
            <MenuItem icon="edit" label={t('collab.rename')} onClick={choose(() => setRenaming(target))} />
            <MenuItem icon="drive_file_move" label={t('collab.move')} onClick={choose(() => setMoving(target))} />
            <div className="my-1 border-t border-[var(--nim-border)]" />
            <MenuItem
              icon="delete"
              danger
              label={target.kind === 'document' || session.isPageTree() ? t('collab.move_to_trash') : t('collab.delete')}
              onClick={choose(() => { void remove(target); })}
            />
          </div>
        </FloatingPortal>
      )}
      <InputModal
        isOpen={renaming !== null}
        title={renaming?.kind === 'folder' ? t('collab.rename_shared_folder') : t('collab.rename_shared_document')}
        placeholder={renaming?.kind === 'folder' ? t('collab.document_name', { type: t('collab.folder') }) : t('collab.document_name', { type: t('collab.document') })}
        defaultValue={renaming ? (renameParts?.baseName ?? targetName(renaming, t('collab.untitled'))) : ''}
        suffix={renameParts?.suffix}
        confirmLabel={t('collab.rename')}
        onConfirm={(value) => { void rename(value); }}
        onCancel={() => setRenaming(null)}
      />
      {moving && (
        <MoveDialog
          target={moving}
          folders={folders}
          onConfirm={(folderId) => { void move(folderId); }}
          onCancel={() => setMoving(null)}
        />
      )}
    </>
  );
}
