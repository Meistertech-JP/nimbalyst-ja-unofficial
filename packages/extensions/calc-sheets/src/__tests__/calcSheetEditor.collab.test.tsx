/**
 * Collab-mode gutter tests for CalcSheetEditor.
 *
 * In collab mode the Monaco model (bound to the shared Y.Text) is the source of
 * truth, but the results gutter is derived from a React state value that used
 * to be fed ONLY by `onDidChangeModelContent`. Anything that re-seeded that
 * state from `host.loadContent()` -- which returns the share-time seed, usually
 * empty -- blanked the gutter until the next keystroke.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

const harness = vi.hoisted(() => {
  interface Listener {
    (): void;
  }

  const state: {
    value: string;
    listeners: Record<string, Listener[]>;
    editor: any;
    monaco: any;
    setValue: (next: string) => void;
  } = {
    value: '',
    listeners: {},
    editor: null,
    monaco: null,
    setValue: () => {},
  };

  return { state };
});

vi.mock('@nimbalyst/runtime', async () => {
  const { useEffect } = await import('react');
  return {
    MonacoEditor: ({ onEditorReady, collab }: any) => {
      // Mount-only, like the real editor: re-running on every render would
      // re-register listeners and loop on the layout state updates.
      useEffect(() => {
        onEditorReady?.({ editor: harness.state.editor, monaco: harness.state.monaco });
        collab?.onBindingReady?.({
          editor: harness.state.editor,
          monaco: harness.state.monaco,
          yText: null,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="monaco-stub" />;
    },
    MonacoCodeEditor: () => <div data-testid="monaco-code-stub" />,
  };
});

// Imported after the mock so the stubbed barrel is what the editor picks up.
const { CalcSheetEditor } = await import('../CalcSheetEditor');
const { CalcSheetShareViewer } = await import('../CalcSheetShareViewer');

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeEach(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

const SHEET = ['---', 'title: Demo', '---', 'a = 1', 'b = 2', 'c = a + b'].join('\n');

function buildFakeEditor(initialValue: string) {
  const listeners: Record<string, Array<() => void>> = {};
  const subscribe = (key: string, cb: () => void) => {
    (listeners[key] ??= []).push(cb);
    return { dispose: () => {} };
  };
  const emit = (key: string) => (listeners[key] ?? []).forEach((cb) => cb());

  const model = {
    getLineCount: () => harness.state.value.split('\n').length,
    getLanguageId: () => 'calc-sheet',
  };

  const editor = {
    getValue: () => harness.state.value,
    getModel: () => model,
    setHiddenAreas: vi.fn(),
    getTopForLineNumber: (lineNumber: number) => (lineNumber - 1) * 30,
    getContentHeight: () => model.getLineCount() * 30,
    getScrollTop: () => 0,
    getSelection: () => null,
    onDidChangeModelContent: (cb: () => void) => subscribe('content', cb),
    onDidScrollChange: (cb: () => void) => subscribe('scroll', cb),
    onDidContentSizeChange: (cb: () => void) => subscribe('contentSize', cb),
    onDidLayoutChange: (cb: () => void) => subscribe('layout', cb),
    onDidChangeCursorSelection: (cb: () => void) => subscribe('selection', cb),
  };

  const monaco = {
    Range: class {
      constructor(
        public startLineNumber: number,
        public startColumn: number,
        public endLineNumber: number,
        public endColumn: number,
      ) {}
    },
    languages: {
      getLanguages: () => [{ id: 'calc-sheet' }],
      register: vi.fn(),
      setTokensProvider: vi.fn(),
    },
    editor: {
      defineTheme: vi.fn(),
      setModelLanguage: vi.fn(),
      setTheme: vi.fn(),
    },
  };

  harness.state.value = initialValue;
  harness.state.editor = editor;
  harness.state.monaco = monaco;
  harness.state.setValue = (next: string) => {
    harness.state.value = next;
    emit('content');
    emit('contentSize');
  };
}

/** Collab host: `loadContent` only ever returns the share-time seed. */
function buildCollabHost(seed: string) {
  return {
    filePath: '/tmp/demo.calc.md',
    fileName: 'demo.calc.md',
    theme: 'light',
    isActive: true,
    readOnly: false,
    collaboration: { documentId: 'doc-1' },
    loadContent: async () => seed,
    onThemeChanged: () => () => {},
    onFileChanged: () => () => {},
    onReadOnlyChanged: () => () => {},
    setEditorContextItems: vi.fn(),
    setDirty: vi.fn(),
    saveContent: async () => {},
  } as any;
}

function gutterValues(): string[] {
  return Array.from(document.querySelectorAll('.calc-sheets__result-value')).map(
    (node) => node.textContent ?? '',
  );
}

describe('CalcSheetEditor collab gutter', () => {
  beforeEach(() => {
    buildFakeEditor(SHEET);
  });

  it('renders results from an already-populated model instead of the empty seed', async () => {
    // A remount reuses the Monaco model keyed by file path, so the model
    // already holds the synced document before any change event fires.
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <CalcSheetEditor host={buildCollabHost('')} />
      </UiLanguageProvider>,
    );

    await screen.findByTestId('monaco-stub');
    await waitFor(() => {
      expect(gutterValues().join(' ')).toContain('3');
    });
  });

  it('keeps results when the host is recreated after sync', async () => {
    const { rerender } = render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <CalcSheetEditor host={buildCollabHost('')} />
      </UiLanguageProvider>,
    );
    await screen.findByTestId('monaco-stub');

    // An edit repopulates state via the model change listener...
    harness.state.setValue(SHEET);
    await waitFor(() => expect(gutterValues().join(' ')).toContain('3'));

    // ...then the tab re-creates its host (activation, sync status, dirty
    // bookkeeping). The gutter must not fall back to the empty seed.
    rerender(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <CalcSheetEditor host={buildCollabHost('')} />
      </UiLanguageProvider>,
    );
    // Let the re-run of the `loadContent` effect settle before asserting.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(gutterValues().join(' ')).toContain('3');
  });

  it('localizes the results label and fixed tooltip text', async () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <CalcSheetEditor host={buildCollabHost(SHEET)} />
      </UiLanguageProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector('[aria-label="計算結果"]')).toBeTruthy();
    });
    await waitFor(() => {
      expect(document.querySelector('.calc-sheets__result-line[title^="定数"]')).toBeTruthy();
      expect(document.querySelector('.calc-sheets__result-line[title^="数式"]')).toBeTruthy();
    });
  });

  it('localizes the shared viewer summary and actions', async () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <CalcSheetShareViewer host={buildCollabHost(SHEET)} />
      </UiLanguageProvider>,
    );

    expect(await screen.findByText('共有された計算シートです。ここでの編集内容は結果に反映されますが、元のファイルには保存されません。'))
      .toBeTruthy();
    expect(screen.getByText('基準通貨: USD')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'リセット' })).toBeTruthy();
  });
});
