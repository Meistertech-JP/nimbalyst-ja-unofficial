import { useCallback, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { atom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { sessionRegistryAtom } from '../../store/atoms/sessions';
import { reparentSessionAtom } from '../../store';
import { errorNotificationService } from '../../services/ErrorNotificationService';
import { sessionMoveError } from './sessionTreeModel';

const MIME = 'application/x-nimbalyst-session';
const MOVE_ERROR_KEYS: Record<string, string> = {
  'Session is no longer available': 'move.validation.session_missing',
  'Containers must stay at top level': 'move.validation.container_top_level',
  'Parent is no longer available': 'move.validation.parent_missing',
  'Sessions must stay in the same workspace and machine': 'move.validation.same_workspace_machine',
  'Blitz sessions cannot receive moved sessions': 'move.validation.blitz_parent',
  'Sessions must stay in the same worktree': 'move.validation.same_worktree',
  'A session cannot move under its descendant': 'move.validation.descendant',
  'The target has a cyclic parent chain': 'move.validation.cyclic_parent',
  'Parent hierarchy is not loaded': 'move.validation.parent_not_loaded',
};

function localizeMoveError(message: string, t: ReturnType<typeof useTranslation>['t']): string {
  const tooDeep = message.match(/^The moved tree would exceed (\d+) levels$/);
  if (tooDeep) return t('move.validation.tree_too_deep', { maxDepth: Number(tooDeep[1]) });
  const key = MOVE_ERROR_KEYS[message];
  return key ? t(key) : message;
}

// Drag payloads are protected during dragover; keep the local identity for validation.
let dragging: { sessionId: string; workspacePath: string } | null = null;
let undoGeneration = 0;

export function useSessionTreeMove(id: string, workspacePath?: string) {
  const { t } = useTranslation('sessions');
  const store = useStore();
  const sessionType = useAtomValue(
    useMemo(() => atom((get) => get(sessionRegistryAtom).get(id)?.sessionType), [id])
  );
  const reparent = useSetAtom(reparentSessionAtom);
  const [isDragging, setDragging] = useState(false);
  const [hint, setHint] = useState<{ valid: boolean; label: string; between: boolean } | null>(null);
  const isDraggable = !!workspacePath && sessionType !== 'workstream' && sessionType !== 'blitz';

  const move = useCallback(
    async (sourceId: string, newParentId: string | null, undo = false, restoreManagerId?: string | null) => {
      if (!workspacePath) return false;
      const currentRegistry = store.get(sessionRegistryAtom);
      const source = currentRegistry.get(sourceId);
      const error = sessionMoveError(currentRegistry, sourceId, newParentId);
      if (error) {
        errorNotificationService.showError(t('move.notification.title'), localizeMoveError(error, t));
        return false;
      }
      const oldParentId = source?.parentSessionId ?? null;
      if (oldParentId === newParentId) return false;
      let previous = { parentId: oldParentId, managerId: source?.createdBySessionId ?? null };
      const success = await reparent({
        sessionId: sourceId,
        oldParentId,
        newParentId,
        workspacePath,
        restoreManagerId,
        onMoved: (result) => {
          previous = result;
        },
      });
      if (!success) {
        errorNotificationService.showError(
          t('move.notification.title'),
          t('move.notification.rejected'),
        );
        return false;
      }
      const generation = ++undoGeneration;
      if (!undo)
        errorNotificationService.showInfo(
          t('move.notification.success_title'),
          newParentId
            ? t('move.notification.under', { name: currentRegistry.get(newParentId)?.title || t('move.session') })
            : t('move.notification.top_level'),
          {
            duration: 8000,
            action: {
              label: t('move.undo'),
              onClick: () => {
                if (generation === undoGeneration)
                  void move(sourceId, previous.parentId, true, previous.managerId);
              },
            },
          }
        );
      return true;
    },
    [store, workspacePath, reparent, t]
  );

  const target = (e: DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const between = e.clientY < rect.top + 5 || e.clientY > rect.bottom - 5;
    return {
      between,
      parentId: between ? store.get(sessionRegistryAtom).get(id)?.parentSessionId ?? null : id,
    };
  };
  return {
    move,
    isDragging,
    isDraggable,
    hint,
    onDragStart(e: DragEvent) {
      if (!isDraggable || !workspacePath) {
        e.preventDefault();
        return;
      }
      e.stopPropagation();
      dragging = { sessionId: id, workspacePath };
      e.dataTransfer.setData(MIME, JSON.stringify(dragging));
      e.dataTransfer.effectAllowed = 'move';
      setDragging(true);
    },
    onDragEnd() {
      dragging = null;
      setDragging(false);
      setHint(null);
    },
    onDragOver(e: DragEvent) {
      if (!e.dataTransfer.types.includes(MIME)) return;
      e.preventDefault();
      e.stopPropagation();
      const { between, parentId } = target(e);
      const registry = store.get(sessionRegistryAtom);
      const error =
        !dragging || dragging.workspacePath !== workspacePath
          ? t('move.validation.same_workspace')
          : sessionMoveError(registry, dragging.sessionId, parentId);
      const errorLabel = error ? localizeMoveError(error, t) : null;
      e.dataTransfer.dropEffect = error ? 'none' : 'move';
      setHint({
        valid: !error,
        between,
        label: errorLabel || (parentId
          ? t('move.hint.under', { name: registry.get(parentId)?.title || t('move.session') })
          : t('move.notification.top_level')),
      });
    },
    onDragLeave(e: DragEvent) {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setHint(null);
    },
    async onDrop(e: DragEvent) {
      if (!e.dataTransfer.types.includes(MIME)) return;
      e.preventDefault();
      e.stopPropagation();
      setHint(null);
      try {
        const data = JSON.parse(e.dataTransfer.getData(MIME));
        if (data.workspacePath === workspacePath && typeof data.sessionId === 'string')
          await move(data.sessionId, target(e).parentId);
      } catch (error) {
        errorNotificationService.showError(t('move.notification.title'), String(error));
      }
      dragging = null;
    },
  };
}
