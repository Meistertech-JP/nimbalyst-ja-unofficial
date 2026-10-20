/**
 * React half of the Kanban Board plugin. Owns the BoardConfigDialog and
 * CardEditDialog state plus the `board-*` `CustomEvent` listeners that
 * mutate React state. All node/transformer/command/drag-drop wiring lives
 * in `editor/extensions/builtin/KanbanBoardExtension.ts`.
 */

import type { JSX } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef, useState } from 'react';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  type NodeKey,
  type NodeMutation,
} from 'lexical';
import { createPortal } from 'react-dom';

import { $isBoardNode } from './KanbanBoardNode';
import { $isColumnNode, $createColumnNode } from './BoardColumnNode';
import { BoardColumnHeaderNode, $createColumnHeaderNode } from './BoardColumnHeaderNode';
import { BoardColumnContentNode, $isColumnContentNode, $createColumnContentNode } from './BoardColumnContentNode';
import { BoardCardNode, $isCardNode, $createCardNode, type CardData } from './BoardCardNode';
import { BoardHeaderNode } from './BoardHeaderNode';
import { BoardConfigDialog, type BoardConfig } from './BoardConfigDialog';
import { CardEditDialog } from './CardEditDialog';
import { useRuntimeTranslation } from '../../../ui/RuntimeTranslation';
import { bindKanbanTranslation, getKanbanTranslation } from './BoardCommands';

/**
 * The graph collaboration / BoardSyncService scaffolding remains stubbed
 * (see git history). The component still keeps the stub so any future sync
 * wiring has a single place to land without rebuilding the dialog state.
 */
const useGraphCollaboration = () => null;
class BoardSyncService {
  start() {}
  stop() {}
  updateConfig(_config: unknown) {}
}

export function KanbanBoardPlugin(): JSX.Element | null {
  const { t } = useRuntimeTranslation();
  const [editor] = useLexicalComposerContext();
  const graphCollaboration = useGraphCollaboration();
  const syncServicesRef = useRef<Map<string, BoardSyncService>>(new Map());
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [currentConfigNodeKey, setCurrentConfigNodeKey] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<BoardConfig | null>(null);
  const [showCardEditDialog, setShowCardEditDialog] = useState(false);
  const [currentEditCardKey, setCurrentEditCardKey] = useState<string | null>(null);
  const [currentCardData, setCurrentCardData] = useState<CardData>({ title: '' });

  const setShowCardEditDialogRef = useRef(setShowCardEditDialog);
  const setCurrentEditCardKeyRef = useRef(setCurrentEditCardKey);
  const setCurrentCardDataRef = useRef(setCurrentCardData);

  useEffect(() => bindKanbanTranslation(editor, t), [editor, t]);

  // Node-created controls are outside React. Refresh only their presentation,
  // scoped to this editor, without dirtying or translating document content.
  useEffect(() => {
    const labels = [
      { selector: '.kanban-card-edit', title: t('editor:kanban.edit_card_tooltip', 'Edit card') },
      { selector: '.kanban-card-delete', title: t('editor:kanban.delete_card', 'Delete card') },
      { selector: '.kanban-column-drag-handle', title: t('editor:kanban.drag_column', 'Drag to reorder column') },
      { selector: '.kanban-column-delete', title: t('editor:kanban.delete_column', 'Delete column') },
      { selector: '.board-settings-button', title: t('editor:kanban.configuration', 'Board Configuration') },
      { selector: '.kanban-add-column-button', text: t('editor:kanban.add_column', '+ Add Column') },
      { selector: '.kanban-add-card-button', text: t('editor:kanban.add_card', '+ Add card') },
    ];
    const updateLabels = (root: HTMLElement | null) => {
      if (!root) return;
      for (const label of labels) {
        for (const element of root.querySelectorAll<HTMLElement>(label.selector)) {
          if (label.title !== undefined) {
            element.title = label.title;
            element.setAttribute('aria-label', label.title);
          }
          // Keep the node-created text node: Lexical removes externally added
          // child nodes, even inside these non-editable controls.
          const text = element.firstChild;
          if (label.text !== undefined && text?.nodeType === 3 && text.nodeValue !== label.text) {
            text.nodeValue = label.text;
          }
        }
      }
    };
    const updateMutatedLabels = (mutations: Map<NodeKey, NodeMutation>) => {
      for (const [key, mutation] of mutations) {
        if (mutation !== 'destroyed') updateLabels(editor.getElementByKey(key));
      }
    };
    const removers = [editor.registerRootListener(updateLabels)];
    if (editor.hasNodes([BoardCardNode])) removers.push(editor.registerMutationListener(BoardCardNode, updateMutatedLabels, { skipInitialization: false }));
    if (editor.hasNodes([BoardHeaderNode])) removers.push(editor.registerMutationListener(BoardHeaderNode, updateMutatedLabels, { skipInitialization: false }));
    if (editor.hasNodes([BoardColumnHeaderNode])) removers.push(editor.registerMutationListener(BoardColumnHeaderNode, updateMutatedLabels, { skipInitialization: false }));
    if (editor.hasNodes([BoardColumnContentNode])) removers.push(editor.registerMutationListener(BoardColumnContentNode, updateMutatedLabels, { skipInitialization: false }));
    return () => { removers.forEach(remove => remove()); };
  }, [editor, t]);

  useEffect(() => {
    setShowCardEditDialogRef.current = setShowCardEditDialog;
    setCurrentEditCardKeyRef.current = setCurrentEditCardKey;
    setCurrentCardDataRef.current = setCurrentCardData;
  });

  useEffect(() => {
    const handleBoardCreated = (event: CustomEvent) => {
      const { nodeKey, config } = event.detail;
      if (config && graphCollaboration) {
        const syncService = new BoardSyncService();
        syncService.start();
        syncServicesRef.current.set(nodeKey, syncService);
      }
    };

    const handleBoardConfigure = (event: CustomEvent) => {
      const { boardNodeKey } = event.detail;
      editor.getEditorState().read(() => {
        const node = $getNodeByKey(boardNodeKey);
        if (!node) return;
        if ($isBoardNode(node)) {
          const config = node.getConfig();
          setCurrentConfigNodeKey(boardNodeKey);
          setCurrentConfig(config);
          setShowConfigDialog(true);
        }
      });
    };

    const handleAddCard = (event: CustomEvent) => {
      const { contentNodeKey } = event.detail;
      editor.update(() => {
        const contentNode = $getNodeByKey(contentNodeKey);
        if (!contentNode) return;
        if ($isColumnContentNode(contentNode)) {
          const newCard = $createCardNode();
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(getKanbanTranslation(editor)('editor:kanban.new_card', 'New card')));
          newCard.append(paragraph);
          contentNode.append(newCard);
          paragraph.select();
        }
      });
    };

    const handleAddColumn = (event: CustomEvent) => {
      const { boardNodeKey } = event.detail;
      editor.update(() => {
        const boardNode = $getNodeByKey(boardNodeKey);
        if (!boardNode) return;
        if ($isBoardNode(boardNode)) {
          const column = $createColumnNode();
          const header = $createColumnHeaderNode();
          const headerParagraph = $createParagraphNode();
          headerParagraph.append($createTextNode(getKanbanTranslation(editor)('editor:kanban.new_column', 'New Column')));
          header.append(headerParagraph);
          const content = $createColumnContentNode();
          column.append(header, content);
          boardNode.append(column);
          headerParagraph.select();
        }
      });
    };

    const handleDeleteColumn = (event: CustomEvent) => {
      const { columnNodeKey } = event.detail;
      editor.update(() => {
        const headerNode = $getNodeByKey(columnNodeKey);
        if (!headerNode) return;
        const columnNode = headerNode.getParent();
        if ($isColumnNode(columnNode)) columnNode.remove();
      });
    };

    const handleDeleteCard = (event: CustomEvent) => {
      const { cardNodeKey } = event.detail;
      editor.update(() => {
        const cardNode = $getNodeByKey(cardNodeKey);
        if (!cardNode) return;
        if ($isCardNode(cardNode)) cardNode.remove();
      });
    };

    const handleEditCard = (event: CustomEvent) => {
      const { cardNodeKey, currentData } = event.detail;
      editor.getEditorState().read(() => {
        const node = $getNodeByKey(cardNodeKey);
        if (!node) return;
        setCurrentEditCardKeyRef.current(cardNodeKey);
        setCurrentCardDataRef.current(currentData);
        setShowCardEditDialogRef.current(true);
      });
    };

    window.addEventListener('board-created', handleBoardCreated as EventListener);
    window.addEventListener('board-configure', handleBoardConfigure as EventListener);
    window.addEventListener('board-add-card', handleAddCard as EventListener);
    window.addEventListener('board-add-column', handleAddColumn as EventListener);
    window.addEventListener('board-delete-column', handleDeleteColumn as EventListener);
    window.addEventListener('board-delete-card', handleDeleteCard as EventListener);
    window.addEventListener('board-edit-card', handleEditCard as EventListener);

    return () => {
      window.removeEventListener('board-created', handleBoardCreated as EventListener);
      window.removeEventListener('board-configure', handleBoardConfigure as EventListener);
      window.removeEventListener('board-add-card', handleAddCard as EventListener);
      window.removeEventListener('board-add-column', handleAddColumn as EventListener);
      window.removeEventListener('board-delete-column', handleDeleteColumn as EventListener);
      window.removeEventListener('board-delete-card', handleDeleteCard as EventListener);
      window.removeEventListener('board-edit-card', handleEditCard as EventListener);
      syncServicesRef.current.forEach((s) => s.stop());
      syncServicesRef.current.clear();
    };
  }, [editor, graphCollaboration]);

  const handleBoardConfigured = (config: BoardConfig) => {
    if (!currentConfigNodeKey) return;
    editor.update(() => {
      const boardNode = $getNodeByKey(currentConfigNodeKey);
      if ($isBoardNode(boardNode)) {
        boardNode.setConfig(config);
        const existingService = syncServicesRef.current.get(currentConfigNodeKey);
        if (existingService) {
          existingService.updateConfig(config);
        } else if (graphCollaboration) {
          const syncService = new BoardSyncService();
          syncService.start();
          syncServicesRef.current.set(currentConfigNodeKey, syncService);
        }
      }
    });
    setShowConfigDialog(false);
    setCurrentConfigNodeKey(null);
    setCurrentConfig(null);
  };

  const handleConfigDialogHide = () => {
    setShowConfigDialog(false);
    setCurrentConfigNodeKey(null);
    setCurrentConfig(null);
  };

  const handleCardEditSave = (data: CardData) => {
    if (!currentEditCardKey) return;
    editor.update(() => {
      const cardNode = $getNodeByKey(currentEditCardKey);
      if ($isCardNode(cardNode)) {
        const parent = cardNode.getParent();
        const index = parent ? parent.getChildren().indexOf(cardNode) : -1;
        const newCard = $createCardNode(cardNode.getId(), data);
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(data.title || t('menu:untitled', 'Untitled')));
        newCard.append(paragraph);
        if (parent && index !== -1) cardNode.replace(newCard);
      }
    });
    setShowCardEditDialog(false);
    setCurrentEditCardKey(null);
  };

  const handleCardEditHide = () => {
    setShowCardEditDialog(false);
    setCurrentEditCardKey(null);
  };

  const editorContainer = document.querySelector('.nimbalyst-editor.active');
  const portalTarget = editorContainer || document.body;

  return (
    <>
      {showConfigDialog &&
        createPortal(
          <BoardConfigDialog
            visible={showConfigDialog}
            onHide={handleConfigDialogHide}
            onSelect={handleBoardConfigured}
            initialConfig={currentConfig || undefined}
          />,
          portalTarget,
        )}
      {showCardEditDialog &&
        createPortal(
          <CardEditDialog
            visible={showCardEditDialog}
            onHide={handleCardEditHide}
            onSave={handleCardEditSave}
            initialData={currentCardData}
          />,
          portalTarget,
        )}
    </>
  );
}
