import { createRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { FUNCTION_CATALOG } from '../../formula/functionCatalog';
import { getFormulaAutocomplete } from '../../formula/formulaAssist';
import { FormulaAssistPopover } from '../FormulaAssistPopover';
import { FormulaBar, type FormulaBarHandle } from '../FormulaBar';

function Harness({ onAccept, onDismiss, onEditorKey, formula = '=COU', names }: {
  onAccept: (name: string) => void;
  onDismiss: () => void;
  onEditorKey: (key: string) => void;
  formula?: string;
  names?: Record<string, string>;
}) {
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  return (
    <>
      <input ref={setInput} defaultValue={formula} onKeyDown={(event) => onEditorKey(event.key)} />
      <FormulaAssistPopover
        anchor={input}
        autocomplete={getFormulaAutocomplete(formula, formula.length, undefined, names)}
        signatureHelp={null}
        onAccept={(entry) => onAccept(entry.name)}
        onDismiss={onDismiss}
      />
    </>
  );
}

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

function renderBar(ui: React.ReactElement, i18n = englishI18n) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe('FormulaAssistPopover localization', () => {
  it('localizes named-range descriptions and preserves the accepted name', () => {
    const onAccept = vi.fn();
    const view = renderBar(
      <Harness formula="=Sales" names={{ Sales: 'B2:B4' }} onAccept={onAccept} onDismiss={vi.fn()} onEditorKey={vi.fn()} />,
      japaneseI18n,
    );
    expect(view.getAllByText('名前付き範囲: B2:B4').length).toBeGreaterThan(0);
    fireEvent.keyDown(view.getByRole('textbox'), { key: 'Enter' });
    expect(onAccept).toHaveBeenCalledWith('Sales');
  });
  it('translates the list label and formula category in Japanese', () => {
    const { getByRole, getAllByText } = renderBar(
      <Harness onAccept={vi.fn()} onDismiss={vi.fn()} onEditorKey={vi.fn()} />,
      japaneseI18n,
    );

    expect(getByRole('listbox', { name: '関数' })).toBeTruthy();
    expect(getAllByText('統計').length).toBeGreaterThan(0);
    expect(getAllByText('引数に含まれる数値の個数を数えます。').length).toBeGreaterThan(0);
    fireEvent.keyDown(getByRole('textbox'), { key: 'ArrowDown' });
    expect(getAllByText('引数に含まれる空でない値の個数を数えます。').length).toBeGreaterThan(0);
  });

  it('retains English formula descriptions in English', () => {
    const { getAllByText } = renderBar(
      <Harness onAccept={vi.fn()} onDismiss={vi.fn()} onEditorKey={vi.fn()} />,
      englishI18n,
    );

    expect(getAllByText('Counts the numbers in its arguments.').length).toBeGreaterThan(0);
  });

  it('translates logical, lookup, and information function descriptions', () => {
    const common = { onAccept: vi.fn(), onDismiss: vi.fn(), onEditorKey: vi.fn() };
    const logical = renderBar(<Harness {...common} formula="=IF" />, japaneseI18n);
    expect(logical.getAllByText('条件がTRUEの場合は一方の値を、FALSEの場合はもう一方の値を返します。').length).toBeGreaterThan(0);
    logical.unmount();

    const lookup = renderBar(<Harness {...common} formula="=VLOOK" />, japaneseI18n);
    expect(lookup.getAllByText('表の最左列で値を検索し、指定した列にある値を返します。').length).toBeGreaterThan(0);
    lookup.unmount();

    const information = renderBar(<Harness {...common} formula="=ISNA" />, japaneseI18n);
    expect(information.getAllByText('値が#N/Aの場合にTRUEを返します。').length).toBeGreaterThan(0);
  });

  it('has matching English and Japanese description keys for these catalog sections', () => {
    const en = englishI18n.getResourceBundle('en', 'editor') as any;
    const ja = japaneseI18n.getResourceBundle('ja', 'editor') as any;
    const names = [...FUNCTION_CATALOG.values()]
      .filter((entry) => ['logical', 'lookup', 'information'].includes(entry.category))
      .map((entry) => entry.name);

    for (const name of names) {
      expect(en.spreadsheet_ui.formula_assist.descriptions[name]).toBe(FUNCTION_CATALOG.get(name)?.description);
      expect(ja.spreadsheet_ui.formula_assist.descriptions[name]).toEqual(expect.any(String));
      expect(ja.spreadsheet_ui.formula_assist.descriptions[name].length).toBeGreaterThan(0);
    }
  });

  it('translates representative math descriptions and keeps every Math key in parity', () => {
    const common = { onAccept: vi.fn(), onDismiss: vi.fn(), onEditorKey: vi.fn() };
    const sum = renderBar(<Harness {...common} formula="=SUM" />, japaneseI18n);
    expect(sum.getAllByText('引数を合計します。').length).toBeGreaterThan(0);
    sum.unmount();

    const trig = renderBar(<Harness {...common} formula="=COS" />, japaneseI18n);
    expect(trig.getAllByText('ラジアン単位の角度の余弦を返します。').length).toBeGreaterThan(0);
    trig.unmount();

    const en = englishI18n.getResourceBundle('en', 'editor') as any;
    const ja = japaneseI18n.getResourceBundle('ja', 'editor') as any;
    const mathEntries = [...FUNCTION_CATALOG.values()].filter((entry) => entry.category === 'math');
    expect(mathEntries).toHaveLength(72);
    for (const entry of mathEntries) {
      expect(en.spreadsheet_ui.formula_assist.descriptions[entry.name]).toBe(entry.description);
      expect(ja.spreadsheet_ui.formula_assist.descriptions[entry.name]).toEqual(expect.any(String));
      expect(ja.spreadsheet_ui.formula_assist.descriptions[entry.name].length).toBeGreaterThan(0);
    }
  });

  it('translates statistical descriptions, retains English, and keeps every Statistical key in parity', () => {
    const common = { onAccept: vi.fn(), onDismiss: vi.fn(), onEditorKey: vi.fn() };
    const average = renderBar(<Harness {...common} formula="=AVERAGE" />, japaneseI18n);
    expect(average.getAllByText('引数の算術平均を返します。').length).toBeGreaterThan(0);
    average.unmount();

    const countif = renderBar(<Harness {...common} formula="=COUNTIF" />, japaneseI18n);
    expect(countif.getAllByText('条件を満たすセルの個数を数えます。').length).toBeGreaterThan(0);
    countif.unmount();

    const english = renderBar(<Harness {...common} formula="=AVERAGE" />, englishI18n);
    expect(english.getAllByText('Arithmetic mean of its arguments.').length).toBeGreaterThan(0);
    english.unmount();

    const en = englishI18n.getResourceBundle('en', 'editor') as any;
    const ja = japaneseI18n.getResourceBundle('ja', 'editor') as any;
    const statisticalEntries = [...FUNCTION_CATALOG.values()].filter((entry) => entry.category === 'statistical');
    expect(statisticalEntries).toHaveLength(58);
    for (const entry of statisticalEntries) {
      expect(en.spreadsheet_ui.formula_assist.descriptions[entry.name]).toBe(entry.description);
      expect(ja.spreadsheet_ui.formula_assist.descriptions[entry.name]).toEqual(expect.any(String));
      expect(ja.spreadsheet_ui.formula_assist.descriptions[entry.name].length).toBeGreaterThan(0);
    }
  });

  it('translates text descriptions, retains English, and keeps every Text key in parity', () => {
    const common = { onAccept: vi.fn(), onDismiss: vi.fn(), onEditorKey: vi.fn() };
    const exact = renderBar(<Harness {...common} formula="=EXACT" />, japaneseI18n);
    expect(exact.getAllByText('大文字と小文字も含め、2つのテキストが完全に一致する場合にTRUEを返します。').length).toBeGreaterThan(0);
    exact.unmount();

    const textjoin = renderBar(<Harness {...common} formula="=TEXTJOIN" />, japaneseI18n);
    expect(textjoin.getAllByText('区切り記号を使ってテキスト値を連結します。').length).toBeGreaterThan(0);
    textjoin.unmount();

    const english = renderBar(<Harness {...common} formula="=LEN" />, englishI18n);
    expect(english.getAllByText('Number of characters in a text.').length).toBeGreaterThan(0);
    english.unmount();

    const en = englishI18n.getResourceBundle('en', 'editor') as any;
    const ja = japaneseI18n.getResourceBundle('ja', 'editor') as any;
    const textEntries = [...FUNCTION_CATALOG.values()].filter((entry) => entry.category === 'text');
    expect(textEntries).toHaveLength(28);
    for (const entry of textEntries) {
      expect(en.spreadsheet_ui.formula_assist.descriptions[entry.name]).toBe(entry.description);
      expect(ja.spreadsheet_ui.formula_assist.descriptions[entry.name]).toEqual(expect.any(String));
      expect(ja.spreadsheet_ui.formula_assist.descriptions[entry.name].length).toBeGreaterThan(0);
    }
  });

  it('translates date descriptions, retains English, and keeps every Date key in parity', () => {
    const common = { onAccept: vi.fn(), onDismiss: vi.fn(), onEditorKey: vi.fn() };
    const date = renderBar(<Harness {...common} formula="=DATE" />, japaneseI18n);
    expect(date.getAllByText('年、月、日から日付を作成します。').length).toBeGreaterThan(0);
    date.unmount();

    const datedif = renderBar(<Harness {...common} formula="=DATEDIF" />, japaneseI18n);
    expect(datedif.getAllByText('2つの日付の差を日、月、または年で返します（"D"、"M"、"Y"）。').length).toBeGreaterThan(0);
    datedif.unmount();

    const english = renderBar(<Harness {...common} formula="=DATE" />, englishI18n);
    expect(english.getAllByText('A date from year, month and day.').length).toBeGreaterThan(0);
    english.unmount();

    const en = englishI18n.getResourceBundle('en', 'editor') as any;
    const ja = japaneseI18n.getResourceBundle('ja', 'editor') as any;
    const dateEntries = [...FUNCTION_CATALOG.values()].filter((entry) => entry.category === 'date');
    expect(dateEntries).toHaveLength(25);
    for (const entry of dateEntries) {
      expect(en.spreadsheet_ui.formula_assist.descriptions[entry.name]).toBe(entry.description);
      expect(ja.spreadsheet_ui.formula_assist.descriptions[entry.name]).toEqual(expect.any(String));
      expect(ja.spreadsheet_ui.formula_assist.descriptions[entry.name].length).toBeGreaterThan(0);
    }
  });

  it('translates financial descriptions, retains English, and keeps every Financial key in parity', () => {
    const common = { onAccept: vi.fn(), onDismiss: vi.fn(), onEditorKey: vi.fn() };
    const pmt = renderBar(<Harness {...common} formula="=PMT" />, japaneseI18n);
    expect(pmt.getAllByText('ローンの1期間あたりの支払額を返します。').length).toBeGreaterThan(0);
    pmt.unmount();

    const xirr = renderBar(<Harness {...common} formula="=XIRR" />, japaneseI18n);
    expect(xirr.getAllByText('不定期なキャッシュフローの内部収益率を返します。').length).toBeGreaterThan(0);
    xirr.unmount();

    const english = renderBar(<Harness {...common} formula="=EFFECT" />, englishI18n);
    expect(english.getAllByText('Effective annual interest rate.').length).toBeGreaterThan(0);
    english.unmount();

    const en = englishI18n.getResourceBundle('en', 'editor') as any;
    const ja = japaneseI18n.getResourceBundle('ja', 'editor') as any;
    const financialEntries = [...FUNCTION_CATALOG.values()].filter((entry) => entry.category === 'financial');
    expect(financialEntries).toHaveLength(23);
    for (const entry of financialEntries) {
      expect(en.spreadsheet_ui.formula_assist.descriptions[entry.name]).toBe(entry.description);
      expect(ja.spreadsheet_ui.formula_assist.descriptions[entry.name]).toEqual(expect.any(String));
      expect(ja.spreadsheet_ui.formula_assist.descriptions[entry.name].length).toBeGreaterThan(0);
    }
  });

  it('translates engineering descriptions and verifies description coverage for the full catalog', () => {
    const common = { onAccept: vi.fn(), onDismiss: vi.fn(), onEditorKey: vi.fn() };
    const binary = renderBar(<Harness {...common} formula="=BIN2DEC" />, japaneseI18n);
    expect(binary.getAllByText('2進数を10進数に変換します。').length).toBeGreaterThan(0);
    binary.unmount();

    const complex = renderBar(<Harness {...common} formula="=IMABS" />, japaneseI18n);
    expect(complex.getAllByText('複素数の絶対値を返します。').length).toBeGreaterThan(0);
    complex.unmount();

    const english = renderBar(<Harness {...common} formula="=CONVERT" />, englishI18n);
    expect(english.getAllByText('Converts a number between units.').length).toBeGreaterThan(0);
    english.unmount();

    const en = englishI18n.getResourceBundle('en', 'editor') as any;
    const ja = japaneseI18n.getResourceBundle('ja', 'editor') as any;
    const descriptionsEn = en.spreadsheet_ui.formula_assist.descriptions;
    const descriptionsJa = ja.spreadsheet_ui.formula_assist.descriptions;
    const engineeringEntries = [...FUNCTION_CATALOG.values()].filter((entry) => entry.category === 'engineering');
    expect(engineeringEntries).toHaveLength(46);
    for (const entry of engineeringEntries) {
      expect(descriptionsEn[entry.name]).toBe(entry.description);
      expect(descriptionsJa[entry.name]).toEqual(expect.any(String));
      expect(descriptionsJa[entry.name].length).toBeGreaterThan(0);
    }
    expect(FUNCTION_CATALOG.size).toBe(287);
    for (const entry of FUNCTION_CATALOG.values()) {
      expect(descriptionsEn[entry.name]).toBe(entry.description);
      expect(descriptionsJa[entry.name]).toEqual(expect.any(String));
      expect(descriptionsJa[entry.name].length).toBeGreaterThan(0);
    }
  });
});

describe('FormulaAssistPopover keyboard', () => {
  it('moves with arrows, accepts with Enter or Tab, dismisses with Escape, and keeps those keys from the editor', () => {
    const onAccept = vi.fn();
    const onDismiss = vi.fn();
    const onEditorKey = vi.fn();
    const { getByRole } = renderBar(<Harness onAccept={onAccept} onDismiss={onDismiss} onEditorKey={onEditorKey} />);
    const input = getByRole('textbox');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAccept).toHaveBeenLastCalledWith('COUNTA');

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(onAccept).toHaveBeenLastCalledWith('COUNT');

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(input, { key: 'a' });
    expect(onEditorKey.mock.calls.map(([key]) => key)).toEqual(['a']);
  });
});

describe('FormulaBar formula editing', () => {
  it('accepts autocomplete with Tab, cycles a reference with F4, and commits the result on Enter', async () => {
    const onChange = vi.fn();
    const bar = createRef<FormulaBarHandle>();
    const { getByLabelText, getAllByRole, findByRole } = renderBar(<FormulaBar ref={bar} onChange={onChange} />);
    act(() => bar.current!.update('A1', '', false));
    const input = getAllByRole('textbox').find((element) => element !== getByLabelText('Name box')) as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: '=SU' } });
    await findByRole('listbox');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input.value).toBe('=SUM(');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.input(input, { target: { value: '=SUM(A1' } });
    fireEvent.keyDown(input, { key: 'F4' });
    expect(input.value).toBe('=SUM($A$1');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('=SUM($A$1');
  });

  it('jumps to a reference typed into the name box and refuses one that is not a reference', () => {
    const onNavigate = vi.fn();
    const bar = createRef<FormulaBarHandle>();
    const { getByLabelText } = renderBar(<FormulaBar ref={bar} onChange={vi.fn()} onNavigate={onNavigate} />);
    act(() => bar.current!.update('A1', '', false));
    const nameBox = getByLabelText('Name box') as HTMLInputElement;

    fireEvent.focus(nameBox);
    fireEvent.change(nameBox, { target: { value: 'nope' } });
    fireEvent.keyDown(nameBox, { key: 'Enter' });
    expect(onNavigate).not.toHaveBeenCalled();
    expect(nameBox.getAttribute('aria-invalid')).toBe('true');

    fireEvent.change(nameBox, { target: { value: 'b2:c4' } });
    fireEvent.keyDown(nameBox, { key: 'Enter' });
    expect(onNavigate).toHaveBeenCalledWith({ startRow: 1, endRow: 3, startCol: 1, endCol: 2 });
  });
});
