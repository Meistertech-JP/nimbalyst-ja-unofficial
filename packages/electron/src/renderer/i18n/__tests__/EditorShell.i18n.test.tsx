import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { RuntimeSettingsProvider } from '../../../../../runtime/src/editor/context/RuntimeSettingsContext';
import { ToolbarContext } from '../../../../../runtime/src/editor/context/ToolbarContext';
import Editor from '../../../../../runtime/src/editor/Editor';
import EditorNodes from '../../../../../runtime/src/editor/nodes/EditorNodes';
import { getEditorTransformers } from '../../../../../runtime/src/editor/markdown';
import type { EditorConfig } from '../../../../../runtime/src/editor/EditorConfig';

vi.mock('../../../../../runtime/src/editor/utils/getDOMRangeRect', () => ({ getDOMRangeRect: () => new DOMRect(20, 30, 80, 20) }));
const locale = i18next.createInstance();
let editor: LexicalEditor;
function CaptureEditor() { [editor] = useLexicalComposerContext(); return null; }
const lexicalConfig = {
  namespace: 'editor-shell-i18n',
  nodes: [...new Set([...EditorNodes, AutoLinkNode, LinkNode, ...getEditorTransformers().flatMap(transformer => 'dependencies' in transformer ? transformer.dependencies : [])])],
  onError: (error: Error) => { throw error; },
};
function localized(language: string, config: EditorConfig) {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
    <RuntimeSettingsProvider><ToolbarContext><LexicalComposer initialConfig={lexicalConfig}>
      <CaptureEditor /><Editor config={config} />
    </LexicalComposer></ToolbarContext></RuntimeSettingsProvider>
  </RuntimeTranslationProvider>;
}
beforeEach(async () => { await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } }); });
afterEach(() => { cleanup(); window.getSelection()?.removeAllRanges(); vi.restoreAllMocks(); });

describe('real editor shell translation integration', () => {
  it.each([false, true])('updates the rich=%s placeholder without remounting or marking locale changes dirty', async isRichText => {
    const onDirtyChange = vi.fn();
    const onEditorReady = vi.fn();
    const config: EditorConfig = { isRichText, editable: true, showToolbar: false, onDirtyChange, onEditorReady };
    const view = render(localized('en', config));
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('aria-placeholder')).toBe(isRichText ? 'Enter some rich text...' : 'Enter some plain text...');
    view.rerender(localized('ja', config));
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input.getAttribute('aria-placeholder')).toBe(isRichText ? 'リッチテキストを入力…' : 'プレーンテキストを入力…');
    const readyCount = onEditorReady.mock.calls.length;
    await act(async () => editor.update(() => { $getRoot().clear().append($createParagraphNode().append($createTextNode('Raw draft'))); }));
    const dirtyCount = onDirtyChange.mock.calls.length;
    const state = editor.getEditorState().toJSON();
    view.rerender(localized('en', config));
    expect(editor.getEditorState().toJSON()).toEqual(state);
    expect(input.textContent).toBe('Raw draft');
    expect(onDirtyChange).toHaveBeenCalledTimes(dirtyCount);
    expect(onEditorReady).toHaveBeenCalledTimes(readyCount);
  });

  it('recomputes the builtin comment contribution on locale change and opens the real composer', async () => {
    const config: EditorConfig = { isRichText: true, editable: true, forceFloatingToolbar: true, comments: { getYDoc: () => null, currentUser: { id: 'raw-user', name: 'Raw User' }, getMembers: () => [], documentTitle: 'Raw Doc', documentId: 'raw-doc', documentUri: 'collab://org:raw:doc:raw' } };
    const view = render(localized('en', config));
    await act(async () => editor.update(() => {
      const text = $createTextNode('Raw selected text');
      $getRoot().clear().append($createParagraphNode().append(text)); text.select(0, 17);
    }));
    const node = document.createTreeWalker(editor.getRootElement()!, NodeFilter.SHOW_TEXT).nextNode()!;
    const range = document.createRange(); range.selectNodeContents(node);
    window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
    fireEvent(document, new Event('selectionchange'));
    const action = screen.getByTestId('floating-toolbar-action-comment');
    expect(action.title).toBe('Add comment');
    view.rerender(localized('ja', config));
    expect(screen.getByTestId('floating-toolbar-action-comment')).toBe(action);
    expect(action.title).toBe('コメントを追加');
    await act(async () => fireEvent.click(action));
    expect(screen.getByTestId('comment-composer')).toBeTruthy();
    expect(document.querySelector('.nim-comment-composer-input')!.getAttribute('aria-placeholder')).toBe('コメントを追加… @でメンション');
  });
});
