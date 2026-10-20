import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildEditorFromExtensions } from '@lexical/extension';
import { RichTextExtension } from '@lexical/rich-text';
import { $isTableNode, $isTableRowNode, INSERT_TABLE_COMMAND, TableExtension } from '@lexical/table';
import { $createParagraphNode, $createTextNode, $getRoot, defineExtension } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { InsertTableDialog } from '../../../../../runtime/src/editor/plugins/TablePlugin/TablePlugin';
import InsertLayoutDialog from '../../../../../runtime/src/editor/plugins/LayoutPlugin/InsertLayoutDialog';
import { LayoutExtension } from '../../../../../runtime/src/editor/extensions/builtin/LayoutExtension';
import { $isLayoutContainerNode, INSERT_LAYOUT_COMMAND } from '../../../../../runtime/src/editor/plugins/LayoutPlugin/LayoutPlugin';

const locale = i18next.createInstance();
let editor: ReturnType<typeof buildEditorFromExtensions>;
const close = vi.fn();
function localized(children: React.ReactNode, language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}><div className="nimbalyst-editor">{children}</div></RuntimeTranslationProvider>;
}
const table = (language = 'ja') => localized(<InsertTableDialog activeEditor={editor} onClose={close} />, language);
const layout = (language = 'ja') => localized(<InsertLayoutDialog activeEditor={editor} onClose={close} />, language);
const confirm = () => screen.getByRole('button', { name: locale.getFixedT('ja')('common:pull_request.confirm') }) as HTMLButtonElement;

beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  vi.clearAllMocks();
  editor = buildEditorFromExtensions(defineExtension({ name: 'test/insert-structure-i18n', theme: { tableScrollableWrapper: 'table-scrollable-wrapper' }, dependencies: [RichTextExtension, TableExtension, LayoutExtension] }));
  editor.update(() => {
    const paragraph = $createParagraphNode().append($createTextNode('Raw document text'));
    $getRoot().append(paragraph); paragraph.selectEnd();
  }, { discrete: true });
});
afterEach(() => { cleanup(); editor.dispose(); vi.restoreAllMocks(); });

describe('table and columns-layout insertion dialogs', () => {
  it('keeps default table dimensions, labels and placeholders while inserting a real table', async () => {
    const view = render(table('en'));
    const rows = screen.getByPlaceholderText('# of rows (1-500)') as HTMLInputElement;
    const columns = screen.getByPlaceholderText('# of columns (1-50)') as HTMLInputElement;
    const original = editor.getEditorState().toJSON();
    view.rerender(table());
    expect(screen.getByText('行数')).toBeTruthy();
    expect(screen.getByText(locale.getFixedT('ja')('common:database.columns'))).toBeTruthy();
    expect(screen.getByPlaceholderText('行数（1〜500）')).toBe(rows);
    expect(screen.getByPlaceholderText('列数（1〜50）')).toBe(columns);
    expect(rows.value).toBe('5'); expect(columns.value).toBe('5');
    expect(editor.getEditorState().toJSON()).toEqual(original);
    expect(close).not.toHaveBeenCalled();
    const dispatch = vi.spyOn(editor, 'dispatchCommand');
    await act(async () => fireEvent.click(confirm()));
    expect(dispatch).toHaveBeenCalledWith(INSERT_TABLE_COMMAND, { rows: '5', columns: '5' });
    const dimensions = editor.getEditorState().read(() => {
      const node = $getRoot().getChildren().find($isTableNode);
      return { rows: node?.getChildrenSize(), columns: node?.getChildren().filter($isTableRowNode).map(row => row.getChildrenSize()), text: $getRoot().getTextContent() };
    });
    expect(dimensions.rows).toBe(5);
    expect(dimensions.columns).toEqual([5, 5, 5, 5, 5]);
    expect(dimensions.text).toContain('Raw document text');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['', '5', true], ['0', '5', true], ['-1', '5', true], ['501', '5', true],
    ['5', '', true], ['5', '0', true], ['5', '-1', true], ['5', '51', true],
    ['1', '1', false], ['500', '50', false], ['1.5', '2', false],
  ])('preserves the upstream guard for rows=%s columns=%s across language changes', (rows, columns, disabled) => {
    const view = render(table());
    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    const dispatch = vi.spyOn(editor, 'dispatchCommand');
    fireEvent.change(inputs[0], { target: { value: rows } });
    fireEvent.change(inputs[1], { target: { value: columns } });
    view.rerender(table('en'));
    expect(inputs.map(input => input.value)).toEqual([rows, columns]);
    expect((screen.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement).disabled).toBe(disabled);
    view.rerender(table());
    expect(confirm().disabled).toBe(disabled);
    if (disabled) fireEvent.click(confirm());
    expect(dispatch).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
  });

  it('retains edited dimensions as strings and dispatches once after locale changes', async () => {
    const view = render(table('en'));
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '2' } });
    fireEvent.change(inputs[1], { target: { value: '3' } });
    const dispatch = vi.spyOn(editor, 'dispatchCommand');
    view.rerender(table());
    expect(screen.getAllByRole('spinbutton')).toEqual(inputs);
    await act(async () => fireEvent.click(confirm()));
    expect(dispatch.mock.calls.filter(([command]) => command === INSERT_TABLE_COMMAND)).toEqual([[INSERT_TABLE_COMMAND, { rows: '2', columns: '3' }]]);
    expect(editor.getEditorState().read(() => $getRoot().getChildren().find($isTableNode)?.getChildren().filter($isTableRowNode).map(row => row.getChildrenSize()))).toEqual([3, 3]);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['2 columns (equal width)', '2段（等幅）', '1fr 1fr', 2],
    ['2 columns (25% - 75%)', '2段（25% - 75%）', '1fr 3fr', 2],
    ['3 columns (equal width)', '3段（等幅）', '1fr 1fr 1fr', 3],
    ['3 columns (25% - 50% - 25%)', '3段（25% - 50% - 25%）', '1fr 2fr 1fr', 3],
    ['4 columns (equal width)', '4段（等幅）', '1fr 1fr 1fr 1fr', 4],
  ] as const)('localizes %s while preserving the selected template and real layout nodes', async (english, japanese, template, count) => {
    const view = render(layout('en'));
    const dispatch = vi.spyOn(editor, 'dispatchCommand');
    const original = editor.getEditorState().toJSON();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '2 columns (equal width)' })));
    const menu = screen.getByRole('menu');
    view.rerender(layout());
    expect(screen.getByRole('menu')).toBe(menu);
    fireEvent.click(within(menu).getByText(japanese));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('button', { name: japanese })).toBeTruthy();
    view.rerender(layout('en'));
    expect(screen.getByRole('button', { name: english })).toBeTruthy();
    expect(editor.getEditorState().toJSON()).toEqual(original);
    expect(dispatch).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Insert' })));
    expect(dispatch).toHaveBeenCalledWith(INSERT_LAYOUT_COMMAND, template);
    const structure = editor.getEditorState().read(() => {
      const node = $getRoot().getChildren().find($isLayoutContainerNode);
      return { template: node?.getTemplateColumns(), children: node?.getChildren().map(child => child.getType()), text: $getRoot().getTextContent() };
    });
    expect(structure.template).toBe(template);
    expect(structure.children).toEqual(Array(count).fill('layout-item'));
    expect(structure.text).toContain('Raw document text');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps original English captions for hosts without a translation provider', async () => {
    const view = render(<div className="nimbalyst-editor"><InsertLayoutDialog activeEditor={editor} onClose={close} /></div>);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '2 columns (equal width)' })));
    expect(screen.getByText('4 columns (equal width)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Insert' })).toBeTruthy();
    view.unmount();
    render(<InsertTableDialog activeEditor={editor} onClose={close} />);
    expect(screen.getByText('Rows')).toBeTruthy();
    expect(screen.getByText('Columns')).toBeTruthy();
    expect(screen.getByPlaceholderText('# of rows (1-500)')).toBeTruthy();
    expect(screen.getByPlaceholderText('# of columns (1-50)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy();
  });
});
