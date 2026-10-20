import React, { useState } from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { $createTableNodeWithDimensions, $createTableSelection, $isTableNode, TableNode, TableRowNode, TableCellNode, TableCellHeaderStates } from '@lexical/table';
import { $createTextNode, $getRoot, $setSelection, type LexicalEditor, type ParagraphNode, type TextNode } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import TableActionMenuPlugin from '../../../../../runtime/src/editor/plugins/TableActionMenuPlugin';

const locale = i18next.createInstance();
let editor: LexicalEditor;
const rangeRectDescriptor = Object.getOwnPropertyDescriptor(Range.prototype, 'getBoundingClientRect');
const config = {
  namespace: 'table-actions-i18n', nodes: [TableNode, TableRowNode, TableCellNode], onError: (error: Error) => { throw error; },
  editorState: () => {
    const table = $createTableNodeWithDimensions(3, 3, false);
    table.getChildren<TableRowNode>().forEach((row, rowIndex) => row.getChildren<TableCellNode>().forEach((cell, columnIndex) => {
      cell.getFirstChildOrThrow<ParagraphNode>().append($createTextNode(`Raw ${rowIndex},${columnIndex}`));
    }));
    $getRoot().append(table);
  },
};
function TableEditor({ cellMerge }: { cellMerge: boolean }) {
  [editor] = useLexicalComposerContext();
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  return <div className="nimbalyst-editor" ref={setAnchor}>
    <RichTextPlugin contentEditable={<ContentEditable aria-label="Raw editor" />} ErrorBoundary={LexicalErrorBoundary} />
    <TablePlugin hasCellMerge hasCellBackgroundColor hasHorizontalScroll={false} />
    {anchor && <TableActionMenuPlugin anchorElem={anchor} cellMerge={cellMerge} />}
  </div>;
}
function current(language: string | null = 'ja', cellMerge = true) {
  if (language === null) return <LexicalComposer initialConfig={config}><TableEditor cellMerge={cellMerge} /></LexicalComposer>;
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
    <LexicalComposer initialConfig={config}><TableEditor cellMerge={cellMerge} /></LexicalComposer>
  </RuntimeTranslationProvider>;
}
function $table() { const table = $getRoot().getChildren().find($isTableNode); if (!table) throw new Error('Missing test table'); return table; }
function $cell(row = 0, column = 0) { return $table().getChildAtIndex<TableRowNode>(row)!.getChildAtIndex<TableCellNode>(column)!; }
async function selectCells(count = 1, collapsed = false) {
  // Seed the normal caret route before extending to a table selection, as the UI does.
  await act(async () => editor.update(() => { const text = $cell().getFirstDescendant<TextNode>()!; text.select(0, collapsed ? 0 : text.getTextContentSize()); }));
  await waitFor(() => expect(document.querySelector('.table-cell-action-button')).not.toBeNull());
  if (count > 1) {
    await act(async () => editor.update(() => {
      const selection = $createTableSelection(); selection.set($table().getKey(), $cell().getKey(), $cell(count - 1, count - 1).getKey()); $setSelection(selection);
    }));
  }
}
async function openMenu(count = 1, collapsed = false) {
  await selectCells(count, collapsed);
  await act(async () => fireEvent.click(document.querySelector('.table-cell-action-button')!));
  return document.querySelector('.table-cell-action-menu-dropdown') as HTMLElement;
}
const matrix = () => editor.getEditorState().read(() => $table().getChildren<TableRowNode>().map(row => row.getChildren<TableCellNode>().map(cell => cell.getTextContent())));
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  vi.spyOn(HTMLButtonElement.prototype, 'focus').mockImplementation(() => {});
  vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 400, 200));
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect(10, 10, 100, 20) });
});
afterEach(() => {
  cleanup(); window.getSelection()?.removeAllRanges(); vi.restoreAllMocks();
  if (rangeRectDescriptor) Object.defineProperty(Range.prototype, 'getBoundingClientRect', rangeRectDescriptor);
  else Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
});

describe('table cell actions localization with real table operations', () => {
  it.each([1, 2])('retains English singular/plural defaults for %i selected rows/columns without a provider', async count => {
    render(current(null)); const menu = await openMenu(count);
    for (const direction of ['above', 'below', 'left', 'right']) {
      const noun = direction === 'above' || direction === 'below' ? 'row' : 'column';
      expect(within(menu).getByRole('button', { name: `Insert ${count === 1 ? noun : `${count} ${noun}s`} ${direction}` })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Table cell actions' })).toBeTruthy();
  });
  it.each([
    ['above', '上', 1], ['above', '上', 2], ['below', '下', 1], ['below', '下', 2],
    ['left', '左', 1], ['left', '左', 2], ['right', '右', 1], ['right', '右', 2],
  ] as const)('retains %s (%s) insertion for %i selected rows/columns and translates the count', async (direction, position, count) => {
    const view = render(current('en')); const menu = await openMenu(count);
    const isRow = direction === 'above' || direction === 'below';
    const english = `Insert ${count === 1 ? (isRow ? 'row' : 'column') : `${count} ${isRow ? 'rows' : 'columns'}`} ${direction}`;
    expect(within(menu).getByRole('button', { name: english })).toBeTruthy();
    const original = editor.getEditorState().toJSON();
    view.rerender(current());
    expect(document.querySelector('.table-cell-action-menu-dropdown')).toBe(menu);
    expect(editor.getEditorState().toJSON()).toEqual(original);
    expect(screen.getByTitle('表のセル操作').getAttribute('aria-label')).toBe('表のセル操作');
    await act(async () => fireEvent.click(within(menu).getByRole('button', { name: `${position}に${count}${isRow ? '行' : '列'}を挿入` })));
    const result = matrix();
    expect(result.length).toBe(isRow ? 3 + count : 3);
    expect(result.every(row => row.length === (isRow ? 3 : 3 + count))).toBe(true);
    expect(result[direction === 'above' ? count : 0][direction === 'left' ? count : 0]).toBe('Raw 0,0');
    expect(document.querySelector('.table-cell-action-menu-dropdown')).toBeNull();
  });

  it.each([['列を削除', 3, 2], ['行を削除', 2, 3], ['表を削除', 0, 0]] as const)('preserves %s deletion and closes the menu', async (label, rows, columns) => {
    render(current()); const menu = await openMenu();
    await act(async () => fireEvent.click(within(menu).getByRole('button', { name: label })));
    if (rows === 0) expect(editor.getEditorState().read(() => $getRoot().getChildren().some($isTableNode))).toBe(false);
    else { expect(matrix().length).toBe(rows); expect(matrix().every(row => row.length === columns)).toBe(true); }
    expect(document.querySelector('.table-cell-action-menu-dropdown')).toBeNull();
  });

  it.each([['行', TableCellHeaderStates.ROW], ['列', TableCellHeaderStates.COLUMN]] as const)('retains %s header toggle and both translated action states', async (label, mask) => {
    const view = render(current()); let menu = await openMenu();
    await act(async () => fireEvent.click(within(menu).getByRole('button', { name: `${label}見出しを追加` })));
    const styles = () => editor.getEditorState().read(() => {
      const cells = label === '行' ? $table().getFirstChild<TableRowNode>()!.getChildren<TableCellNode>() : $table().getChildren<TableRowNode>().map(row => row.getFirstChild<TableCellNode>()!);
      return cells.map(cell => cell.getHeaderStyles() & mask);
    });
    expect(styles()).toEqual([mask, mask, mask]);
    menu = await openMenu(); view.rerender(current('en'));
    const english = `Remove ${label === '行' ? 'row' : 'column'} header`;
    expect(within(menu).getByRole('button', { name: english })).toBeTruthy();
    view.rerender(current());
    await act(async () => fireEvent.click(within(menu).getByRole('button', { name: `${label}見出しを解除` })));
    expect(styles()).toEqual([0, 0, 0]);
  });

  it.each(['striping', 'rows', 'columns'] as const)('retains %s toggling and state through language switches', async kind => {
    const labels = { striping: '行の交互色を切り替え', rows: '先頭行の固定を切り替え', columns: '先頭列の固定を切り替え' };
    const value = () => editor.getEditorState().read(() => kind === 'striping' ? $table().getRowStriping() : kind === 'rows' ? $table().getFrozenRows() : $table().getFrozenColumns());
    const view = render(current()); const first = await openMenu();
    await act(async () => fireEvent.click(within(first).getByRole('button', { name: labels[kind] })));
    expect(value()).toBe(kind === 'striping' ? true : 1);
    const menu = await openMenu(); const original = editor.getEditorState().toJSON();
    view.rerender(current('en')); view.rerender(current());
    expect(editor.getEditorState().toJSON()).toEqual(original);
    await act(async () => fireEvent.click(within(menu).getByRole('button', { name: labels[kind] })));
    expect(value()).toBe(kind === 'striping' ? false : 0);
  });

  it.each([['top', '上揃え'], ['middle', '中央揃え'], ['bottom', '下揃え']] as const)('retains %s alignment for all selected cells', async (value, label) => {
    const view = render(current('en')); await openMenu(2);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Formatting options for vertical alignment' })));
    const menu = screen.getByRole('menu'); view.rerender(current());
    expect(screen.getByRole('menu')).toBe(menu);
    await act(async () => fireEvent.click(within(menu).getByText(label)));
    expect(editor.getEditorState().read(() => [$cell(0, 0), $cell(0, 1), $cell(1, 0), $cell(1, 1)].map(cell => cell.getVerticalAlign()))).toEqual([value, value, value, value]);
    expect(editor.getEditorState().read(() => $cell(2, 2).getVerticalAlign())).toBeUndefined();
  });

  it('updates the open background-color modal title without losing its draft or selected-cell writes', async () => {
    // A browser canvas ignores an invalid empty fillStyle and retains default black.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      get fillStyle() { return '#000000'; },
      set fillStyle(value: string) { expect(value).toBe(''); },
    } as CanvasRenderingContext2D);
    const view = render(current('en')); const menu = await openMenu(2);
    await act(async () => fireEvent.click(within(menu).getByRole('button', { name: 'Background color' })));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Cell background color')).toBeTruthy();
    const input = within(modal).getByRole('textbox') as HTMLInputElement;
    await act(async () => fireEvent.change(input, { target: { value: '#123456' } }));
    view.rerender(current());
    expect(screen.getByRole('dialog')).toBe(modal); expect(within(modal).getByText('セルの背景色')).toBeTruthy();
    expect(within(modal).getByRole('textbox')).toBe(input); expect(input.value).toBe('#123456');
    expect(editor.getEditorState().read(() => [$cell(0, 0), $cell(0, 1), $cell(1, 0), $cell(1, 1)].map(cell => cell.getBackgroundColor()))).toEqual(Array(4).fill('#123456'));
    expect(editor.getEditorState().read(() => $cell(2, 2).getBackgroundColor())).toBeNull();
    fireEvent.click(within(modal).getByRole('button', { name: 'モーダルを閉じる' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('preserves merge/unmerge operations, spans and content after locale switches', async () => {
    const view = render(current('en')); const menu = await openMenu(2);
    expect(within(menu).getByText('Merge cells')).toBeTruthy(); view.rerender(current());
    await act(async () => fireEvent.click(within(menu).getByRole('button', { name: 'セルを結合' })));
    expect(editor.getEditorState().read(() => [$cell().getRowSpan(), $cell().getColSpan()])).toEqual([2, 2]);
    expect(editor.getEditorState().read(() => $cell().getTextContent())).toContain('Raw 1,1');
    const second = await openMenu(1, true); view.rerender(current('en'));
    expect(within(second).getByText('Unmerge cells')).toBeTruthy(); view.rerender(current());
    await act(async () => fireEvent.click(within(second).getByRole('button', { name: 'セルの結合を解除' })));
    expect(matrix().every(row => row.length === 3)).toBe(true);
    expect(editor.getEditorState().read(() => [$cell().getRowSpan(), $cell().getColSpan()])).toEqual([1, 1]);
  });

  it('preserves cell-merge and read-only visibility guards', async () => {
    const view = render(current('ja', false)); const menu = await openMenu(2);
    expect(within(menu).queryByText('セルを結合')).toBeNull();
    expect(within(menu).queryByText('セルの結合を解除')).toBeNull();
    await act(async () => editor.setEditable(false));
    expect(document.querySelector('.table-cell-action-button')).toBeNull();
    view.rerender(current('en', false));
    expect(document.querySelector('.table-cell-action-button')).toBeNull();
  });
});
