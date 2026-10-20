import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { VisualDisplayWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/VisualDisplayWidget';
import { localAssetUrl } from '../../../../../runtime/src/utils/localAssetUrl';
import type { TranscriptViewMessage } from '../../../../../runtime/src/ai/server/types';

const faults = vi.hoisted(() => ({ chart: false, gif: false }));
// Give the real chart renderers deterministic dimensions in jsdom; inject rendering failures only in boundary tests.
vi.mock('recharts', async importOriginal => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactElement }) => {
    if (faults.chart) throw new Error('Raw chart failure');
    return React.cloneElement(children as React.ReactElement<{ width: number; height: number }>, { width: 500, height: 300 });
  } };
});
vi.mock('../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/GifPlayer', () => ({
  GifPlayer: ({ src, alt }: { src: string; alt: string }) => {
    if (faults.gif) throw new Error('Raw decoder failure');
    return <img src={src} alt={alt} />;
  },
}));

const locale = i18next.createInstance();
const readFile = vi.fn();
const imageItem = (path = '/repo/raw.png', description = 'Original image') => ({ description, image: { path } });
const chartItem = (chartType = 'bar') => ({ description: 'Original chart', chart: {
  chartType, data: [{ raw_x: 'Alpha', raw_y: 2, raw_z: 3 }], xAxisKey: 'raw_x', yAxisKey: ['raw_y', 'raw_z'],
} });
function message(items: unknown = [imageItem()], result?: unknown, isError = false): TranscriptViewMessage {
  return { id: 1, sequence: 1, type: 'tool_call', isError, subagentId: null, createdAt: new Date(1000), toolCall: {
    toolName: 'display_visual', toolDisplayName: 'display_visual', status: 'completed', description: null,
    arguments: { items }, targetFilePath: null, mcpServer: null, mcpTool: null, providerToolCallId: 'raw-tool', progress: [], result: result as string,
  } };
}
function localized(msg: TranscriptViewMessage, language = 'ja', read = readFile) {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
    <VisualDisplayWidget sessionId="visual-i18n" message={msg} readFile={read} isExpanded onToggle={() => {}} />
  </RuntimeTranslationProvider>;
}
class ResizeObserverMock {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) { this.callback([{ target, contentRect: { width: 400, height: 300 } }] as ResizeObserverEntry[], this as unknown as ResizeObserver); }
  unobserve() {}
  disconnect() {}
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  readFile.mockReset().mockResolvedValue({ success: true, content: 'AA==' });
  faults.chart = false; faults.gif = false;
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('visual images, galleries and error localization', () => {
  it('translates while loading without rereading and retains the image/description/data URL', async () => {
    let resolve!: (value: { success: boolean; content: string }) => void;
    readFile.mockReturnValue(new Promise(done => { resolve = done; }));
    const msg = message();
    const view = render(localized(msg, 'en'));
    expect(screen.getByText('Loading...')).toBeTruthy();
    view.rerender(localized(msg));
    expect(screen.getByText(locale.getFixedT('ja')('common:image_viewer.loading'))).toBeTruthy();
    await act(async () => resolve({ success: true, content: 'data:image/jpeg;base64,raw' }));
    const image = screen.getByAltText('Original image');
    expect(image.getAttribute('src')).toBe('data:image/jpeg;base64,raw');
    view.rerender(localized(msg, 'en'));
    expect(screen.getByAltText('Original image')).toBe(image);
    expect(readFile).toHaveBeenCalledExactlyOnceWith('/repo/raw.png');
    expect(screen.getByRole('img', { name: '1 visual item(s)' })).toBeTruthy();
  });

  it('keeps gallery position/zoom across languages and preserves wraparound navigation and Escape', async () => {
    const msg = message([imageItem('/repo/one.png', 'Raw one'), imageItem('/repo/two.png', 'Raw two')]);
    const view = render(localized(msg, 'en'));
    fireEvent.click(await screen.findByAltText('Raw one'));
    expect(screen.getByRole('dialog', { name: 'Image lightbox' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Previous image' }));
    expect(screen.getByTestId('zoomable-image').getAttribute('src')).toBe(localAssetUrl('/repo/two.png'));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    const zoom = screen.getByTestId('zoomable-image-zoom').textContent;
    const image = screen.getByTestId('zoomable-image');
    view.rerender(localized(msg));
    expect(screen.getByRole('dialog', { name: '画像の拡大表示' })).toBeTruthy();
    expect(screen.getByTestId('zoomable-image')).toBe(image);
    expect(screen.getByTestId('zoomable-image-zoom').textContent).toBe(zoom);
    expect(screen.getByText('2 / 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '次の画像' }));
    expect(screen.getByTestId('zoomable-image').getAttribute('alt')).toBe('Raw one');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(readFile).toHaveBeenCalledTimes(2);
  });

  it.each(['read', 'throw', 'unknown', 'element'])('translates the %s failure after a locale switch without retrying', async kind => {
    if (kind === 'read') readFile.mockResolvedValue({ success: false, error: 'Raw read detail' });
    if (kind === 'throw') readFile.mockRejectedValue(new Error('Raw exception'));
    if (kind === 'unknown') readFile.mockRejectedValue(null);
    const msg = message();
    const view = render(localized(msg, 'en'));
    if (kind === 'element') fireEvent.error(await screen.findByAltText('Original image'));
    await screen.findByText(/Failed to (load|render) image/);
    view.rerender(localized(msg));
    const detail = kind === 'read' ? 'Raw read detail' : kind === 'throw' ? 'Raw exception' : locale.getFixedT('ja')('dialogs:error.unknown');
    expect(screen.getByText(kind === 'element' ? '画像を表示できませんでした: /repo/raw.png' : `画像を読み込めませんでした: ${detail}`)).toBeTruthy();
    expect(screen.getByText('/repo/raw.png')).toBeTruthy();
    expect(readFile).toHaveBeenCalledTimes(1);
  });

  it.each(['png', 'jpg', 'svg', 'gif', 'unknown'])('retains MIME inference and raw alt for %s', async extension => {
    render(localized(message([imageItem(`/repo/raw.${extension}`)])));
    const image = await screen.findByAltText('Original image');
    const mime = extension === 'jpg' ? 'jpeg' : extension === 'svg' ? 'svg+xml' : extension === 'unknown' ? 'png' : extension;
    expect(image.getAttribute('src')).toBe(`data:image/${mime};base64,AA==`);
  });

  it('retains local asset fallback and still renders valid items despite a tool error flag', async () => {
    readFile.mockResolvedValue({ success: false });
    render(localized(message([imageItem()], 'Raw tool error', true)));
    expect((await screen.findByAltText('Original image')).getAttribute('src')).toBe(localAssetUrl('/repo/raw.png'));
    expect(screen.queryByText('Raw tool error')).toBeNull();
  });

  it.each(['text', 'content', 'simple', 'error', 'message'])('localizes known missing-file guidance from %s result shapes', shape => {
    const text = 'items[0].image.path file does not exist: "/repo/missing.png"';
    const result = shape === 'text' ? text : shape === 'content' ? { content: [{ type: 'text', text }] } : shape === 'simple' ? { text } : shape === 'error' ? { error: text } : { message: text };
    const msg = message([], result, true);
    const view = render(localized(msg, 'en'));
    expect(screen.getByText('File not found at "/repo/missing.png". Please verify the file exists and the path is correct.')).toBeTruthy();
    view.rerender(localized(msg));
    expect(screen.getByRole('img', { name: '画像・グラフのエラー' })).toBeTruthy();
    expect(screen.getByText('「/repo/missing.png」にファイルが見つかりません。ファイルが存在し、パスが正しいか確認してください。')).toBeTruthy();
  });

  it.each([
    ['items[2].image.path Raw validation', 'Raw validation'],
    ['Error: items[1]. Raw validation', 'Raw validation'],
    ['Raw service text /token', 'Raw service text /token'],
  ])('preserves external validation details while retaining prefix stripping: %s', (raw, expected) => {
    render(localized(message([], raw, true)));
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it.each([false, true])('translates generated invalid/rejected messages and retains technical path context (error=%s)', isError => {
    const msg = message([{ image: { path: '/repo/raw.png' } }], undefined, isError);
    const view = render(localized(msg, 'en'));
    expect(screen.getByText(isError ? /Server rejected the request/ : /Invalid visual configuration/)).toBeTruthy();
    view.rerender(localized(msg));
    const text = screen.getByRole('img', { name: '画像・グラフのエラー' }).textContent;
    expect(text).toContain(isError ? 'サーバーがリクエストを拒否しました' : 'items配列が存在しないか、形式が正しくありません');
    expect(text).toContain('指定されたパス: items[0].image.path: "/repo/raw.png"');
  });

  it('keeps missing-tool rendering safe when tool data arrives', async () => {
    const view = render(localized({ ...message(), toolCall: undefined }));
    expect(view.container.textContent).toBe('');
    view.rerender(localized(message()));
    expect(await screen.findByAltText('Original image')).toBeTruthy();
  });

  it('translates latched gallery fallback, limits listed paths to three, and retains original paths', async () => {
    faults.gif = true;
    const msg = message([1, 2, 3, 4].map(n => imageItem(`/repo/${n}.gif`, `Raw ${n}`)));
    const view = render(localized(msg, 'en'));
    await screen.findByText(/Failed to render image gallery \(4 images\)/);
    faults.gif = false;
    view.rerender(localized(msg));
    expect(screen.getByText(/画像ギャラリー（4枚）を表示できませんでした/)).toBeTruthy();
    expect(screen.getByText('パス: /repo/1.gif, /repo/2.gif, /repo/3.gif、ほか1件')).toBeTruthy();
    expect(screen.queryByAltText('Raw 1')).toBeNull();
  });
});

describe('visual chart captions and preserved rendering', () => {
  it.each([['bar', '棒グラフ'], ['line', '折れ線グラフ'], ['pie', '円グラフ'], ['area', '面グラフ'], ['scatter', '散布図']])('translates %s ARIA while keeping actual chart data and description', (type, label) => {
    const msg = message([chartItem(type)]);
    const view = render(localized(msg, 'en'));
    const chart = screen.getByRole('img', { name: `${type} chart: Original chart` });
    expect(chart.querySelector('svg')).toBeTruthy();
    view.rerender(localized(msg));
    expect(screen.getByRole('img', { name: `${label}: Original chart` })).toBe(chart);
    expect(screen.getByText('Original chart')).toBeTruthy();
    if (['bar', 'line', 'area'].includes(type)) {
      expect(screen.getAllByText('raw_y').length).toBeGreaterThan(0);
      expect(screen.getAllByText('raw_z').length).toBeGreaterThan(0);
    }
  });

  it('translates the latched chart boundary message without changing raw field names', () => {
    faults.chart = true;
    const msg = message([chartItem()]);
    const view = render(localized(msg, 'en'));
    expect(screen.getByText('Failed to render bar chart. Check that data contains valid "raw_x" and "raw_y, raw_z" fields.')).toBeTruthy();
    faults.chart = false;
    view.rerender(localized(msg));
    expect(screen.getByText('棒グラフを表示できませんでした。データに有効な「raw_x」と「raw_y, raw_z」のフィールドが含まれているか確認してください。')).toBeTruthy();
  });

  it('localizes main boundary content counts when a child fails before its inner boundary', () => {
    const item = chartItem();
    Object.defineProperty(item.chart, 'colors', { get() { throw new Error('Raw config failure'); } });
    const msg = message([item, imageItem()]);
    const view = render(localized(msg, 'en'));
    expect(screen.getByText('Failed to render visual content (1 chart and 1 image).')).toBeTruthy();
    view.rerender(localized(msg));
    expect(screen.getByText('画像・グラフ（グラフ1件と画像1枚）を表示できませんでした。')).toBeTruthy();
  });
});
