import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildEditorFromExtensions } from '@lexical/extension';
import { RichTextExtension } from '@lexical/rich-text';
import { $createParagraphNode, $createTextNode, $getRoot, defineExtension } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { InsertImageDialog, InsertImageUriDialogBody, InsertImageUploadedDialogBody, getImagePluginCallbacks, setImagePluginCallbacks, INSERT_IMAGE_COMMAND } from '../../../../../runtime/src/editor/plugins/ImagesPlugin';
import { ImagesExtension } from '../../../../../runtime/src/editor/extensions/builtin/ImagesExtension';

const locale = i18next.createInstance();
const close = vi.fn();
let editor: ReturnType<typeof buildEditorFromExtensions>;
let savedCallbacks: ReturnType<typeof getImagePluginCallbacks>;
let apiDescriptor: PropertyDescriptor | undefined;
let pathDescriptor: PropertyDescriptor | undefined;
function localized(children: React.ReactNode, language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider>;
}
const dialog = (language = 'ja') => localized(<InsertImageDialog activeEditor={editor} onClose={close} />, language);
const confirm = () => screen.getByRole('button', { name: locale.getFixedT('ja')('common:pull_request.confirm') }) as HTMLButtonElement;
const uploadInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;
const setApi = (value: unknown) => Object.defineProperty(window, 'electronAPI', { configurable: true, writable: true, value });
function imageFile(name = 'Raw image.png') {
  const bytes = new Uint8Array([1, 2, 3]);
  const file = new File([bytes], name, { type: 'image/png' });
  Object.defineProperty(file, 'arrayBuffer', { value: vi.fn(async () => bytes.buffer) });
  return file;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  vi.clearAllMocks();
  apiDescriptor = Object.getOwnPropertyDescriptor(window, 'electronAPI');
  pathDescriptor = Object.getOwnPropertyDescriptor(window, '__currentDocumentPath');
  setApi(undefined);
  savedCallbacks = getImagePluginCallbacks(); setImagePluginCallbacks({});
  editor = buildEditorFromExtensions(defineExtension({ name: 'test/insert-image-i18n', dependencies: [RichTextExtension, ImagesExtension] }));
  editor.update(() => {
    const paragraph = $createParagraphNode().append($createTextNode('Raw document text'));
    $getRoot().append(paragraph); paragraph.selectEnd();
  }, { discrete: true });
});
afterEach(() => {
  cleanup(); editor.dispose(); setImagePluginCallbacks(savedCallbacks);
  if (apiDescriptor) Object.defineProperty(window, 'electronAPI', apiDescriptor); else Reflect.deleteProperty(window, 'electronAPI');
  if (pathDescriptor) Object.defineProperty(window, '__currentDocumentPath', pathDescriptor); else Reflect.deleteProperty(window, '__currentDocumentPath');
  vi.restoreAllMocks();
});

describe('image insertion localization and original upload routes', () => {
  it('keeps the selected URL mode, raw drafts and actual inserted image across language changes', async () => {
    const view = render(dialog('en'));
    expect(screen.getByRole('button', { name: 'File' })).toBeTruthy();
    view.rerender(dialog());
    expect(screen.getByRole('button', { name: 'ファイル' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'URL' }));
    expect(screen.getByText('画像のURL')).toBeTruthy();
    expect(screen.getByText('代替テキスト')).toBeTruthy();
    expect(confirm().disabled).toBe(true);
    const src = screen.getByPlaceholderText('例: https://source.unsplash.com/random') as HTMLInputElement;
    const alt = screen.getByPlaceholderText('Unsplashのランダム画像') as HTMLInputElement;
    fireEvent.change(src, { target: { value: ' raw/path image.png ' } });
    fireEvent.change(alt, { target: { value: 'Raw user description 日本語' } });
    const original = editor.getEditorState().toJSON();
    const dispatch = vi.spyOn(editor, 'dispatchCommand');
    view.rerender(dialog('en'));
    expect(screen.getByPlaceholderText('i.e. https://source.unsplash.com/random')).toBe(src);
    expect(screen.getByPlaceholderText('Random unsplash image')).toBe(alt);
    expect(screen.queryByRole('button', { name: 'File' })).toBeNull();
    expect(src.value).toBe(' raw/path image.png '); expect(alt.value).toBe('Raw user description 日本語');
    expect(editor.getEditorState().toJSON()).toEqual(original); expect(dispatch).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Confirm' })));
    expect(dispatch).toHaveBeenCalledWith(INSERT_IMAGE_COMMAND, { src: ' raw/path image.png ', altText: 'Raw user description 日本語' });
    const serialized = JSON.stringify(editor.getEditorState().toJSON());
    expect(serialized).toContain(' raw/path image.png '); expect(serialized).toContain('Raw user description 日本語');
    expect(serialized).toContain('Raw document text'); expect(close).toHaveBeenCalledTimes(1);
  });

  it('retains the original nonempty-only URL guard without adding validation or trimming', () => {
    const insert = vi.fn();
    render(localized(<InsertImageUriDialogBody onClick={insert} />));
    fireEvent.click(confirm()); expect(insert).not.toHaveBeenCalled();
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: ' ' } });
    expect(confirm().disabled).toBe(false);
    fireEvent.click(confirm()); expect(insert).toHaveBeenCalledExactlyOnceWith({ src: ' ', altText: '' });
  });

  it('retains pending host upload, custom alt text and mode without restarting the upload', async () => {
    const pending = deferred<{ kind: 'image'; src: string; altText: string }>();
    const upload = vi.fn(() => pending.promise); setImagePluginCallbacks({ onUploadAsset: upload });
    const view = render(dialog('en'));
    fireEvent.click(screen.getByRole('button', { name: 'File' }));
    const input = uploadInput(); const alt = screen.getByRole('textbox') as HTMLInputElement;
    const file = imageFile();
    fireEvent.change(alt, { target: { value: 'User-written alt' } });
    await act(async () => fireEvent.change(input, { target: { files: [file] } }));
    view.rerender(dialog());
    expect(uploadInput()).toBe(input); expect(screen.getByRole('textbox')).toBe(alt);
    expect(input.accept).toBe('image/*'); expect(screen.getByText('画像のアップロード')).toBeTruthy();
    expect(screen.getByPlaceholderText('画像の内容を説明する代替テキスト')).toBe(alt);
    expect(confirm().disabled).toBe(true); expect(upload).toHaveBeenCalledExactlyOnceWith(file);
    await act(async () => pending.resolve({ kind: 'image', src: 'collab-asset://raw/doc/image', altText: 'Provider description' }));
    expect(alt.value).toBe('User-written alt'); expect(confirm().disabled).toBe(false);
    const dispatch = vi.spyOn(editor, 'dispatchCommand');
    await act(async () => fireEvent.click(confirm()));
    expect(dispatch).toHaveBeenCalledWith(INSERT_IMAGE_COMMAND, { src: 'collab-asset://raw/doc/image', altText: 'User-written alt' });
    expect(upload).toHaveBeenCalledTimes(1); expect(close).toHaveBeenCalledTimes(1);
  });

  it.each([['Provider alternative', 'Provider alternative'], [undefined, 'Raw image.png']])('keeps the host alt fallback %s as raw data', async (hostAlt, expected) => {
    const insert = vi.fn();
    setImagePluginCallbacks({ onUploadAsset: vi.fn(async () => ({ kind: 'image' as const, src: 'raw-upload-src', altText: hostAlt })) });
    const body = <InsertImageUploadedDialogBody onClick={insert} />;
    const view = render(localized(body));
    await act(async () => fireEvent.change(uploadInput(), { target: { files: [imageFile()] } }));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(expected);
    view.rerender(localized(body, 'en'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(insert).toHaveBeenCalledExactlyOnceWith({ src: 'raw-upload-src', altText: expected });
  });

  it.each(['no host', 'host failure', 'non-image result'])('preserves Electron asset storage after %s', async route => {
    const insert = vi.fn();
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    if (route === 'host failure') setImagePluginCallbacks({ onUploadAsset: vi.fn(async () => { throw new Error('Raw upload error'); }) });
    if (route === 'non-image result') setImagePluginCallbacks({ onUploadAsset: vi.fn(async () => ({ kind: 'file' as const, src: 'raw-file-src' })) });
    const pending = deferred<{ relativePath: string }>();
    const invoke = vi.fn(() => pending.promise); setApi({ invoke });
    Object.defineProperty(window, '__currentDocumentPath', { configurable: true, value: 'F:/Raw project/doc.md' });
    const body = <InsertImageUploadedDialogBody onClick={insert} />;
    const view = render(localized(body));
    const file = imageFile();
    await act(async () => fireEvent.change(uploadInput(), { target: { files: [file] } }));
    view.rerender(localized(body, 'en'));
    expect(invoke).toHaveBeenCalledExactlyOnceWith('document-service:store-asset', { buffer: [1, 2, 3], mimeType: 'image/png', documentPath: 'F:/Raw project/doc.md' });
    await act(async () => pending.resolve({ relativePath: './assets/Raw image.png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(insert).toHaveBeenCalledExactlyOnceWith({ src: './assets/Raw image.png', altText: '' });
    expect(warn).toHaveBeenCalledTimes(route === 'no host' ? 0 : 1);
  });

  it.each([false, true])('preserves FileReader fallback when Electron storage failure=%s', async storageFailure => {
    const insert = vi.fn();
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    if (storageFailure) setApi({ invoke: vi.fn(async () => { throw new Error('Raw storage error'); }) });
    render(localized(<InsertImageUploadedDialogBody onClick={insert} />));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Raw alt' } });
    await act(async () => fireEvent.change(uploadInput(), { target: { files: [imageFile()] } }));
    await waitFor(() => expect(confirm().disabled).toBe(false));
    fireEvent.click(confirm());
    expect(insert).toHaveBeenCalledExactlyOnceWith({ src: 'data:image/png;base64,AQID', altText: 'Raw alt' });
    expect(warn).toHaveBeenCalledTimes(storageFailure ? 1 : 0);
  });

  it('ignores empty file selections and uses only the first selected file', async () => {
    const upload = vi.fn(async () => ({ kind: 'image' as const, src: 'raw-first-src' }));
    setImagePluginCallbacks({ onUploadAsset: upload });
    render(localized(<InsertImageUploadedDialogBody onClick={vi.fn()} />));
    await act(async () => fireEvent.change(uploadInput(), { target: { files: null } }));
    await act(async () => fireEvent.change(uploadInput(), { target: { files: [] } }));
    expect(upload).not.toHaveBeenCalled(); expect(confirm().disabled).toBe(true);
    const first = imageFile('First.png'); const second = imageFile('Second.png');
    await act(async () => fireEvent.change(uploadInput(), { target: { files: [first, second] } }));
    expect(upload).toHaveBeenCalledExactlyOnceWith(first);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('First.png');
  });

  it('preserves English defaults without a translation provider', () => {
    const view = render(<InsertImageUriDialogBody onClick={vi.fn()} />);
    expect(screen.getByText('Image URL')).toBeTruthy(); expect(screen.getByText('Alt Text')).toBeTruthy();
    expect(screen.getByPlaceholderText('Random unsplash image')).toBeTruthy();
    view.unmount(); render(<InsertImageUploadedDialogBody onClick={vi.fn()} />);
    expect(screen.getByText('Image Upload')).toBeTruthy();
    expect(screen.getByPlaceholderText('Descriptive alternative text')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy();
  });
});
