import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListNode, ListItemNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { $createParagraphNode, $createTextNode, $getRoot, $getSelection, $isRangeSelection, $isTextNode, type LexicalEditor, type TextFormatType } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider, useRuntimeTranslation } from '../../../../../runtime/src/ui/RuntimeTranslation';
import FloatingTextFormatToolbarPlugin from '../../../../../runtime/src/editor/plugins/FloatingTextFormatToolbarPlugin';
import { getCommentToolbarActions } from '../../../../../runtime/src/editor/plugins/CommentPlugin/toolbarAction';
import type { CommentsConfig } from '../../../../../runtime/src/editor/commenting/types';
import { OPEN_COMMENT_COMPOSER_COMMAND } from '../../../../../runtime/src/editor/plugins/CommentPlugin/commands';
import { SHORTCUTS } from '../../../../../runtime/src/editor/plugins/ShortcutsPlugin/shortcuts';

// Only native geometry is unavailable in jsdom; selection, portals, dropdowns and format commands remain real.
vi.mock('../../../../../runtime/src/editor/utils/getDOMRangeRect', () => ({ getDOMRangeRect: () => new DOMRect(20, 30, 80, 20) }));
const locale = i18next.createInstance();
const setIsLinkEditMode = vi.fn();
const customAction = vi.fn();
let editor: LexicalEditor;
let anchor: HTMLDivElement;
const config = { namespace: 'floating-text-i18n', nodes: [HeadingNode, QuoteNode, CodeNode, CodeHighlightNode, ListNode, ListItemNode, LinkNode, AutoLinkNode], onError: (error: Error) => { throw error; }, editorState: () => { $getRoot().append($createParagraphNode().append($createTextNode('Raw selected text'))); } };
function Toolbar() {
  [editor] = useLexicalComposerContext();
  const { t } = useRuntimeTranslation();
  const actions = [...getCommentToolbarActions({} as CommentsConfig, editor, t), { id: 'raw-extension', label: 'Raw custom action', icon: 'raw_icon', onSelect: customAction }];
  return <FloatingTextFormatToolbarPlugin anchorElem={anchor} setIsLinkEditMode={setIsLinkEditMode} actions={actions} />;
}
function localized(language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
    <LexicalComposer initialConfig={config}>
      <RichTextPlugin contentEditable={<ContentEditable aria-label="Raw editor" />} ErrorBoundary={LexicalErrorBoundary} />
      <ListPlugin /><CheckListPlugin /><LinkPlugin /><Toolbar />
    </LexicalComposer>
  </RuntimeTranslationProvider>;
}
async function selectText() {
  await act(async () => editor.update(() => {
    const text = $getRoot().getAllTextNodes()[0];
    text.select(0, text.getTextContentSize());
  }));
  const text = document.createTreeWalker(editor.getRootElement()!, NodeFilter.SHOW_TEXT).nextNode()!;
  const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, text.textContent!.length);
  window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
  await act(async () => fireEvent(document, new Event('selectionchange')));
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  vi.clearAllMocks();
  // jsdom moves the native text selection when menu buttons receive focus. Browsers retain the editor range.
  // Test command/selection behavior without that focus emulation; dropdown navigation is covered separately.
  vi.spyOn(HTMLButtonElement.prototype, 'focus').mockImplementation(() => {});
  anchor = document.createElement('div'); anchor.className = 'nimbalyst-editor'; document.body.append(anchor);
});
afterEach(() => { cleanup(); anchor.remove(); window.getSelection()?.removeAllRanges(); vi.restoreAllMocks(); });

describe('floating text-format UI and preserved selection commands', () => {
  it.each([
    ['bold', 'Bold', '太字', 'テキストを太字にする'],
    ['italic', 'Italic', '斜体', 'テキストを斜体にする'],
    ['underline', 'Underline', '下線', 'テキストに下線を付ける'],
    ['strikethrough', 'Strikethrough', '取り消し線', 'テキストに取り消し線を付ける'],
    ['code', 'Insert code block', 'コードブロックを挿入', 'コードブロックを挿入'],
  ])('retains selected text and the %s toggle through language switching', async (format, english, japanese, aria) => {
    const view = render(localized('en')); await selectText();
    const popup = anchor.querySelector('.floating-text-format-popup');
    expect(screen.getByTitle(english)).toBeTruthy();
    const before = editor.getEditorState().toJSON();
    view.rerender(localized());
    expect(anchor.querySelector('.floating-text-format-popup')).toBe(popup);
    expect(editor.getEditorState().toJSON()).toEqual(before);
    expect(screen.getByTitle(japanese).getAttribute('aria-label')).toBe(aria);
    await act(async () => fireEvent.click(screen.getByTitle(japanese)));
    expect(editor.getEditorState().read(() => $getRoot().getAllTextNodes()[0].hasFormat(format as TextFormatType))).toBe(true);
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('Raw selected text');
    view.rerender(localized('en'));
    await selectText();
    await act(async () => fireEvent.click(screen.getByTitle(english)));
    expect(editor.getEditorState().read(() => $getRoot().getAllTextNodes()[0].hasFormat(format as TextFormatType))).toBe(false);
  });

  it.each([
    ['normal_text', 'paragraph', SHORTCUTS.NORMAL], ['heading_1', 'h1', SHORTCUTS.HEADING1],
    ['heading_2', 'h2', SHORTCUTS.HEADING2], ['heading_3', 'h3', SHORTCUTS.HEADING3],
    ['numbered_list', 'number', SHORTCUTS.NUMBERED_LIST], ['bullet_list', 'bullet', SHORTCUTS.BULLET_LIST],
    ['check_list', 'check', SHORTCUTS.CHECK_LIST], ['quote', 'quote', SHORTCUTS.QUOTE], ['code_block', 'code', SHORTCUTS.CODE_BLOCK],
  ])('translates %s without changing shortcut or block/list type', async (name, expected, shortcut) => {
    const view = render(localized('en')); await selectText();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Formatting options for text style' })));
    const menu = screen.getByRole('menu');
    view.rerender(localized());
    expect(screen.getByRole('menu')).toBe(menu);
    expect(anchor.contains(menu)).toBe(true);
    const label = locale.getFixedT('ja')(`dialogs:keyboard_shortcuts.labels.${name}`);
    const button = screen.getByText(label).closest('button')!;
    expect(button.textContent).toContain(shortcut);
    await act(async () => fireEvent.click(button));
    const block = editor.getEditorState().read(() => $getRoot().getFirstChild()!.exportJSON()) as { type: string; tag?: string; listType?: string };
    expect(block.listType ?? block.tag ?? block.type).toBe(expected);
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('Raw selected text');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('retains link creation/removal payloads and edit-mode signaling', async () => {
    const view = render(localized('en')); await selectText();
    view.rerender(localized());
    await act(async () => fireEvent.click(screen.getByTitle('リンクを挿入')));
    expect(setIsLinkEditMode).toHaveBeenLastCalledWith(true);
    expect(editor.getEditorState().read(() => $getRoot().getAllTextNodes()[0].getParent()!.exportJSON())).toMatchObject({ type: 'link', url: 'https://' });
    await selectText();
    await act(async () => fireEvent.click(screen.getByTitle('リンクを挿入')));
    expect(setIsLinkEditMode).toHaveBeenLastCalledWith(false);
    expect(editor.getEditorState().read(() => $getRoot().getAllTextNodes()[0].getParent()!.getType())).toBe('paragraph');
  });

  it('localizes the builtin comment action while retaining custom labels, IDs, selection and commands', async () => {
    const view = render(localized('en')); await selectText();
    const dispatch = vi.spyOn(editor, 'dispatchCommand');
    view.rerender(localized());
    const action = screen.getByTestId('floating-toolbar-action-comment');
    expect(action.title).toBe('コメントを追加');
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    fireEvent(action, down);
    expect(down.defaultPrevented).toBe(true);
    fireEvent.click(action);
    expect(dispatch).toHaveBeenCalledWith(OPEN_COMMENT_COMPOSER_COMMAND, undefined);
    expect(editor.getEditorState().read(() => { const selection = $getSelection(); return $isRangeSelection(selection) ? selection.getTextContent() : ''; })).toBe('Raw selected text');
    const custom = screen.getByTestId('floating-toolbar-action-raw-extension');
    expect(custom.title).toBe('Raw custom action');
    expect(custom.textContent).toBe('raw_icon');
    fireEvent.click(custom);
    expect(customAction).toHaveBeenCalledExactlyOnceWith(expect.anything());
  });

  it('keeps empty-selection and read-only controls hidden', async () => {
    const view = render(localized());
    expect(anchor.querySelector('.floating-text-format-popup')).toBeNull();
    await selectText();
    await act(async () => { editor.setEditable(false); editor.update(() => { const text = $getRoot().getAllTextNodes()[0]; if ($isTextNode(text)) text.select(0, 3); }); });
    fireEvent(document, new Event('selectionchange'));
    view.rerender(localized('en'));
    expect(screen.queryByTitle('太字')).toBeNull();
  });
});
