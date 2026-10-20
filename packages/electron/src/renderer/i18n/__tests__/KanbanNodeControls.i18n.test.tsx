import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $createParagraphNode, $createTextNode, $getNodeByKey, $getRoot, type LexicalEditor } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { KanbanBoardPlugin } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/KanbanBoardPlugin';
import { BoardCardNode, $createCardNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardCardNode';
import { BoardColumnNode, $createColumnNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardColumnNode';
import { BoardColumnHeaderNode, $createColumnHeaderNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardColumnHeaderNode';
import { BoardColumnContentNode, $createColumnContentNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardColumnContentNode';
import { BoardHeaderNode, $createBoardHeaderNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardHeaderNode';
import { KanbanBoardNode, $createBoardNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/KanbanBoardNode';

const locale = i18next.createInstance();
const editors: Record<string, LexicalEditor> = {};
const keys: Record<string, { board: string; column: string; content: string; card: string }> = {};
const nodes = [KanbanBoardNode, BoardHeaderNode, BoardColumnNode, BoardColumnHeaderNode, BoardColumnContentNode, BoardCardNode];
const data = { title: 'Untitled', owner: 'Raw owner', dueDate: '2026-09-21', priority: 'high' as const, description: 'Raw description 日本語' };
const paragraph = (text: string) => $createParagraphNode().append($createTextNode(text));
function Body({ id, enabled }: { id: string; enabled: boolean }) {
  const [editor] = useLexicalComposerContext(); editors[id] = editor;
  return <><RichTextPlugin contentEditable={<ContentEditable aria-label={`Raw document ${id}`} />} placeholder={null} ErrorBoundary={LexicalErrorBoundary} />{enabled && <KanbanBoardPlugin />}</>;
}
function current(language: string | null = 'ja', id = 'one', enabled = true) {
  const config = {
    namespace: `kanban-controls-${id}`, nodes, onError: (error: Error) => { throw error; },
    editorState: () => {
      const board = $createBoardNode({ entityTypeId: 'raw-type', filter: 'Raw filter', visibleFields: { owner: true, dueDate: true, priority: true, description: true } });
      const header = $createBoardHeaderNode().append(paragraph('Raw Board'));
      const column = $createColumnNode(); const columnHeader = $createColumnHeaderNode().append(paragraph('New Column'));
      const content = $createColumnContentNode(); const card = $createCardNode(`raw-card-${id}`, data).append(paragraph('New card'));
      content.append(card); column.append(columnHeader, content); board.append(header, column); $getRoot().append(board);
      keys[id] = { board: board.getKey(), column: column.getKey(), content: content.getKey(), card: card.getKey() };
    },
  };
  const child = <div data-testid={id}><LexicalComposer initialConfig={config}><Body id={id} enabled={enabled} /></LexicalComposer></div>;
  if (language === null) return child;
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{child}</RuntimeTranslationProvider>;
}
const settle = async () => { await act(async () => {}); };
const root = (id = 'one') => editors[id].getRootElement()!;
const button = (selector: string, id = 'one') => root(id).querySelector<HTMLElement>(selector)!;
beforeEach(async () => { await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('translates existing node controls without replacing nodes, serializing translations or changing raw data', async () => {
  const view = render(current('en')); await settle();
  const editor = editors.one; const original = editor.getEditorState().toJSON();
  const edit = button('.kanban-card-edit'); const add = button('.kanban-add-card-button');
  const addText = add.firstChild;
  expect(edit.title).toBe('Edit card'); expect(add.textContent).toBe('+ Add card');
  const updates = vi.fn(); const remove = editor.registerUpdateListener(updates);
  view.rerender(current()); await settle();
  expect(button('.kanban-card-edit')).toBe(edit); expect(edit.title).toBe('カードを編集'); expect(edit.getAttribute('aria-label')).toBe('カードを編集');
  expect(button('.kanban-card-delete').title).toBe('カードを削除'); expect(button('.kanban-column-delete').title).toBe('列を削除');
  expect(button('.kanban-column-drag-handle').title).toBe('ドラッグして列を並べ替え'); expect(button('.board-settings-button').title).toBe('ボードの設定');
  expect(button('.kanban-add-column-button').textContent).toBe('+ 列を追加'); expect(add.textContent).toBe('+ カードを追加'); expect(add.firstChild).toBe(addText);
  expect(button('.kanban-card-edit .material-symbols-outlined').textContent).toBe('edit');
  expect(button('.kanban-board-title-container').textContent).toBe('Raw Board'); expect(button('.kanban-column-header-content').textContent).toBe('New Column');
  expect(button('.kanban-card-content').textContent).toBe('New card'); expect(button('.kanban-card-description').textContent).toBe(data.description);
  expect(editor.getEditorState().toJSON()).toEqual(original); expect(updates).not.toHaveBeenCalled();
  view.rerender(current('en')); await settle(); expect(edit.title).toBe('Edit card'); expect(add.textContent).toBe('+ Add card');
  expect(editor.getEditorState().toJSON()).toEqual(original); expect(updates).not.toHaveBeenCalled(); remove();
});

it('localizes newly created card and column controls while retaining original event payloads', async () => {
  render(current()); await settle();
  const cardEvent = vi.fn(); const columnEvent = vi.fn();
  window.addEventListener('board-add-card', cardEvent); window.addEventListener('board-add-column', columnEvent);
  try {
    await act(async () => fireEvent.click(button('.kanban-add-card-button')));
    expect(cardEvent).toHaveBeenCalledTimes(1); expect(cardEvent.mock.calls[0][0].detail.contentNodeKey).toBe(keys.one.content);
    expect(root().querySelectorAll('.kanban-card-edit')).toHaveLength(2);
    expect(Array.from(root().querySelectorAll<HTMLElement>('.kanban-card-edit')).map(node => node.title)).toEqual(['カードを編集', 'カードを編集']);
    expect(Array.from(root().querySelectorAll('.kanban-card-content')).map(node => node.textContent)).toEqual(['New card', '新しいカード']);
    await act(async () => fireEvent.click(button('.kanban-add-column-button')));
    expect(columnEvent).toHaveBeenCalledTimes(1); expect(columnEvent.mock.calls[0][0].detail.boardNodeKey).toBe(keys.one.board);
    expect(root().querySelectorAll('.kanban-column')).toHaveLength(2);
    expect(Array.from(root().querySelectorAll('.kanban-column-header-content')).map(node => node.textContent)).toEqual(['New Column', '新しい列']);
    expect(Array.from(root().querySelectorAll<HTMLElement>('.kanban-column-delete')).map(node => node.title)).toEqual(['列を削除', '列を削除']);
    expect(Array.from(root().querySelectorAll('.kanban-add-card-button')).map(node => node.textContent)).toEqual(['+ カードを追加', '+ カードを追加']);
  } finally { window.removeEventListener('board-add-card', cardEvent); window.removeEventListener('board-add-column', columnEvent); }
});

it('retains the real edit dialog portal and updates replacement card controls after Save', async () => {
  const view = render(current('en')); await settle();
  await act(async () => fireEvent.click(button('.kanban-card-edit')));
  const input = screen.getByPlaceholderText('Card title') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '  Raw saved title 日本語  ' } });
  view.rerender(current()); expect(screen.getByPlaceholderText('カードのタイトル')).toBe(input); expect(input.value).toBe('  Raw saved title 日本語  ');
  await act(async () => fireEvent.click(screen.getByRole('button', { name: locale.getFixedT('ja')('common:save') })));
  expect(screen.queryByPlaceholderText('カードのタイトル')).toBeNull(); expect(button('.kanban-card-edit').title).toBe('カードを編集');
  const result = editors.one.getEditorState().read(() => $getNodeByKey<BoardColumnContentNode>(keys.one.content)!.getFirstChildOrThrow<BoardCardNode>());
  expect(result.getId()).toBe('raw-card-one');
  expect(editors.one.getEditorState().read(() => result.getData())).toEqual({ ...data, title: '  Raw saved title 日本語  ' });
  expect(button('.kanban-card-content').textContent).toBe('  Raw saved title 日本語  ');
});

it('keeps node-reconciliation replacements localized after direct card metadata changes', async () => {
  render(current()); await settle(); const old = button('.kanban-card-edit');
  await act(async () => editors.one.update(() => $getNodeByKey<BoardCardNode>(keys.one.card)!.setData({ ...data, description: 'Updated raw description' })));
  expect(button('.kanban-card-edit')).not.toBe(old); expect(button('.kanban-card-edit').title).toBe('カードを編集');
  expect(button('.kanban-card-description').textContent).toBe('Updated raw description');
});

it('preserves the config button event, actual board metadata and localized open dialog', async () => {
  const view = render(current('en')); await settle(); await act(async () => fireEvent.click(button('.board-settings-button')));
  const boxes = screen.getAllByRole('checkbox'); fireEvent.click(boxes[3]); view.rerender(current());
  expect(screen.getAllByRole('checkbox')).toEqual(boxes);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '設定を保存' })));
  expect(editors.one.getEditorState().read(() => $getNodeByKey<KanbanBoardNode>(keys.one.board)!.getConfig())).toEqual({ entityTypeId: 'raw-type', filter: 'Raw filter', visibleFields: { owner: true, dueDate: true, priority: true, description: false } });
  expect(button('.kanban-card-edit').title).toBe('カードを編集'); expect(screen.queryByRole('checkbox')).toBeNull();
});

it.each(['card', 'column'])('keeps the actual %s delete action working through translated controls', async kind => {
  render(current()); await settle();
  const selector = `.kanban-${kind}`; expect(root().querySelectorAll(selector)).toHaveLength(1);
  await act(async () => fireEvent.click(button(`${selector}-delete`)));
  expect(root().querySelectorAll(selector)).toHaveLength(0);
});

it('isolates languages between two editors without rewriting either document', async () => {
  const view = render(<>{current('ja', 'one')}{current('en', 'two')}</>); await settle();
  const original = editors.two.getEditorState().toJSON(); const second = button('.kanban-card-edit', 'two');
  expect(button('.kanban-card-edit', 'one').title).toBe('カードを編集'); expect(second.title).toBe('Edit card');
  view.rerender(<>{current('en', 'one')}{current('ja', 'two')}</>); await settle();
  expect(button('.kanban-card-edit', 'one').title).toBe('Edit card'); expect(second.title).toBe('カードを編集');
  expect(editors.two.getEditorState().toJSON()).toEqual(original);
  expect(within(screen.getByTestId('one')).getByRole('button', { name: 'Edit card' })).toBe(button('.kanban-card-edit', 'one'));
});

it('cleans up presentation listeners and initializes existing nodes when remounted', async () => {
  const view = render(current()); await settle(); view.rerender(current('ja', 'one', false)); await settle();
  await act(async () => editors.one.update(() => {
    $getNodeByKey<BoardColumnContentNode>(keys.one.content)!.append($createCardNode('raw-after-unmount').append(paragraph('Raw later card')));
  }));
  const later = root().querySelector<HTMLElement>('[data-card-id="raw-after-unmount"] .kanban-card-edit')!;
  expect(later.title).toBe('Edit card'); view.rerender(current()); await settle(); expect(later.title).toBe('カードを編集');
});

it('keeps English controls when no translation provider is supplied', async () => {
  render(current(null)); await settle(); expect(button('.kanban-card-edit').title).toBe('Edit card'); expect(button('.kanban-add-column-button').textContent).toBe('+ Add Column');
});
