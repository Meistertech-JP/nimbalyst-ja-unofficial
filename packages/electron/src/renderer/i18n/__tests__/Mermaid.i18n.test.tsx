import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, type LexicalEditor } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import MermaidComponent from '../../../../../runtime/src/editor/plugins/MermaidPlugin/MermaidComponent';
import { $createMermaidNode, MermaidNode } from '../../../../../runtime/src/editor/plugins/MermaidPlugin/MermaidNode';

const mocks = vi.hoisted(() => ({ render: vi.fn(), initialize: vi.fn(), bind: vi.fn(), failTheme: false }));
vi.mock('mermaid', () => ({ default: { render: mocks.render, initialize: mocks.initialize } }));
vi.mock('../../../../../runtime/src/editor/context/ThemeContext', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../../../runtime/src/editor/context/ThemeContext')>();
  return { ...actual, useTheme: () => { if (mocks.failTheme) throw new Error('Injected theme boundary failure'); return actual.useTheme(); } };
});
const locale = i18next.createInstance();
const originalCode = 'graph TD\n  A[Raw Start] --> B[Raw end 日本語]';
let editor: LexicalEditor;
let nodeKey: string;
let savedTheme: string | null;
let savedClass: string;
const config = {
  namespace: 'mermaid-i18n', nodes: [MermaidNode], onError: (error: Error) => { throw error; },
  editorState: () => {
    const node = $createMermaidNode({ content: originalCode });
    nodeKey = node.getKey();
    $getRoot().append(node);
  },
};
function Body({ content }: { content: string }) {
  [editor] = useLexicalComposerContext();
  return <MermaidComponent content={content} nodeKey={nodeKey} className="raw-extension-class" />;
}
function current(language: string | null = 'ja', content = originalCode) {
  const child = <LexicalComposer initialConfig={config}><Body content={content} /></LexicalComposer>;
  if (language === null) return child;
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{child}</RuntimeTranslationProvider>;
}
const tick = async (ms = 500) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const storedCode = () => editor.getEditorState().read(() => $getRoot().getFirstChildOrThrow<MermaidNode>().getContent());
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  savedTheme = document.documentElement.getAttribute('data-theme'); savedClass = document.documentElement.className;
  document.documentElement.setAttribute('data-theme', 'light'); document.documentElement.className = '';
  mocks.failTheme = false; mocks.render.mockReset(); mocks.initialize.mockClear(); mocks.bind.mockClear();
  mocks.render.mockResolvedValue({ svg: '<svg><text>Raw diagram label 日本語</text></svg>', bindFunctions: mocks.bind });
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); mocks.failTheme = false;
  if (savedTheme === null) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', savedTheme);
  document.documentElement.className = savedClass;
});

describe('Mermaid localization while retaining rendering and node content', () => {
  it('updates labels/loading/title without redrawing or changing source on a locale change', async () => {
    const view = render(current('en'));
    expect(screen.getByText('Mermaid Diagram')).toBeTruthy(); expect(screen.getByText('Loading diagram...')).toBeTruthy();
    const redraw = screen.getByTitle('Redraw diagram');
    view.rerender(current());
    expect(screen.getByText('Mermaid図')).toBeTruthy(); expect(screen.getByText('図を読み込み中…')).toBeTruthy();
    expect(screen.getByTitle('図を再描画')).toBe(redraw);
    await tick();
    expect(mocks.render).toHaveBeenCalledWith(expect.stringMatching(/^mermaid_\w+_0_\d+$/), originalCode);
    expect(mocks.bind).toHaveBeenCalledWith(document.querySelector('.mermaid-render-container'));
    expect(screen.getByText('Raw diagram label 日本語')).toBeTruthy();
    const original = editor.getEditorState().toJSON(); const initialized = mocks.initialize.mock.calls.length;
    view.rerender(current('en')); await tick(1000);
    expect(mocks.render).toHaveBeenCalledTimes(1); expect(mocks.initialize).toHaveBeenCalledTimes(initialized);
    expect(editor.getEditorState().toJSON()).toEqual(original);
    expect(document.querySelector('.raw-extension-class')).not.toBeNull();
  });

  it('preserves redraw IDs and the source passed to Mermaid', async () => {
    render(current()); await tick();
    fireEvent.click(screen.getByRole('button', { name: '再描画' })); await tick();
    expect(mocks.render).toHaveBeenCalledTimes(2);
    expect(mocks.render.mock.calls[0][0]).not.toBe(mocks.render.mock.calls[1][0]);
    expect(mocks.render.mock.calls[1][1]).toBe(originalCode); expect(storedCode()).toBe(originalCode);
  });

  it('keeps raw edit drafts and preview through locale changes, saving on blur and Done', async () => {
    const view = render(current('en')); await tick();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const input = screen.getByPlaceholderText('Enter Mermaid diagram code...') as HTMLTextAreaElement;
    const draft = 'graph LR\n A[Untranslated user text] --> B[日本語]';
    fireEvent.change(input, { target: { value: draft } });
    view.rerender(current());
    expect(screen.getByPlaceholderText('Mermaidの図のコードを入力…')).toBe(input); expect(input.value).toBe(draft);
    expect(storedCode()).toBe(originalCode); await tick();
    expect(mocks.render.mock.calls.at(-1)?.[1]).toBe(draft);
    await act(async () => fireEvent.blur(input)); expect(storedCode()).toBe(draft);
    fireEvent.change(input, { target: { value: draft + '\n B --> C[Raw third]' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: locale.getFixedT('ja')('common:walkthrough.done') })));
    expect(screen.queryByRole('textbox')).toBeNull(); expect(storedCode()).toBe(draft + '\n B --> C[Raw third]');
  });

  it('debounces edits and retains the upstream first-mount-only content behavior', async () => {
    const view = render(current('en'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'graph TD\n A --> B' } }); await tick(250);
    fireEvent.change(input, { target: { value: 'graph LR\n X --> Y' } }); await tick(499);
    expect(mocks.render).not.toHaveBeenCalled();
    view.rerender(current('ja', 'Raw externally changed content'));
    expect(input.value).toBe('graph LR\n X --> Y'); await tick(1);
    expect(mocks.render).toHaveBeenCalledTimes(1); expect(mocks.render.mock.calls[0][1]).toBe('graph LR\n X --> Y');
    expect(storedCode()).toBe(originalCode);
  });

  it.each([
    ['string', 'Raw syntax error', 'Raw syntax error', 'Raw syntax error'],
    ['message', { message: 'Raw message error' }, 'Raw message error', 'Raw message error'],
    ['parser str', { str: 'Raw parser details' }, 'Raw parser details', 'Raw parser details'],
    ['hash text', { hash: { text: 'A --> ?' } }, 'Parse error near: A --> ?', '次の箇所付近に構文エラーがあります: A --> ?'],
    ['json', { raw: 'Original error JSON' }, '{\n  "raw": "Original error JSON"\n}', '{\n  "raw": "Original error JSON"\n}'],
    ['empty object', {}, 'Failed to render diagram', '図の描画に失敗しました'],
    ['primitive', 7, 'Failed to render diagram', '図の描画に失敗しました'],
    ['null', null, 'null', 'null'],
    ['same text as internal error', new Error('Failed to load mermaid module'), 'Failed to load mermaid module', 'Failed to load mermaid module'],
  ])('retains %s details and translates only generated error framing', async (_name, error, english, japanese) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.render.mockRejectedValue(error);
    const view = render(current('en')); await tick();
    expect(screen.getByText('Diagram Error:')).toBeTruthy();
    expect(document.querySelector('.mermaid-error pre')?.textContent).toBe(english);
    view.rerender(current()); await tick(1000);
    expect(screen.getByText('図のエラー:')).toBeTruthy();
    expect(document.querySelector('.mermaid-error pre')?.textContent).toBe(japanese);
    expect(mocks.render).toHaveBeenCalledTimes(1); expect(log).toHaveBeenCalledExactlyOnceWith('Mermaid render error:', error);
    expect(storedCode()).toBe(originalCode);
  });

  it('preserves cyclic-error fallback and an empty-string error remaining hidden', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const cyclic: { self?: unknown } = {}; cyclic.self = cyclic;
    mocks.render.mockRejectedValueOnce(cyclic).mockRejectedValueOnce('');
    render(current()); await tick(); expect(screen.getByText('図の描画に失敗しました')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '再描画' })); await tick();
    expect(document.querySelector('.mermaid-error')).toBeNull();
  });

  it('retains theme-triggered rendering and initialization but not locale-triggered rendering', async () => {
    const view = render(current('en')); await tick();
    await act(async () => document.documentElement.setAttribute('data-theme', 'dark')); await tick();
    expect(mocks.initialize).toHaveBeenLastCalledWith({ startOnLoad: false, theme: 'dark', securityLevel: 'antiscript', fontFamily: 'monospace' });
    const renderCount = mocks.render.mock.calls.length; const initCount = mocks.initialize.mock.calls.length;
    await act(async () => document.documentElement.setAttribute('data-theme', 'crystal-dark'));
    view.rerender(current()); await tick();
    expect(mocks.render).toHaveBeenCalledTimes(renderCount); expect(mocks.initialize).toHaveBeenCalledTimes(initCount);
  });

  it('discards stale render completion without rebinding or replacing the current SVG', async () => {
    let resolve!: (result: { svg: string; bindFunctions: () => void }) => void;
    mocks.render.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    render(current('en')); await tick();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'graph TD\n New --> Content' } });
    await tick();
    const staleBind = vi.fn();
    await act(async () => resolve({ svg: '<svg><text>Stale diagram</text></svg>', bindFunctions: staleBind }));
    expect(screen.queryByText('Stale diagram')).toBeNull(); expect(staleBind).not.toHaveBeenCalled();
    expect(screen.getByText('Raw diagram label 日本語')).toBeTruthy();
  });

  it('keeps the existing error-boundary latch while translating its fallback', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); mocks.failTheme = true;
    const view = render(current('en')); expect(screen.getByText('Failed to render Mermaid diagram')).toBeTruthy();
    mocks.failTheme = false; view.rerender(current());
    expect(screen.getByText('Mermaid図の描画に失敗しました')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '再描画' }));
    expect(screen.getByText('Mermaid図の描画に失敗しました')).toBeTruthy(); expect(mocks.render).not.toHaveBeenCalled();
  });

  it('cancels the pending debounce on unmount and keeps providerless English defaults', async () => {
    const view = render(current(null));
    expect(screen.getByText('Mermaid Diagram')).toBeTruthy(); expect(screen.getByText('Loading diagram...')).toBeTruthy();
    expect(screen.getByTitle('Redraw diagram')).toBeTruthy();
    view.unmount(); await tick(1000); expect(mocks.render).not.toHaveBeenCalled();
  });
});
