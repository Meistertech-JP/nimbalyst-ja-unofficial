import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin';
import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import DraggableBlockPlugin from '../../../../../runtime/src/editor/plugins/DraggableBlockPlugin';
import { draggableBlockMenuRegistry } from '../../../../../runtime/src/editor/plugins/DraggableBlockPlugin/DraggableBlockMenuRegistry';

let draggableProps: React.ComponentProps<typeof DraggableBlockPlugin_EXPERIMENTAL>;
// jsdom has no layout hit-testing; expose the same element-change contract while testing real Lexical mutations.
vi.mock('@lexical/react/LexicalDraggableBlockPlugin', () => ({
  DraggableBlockPlugin_EXPERIMENTAL: (props: React.ComponentProps<typeof DraggableBlockPlugin_EXPERIMENTAL>) => {
    draggableProps = props;
    return <>{props.menuComponent}{props.targetLineComponent}</>;
  },
}));
let editor: LexicalEditor;
const unregister: Array<() => void> = [];
const locale = i18next.createInstance();
function CaptureEditor() { [editor] = useLexicalComposerContext(); return null; }
const config = {
  namespace: 'draggable-i18n', onError: (error: Error) => { throw error; },
  editorState: () => { $getRoot().append($createParagraphNode().append($createTextNode('Raw first')), $createParagraphNode().append($createTextNode('Raw second'))); },
};
function localized(language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
    <LexicalComposer initialConfig={config}><CaptureEditor /><ContentEditable aria-label="Raw editor" /><DraggableBlockPlugin /></LexicalComposer>
  </RuntimeTranslationProvider>;
}
function selectFirst() {
  act(() => draggableProps.onElementChanged?.(editor.getRootElement()!.firstElementChild as HTMLElement));
}
function texts() { return editor.getEditorState().read(() => $getRoot().getChildren().map(node => node.getTextContent())); }
beforeEach(async () => { await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } }); });
afterEach(() => { cleanup(); for (const dispose of unregister.splice(0)) dispose(); vi.restoreAllMocks(); });

describe('localized draggable-block actions and unchanged node operations', () => {
  it.each(['normal', 'alt', 'ctrl'])('keeps %s insertion direction and original contents across locales', async modifier => {
    const view = render(localized('en'));
    selectFirst();
    expect(screen.getByTitle('Click to add below')).toBeTruthy();
    view.rerender(localized());
    await act(async () => fireEvent.click(screen.getByTitle('クリックして下に追加'), { altKey: modifier === 'alt', ctrlKey: modifier === 'ctrl' }));
    expect(texts()).toEqual(modifier === 'normal' ? ['Raw first', '', 'Raw second'] : ['', 'Raw first', 'Raw second']);
  });

  it('keeps an open menu and deletes only the selected node after language switching', async () => {
    const view = render(localized('en'));
    selectFirst();
    fireEvent.click(view.container.querySelector('.draggable-handle')!);
    expect(screen.getByText('Delete')).toBeTruthy();
    const menu = view.container.querySelector('.draggable-dropdown');
    view.rerender(localized());
    expect(view.container.querySelector('.draggable-dropdown')).toBe(menu);
    await act(async () => fireEvent.click(screen.getByText(locale.getFixedT('ja')('common:delete'))));
    expect(texts()).toEqual(['Raw second']);
    expect(view.container.querySelector('.draggable-dropdown')).toBeNull();
  });

  it('preserves extension labels/IDs, registry updates and command node identity', () => {
    const command = vi.fn();
    unregister.push(draggableBlockMenuRegistry.registerMenuItem({ id: 'i18n-custom', label: 'Raw custom menu', icon: 'raw_icon', nodeTypes: ['paragraph'], command }));
    const view = render(localized('en'));
    selectFirst();
    const key = editor.getEditorState().read(() => $getRoot().getFirstChild()!.getKey());
    fireEvent.click(view.container.querySelector('.draggable-handle')!);
    view.rerender(localized());
    expect(screen.getByText('Raw custom menu')).toBeTruthy();
    expect(screen.getByText('raw_icon')).toBeTruthy();
    act(() => { unregister.push(draggableBlockMenuRegistry.registerMenuItem({ id: 'i18n-second', label: 'Raw second menu', nodeTypes: ['paragraph'], command: vi.fn() })); });
    expect(screen.getByText('Raw second menu')).toBeTruthy();
    fireEvent.click(screen.getByText('Raw custom menu'));
    expect(command).toHaveBeenCalledTimes(1);
    expect(command.mock.calls[0][0]).toBe(editor);
    expect(command.mock.calls[0][1].getKey()).toBe(key);
    expect(view.container.querySelector('.draggable-dropdown')).toBeNull();
    expect(texts()).toEqual(['Raw first', 'Raw second']);
  });

  it('keeps the missing-target guard, outside-click dismissal and menu hit-test', async () => {
    const view = render(localized());
    await act(async () => fireEvent.click(screen.getByTitle('クリックして下に追加')));
    expect(texts()).toEqual(['Raw first', 'Raw second']);
    fireEvent.click(view.container.querySelector('.draggable-handle')!);
    expect(draggableProps.isOnMenu(screen.getByText(locale.getFixedT('ja')('common:delete')))).toBe(true);
    expect(draggableProps.isOnMenu(document.body)).toBe(false);
    fireEvent.mouseDown(document.body);
    expect(view.container.querySelector('.draggable-dropdown')).toBeNull();
  });
});
