import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const lexical = vi.hoisted(() => ({
  nodes: new Map<string, any>(),
  selection: null as any,
}));
vi.mock('lexical', () => ({
  $getRoot: () => ({ getChildren: () => [...lexical.nodes.values()] }),
  $getNodeByKey: (key: string) => lexical.nodes.get(key),
  $isTextNode: (node: any) => typeof node.getTextContent === 'function',
  $createRangeSelection: () => ({ anchor: { set: vi.fn() }, focus: { set: vi.fn() } }),
  $setSelection: (selection: any) => { lexical.selection = selection; },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, values?: any) =>
    key === 'search.match_position' ? `${values.current}/${values.total}` : key }),
}));

import { SearchReplaceBar } from '../SearchReplaceBar';
import { HighlightManager, MAX_RENDERED_HIGHLIGHTS } from '../HighlightManager';
import { SearchReplaceStateManager } from '../SearchReplaceStateManager';

const tabId = '/search-regression.md';

function createEditor(count = 2501) {
  const parent = document.createElement('div');
  const root = document.createElement('div');
  parent.appendChild(root);
  document.body.appendChild(parent);
  const elements = new Map<string, HTMLElement>();
  const listeners = new Set<(payload: any) => void>();
  for (let index = 0; index < count; index++) {
    const key = `match-${index}`;
    let text = `- R20TOKEN item ${index + 1}`;
    const span = document.createElement('span');
    span.dataset.index = String(index);
    span.textContent = text;
    lexical.nodes.set(key, {
      getKey: () => key,
      getTextContent: () => text,
      setTextContent: (value: string) => { text = value; span.textContent = value; },
    });
    span.scrollIntoView = vi.fn();
    root.appendChild(span);
    elements.set(key, span);
  }
  const editorState = { read: (fn: () => void) => fn() };
  const emitUpdate = () => listeners.forEach(listener => listener({ editorState }));
  const editor = {
    getRootElement: () => root,
    getElementByKey: (key: string) => elements.get(key) ?? null,
    getEditorState: () => editorState,
    registerUpdateListener: (listener: (payload: any) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update: (fn: () => void) => { fn(); emitUpdate(); },
  } as any;
  return { editor, parent, elements, emitUpdate };
}

function highlightedTops(parent: HTMLElement) {
  return [...parent.querySelectorAll<HTMLElement>('.search-highlight, .search-highlight-current')]
    .map(element => Number.parseFloat(element.style.top));
}

describe('SearchReplaceBar committed highlight state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    lexical.nodes.clear();
    lexical.selection = null;
    SearchReplaceStateManager.clearState(tabId);
    SearchReplaceStateManager.open(tabId);
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    Range.prototype.getClientRects = vi.fn(function (this: Range) {
      const index = Number(this.startContainer.parentElement!.dataset.index);
      return [{ left: 10, top: index * 20, width: 40, height: 16 }] as any;
    });
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    SearchReplaceStateManager.clearState(tabId);
    vi.restoreAllMocks();
    delete (Range.prototype as any).getClientRects;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('retains the last 2501-match window after previous-wrap and a selection update', () => {
    const { editor, parent, elements, emitUpdate } = createEditor();
    const draw = vi.spyOn(HighlightManager.prototype, 'updateHighlights');
    render(<SearchReplaceBar filePath={tabId} fileName="search-regression.md" editor={editor} />);
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'TOKEN' } });
    act(() => { vi.advanceTimersByTime(151); });
    expect(screen.getByTestId('match-counter').textContent).toBe('1/2501');

    fireEvent.click(screen.getByRole('button', { name: 'search.previous_match' }));
    expect(screen.getByTestId('match-counter').textContent).toBe('2501/2501');
    expect(lexical.selection.anchor.set).toHaveBeenCalledWith('match-2500', 5, 'text');
    expect(lexical.selection.focus.set).toHaveBeenCalledWith('match-2500', 10, 'text');
    expect(elements.get('match-2500')!.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });

    // A selection update schedules re-search. Drain its zero-delay work in the same
    // batch, before React commits queued state updaters: drawing must not depend on
    // a side effect inside one of those updaters having already run.
    act(() => { emitUpdate(); vi.advanceTimersByTime(101); });
    expect(screen.getByTestId('match-counter').textContent).toBe('2501/2501');
    expect(draw.mock.calls.every(([, index]) => Number.isFinite(index))).toBe(true);
    expect(highlightedTops(parent)).toHaveLength(MAX_RENDERED_HIGHLIGHTS);
    expect(highlightedTops(parent)).toEqual(Array.from({ length: 1000 }, (_, i) => (1501 + i) * 20));
    expect(parent.querySelector<HTMLElement>('.search-highlight-current')!.style.top).toBe('50000px');
    expect((screen.getByTestId('search-input') as HTMLInputElement).value).toBe('TOKEN');
    expect(elements.get('match-2500')!.scrollIntoView).toHaveBeenCalledTimes(1);
    const drawCount = draw.mock.calls.length;
    act(() => { vi.advanceTimersByTime(10000); });
    expect(draw).toHaveBeenCalledTimes(drawCount);

    fireEvent.click(screen.getByRole('button', { name: 'search.next_match' }));
    act(() => { vi.advanceTimersByTime(101); });
    expect(screen.getByTestId('match-counter').textContent).toBe('1/2501');
    expect(highlightedTops(parent)[0]).toBe(0);
  });

  it('does not resurrect queued highlights after closing the bar', () => {
    const { editor, parent } = createEditor(2);
    render(<SearchReplaceBar filePath={tabId} fileName="search-regression.md" editor={editor} />);
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'TOKEN' } });
    act(() => { SearchReplaceStateManager.close(tabId); });
    act(() => { vi.advanceTimersByTime(151); });
    expect(highlightedTops(parent)).toEqual([]);
  });

  it('clears highlights when the query is emptied without changing editor content', () => {
    const { editor, parent } = createEditor(2);
    render(<SearchReplaceBar filePath={tabId} fileName="search-regression.md" editor={editor} />);
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'TOKEN' } });
    act(() => { vi.advanceTimersByTime(151); });
    expect(highlightedTops(parent)).toHaveLength(2);
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: '' } });
    act(() => { vi.advanceTimersByTime(151); });
    expect(highlightedTops(parent)).toEqual([]);
  });

  it('redraws committed matches after replacing the selected match', () => {
    const { editor, parent } = createEditor(2);
    render(<SearchReplaceBar filePath={tabId} fileName="search-regression.md" editor={editor} />);
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'TOKEN' } });
    act(() => { vi.advanceTimersByTime(151); });
    fireEvent.click(screen.getByRole('button', { name: 'search.replace' }));
    act(() => { vi.advanceTimersByTime(151); });
    expect(lexical.nodes.get('match-0').getTextContent()).toBe('- R20 item 1');
    expect(screen.getByTestId('match-counter').textContent).toBe('1/1');
    expect(highlightedTops(parent)).toEqual([20]);
  });
});
