// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SelectionChips } from '../SelectionChips';
import { clearTextSelection, getTextSelection, setTextSelection } from '../TextSelectionIndicator';
import {
  clearEditorContext,
  getActiveEditorContextItems,
  setEditorContextItems,
} from '../../../stores/editorContextStore';
const FILE = '/test/diagram.excalidraw';
const OTHER_FILE = '/test/other.excalidraw';
const COLLAB_FILE = 'collab://org:o:doc:shared.md';
let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

async function renderChips(currentFilePath?: string, i18n = englishI18n, currentFileName?: string) {
  return render(
    <SelectionChips currentFilePath={currentFilePath} currentFileName={currentFileName} />,
    { wrapper: ({ children }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider> },
  );
}

beforeEach(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => {
  cleanup();
  clearTextSelection();
  clearEditorContext(FILE);
  clearEditorContext(OTHER_FILE);
  clearEditorContext(COLLAB_FILE);
  delete (window as any).__mockupFilePath;
  delete (window as any).__mockupSelectedElement;
  delete (window as any).__mockupDrawing;
  delete (window as any).__mockupAnnotationTimestamp;
});

describe('SelectionChips', () => {
  it('keeps the named document context when its selection is removed', async () => {
    const { rerender } = await renderChips(FILE, englishI18n, 'Architecture');
    act(() => setTextSelection('  First line\n\tsecond line  ', FILE));
    expect(screen.getByText(': “First line second line”').textContent).toBe(': “First line second line”');
    expect(getTextSelection()?.text).toBe('  First line\n\tsecond line  ');
    fireEvent.click(screen.getByLabelText('Remove Selection from context'));
    expect(getTextSelection()).toBeNull();
    expect(screen.getByText('Architecture').textContent).toBe('Architecture');

    act(() => setTextSelection('Previous page selection', FILE));
    rerender(<SelectionChips currentFilePath={COLLAB_FILE} currentFileName="Team handbook" />);
    expect(screen.queryByText('Architecture')).toBeNull();
    expect(screen.queryByText('Selection')).toBeNull();
    expect(screen.getByText('Team handbook').textContent).toBe('Team handbook');
    rerender(<SelectionChips />);
    expect(screen.queryByText('Team handbook')).toBeNull();
  });

  it('reacts to text-selection events and removes the selection immediately', async () => {
    await renderChips(FILE);
    expect(screen.queryByText('Selection')).toBeNull();

    act(() => setTextSelection('selected text', FILE));
    screen.getByText('Selection');

    fireEvent.click(screen.getByLabelText('Remove Selection from context'));
    expect(screen.queryByText('Selection')).toBeNull();
  });

  it('does not show a selection when the panel has no currentFilePath (prevents cross-mode leak)', async () => {
    // A panel with no active document (e.g. the agent chat with no editor tab)
    // must NOT surface a selection made in another mode. Strict scoping: no
    // currentFilePath -> no chip, even if a selection is stored.
    await renderChips();
    act(() => setTextSelection('selected text', COLLAB_FILE));
    expect(screen.queryByText('Selection')).toBeNull();
  });

  it('shows the selection when currentFilePath matches the selection file', async () => {
    await renderChips(COLLAB_FILE);
    expect(screen.queryByText('Selection')).toBeNull();

    act(() => setTextSelection('selected text', COLLAB_FILE));
    screen.getByText('Selection');
  });

  it('localizes text-selection labels and tooltips in Japanese', async () => {
    await renderChips(FILE, japaneseI18n);
    act(() => setTextSelection('選択されたテキスト', FILE));

    expect(screen.getByText('選択範囲')).toBeDefined();
    expect(screen.getByTitle('選択したテキストが含まれます: 「選択されたテキスト」')).toBeDefined();
    expect(screen.getByRole('button', { name: '選択範囲をコンテキストから除外' })).toBeDefined();
  });

  it('localizes the current document context without translating its title or path', async () => {
    const { rerender } = await renderChips(FILE, japaneseI18n, 'Architecture');
    screen.getByText('コンテキスト:');
    screen.getByTitle(`メッセージに含まれます: ${FILE}`);
    expect(screen.getByText('Architecture').textContent).toBe('Architecture');

    await act(async () => { await japaneseI18n.changeLanguage('en'); });
    screen.getByText('Context:');
    screen.getByTitle(`Included with your message: ${FILE}`);
    expect(screen.getByText('Architecture').textContent).toBe('Architecture');

    rerender(<SelectionChips currentFilePath={COLLAB_FILE} currentFileName="Team handbook" />);
    expect(screen.queryByText('Architecture')).toBeNull();
    screen.getByTitle(`Included with your message: ${COLLAB_FILE}`);
    screen.getByText('Team handbook');
  });

  it('does not show a selection belonging to a different file when currentFilePath is set', async () => {
    await renderChips(FILE);

    act(() => setTextSelection('selection from another doc', OTHER_FILE));
    expect(screen.queryByText('Selection')).toBeNull();
  });

  it('dismisses and restores an extension item without sending it while hidden', async () => {
    act(() => {
      setEditorContextItems(FILE, [{ id: 'a', label: 'Rectangle A', description: 'A rectangle' }]);
    });
    await renderChips(FILE);

    fireEvent.click(screen.getByLabelText('Remove Rectangle A from context'));
    expect(screen.queryByText('Rectangle A')).toBeNull();
    screen.getByText('1 hidden — restore');
    expect(getActiveEditorContextItems(FILE)).toBeUndefined();

    fireEvent.click(screen.getByText('1 hidden — restore'));
    screen.getByText('Rectangle A');
    expect(getActiveEditorContextItems(FILE)?.[0].id).toBe('a');
  });

  it('localizes removal and restore affordances while preserving user labels', async () => {
    act(() => {
      setEditorContextItems(FILE, [{ id: 'a', label: 'Rectangle A', description: 'A rectangle' }]);
    });
    const japaneseI18n = await createI18nInstance('ja');
    await renderChips(FILE, japaneseI18n);

    fireEvent.click(screen.getByLabelText('Rectangle Aをコンテキストから除外'));
    screen.getByText('1件を非表示中 — 再表示');
  });

  it('scopes extension items to the active file', async () => {
    act(() => {
      setEditorContextItems(FILE, [{ id: 'a', label: 'Current file', description: 'current' }]);
      setEditorContextItems(OTHER_FILE, [{ id: 'b', label: 'Other file', description: 'other' }]);
    });

    await renderChips(FILE);
    screen.getByText('Current file');
    expect(screen.queryByText('Other file')).toBeNull();
  });

  it('shows a collab spreadsheet cell selection when the panel is scoped to that doc', async () => {
    // A collaborative spreadsheet publishes its selected-cell context keyed by
    // the collab doc path; the collab chat panel scopes to that same path.
    act(() => {
      setEditorContextItems(COLLAB_FILE, [{ id: 'c1', label: 'Cells A1:B2', description: '4 cells' }]);
    });

    await renderChips(COLLAB_FILE);
    screen.getByText('Cells A1:B2');
  });

  it('does not leak an extension selection into a panel with no currentFilePath', async () => {
    // Regression: switching from collab (spreadsheet) to agent mode must not
    // carry the spreadsheet's cell chip into the agent panel.
    act(() => {
      setEditorContextItems(COLLAB_FILE, [{ id: 'c1', label: 'Cells A1:B2', description: '4 cells' }]);
    });

    await renderChips();
    expect(screen.queryByText('Cells A1:B2')).toBeNull();
  });

  it('collapses large groups and can expand them', async () => {
    act(() => {
      setEditorContextItems(
        FILE,
        Array.from({ length: 8 }, (_, index) => ({
          id: String(index),
          label: `Shape ${index + 1}`,
          description: `Shape ${index + 1}`,
          groupLabel: 'shapes',
        }))
      );
    });

    await renderChips(FILE);
    screen.getByText('Shape 5');
    expect(screen.queryByText('Shape 6')).toBeNull();

    fireEvent.click(screen.getByLabelText('Show 3 more shapes'));
    screen.getByText('Shape 8');
    screen.getByLabelText('Show fewer shapes');
  });
});
