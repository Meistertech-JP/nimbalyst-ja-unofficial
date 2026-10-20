import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { EditorScreenshotWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/EditorScreenshotWidget';
import { GifPlayer } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/GifPlayer';
import { ZoomableImageSurface } from '../../../../../runtime/src/ui/AgentTranscript/components/ZoomableImageSurface';
import { copyImageToClipboard } from '../../../../../runtime/src/utils/clipboard';
import { parseGIF, decompressFrames } from 'gifuct-js';
import type { TranscriptViewMessage } from '../../../../../runtime/src/ai/server/types';

vi.mock('../../../../../runtime/src/utils/clipboard', () => ({ copyImageToClipboard: vi.fn() }));
vi.mock('gifuct-js', () => ({ parseGIF: vi.fn(), decompressFrames: vi.fn() }));

const locale = i18next.createInstance();
const readFile = vi.fn();
const inlineResult = JSON.stringify([{ type: 'image', source: { data: 'AA==', media_type: 'image/png' } }]);
const persistedResult = '<persisted-output>Full output saved to: /repo/raw-output.json</persisted-output>';
function message(result = inlineResult, filePath = '/repo/raw.mockup.html'): TranscriptViewMessage {
  return { id: 1, sequence: 1, type: 'tool_call', subagentId: null, createdAt: new Date(1000), toolCall: {
    toolName: 'capture_editor_screenshot', toolDisplayName: 'capture_editor_screenshot', status: 'completed', description: null,
    arguments: { file_path: filePath }, targetFilePath: null, mcpServer: null, mcpTool: null, providerToolCallId: 'raw-tool', progress: [], result,
  } };
}
function localized(children: React.ReactNode, language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider>;
}
function screenshot(props: Partial<React.ComponentProps<typeof EditorScreenshotWidget>> = {}) {
  return <EditorScreenshotWidget sessionId="media-i18n" message={message()} isExpanded onToggle={() => {}} {...props} />;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
class ResizeObserverMock {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) { this.callback([{ target, contentRect: { width: 400, height: 300 } }] as ResizeObserverEntry[], this as unknown as ResizeObserver); }
  unobserve() {}
  disconnect() {}
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  readFile.mockReset();
  vi.mocked(copyImageToClipboard).mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('screenshot localization and retained image state', () => {
  it('keeps the open image and zoom across locales, and closes on Escape', () => {
    const content = screenshot();
    const view = render(localized(content, 'en'));
    fireEvent.click(screen.getByTitle('Click to enlarge'));
    const image = screen.getByTestId('zoomable-image');
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(screen.getByTestId('zoomable-image-zoom').textContent).toBe('125%');
    view.rerender(localized(content));
    expect(screen.getByRole('dialog', { name: '画像プレビュー' })).toBeTruthy();
    expect(screen.getByTitle('閉じる（Esc）')).toBeTruthy();
    expect(screen.getByTestId('zoomable-image')).toBe(image);
    expect(image.getAttribute('src')).toBe('data:image/png;base64,AA==');
    expect(image.getAttribute('alt')).toBe('raw.mockup.html');
    expect(screen.getByTestId('zoomable-image-zoom').textContent).toBe('125%');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps hooks stable when tool data arrives and translates only the default filename', () => {
    const missing = { ...message(), toolCall: undefined };
    const view = render(localized(screenshot({ message: missing })));
    expect(view.container.textContent).toBe('');
    view.rerender(localized(screenshot({ message: message(inlineResult, '') })));
    expect(screen.getByRole('img', { name: 'スクリーンショット' })).toBeTruthy();
    expect(screen.getByText('エディターのスクリーンショット')).toBeTruthy();
    view.rerender(localized(screenshot({ message: missing })));
    expect(view.container.textContent).toBe('');
  });

  it.each(['array', 'wrapper'])('does not reread a pending or loaded %s persisted image on language switch', async shape => {
    const pending = deferred<{ success: boolean; content: string }>();
    readFile.mockReturnValue(pending.promise);
    const content = screenshot({ message: message(persistedResult), readFile });
    const view = render(localized(content, 'en'));
    expect(screen.getByTitle('Loading image...')).toBeTruthy();
    view.rerender(localized(content));
    expect(screen.getByTitle('画像を読み込み中...')).toBeTruthy();
    const blocks = [{ type: 'image', data: 'AQ==', mimeType: 'image/jpeg' }];
    await act(async () => pending.resolve({ success: true, content: JSON.stringify(shape === 'array' ? blocks : { content: blocks }) }));
    expect(screen.getByRole('img').getAttribute('src')).toBe('data:image/jpeg;base64,AQ==');
    view.rerender(localized(content, 'en'));
    expect(readFile).toHaveBeenCalledExactlyOnceWith('/repo/raw-output.json');
    expect(screen.queryByTitle('Loading image...')).toBeNull();
  });

  it.each([
    ['unavailable', 'File reading not available', 'ファイルの読み取りを利用できません'],
    ['read', 'Failed to read file', 'ファイルを読み込めませんでした'],
    ['parse', 'Could not parse image data from file', 'ファイルから画像データを読み取れませんでした'],
    ['load', 'Failed to load image', '画像の読み込みに失敗しました'],
    ['detail', 'Raw service error', 'Raw service error'],
    ['throw', 'Raw service error', 'Raw service error'],
  ])('translates app-owned %s errors without translating external details or rereading', async (kind, english, japanese) => {
    if (kind === 'throw') readFile.mockRejectedValue(new Error('Raw service error'));
    else if (kind === 'load') readFile.mockRejectedValue(null);
    else readFile.mockResolvedValue(kind === 'parse' ? { success: true, content: 'invalid JSON' } : { success: false, error: kind === 'detail' ? 'Raw service error' : undefined });
    const content = screenshot({ message: message(persistedResult), readFile: kind === 'unavailable' ? undefined : readFile });
    const view = render(localized(content, 'en'));
    expect(await screen.findByText(english)).toBeTruthy();
    view.rerender(localized(content));
    expect(screen.getByText(japanese)).toBeTruthy();
    expect(readFile).toHaveBeenCalledTimes(kind === 'unavailable' ? 0 : 1);
  });

  it('translates the failure badge while preserving tool error content', () => {
    const content = screenshot({ message: message(JSON.stringify({ isError: true, content: [{ type: 'text', text: 'Raw tool diagnostic' }] })) });
    const view = render(localized(content, 'en'));
    expect(screen.getByText('Failed')).toBeTruthy();
    view.rerender(localized(content));
    expect(screen.getByText('失敗')).toBeTruthy();
    expect(screen.getByText('Raw tool diagnostic')).toBeTruthy();
  });
});

describe('zoom and copy localization', () => {
  it('preserves dimensions, zoom and pending copy, using the original source/path', async () => {
    const pending = deferred<void>();
    vi.mocked(copyImageToClipboard).mockReturnValue(pending.promise);
    const onImageLoad = vi.fn();
    const content = <ZoomableImageSurface src="raw.png" alt="Raw title" copyFilePath="/repo/raw.png" onImageLoad={onImageLoad} />;
    const view = render(localized(content, 'en'));
    const image = screen.getByTestId('zoomable-image');
    Object.defineProperties(image, { naturalWidth: { value: 800 }, naturalHeight: { value: 600 } });
    fireEvent.load(image);
    expect(screen.getByTestId('zoomable-image-zoom').textContent).toBe('50%');
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy image' }));
    expect((screen.getByRole('button', { name: 'Copying...' }) as HTMLButtonElement).disabled).toBe(true);
    view.rerender(localized(content));
    expect((screen.getByRole('button', { name: 'コピー中...' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('zoomable-image-zoom').textContent).toBe('63%');
    expect(onImageLoad).toHaveBeenCalledExactlyOnceWith({ width: 800, height: 600 });
    await act(async () => pending.resolve());
    expect(screen.getByRole('button', { name: 'コピーしました' })).toBeTruthy();
    expect(copyImageToClipboard).toHaveBeenCalledExactlyOnceWith({ src: 'raw.png', filePath: '/repo/raw.png' });
    fireEvent.click(screen.getByRole('button', { name: '全体を表示' }));
    expect(screen.getByTestId('zoomable-image-zoom').textContent).toBe('50%');
    expect(screen.getByTestId('zoomable-image')).toBe(image);
  });

  it('translates a completed copy failure without retrying it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(copyImageToClipboard).mockRejectedValue(new Error('Clipboard failure'));
    const content = <ZoomableImageSurface src="raw.png" alt="Raw title" />;
    const view = render(localized(content, 'en'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy image' }));
    expect(await screen.findByRole('button', { name: 'Copy failed' })).toBeTruthy();
    view.rerender(localized(content));
    expect(screen.getByRole('button', { name: 'コピーに失敗しました' })).toBeTruthy();
    expect(copyImageToClipboard).toHaveBeenCalledTimes(1);
  });
});

describe('GIF playback localization', () => {
  beforeEach(() => {
    vi.mocked(parseGIF).mockReset().mockReturnValue({ lsd: { width: 1, height: 1 } } as ReturnType<typeof parseGIF>);
    vi.mocked(decompressFrames).mockReset().mockReturnValue([0, 1].map(() => ({ dims: { width: 1, height: 1, top: 0, left: 0 }, patch: new Uint8ClampedArray(4), delay: 10, disposalType: 1, colorTable: [[0, 0, 0]], pixels: [0], transparentIndex: 0 })));
    vi.stubGlobal('ImageData', class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ putImageData: vi.fn(), drawImage: vi.fn(), getImageData: vi.fn(() => new ImageData(new Uint8ClampedArray(4), 1, 1)), clearRect: vi.fn() } as unknown as CanvasRenderingContext2D);
  });

  it('retains paused scrub position and resumes without decoding again', () => {
    const content = <GifPlayer src="data:image/gif;base64,AA==" />;
    const view = render(localized(content, 'en'));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    fireEvent.change(screen.getByRole('slider', { name: 'GIF frame position' }), { target: { value: '1' } });
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
    view.rerender(localized(content));
    expect(screen.getByRole('img', { name: 'アニメーションGIF' })).toBeTruthy();
    expect((screen.getByRole('slider', { name: 'GIFのフレーム位置' }) as HTMLInputElement).value).toBe('1');
    expect(screen.getByText('0.1秒 / 0.2秒')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '再生' }));
    expect(screen.getByRole('button', { name: '一時停止' })).toBeTruthy();
    expect(parseGIF).toHaveBeenCalledTimes(1);
  });

  it('translates pending loading while fetching once and preserving a custom image label', async () => {
    const pending = deferred<{ arrayBuffer: () => Promise<ArrayBuffer> }>();
    const fetchImage = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetchImage);
    const content = <GifPlayer src="file:///raw.gif" alt="Raw animation title" />;
    const view = render(localized(content, 'en'));
    expect(screen.getByText('Decoding GIF...')).toBeTruthy();
    view.rerender(localized(content));
    expect(screen.getByText('GIFを読み込み中...')).toBeTruthy();
    await act(async () => pending.resolve({ arrayBuffer: async () => new ArrayBuffer(1) }));
    expect(screen.getByRole('img', { name: 'Raw animation title' })).toBeTruthy();
    expect(fetchImage).toHaveBeenCalledExactlyOnceWith('file:///raw.gif');
    expect(parseGIF).toHaveBeenCalledTimes(1);
  });

  it('preserves the existing no-frames hidden fallback without rendering internal errors', () => {
    vi.mocked(decompressFrames).mockReturnValue([]);
    const view = render(localized(<GifPlayer src="data:image/gif;base64,AA==" />));
    expect(view.container.textContent).toBe('');
    expect(screen.queryByRole('img')).toBeNull();
  });
});
