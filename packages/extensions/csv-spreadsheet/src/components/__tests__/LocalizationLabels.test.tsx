// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { EditorCore } from '../../editor/editorCore';
import type { ColumnOptions } from '../../editor/gridColumns';
import { generateColumns } from '../../editor/gridColumns';
import type { ConditionalFormat } from '../../conditional/types';
import { ColorPalette } from '../toolbar/ColorPalette';
import { ConditionalFormatPanel } from '../ConditionalFormatPanel';
import { FormulaErrorHoverCard } from '../FormulaErrorHoverCard';
import { ColumnFormatDialog } from '../ColumnFormatDialog';

afterEach(cleanup);

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('spreadsheet accessibility labels and formula errors', () => {
  it.each([
    ['en', '(1,234.57) in red', 'Apply'],
    ['ja', '(1,234.57)(赤)', '適用'],
  ] as const)('renders negative styles and saves their unchanged identifiers in %s', async (language, label, apply) => {
    const i18n = await createI18nInstance(language);
    const onSave = vi.fn();
    render(
      <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
        <ColumnFormatDialog isOpen columnIndex={0} columnLetter="A" currentFormat={{ type: 'number' }} onSave={onSave} onClose={() => undefined} />
      </UiLanguageProvider>,
    );
    const option = screen.getByRole('option', { name: label }) as HTMLOptionElement;
    expect(option.value).toBe('parens-red');
    fireEvent.change(option.closest('select')!, { target: { value: 'parens-red' } });
    fireEvent.click(screen.getByRole('button', { name: apply }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: 'number', negativeStyle: 'parens-red' }));
  });

  it.each([
    ['en', 'Yes / No', 'Checkmark', 'Apply'],
    ['ja', 'はい / いいえ', 'チェックマーク', '適用'],
  ] as const)('renders boolean styles and preserves saved values in %s', async (language, yesNo, check, apply) => {
    const i18n = await createI18nInstance(language);
    const onSave = vi.fn();
    render(
      <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
        <ColumnFormatDialog isOpen columnIndex={0} columnLetter="A" currentFormat={{ type: 'boolean' }} onSave={onSave} onClose={() => undefined} />
      </UiLanguageProvider>,
    );
    const trueFalse = screen.getByRole('option', { name: 'TRUE / FALSE' }) as HTMLOptionElement;
    expect(trueFalse.value).toBe('true-false');
    expect((screen.getByRole('option', { name: check }) as HTMLOptionElement).value).toBe('check');
    const option = screen.getByRole('option', { name: yesNo }) as HTMLOptionElement;
    expect(option.value).toBe('yes-no');
    fireEvent.change(option.closest('select')!, { target: { value: 'yes-no' } });
    fireEvent.click(screen.getByRole('button', { name: apply }));
    expect(onSave).toHaveBeenCalledWith({ type: 'boolean', booleanStyle: 'yes-no' });
  });

  it('localizes theme color names in the palette accessible labels and tooltips', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <ColorPalette value={undefined} kind="fill" onPick={() => undefined} />
      </UiLanguageProvider>,
    );

    const redTheme = screen.getByRole('button', { name: '赤のテーマカラー' });
    expect(redTheme.getAttribute('title')).toBe('赤のテーマカラー');
  });

  it('localizes color-scale picker labels', () => {
    const formats: ConditionalFormat[] = [{
      id: 'scale',
      ranges: ['A1:A3'],
      rule: {
        kind: 'colorScale',
        min: { type: 'min', color: '#000000' },
        mid: { type: 'percentile', value: 50, color: '#888888' },
        max: { type: 'max', color: '#ffffff' },
      },
    }];

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <ConditionalFormatPanel formats={formats} selectionKey="A1" onChange={() => undefined} onClose={() => undefined} />
      </UiLanguageProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '編集' }));

    expect(screen.getByLabelText('最小点 色')).toBeTruthy();
    expect(screen.getByLabelText('中間点 色')).toBeTruthy();
    expect(screen.getByLabelText('最大点 色')).toBeTruthy();
  });

  it('localizes grid column tooltips without changing column identifiers', () => {
    const translate = japaneseI18n.getFixedT('ja', 'editor');
    const options = {
      translate,
      columnCount: 1,
      formulaViewState: { getDisplayValue: () => null },
      decorations: { formatAt: () => undefined, validationAt: () => undefined, hasWrap: false, wraps: () => false, borderCssAt: () => undefined },
      rows: { rowOf: () => 0 },
      conditional: { styleAt: () => null },
      hiddenCols: [0],
    } as unknown as ColumnOptions;
    const hiddenColumn = generateColumns(options)[0] as unknown as {
      prop: string;
      columnTemplate: (h: (tag: string, props: Record<string, unknown>, children?: unknown) => unknown, props: Record<string, unknown>) => { props: Record<string, unknown> };
    };
    const hiddenHeader = hiddenColumn.columnTemplate((_tag, props) => ({ props }), {});
    expect(hiddenColumn.prop).toBe('A');
    expect(hiddenHeader.props.title).toBe('A列は非表示です');

    const visibleColumn = generateColumns({ ...options, hiddenCols: [] })[0] as unknown as {
      columnTemplate: (h: (tag: string, props: Record<string, unknown>, children?: unknown) => unknown, props: Record<string, unknown>) => { children: unknown[] };
    };
    const visibleHeader = visibleColumn.columnTemplate((_tag, props, children) => ({ props, children }), { name: 'A' });
    expect((visibleHeader.children[1] as { props: Record<string, unknown> }).props.title).toBe('この列を絞り込む');
  });

  it('renders formula error hover text in the selected language', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<revogr-data col-type="colPinStart" type="rowPinStart"><div data-rgrow="0" data-rgcol="0">#REF!</div></revogr-data>';
    document.body.appendChild(container);
    const cell = container.querySelector('[data-rgrow]')!;
    const core = {
      gridContainerRef: { current: container },
      rowSpaceRef: { current: { visibleToLogical: (row: number) => row } },
      spreadsheetMetaRef: { current: { getMetadata: () => ({ headerRowCount: 0, frozenRowCount: 0, frozenColumnCount: 0 }) } },
      gridOpsRef: { current: { getCellRawValue: async () => '=#REF!+1' } },
    } as unknown as EditorCore;

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <FormulaErrorHoverCard core={core} enabled />
      </UiLanguageProvider>,
    );
    fireEvent.mouseOver(cell);

    expect(await screen.findByText('無効な参照')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('tooltip').textContent).toContain('数式が削除された行または列を参照しています。'));
  });
});
