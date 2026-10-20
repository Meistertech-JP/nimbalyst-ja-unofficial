import i18next from 'i18next';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { buildEditorFromExtensions } from '@lexical/extension';
import { RichTextExtension } from '@lexical/rich-text';
import { $createParagraphNode, $createTextNode, $getNodeByKey, $getRoot, defineExtension, DROP_COMMAND } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { runtimeEnglishTranslation, type RuntimeTranslate } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { KanbanBoardExtension } from '../../../../../runtime/src/editor/extensions/builtin/KanbanBoardExtension';
import { $createBoardNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/KanbanBoardNode';
import { $createColumnNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardColumnNode';
import { $createColumnHeaderNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardColumnHeaderNode';
import { $createColumnContentNode, BoardColumnContentNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardColumnContentNode';
import { $createCardNode, BoardCardNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardCardNode';
import { bindKanbanTranslation, getKanbanTranslation, MOVE_BOARD_CARD_COMMAND } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardCommands';

const locale = i18next.createInstance();
let editor: ReturnType<typeof buildEditorFromExtensions>;
let root: HTMLDivElement;
const releases: (() => void)[] = [];
const translator = (language: string): RuntimeTranslate => {
  const t = locale.getFixedT(language);
  return (key, defaultValue, params) => t(key, { ...params, defaultValue });
};
const paragraph = (text: string) => $createParagraphNode().append($createTextNode(text));
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  editor = buildEditorFromExtensions(defineExtension({ name: 'test/kanban-creation-i18n', dependencies: [RichTextExtension, KanbanBoardExtension] }));
  root = document.createElement('div'); document.body.append(root); editor.setRootElement(root);
});
afterEach(() => { releases.splice(0).forEach(release => release()); editor.dispose(); root.remove(); vi.restoreAllMocks(); });

it('isolates translation bindings between editors and cleans up out of order without restoring stale owners', () => {
  const other = buildEditorFromExtensions(defineExtension({ name: 'test/kanban-other-i18n', dependencies: [RichTextExtension] }));
  try {
    const ja = translator('ja'); const en = translator('en');
    const first = bindKanbanTranslation(editor, ja); const second = bindKanbanTranslation(editor, en);
    releases.push(first, second);
    expect(getKanbanTranslation(editor)).toBe(en); expect(getKanbanTranslation(other)).toBe(runtimeEnglishTranslation);
    first(); expect(getKanbanTranslation(editor)).toBe(en); second(); expect(getKanbanTranslation(editor)).toBe(runtimeEnglishTranslation);
    const third = bindKanbanTranslation(editor, ja); releases.push(third);
    first(); second(); expect(getKanbanTranslation(editor)).toBe(ja);
    const fourth = bindKanbanTranslation(editor, en); releases.push(fourth);
    fourth(); expect(getKanbanTranslation(editor)).toBe(ja); third(); expect(getKanbanTranslation(editor)).toBe(runtimeEnglishTranslation);
  } finally { other.dispose(); }
});

function prepare(text: string) {
  let destinationKey = '';
  editor.update(() => {
    const board = $createBoardNode();
    const source = $createColumnNode().append($createColumnHeaderNode().append(paragraph('Raw source')));
    const sourceContent = $createColumnContentNode();
    const card = $createCardNode('raw-drag-id', { title: 'Raw metadata title', owner: 'Raw owner', priority: 'high', description: 'Raw details' }).append(paragraph(text));
    sourceContent.append(card); source.append(sourceContent);
    const destination = $createColumnNode().append($createColumnHeaderNode().append(paragraph('Raw destination')));
    const destinationContent = $createColumnContentNode(); destinationKey = destinationContent.getKey(); destination.append(destinationContent);
    board.append(source, destination); $getRoot().append(board);
  }, { discrete: true });
  return destinationKey;
}

it.each(['', 'Original card 日本語', 'Moved card'])('preserves real extension drop metadata and translates only the empty text fallback %j', async text => {
  releases.push(bindKanbanTranslation(editor, translator('ja')));
  const destinationKey = prepare(text); const target = editor.getElementByKey(destinationKey)!;
  const event = new Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    target: { value: target },
    dataTransfer: { value: { types: ['application/x-kanban-card'], getData: (type: string) => type === 'application/x-kanban-card' ? 'raw-drag-id' : '' } },
  });
  const moved = vi.fn(); window.addEventListener('kanban-card-moved', moved);
  try {
    await act(async () => { editor.dispatchCommand(DROP_COMMAND, event as DragEvent); });
    const result = editor.getEditorState().read(() => {
      const card = $getNodeByKey<BoardColumnContentNode>(destinationKey)!.getFirstChildOrThrow<BoardCardNode>();
      return { id: card.getId(), text: card.getTextContent(), data: card.getData() };
    });
    expect(result).toEqual({ id: 'raw-drag-id', text: text || '移動したカード', data: { title: 'Raw metadata title', owner: 'Raw owner', priority: 'high', description: 'Raw details' } });
    expect(moved).toHaveBeenCalledTimes(1); expect(moved.mock.calls[0][0].detail).toEqual({ cardId: 'raw-drag-id', fromColumnIndex: 0, toColumnIndex: 1 });
    const snapshot = editor.getEditorState().toJSON(); releases.push(bindKanbanTranslation(editor, translator('en')));
    expect(editor.getEditorState().toJSON()).toEqual(snapshot);
  } finally { window.removeEventListener('kanban-card-moved', moved); }
});

it.each(['ja', 'en'])('preserves the legacy move command shape and %s empty-content fallback', async language => {
  releases.push(bindKanbanTranslation(editor, translator(language)));
  prepare('');
  await act(async () => { editor.dispatchCommand(MOVE_BOARD_CARD_COMMAND, { cardId: 'raw-drag-id', fromColumnIndex: 0, toColumnIndex: 1, position: 0 }); });
  const moved = root.querySelector('[data-card-id="raw-drag-id"] .kanban-card-content');
  expect(moved?.textContent).toBe(language === 'ja' ? '移動したカード' : 'Moved card');
  // Keep the original legacy move route; it appends directly to the column.
  expect(moved?.closest('.kanban-column')).toBe(root.querySelectorAll('.kanban-column')[1]);
});
