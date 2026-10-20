import React, { useEffect } from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { CardEditDialog } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/CardEditDialog';
import { BoardConfigDialog, type BoardConfig } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardConfigDialog';
import { BoardToolbar } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardToolbar';
import { BoardCardNode, type CardData } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardCardNode';
import { BoardColumnNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardColumnNode';
import { BoardColumnHeaderNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardColumnHeaderNode';
import { BoardColumnContentNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardColumnContentNode';
import { BoardHeaderNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardHeaderNode';
import { KanbanBoardNode, $isBoardNode } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/KanbanBoardNode';
import { registerKanbanCommands, INSERT_BOARD_COMMAND, INSERT_CONFIGURED_BOARD_COMMAND } from '../../../../../runtime/src/editor/plugins/KanbanBoardPlugin/BoardCommands';

const locale = i18next.createInstance();
const hide = vi.fn(); const save = vi.fn();
const initialData: CardData = { title: 'Raw original title', owner: 'Raw owner', dueDate: '2026-09-21', priority: 'medium', description: 'Raw description 日本語' };
const initialConfig: BoardConfig = { entityTypeId: 'raw-type-id', entityTypeName: 'Raw type', statusPropertyId: 'status-id', statusPropertyName: 'Raw status', filter: 'status = "Raw status"', visibleFields: { owner: true, dueDate: false, priority: true, description: false } };
const translated = (key: string, language = 'ja') => locale.getFixedT(language)(key);
function localized(child: React.ReactNode, language: string | null = 'ja') {
  if (language === null) return child;
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{child}</RuntimeTranslationProvider>;
}
const card = (language: string | null = 'ja', visible = true, data = initialData) => localized(<CardEditDialog visible={visible} onHide={hide} onSave={save} initialData={data} />, language);
const config = (language: string | null = 'ja', visible = true, value: BoardConfig | undefined = initialConfig) => localized(<BoardConfigDialog visible={visible} onHide={hide} onSelect={save} initialConfig={value} />, language);
const cardSave = (language = 'ja') => screen.getByRole('button', { name: translated('common:save', language) });
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  vi.clearAllMocks();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Kanban card and configuration dialog localization', () => {
  it.each(['low', 'medium', 'high'] as const)('keeps all raw drafts and %s priority token across locale switches', priority => {
    const view = render(card('en'));
    const title = screen.getByPlaceholderText('Card title') as HTMLInputElement;
    const owner = screen.getByPlaceholderText('Assigned to') as HTMLInputElement;
    const description = screen.getByPlaceholderText('Add a description...') as HTMLTextAreaElement;
    const date = document.querySelector('input[type=date]') as HTMLInputElement;
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(title, { target: { value: '  New raw title  ' } });
    fireEvent.change(owner, { target: { value: '  Raw owner 日本語  ' } });
    fireEvent.change(description, { target: { value: 'Raw description\n  retained spaces ' } });
    fireEvent.change(date, { target: { value: '2026-10-01' } });
    fireEvent.change(select, { target: { value: priority } });
    view.rerender(card());
    expect(screen.getByText('カードを編集')).toBeTruthy();
    expect(screen.getByPlaceholderText('カードのタイトル')).toBe(title);
    expect(screen.getByPlaceholderText('担当者')).toBe(owner);
    expect(screen.getByPlaceholderText('説明を追加…')).toBe(description);
    expect(Array.from(select.options).map(option => [option.value, option.text])).toEqual(['low', 'medium', 'high'].map(value => [value, translated(`tracker:kanban.priority_${value}`)]));
    expect(select.value).toBe(priority); expect(save).not.toHaveBeenCalled(); expect(hide).not.toHaveBeenCalled();
    view.rerender(card('en')); view.rerender(card());
    fireEvent.click(cardSave());
    expect(save).toHaveBeenCalledExactlyOnceWith({ title: '  New raw title  ', owner: '  Raw owner 日本語  ', description: 'Raw description\n  retained spaces ', dueDate: '2026-10-01', priority });
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it.each(['ja', 'en'])('generates only an empty title in %s and preserves optional-value defaults', language => {
    render(card(language, true, { title: '' })); fireEvent.click(cardSave(language));
    expect(save).toHaveBeenCalledExactlyOnceWith({ title: translated('menu:untitled', language), owner: undefined, dueDate: undefined, priority: 'medium', description: undefined });
  });

  it.each(['Untitled', '   '])('does not reinterpret an existing nonempty title %j', title => {
    render(card('ja', true, { title })); fireEvent.click(cardSave());
    expect(save.mock.calls[0][0].title).toBe(title);
  });

  it('retains overlay-save, inner-click and Escape-cancel behavior', () => {
    const view = render(card());
    fireEvent.click(document.querySelector('.card-edit-dialog')!); expect(save).not.toHaveBeenCalled();
    fireEvent.click(document.querySelector('.card-edit-overlay')!);
    expect(save).toHaveBeenCalledExactlyOnceWith(initialData); expect(hide).toHaveBeenCalledTimes(1);
    save.mockClear(); hide.mockClear();
    const escaped = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    fireEvent(document, escaped); expect(escaped.defaultPrevented).toBe(true);
    expect(hide).toHaveBeenCalledTimes(1); expect(save).not.toHaveBeenCalled();
    view.rerender(card('ja', false)); hide.mockClear();
    fireEvent.keyDown(document, { key: 'Escape' }); expect(hide).not.toHaveBeenCalled(); expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('resets from fresh initial data on reopen without conditional hooks', () => {
    const view = render(card('en', false)); view.rerender(card('en'));
    fireEvent.change(screen.getByPlaceholderText('Card title'), { target: { value: 'Unsaved raw draft' } });
    view.rerender(card('ja', false));
    const next: CardData = { title: 'Raw reopened title', priority: 'high' };
    view.rerender(card('ja', true, next));
    expect((screen.getByPlaceholderText('カードのタイトル') as HTMLInputElement).value).toBe(next.title);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('high');
    expect(save).not.toHaveBeenCalled();
  });

  it.each(['owner', 'dueDate', 'priority', 'description'] as const)('keeps toggled %s and raw configuration across locales', field => {
    const fields = ['owner', 'dueDate', 'priority', 'description'];
    const view = render(config('en')); const inputs = screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(inputs[fields.indexOf(field)]);
    view.rerender(config());
    expect(screen.getByText('ボードの設定')).toBeTruthy(); expect(screen.getByText('カードに表示する項目:')).toBeTruthy();
    for (const key of ['show_owner', 'show_due_dates', 'show_priority', 'show_description']) expect(screen.getByText(translated(`editor:kanban.${key}`))).toBeTruthy();
    expect(screen.getAllByRole('checkbox')).toEqual(inputs); expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '設定を保存' }));
    expect(save).toHaveBeenCalledExactlyOnceWith({ ...initialConfig, visibleFields: { ...initialConfig.visibleFields, [field]: !initialConfig.visibleFields![field] } });
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it('retains configuration cancel/reopen/defaults and does not add Escape or overlay submission', () => {
    const view = render(config());
    fireEvent.click(document.querySelector('.board-config-overlay')!); fireEvent.keyDown(document, { key: 'Escape' });
    expect(save).not.toHaveBeenCalled(); expect(hide).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: translated('common:cancel') }));
    expect(hide).toHaveBeenCalledTimes(1); expect(save).not.toHaveBeenCalled();
    view.rerender(config('en', false)); view.rerender(config('en', true, {}));
    expect((screen.getAllByRole('checkbox') as HTMLInputElement[]).map(input => input.checked)).toEqual([true, true, true, false]);
    fireEvent.click(screen.getByRole('button', { name: 'Save Configuration' }));
    expect(save).toHaveBeenCalledExactlyOnceWith({ visibleFields: { owner: true, dueDate: true, priority: true, description: false } });
  });

  it('provides original English labels without a translation provider', () => {
    const view = render(card(null));
    expect(screen.getByText('Edit Card')).toBeTruthy(); expect(screen.getByPlaceholderText('Card title')).toBeTruthy();
    view.unmount(); render(config(null)); expect(screen.getByText('Board Configuration')).toBeTruthy(); expect(screen.getByText('Show card owner')).toBeTruthy();
  });
});

let editor: LexicalEditor;
const toolbarConfig = {
  namespace: 'kanban-toolbar-i18n', nodes: [KanbanBoardNode, BoardHeaderNode, BoardColumnNode, BoardColumnHeaderNode, BoardColumnContentNode, BoardCardNode],
  onError: (error: Error) => { throw error; },
  editorState: () => { const paragraph = $createParagraphNode().append($createTextNode('Raw preceding text')); $getRoot().append(paragraph); paragraph.selectEnd(); },
};
function ToolbarHarness() {
  [editor] = useLexicalComposerContext();
  useEffect(() => registerKanbanCommands(editor), [editor]);
  return <BoardToolbar />;
}
const toolbar = (language = 'ja') => localized(<LexicalComposer initialConfig={toolbarConfig}><ToolbarHarness /></LexicalComposer>, language);
it('inserts an actual basic board through the original command after a locale switch', async () => {
  const view = render(toolbar('en')); await act(async () => {});
  const button = screen.getByRole('button', { name: 'Insert Basic Board' }); const dispatch = vi.spyOn(editor, 'dispatchCommand');
  view.rerender(toolbar()); expect(screen.getByRole('button', { name: '基本ボードを挿入' })).toBe(button);
  expect(dispatch).not.toHaveBeenCalled(); await act(async () => fireEvent.click(button));
  expect(dispatch).toHaveBeenCalledExactlyOnceWith(INSERT_BOARD_COMMAND, undefined);
  const board = editor.getEditorState().read(() => $getRoot().getChildren().find($isBoardNode)?.exportJSON());
  expect(board?.type).toBe('kanban-board');
  expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toContain('Raw preceding text');
  const text = editor.getEditorState().read(() => $getRoot().getChildren().find($isBoardNode)!.getTextContent());
  for (const label of ['カンバンボード', '未着手', '進行中', '完了', 'サンプルタスク 1', 'サンプルタスク 2']) expect(text).toContain(label);
  const saved = editor.getEditorState().toJSON(); view.rerender(toolbar('en')); await act(async () => {});
  expect(editor.getEditorState().toJSON()).toEqual(saved);
});

it('retains the open toolbar config and inserts an actual configured board with unchanged payload', async () => {
  const view = render(toolbar('en')); await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'Insert Entity Board' }));
  const inputs = screen.getAllByRole('checkbox') as HTMLInputElement[]; fireEvent.click(inputs[3]);
  const dispatch = vi.spyOn(editor, 'dispatchCommand'); view.rerender(toolbar());
  expect(screen.getAllByRole('checkbox')).toEqual(inputs); expect(inputs[3].checked).toBe(true); expect(dispatch).not.toHaveBeenCalled();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '設定を保存' })));
  const expected = { visibleFields: { owner: true, dueDate: true, priority: true, description: true } };
  expect(dispatch).toHaveBeenCalledExactlyOnceWith(INSERT_CONFIGURED_BOARD_COMMAND, { config: expected });
  expect(editor.getEditorState().read(() => $getRoot().getChildren().find($isBoardNode)?.getConfig())).toEqual(expected);
  expect(editor.getEditorState().read(() => $getRoot().getChildren().find($isBoardNode)?.getTextContent())).toBe('カンバンボード');
  expect(screen.queryByRole('checkbox')).toBeNull();
});
