import React, { useState } from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { $createHeadingNode } from '@lexical/rich-text';
import { $createCodeNode } from '@lexical/code';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/extension';
import { $createParagraphNode, $createTextNode, $getRoot, CAN_REDO_COMMAND, CAN_UNDO_COMMAND, REDO_COMMAND, UNDO_COMMAND, type LexicalEditor, type TextFormatType } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { ToolbarContext } from '../../../../../runtime/src/editor/context/ToolbarContext';
import { RuntimeSettingsProvider } from '../../../../../runtime/src/editor/context/RuntimeSettingsContext';
import ToolbarPlugin from '../../../../../runtime/src/editor/plugins/ToolbarPlugin';
import EditorNodes from '../../../../../runtime/src/editor/nodes/EditorNodes';
import { getEditorTransformers } from '../../../../../runtime/src/editor/markdown';
import { SHORTCUTS } from '../../../../../runtime/src/editor/plugins/ShortcutsPlugin/shortcuts';
import { INSERT_PAGE_BREAK } from '../../../../../runtime/src/editor/plugins/PageBreakPlugin';
import { INSERT_COLLAPSIBLE_COMMAND } from '../../../../../runtime/src/editor/plugins/CollapsiblePlugin';

const locale = i18next.createInstance();
let editor: LexicalEditor;
const setIsLinkEditMode = vi.fn();
const config = {
  namespace: 'standard-toolbar-i18n', onError: (error: Error) => { throw error; },
  nodes: [...new Set([...EditorNodes, LinkNode, AutoLinkNode, ...getEditorTransformers().flatMap(transformer => 'dependencies' in transformer ? transformer.dependencies : [])])],
  editorState: () => { $getRoot().append($createParagraphNode().append($createTextNode('Raw selected text'))); },
};
function Toolbar({markdownOnly}: {markdownOnly: boolean}) {
  [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  return <ToolbarPlugin editor={editor} activeEditor={activeEditor} setActiveEditor={setActiveEditor} setIsLinkEditMode={setIsLinkEditMode} markdownOnly={markdownOnly} />;
}
function localized(language = 'ja', markdownOnly = false) {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
    <RuntimeSettingsProvider><ToolbarContext><LexicalComposer initialConfig={config}>
      <div className="nimbalyst-editor"><Toolbar markdownOnly={markdownOnly} />
        <RichTextPlugin contentEditable={<ContentEditable aria-label="Raw editor" />} ErrorBoundary={LexicalErrorBoundary} />
      </div><ListPlugin /><CheckListPlugin /><LinkPlugin />
    </LexicalComposer></ToolbarContext></RuntimeSettingsProvider>
  </RuntimeTranslationProvider>;
}
async function selectText() { await act(async () => editor.update(() => { const text = $getRoot().getAllTextNodes()[0]; text.select(0, text.getTextContentSize()); })); }
async function open(name: string) { await act(async () => fireEvent.click(screen.getByRole('button', { name }))); }
const t = (key: string, language = 'ja') => locale.getFixedT(language)(key);
const rangeRectDescriptor = Object.getOwnPropertyDescriptor(Range.prototype, 'getBoundingClientRect');
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  vi.clearAllMocks();
  // Isolate jsdom button-focus selection loss; command handlers and Lexical selection remain real.
  vi.spyOn(HTMLButtonElement.prototype, 'focus').mockImplementation(() => {});
  vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
  // jsdom has no layout API for native ranges; Lexical uses it when committing selection.
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true, value: () => new DOMRect(0, 0, 100, 20),
  });
});
afterEach(() => {
  cleanup(); window.getSelection()?.removeAllRanges(); vi.restoreAllMocks();
  if (rangeRectDescriptor) Object.defineProperty(Range.prototype, 'getBoundingClientRect', rangeRectDescriptor);
  else Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
});

describe('standard toolbar localization without changing editor actions', () => {
  it.each([
    ['bold', 'Bold', '太字', SHORTCUTS.BOLD], ['italic', 'Italic', '斜体', SHORTCUTS.ITALIC],
    ['underline', 'Underline', '下線', SHORTCUTS.UNDERLINE], ['code', 'Insert code block', 'コードブロックを挿入', SHORTCUTS.INSERT_CODE_BLOCK],
  ])('preserves the %s format command, selected text and shortcut', async (format, english, japanese, shortcut) => {
    const view = render(localized('en')); await selectText();
    const button = screen.getByTitle(`${english} (${shortcut})`);
    view.rerender(localized());
    expect(screen.getByTitle(`${japanese} (${shortcut})`)).toBe(button);
    expect(button.getAttribute('aria-label')).not.toMatch(/Format text|Shortcut:/);
    await act(async () => fireEvent.click(button));
    expect(editor.getEditorState().read(() => $getRoot().getAllTextNodes()[0].hasFormat(format as TextFormatType))).toBe(true);
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('Raw selected text');
  });

  it.each(['lowercase', 'uppercase', 'capitalize', 'strikethrough', 'subscript', 'superscript', 'highlight'])('forwards localized %s title/ARIA and keeps the format payload', async format => {
    const view = render(localized('en')); await selectText();
    await open('Formatting options for additional text styles');
    const menu = screen.getByRole('menu');
    view.rerender(localized());
    expect(screen.getByRole('menu')).toBe(menu);
    const label = format === 'highlight' ? 'ハイライト' : t(`dialogs:keyboard_shortcuts.labels.${format}`);
    const button = within(menu).getByTitle(label);
    expect(button.getAttribute('aria-label')).toMatch(/テキスト|単語/);
    await act(async () => fireEvent.click(button));
    expect(editor.getEditorState().read(() => $getRoot().getAllTextNodes()[0].hasFormat(format as TextFormatType))).toBe(true);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it.each(['left', 'center', 'right', 'justify', 'start', 'end'])('keeps %s alignment and translates the current-value display', async alignment => {
    const view = render(localized('en')); await selectText();
    await open('Formatting options for text alignment');
    view.rerender(localized());
    const labels: Record<string, string> = { left: '左揃え', center: '中央揃え', right: '右揃え', justify: '両端揃え', start: '行頭揃え', end: '行末揃え' };
    await act(async () => fireEvent.click(within(screen.getByRole('menu')).getByText(labels[alignment])));
    expect(editor.getEditorState().read(() => $getRoot().getFirstChild()!.exportJSON())).toMatchObject({ format: alignment });
    expect(screen.getByRole('button', { name: 'テキストの配置を設定' }).textContent).toContain(labels[alignment]);
  });

  it.each([1, 2, 3, 4, 5, 6])('localizes the selected heading level %i without changing its tag', async level => {
    const view = render(localized('en'));
    await act(async () => editor.update(() => {
      const text = $createTextNode('Raw heading');
      $getRoot().clear().append($createHeadingNode(`h${level}` as 'h1').append(text)); text.select(0, 3);
    }));
    expect(screen.getByRole('button', { name: 'Formatting options for text style' }).textContent).toContain(`Heading ${level}`);
    view.rerender(localized());
    expect(screen.getByRole('button', { name: 'テキストスタイルの書式設定' }).textContent).toContain(`見出し${level}`);
    expect(editor.getEditorState().read(() => $getRoot().getFirstChild()!.exportJSON())).toMatchObject({ tag: `h${level}` });
  });

  it('retains font names, in-progress size input, limits and font-style writes', async () => {
    const view = render(localized('en')); await selectText();
    await open('Formatting options for font family');
    view.rerender(localized());
    await act(async () => fireEvent.click(screen.getByText('Courier New')));
    expect(editor.getEditorState().read(() => $getRoot().getAllTextNodes()[0].getStyle())).toContain('font-family: Courier New');
    await selectText();
    const input = screen.getByTitle('フォントサイズ') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '999' } });
    view.rerender(localized('en'));
    expect(screen.getByTitle('Font size')).toBe(input);
    expect(input.value).toBe('999');
    await act(async () => fireEvent.keyDown(input, { key: 'Enter' }));
    expect(input.value).toBe('72');
    expect(editor.getEditorState().read(() => $getRoot().getAllTextNodes()[0].getStyle())).toContain('font-size: 72px');
    view.rerender(localized());
    expect((screen.getByRole('button', { name: t('dialogs:keyboard_shortcuts.labels.increase_font') }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: t('dialogs:keyboard_shortcuts.labels.decrease_font') })));
    expect(input.value).toBe('60');
  });

  it.each([['文字色', '文字色を設定', 'color'], ['背景色', '背景色を設定', 'background-color']])('forwards the %s tooltip and preserves open color input and CSS value', async (label, aria, property) => {
    const view = render(localized()); await selectText();
    expect(screen.getByTitle(label)).toBe(screen.getByRole('button', { name: aria }));
    await open(aria);
    await selectText();
    const input = within(screen.getByRole('menu')).getByRole('textbox') as HTMLInputElement;
    await act(async () => fireEvent.change(input, { target: { value: '#123456' } }));
    view.rerender(localized('en'));
    expect(within(screen.getByRole('menu')).getByRole('textbox')).toBe(input);
    expect(input.value).toBe('#123456');
    expect(editor.getEditorState().read(() => $getRoot().getAllTextNodes()[0].getStyle())).toContain(`${property}: #123456`);
  });

  it.each([
    ['Image', 'Insert Image', '画像を挿入'], ['Table', 'Insert Table', '表を挿入'], ['Columns Layout', 'Insert Columns Layout', '段組みレイアウトを挿入'],
  ])('updates an open %s dialog title without recreating its controls', async (label, title, japanese) => {
    const view = render(localized('en')); await selectText();
    await open('Insert specialized editor node');
    await act(async () => fireEvent.click(screen.getByText(label)));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(title)).toBeTruthy();
    const control = dialog.querySelector('input, .dialog-dropdown, .DialogButtonsList button');
    if (label === 'Table') fireEvent.change(dialog.querySelector('input')!, { target: { value: '12' } });
    view.rerender(localized());
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(within(dialog).getByText(japanese)).toBeTruthy();
    if (control) expect(dialog.contains(control)).toBe(true);
    if (label === 'Table') expect((dialog.querySelector('input') as HTMLInputElement).value).toBe('12');
    fireEvent.click(within(dialog).getByRole('button', { name: 'モーダルを閉じる' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('retains insertion and history command identities, guards and raw programming-language options', async () => {
    const view = render(localized()); await selectText();
    const dispatch = vi.spyOn(editor, 'dispatchCommand');
    for (const [label, command] of [['水平線', INSERT_HORIZONTAL_RULE_COMMAND], ['改ページ', INSERT_PAGE_BREAK], ['折りたたみコンテナ', INSERT_COLLAPSIBLE_COMMAND]] as const) {
      await open('エディター要素を挿入');
      fireEvent.click(screen.getByText(label));
      expect(dispatch).toHaveBeenCalledWith(command, undefined);
    }
    expect((screen.getByRole('button', { name: t('dialogs:keyboard_shortcuts.labels.undo') }) as HTMLButtonElement).disabled).toBe(true);
    act(() => { editor.dispatchCommand(CAN_UNDO_COMMAND, true); editor.dispatchCommand(CAN_REDO_COMMAND, true); });
    fireEvent.click(screen.getByRole('button', { name: t('dialogs:keyboard_shortcuts.labels.undo') }));
    fireEvent.click(screen.getByRole('button', { name: t('dialogs:keyboard_shortcuts.labels.redo') }));
    expect(dispatch).toHaveBeenCalledWith(UNDO_COMMAND, undefined);
    expect(dispatch).toHaveBeenCalledWith(REDO_COMMAND, undefined);
    await act(async () => editor.update(() => { const node = $createCodeNode('js').append($createTextNode('rawCode()')); $getRoot().clear().append(node); node.selectStart(); }));
    await open('コードの言語を選択');
    expect(screen.getAllByText('JavaScript').length).toBeGreaterThan(0);
    await act(async () => fireEvent.click(screen.getByText('Python')));
    expect(editor.getEditorState().read(() => $getRoot().getFirstChild()!.exportJSON())).toMatchObject({ language: 'python' });
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('rawCode()');
    act(() => editor.setEditable(false));
    expect((screen.getByRole('button', { name: 'コードの言語を選択' }) as HTMLButtonElement).disabled).toBe(true);
    view.rerender(localized('en'));
    expect((screen.getByRole('button', { name: 'Select language' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('preserves Markdown-only visibility and the localized TOC scroll target', async () => {
    const view = render(localized('en', true));
    expect(screen.queryByRole('button', { name: 'Formatting options for font family' })).toBeNull();
    expect((screen.getByRole('button', { name: 'Table of Contents' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => editor.update(() => { $getRoot().clear().append($createHeadingNode('h2').append($createTextNode('Raw TOC heading'))); }));
    view.rerender(localized('ja', true));
    await open('目次');
    const scroll = vi.fn(); editor.getRootElement()!.firstElementChild!.scrollIntoView = scroll;
    fireEvent.click(screen.getByText('Raw TOC heading', { selector: '.toc-item .text' }));
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block: 'center' });
    await open('その他のテキスト書式');
    expect(screen.queryByTitle('小文字')).toBeNull();
    expect(screen.getByTitle('取り消し線')).toBeTruthy();
  });
});
