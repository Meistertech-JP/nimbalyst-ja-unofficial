import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { $createImageNode, ImageNode } from '../../../../../runtime/src/editor/plugins/ImagesPlugin/ImageNode';
import { getImagePluginCallbacks, setImagePluginCallbacks } from '../../../../../runtime/src/editor/plugins/ImagesPlugin';
import { SharedHistoryContext } from '../../../../../runtime/src/editor/context/SharedHistoryContext';
import { copyImageToClipboard } from '../../../../../runtime/src/utils/clipboard';
import { localAssetUrl } from '../../../../../runtime/src/utils/localAssetUrl';

vi.mock('../../../../../runtime/src/utils/clipboard', () => ({ copyImageToClipboard: vi.fn(async () => {}), copyToClipboard: vi.fn(async () => {}) }));
vi.mock('../../../../../runtime/src/utils/localAssetUrl', () => ({ localAssetUrl: vi.fn((path: string) => `nim-asset://${encodeURIComponent(path)}`) }));

const locale = i18next.createInstance();
let editor: LexicalEditor;
let caption: LexicalEditor;
let savedCallbacks: ReturnType<typeof getImagePluginCallbacks>;
let source: string;
let sequence = 0;
const decodes: string[] = [];
function CaptureEditor() { [editor] = useLexicalComposerContext(); return null; }
function current(language = 'ja', options: { src?: string; showCaption?: boolean; maxWidth?: number } = {}) {
  const t = locale.getFixedT(language);
  const config = {
    namespace: 'image-display-i18n', nodes: [ImageNode], onError: (error: Error) => { throw error; },
    editorState: () => {
      const node = $createImageNode({ src: options.src ?? source, altText: 'Raw user alternative 日本語', showCaption: options.showCaption, maxWidth: options.maxWidth });
      caption = node.__caption;
      $getRoot().append($createParagraphNode().append(node));
    },
  };
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
    <SharedHistoryContext><LexicalComposer initialConfig={config}><CaptureEditor />
      <div className="nimbalyst-editor" data-file-path="F:\Raw project\doc.md">
        <RichTextPlugin contentEditable={<ContentEditable aria-label="Raw editor" />} ErrorBoundary={LexicalErrorBoundary} />
      </div>
    </LexicalComposer></SharedHistoryContext>
  </RuntimeTranslationProvider>;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  vi.clearAllMocks(); decodes.length = 0;
  source = `https://example.test/image-${++sequence}.png`;
  savedCallbacks = getImagePluginCallbacks(); setImagePluginCallbacks({});
  vi.mocked(copyImageToClipboard).mockResolvedValue(undefined);
  // Only image decoding is supplied by the browser boundary; real React/Lexical nodes render.
  vi.stubGlobal('Image', class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) {
      decodes.push(value);
      queueMicrotask(() => value.includes('/broken/') ? this.onerror?.() : this.onload?.());
    }
  });
});
afterEach(() => { cleanup(); setImagePluginCallbacks(savedCallbacks); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.getSelection()?.removeAllRanges(); });

describe('image display captions, fallback and context actions', () => {
  it('updates pending-loading text without restarting source resolution on locale changes', async () => {
    let resolve!: (src: string) => void;
    const pending = new Promise<string>(done => { resolve = done; });
    const resolver = vi.fn(() => pending); setImagePluginCallbacks({ resolveImageSrc: resolver });
    const view = render(current('en'));
    await screen.findByText('Loading…');
    const calls = resolver.mock.calls.length;
    view.rerender(current());
    expect(screen.getByText(locale.getFixedT('ja')('common:loading'))).toBeTruthy();
    expect(resolver).toHaveBeenCalledTimes(calls);
    await act(async () => resolve(`blob:resolved-${sequence}`));
    const img = await screen.findByRole('img', { name: 'Raw user alternative 日本語' });
    expect(img.getAttribute('src')).toBe(`blob:resolved-${sequence}`);
    expect(decodes).toEqual([`blob:resolved-${sequence}`]);
  });

  it('localizes broken-image caption and accessible name without changing the original source', async () => {
    source = `https://example.test/broken/${sequence}.png`;
    const view = render(current('en'));
    await screen.findByRole('img', { name: 'Image unavailable' });
    // LazyImage reports its decode error in an effect; settle the parent's error branch first.
    await act(async () => {});
    const unavailable = screen.getByRole('img', { name: 'Image unavailable' });
    const original = editor.getEditorState().toJSON(); const requests = [...decodes];
    view.rerender(current());
    expect(screen.getByRole('img', { name: '画像を表示できません' })).toBe(unavailable);
    expect(screen.getByText('画像を表示できません')).toBeTruthy();
    expect(editor.getEditorState().toJSON()).toEqual(original); expect(decodes).toEqual(requests);
    expect(JSON.stringify(original)).toContain(source);
  });

  it('retains an open real right-click menu and copies the unchanged image URL', async () => {
    const view = render(current('en'));
    const img = await screen.findByRole('img', { name: 'Raw user alternative 日本語' });
    await act(async () => fireEvent.contextMenu(img, { clientX: 40, clientY: 60 }));
    const menu = await screen.findByRole('menu');
    expect(screen.getByRole('menuitem', { name: 'Copy image' })).toBeTruthy();
    const original = editor.getEditorState().toJSON(); const requests = [...decodes];
    view.rerender(current());
    expect(screen.getByRole('menu')).toBe(menu);
    expect(editor.getEditorState().toJSON()).toEqual(original); expect(decodes).toEqual(requests);
    await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: locale.getFixedT('ja')('aichat:media.copy_image') })));
    expect(copyImageToClipboard).toHaveBeenCalledExactlyOnceWith({ src: source });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('keeps copy failure handling and raw diagnostic details unchanged', async () => {
    const error = new Error('Raw clipboard error');
    vi.mocked(copyImageToClipboard).mockRejectedValue(error);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(current());
    const img = await screen.findByRole('img', { name: 'Raw user alternative 日本語' });
    await act(async () => fireEvent.contextMenu(img));
    await act(async () => fireEvent.click(await screen.findByRole('menuitem')));
    expect(log).toHaveBeenCalledExactlyOnceWith('Failed to copy image to clipboard', error);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('keeps caption editor identity, placeholder accessibility and raw caption content', async () => {
    const view = render(current('en', { showCaption: true }));
    await screen.findByRole('img', { name: 'Raw user alternative 日本語' });
    const input = await screen.findByRole('textbox', { name: '' });
    expect(input.getAttribute('aria-placeholder')).toBe('Enter a caption...');
    view.rerender(current('ja', { showCaption: true }));
    expect(input.getAttribute('aria-placeholder')).toBe('キャプションを入力…');
    expect(screen.getByText('キャプションを入力…')).toBeTruthy();
    await act(async () => caption.update(() => { $getRoot().clear().append($createParagraphNode().append($createTextNode('Raw caption draft 日本語'))); }));
    const original = caption.getEditorState().toJSON();
    view.rerender(current('en', { showCaption: true }));
    expect(screen.getByRole('textbox', { name: '' })).toBe(input);
    expect(caption.getEditorState().toJSON()).toEqual(original);
    expect(screen.getByText('Raw caption draft 日本語')).toBeTruthy();
    expect(screen.queryByText('Enter a caption...')).toBeNull();
  });

  it.each(['collab-asset://doc/raw-image-', 'data:image/png;base64,', 'blob:raw-image-'])('preserves %s absolute sources and raw alt text across locale changes', async prefix => {
    source = `${prefix}${sequence}`;
    const view = render(current('en'));
    const img = await screen.findByRole('img', { name: 'Raw user alternative 日本語' });
    expect(img.getAttribute('src')).toBe(source);
    view.rerender(current());
    expect(screen.getByRole('img', { name: 'Raw user alternative 日本語' })).toBe(img);
    expect(img.getAttribute('src')).toBe(source); expect(localAssetUrl).not.toHaveBeenCalled();
    expect(decodes).toEqual([source]);
  });

  it('uses the stable editor document path for a relative image and does not re-resolve on locale changes', async () => {
    source = `assets/raw-${sequence}.png`;
    const view = render(current('en'));
    const img = await screen.findByRole('img', { name: 'Raw user alternative 日本語' });
    expect(localAssetUrl).toHaveBeenCalledWith(`F:\\Raw project/${source}`);
    const calls = vi.mocked(localAssetUrl).mock.calls.length;
    view.rerender(current());
    expect(localAssetUrl).toHaveBeenCalledTimes(calls);
    expect(screen.getByRole('img', { name: 'Raw user alternative 日本語' })).toBe(img);
  });

  it('retains SVG aspect-ratio scaling after translated UI rerenders', async () => {
    source = `https://example.test/vector-${sequence}.svg`;
    const view = render(current('en', { maxWidth: 100 }));
    const img = await screen.findByRole('img', { name: 'Raw user alternative 日本語' });
    Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 400 });
    Object.defineProperty(img, 'naturalHeight', { configurable: true, value: 200 });
    fireEvent.load(img);
    await waitFor(() => expect(img.style.width).toBe('100px'));
    expect(img.style.height).toBe('50px');
    view.rerender(current('ja', { maxWidth: 100 }));
    expect(img.style.width).toBe('100px'); expect(img.style.height).toBe('50px');
  });
});
