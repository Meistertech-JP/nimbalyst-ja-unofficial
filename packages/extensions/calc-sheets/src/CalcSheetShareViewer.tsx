import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { IDisposable } from 'monaco-editor';
import type { EditorHostProps } from '@nimbalyst/extension-sdk';
import { MonacoCodeEditor } from '@nimbalyst/runtime';
import { applyCalcSheetMonaco } from './calcSheetMonaco';
import { evaluateCalcSheet } from './evaluator';
import { parseCalcSheetDocument } from './parser';

const EDITOR_LINE_HEIGHT = 30;

function lineTitle(
  line: ReturnType<typeof parseCalcSheetDocument>['lines'][number],
  evaluation: ReturnType<typeof evaluateCalcSheet>,
  t: ReturnType<typeof useTranslation<'extensions'>>['t'],
): string | undefined {
  if (line.kind === 'binding' && line.binding) {
    const result = evaluation.bindings.get(line.binding.name);
    if (!result) return undefined;
    const parts = [
      t(
        result.classification === 'constant'
          ? 'calc_sheets.constant_tooltip'
          : 'calc_sheets.formula_tooltip',
        { name: line.binding.name },
      ),
    ];
    if (result.dependencies.length > 0) {
      parts.push(t('calc_sheets.depends_tooltip', { dependencies: result.dependencies.join(', ') }));
    }
    if (result.error) {
      parts.push(t('calc_sheets.error_tooltip', { error: result.error }));
    }
    return parts.join('\n');
  }
  if (line.kind === 'assert' && line.assertion) {
    const assertion = evaluation.assertions.find(
      (entry) => entry.expression === line.assertion?.expression,
    );
    if (!assertion) return undefined;
    const parts = [t('calc_sheets.assertion_tooltip', { expression: line.assertion.expression })];
    if (assertion.dependencies.length > 0) {
      parts.push(t('calc_sheets.depends_tooltip', { dependencies: assertion.dependencies.join(', ') }));
    }
    if (assertion.error) {
      parts.push(t('calc_sheets.error_tooltip', { error: assertion.error }));
    }
    return parts.join('\n');
  }
  if (line.parseError) {
    return line.parseError;
  }
  return undefined;
}

export function CalcSheetShareViewer({ host }: EditorHostProps) {
  const { t } = useTranslation('extensions');
  const tRef = useRef(t);
  tRef.current = t;
  const [bodyContent, setBodyContent] = useState<string | null>(null);
  const [initialBodyContent, setInitialBodyContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [theme, setTheme] = useState(host.theme);
  const [lineTops, setLineTops] = useState<number[]>([]);
  const [contentHeight, setContentHeight] = useState(0);
  const frontmatterBlockRef = useRef('');
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);
  const contentListenerRef = useRef<IDisposable | null>(null);
  const scrollListenerRef = useRef<IDisposable | null>(null);
  const contentSizeListenerRef = useRef<IDisposable | null>(null);
  const layoutListenerRef = useRef<IDisposable | null>(null);

  useEffect(() => {
    let mounted = true;

    host.loadContent()
      .then((content) => {
        if (!mounted) return;
        const parsed = parseCalcSheetDocument(content);
        frontmatterBlockRef.current = parsed.frontmatterBlock;
        setBodyContent(parsed.body);
        setInitialBodyContent(parsed.body);
      })
      .catch((error) => {
        if (!mounted) return;
        setLoadError(error instanceof Error ? error.message : tRef.current('calc_sheets.load_failed'));
      });

    return () => {
      mounted = false;
    };
  }, [host]);

  useEffect(() => {
    setTheme(host.theme);
    return host.onThemeChanged((nextTheme) => {
      setTheme(nextTheme);
    });
  }, [host]);

  useEffect(() => {
    return () => {
      contentListenerRef.current?.dispose();
      scrollListenerRef.current?.dispose();
      contentSizeListenerRef.current?.dispose();
      layoutListenerRef.current?.dispose();
    };
  }, []);

  const documentContent = `${frontmatterBlockRef.current}${bodyContent ?? ''}`;
  const parsed = useMemo(() => parseCalcSheetDocument(documentContent), [documentContent]);
  const evaluation = useMemo(
    () => evaluateCalcSheet(parsed.lines, parsed.frontmatter, parsed.lines.length),
    [parsed],
  );

  const title = parsed.frontmatter.title || host.fileName;
  const baseCurrency = parsed.frontmatter.baseCurrency || 'USD';
  const hasLocalChanges = bodyContent !== null && bodyContent !== initialBodyContent;

  const refreshLayout = useCallback((editor: any) => {
    const model = editor?.getModel?.();
    if (!model) {
      setLineTops([]);
      setContentHeight(0);
      return;
    }

    const nextLineTops: number[] = [];
    const lineCount = model.getLineCount();
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      nextLineTops.push(editor.getTopForLineNumber(lineNumber));
    }

    setLineTops(nextLineTops);
    setContentHeight(editor.getContentHeight());
  }, []);

  const attachEditor = useCallback((wrapper: any) => {
    editorRef.current = wrapper;
    const editor = wrapper?.editor;
    const monaco = wrapper?.monaco;
    if (!editor || !monaco) return;

    contentListenerRef.current?.dispose();
    scrollListenerRef.current?.dispose();
    contentSizeListenerRef.current?.dispose();
    layoutListenerRef.current?.dispose();

    applyCalcSheetMonaco(editor, monaco, theme);
    refreshLayout(editor);
    if (gutterRef.current) {
      gutterRef.current.scrollTop = editor.getScrollTop();
    }

    contentListenerRef.current = editor.onDidChangeModelContent(() => {
      setBodyContent(editor.getValue());
      refreshLayout(editor);
    });

    scrollListenerRef.current = editor.onDidScrollChange(() => {
      if (!gutterRef.current) return;
      gutterRef.current.scrollTop = editor.getScrollTop();
    });

    contentSizeListenerRef.current = editor.onDidContentSizeChange(() => {
      refreshLayout(editor);
    });

    layoutListenerRef.current = editor.onDidLayoutChange(() => {
      refreshLayout(editor);
    });
  }, [refreshLayout, theme]);

  useEffect(() => {
    if (editorRef.current?.editor && editorRef.current?.monaco) {
      applyCalcSheetMonaco(editorRef.current.editor, editorRef.current.monaco, theme);
    }
  }, [theme, parsed]);

  if (loadError) {
    return (
      <div className="calc-sheets calc-sheets--error">
        {t('calc_sheets.load_error', { error: loadError })}
      </div>
    );
  }

  if (bodyContent === null || initialBodyContent === null) {
    return <div className="calc-sheets calc-sheets--loading">{t('calc_sheets.loading')}</div>;
  }

  return (
    <div className="calc-sheets">
      <div className="calc-sheets__header">
        <div className="calc-sheets__title-group">
          <div className="calc-sheets__title">{title}</div>
          <div className="calc-sheets__subtitle">
            {t('calc_sheets.share_subtitle')}
          </div>
        </div>
        <div className="calc-sheets__meta">
          <span>{t('calc_sheets.base_currency', { currency: baseCurrency })}</span>
          <span>{t('calc_sheets.errors', { count: evaluation.errorCount })}</span>
          {hasLocalChanges ? <span>{t('calc_sheets.local_edits_active')}</span> : null}
          <button
            type="button"
            className="calc-sheets__action"
            disabled={!hasLocalChanges}
            onClick={() => {
              setBodyContent(initialBodyContent);
              editorRef.current?.setContent?.(initialBodyContent);
              editorRef.current?.editor?.setScrollTop?.(0);
              if (gutterRef.current) {
                gutterRef.current.scrollTop = 0;
              }
              refreshLayout(editorRef.current?.editor);
            }}
          >
            {t('calc_sheets.reset')}
          </button>
        </div>
      </div>

      {parsed.frontmatterError ? (
        <div className="calc-sheets__banner calc-sheets__banner--error">
          {t('calc_sheets.frontmatter_error', { error: parsed.frontmatterError })}
        </div>
      ) : null}

      <div className="calc-sheets__surface">
        <div className="calc-sheets__editor">
          <MonacoCodeEditor
            filePath={host.filePath}
            fileName={host.fileName}
            initialContent={bodyContent}
            theme={theme as any}
            onEditorReady={attachEditor}
            editorOptions={{
              readOnly: false,
              fontSize: 15,
              lineHeight: EDITOR_LINE_HEIGHT,
              fontFamily: "'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace",
              lineNumbers: 'on',
              lineNumbersMinChars: 3,
              minimap: { enabled: false },
              glyphMargin: false,
              folding: false,
              lineDecorationsWidth: 18,
              renderLineHighlight: 'none',
              renderWhitespace: 'none',
              scrollBeyondLastLine: false,
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              wordWrap: 'off',
              tabSize: 2,
              guides: {
                indentation: false,
                highlightActiveIndentation: false,
              },
              padding: { top: 8, bottom: 8 },
            }}
          />
        </div>

        <div className="calc-sheets__gutter" ref={gutterRef} aria-hidden="true">
          <div
            className="calc-sheets__results"
            style={{ height: Math.max(contentHeight, lineTops.length * EDITOR_LINE_HEIGHT) }}
          >
            {parsed.lines.map((line) => {
              const output = evaluation.lineOutputs[line.index] ?? '';
              const classes = ['calc-sheets__result-line', `calc-sheets__result-line--${line.kind}`];
              if (line.parseError || output.includes('ERR') || output.includes('FAIL')) {
                classes.push('calc-sheets__result-line--error');
              }
              return (
                <div
                  key={`${line.index}-${line.raw}`}
                  className={classes.join(' ')}
                  style={{
                    top: lineTops[line.index] ?? (line.index * EDITOR_LINE_HEIGHT),
                    height: EDITOR_LINE_HEIGHT,
                  }}
                  title={lineTitle(line, evaluation, t)}
                >
                  <span className="calc-sheets__result-value">
                    {line.kind === 'section' || line.kind === 'prose' ? '' : output}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
