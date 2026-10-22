/**
 * Short explanations for the error values a formula cell can show, for the
 * hover card over an error cell. When the cell's formula is known, the text
 * names the specific cause where the formula makes it obvious (the unknown
 * function behind `#NAME?`, the deleted reference behind `#REF!`).
 */

import { FORMULA_LIMITS, type FormulaErrorCode } from '../utils/engine/ast';
import { getFunctionEntry } from './functionCatalog';
import { scanFormulaTokens } from './referenceScanner';

export interface FormulaErrorDescription {
  code: FormulaErrorCode;
  titleKey: string;
  detailKey: string;
  detailParams?: Record<string, string | number>;
}

const ERROR_CODES: readonly FormulaErrorCode[] = [
  '#VALUE!', '#NAME?', '#REF!', '#DIV/0!', '#CIRC!', '#ERROR!', '#N/A', '#NUM!', '#NULL!', '#LIMIT!',
];

/** The error code a displayed cell value is, or null for any other value. */
export function asFormulaErrorCode(value: unknown): FormulaErrorCode | null {
  if (typeof value !== 'string') return null;
  const upper = value.trim().toUpperCase();
  return (ERROR_CODES as readonly string[]).includes(upper) ? upper as FormulaErrorCode : null;
}

function unknownNames(formula: string): string[] {
  const names = new Set<string>();
  for (const token of scanFormulaTokens(formula)) {
    if (token.kind === 'function' && !getFunctionEntry(token.text)) names.add(token.text.toUpperCase());
    if (token.kind === 'name' && !/^(TRUE|FALSE)$/i.test(token.text)) names.add(token.text);
  }
  return [...names];
}

/** Describe an error value. `formula` is the cell's raw text, when known. */
export function describeFormulaError(code: FormulaErrorCode, formula?: string): FormulaErrorDescription {
  const text = formula?.startsWith('=') ? formula : undefined;
  switch (code) {
    case '#REF!':
      return {
        code,
        titleKey: 'spreadsheet_ui.formula_errors.title_ref',
        detailKey: text?.toUpperCase().includes('#REF!')
          ? 'spreadsheet_ui.formula_errors.detail_ref_deleted'
          : 'spreadsheet_ui.formula_errors.detail_ref_outside',
      };
    case '#NAME?': {
      const names = text ? unknownNames(text) : [];
      return {
        code,
        titleKey: 'spreadsheet_ui.formula_errors.title_name',
        detailKey: names.length > 0
          ? 'spreadsheet_ui.formula_errors.detail_name_unknown'
          : 'spreadsheet_ui.formula_errors.detail_name_general',
        ...(names.length > 0 ? { detailParams: { names: names.join(', ') } } : {}),
      };
    }
    case '#VALUE!':
      return { code, titleKey: 'spreadsheet_ui.formula_errors.title_value', detailKey: 'spreadsheet_ui.formula_errors.detail_value' };
    case '#DIV/0!':
      return { code, titleKey: 'spreadsheet_ui.formula_errors.title_div_zero', detailKey: 'spreadsheet_ui.formula_errors.detail_div_zero' };
    case '#CIRC!':
      return { code, titleKey: 'spreadsheet_ui.formula_errors.title_circular', detailKey: 'spreadsheet_ui.formula_errors.detail_circular' };
    case '#LIMIT!':
      return {
        code,
        titleKey: 'spreadsheet_ui.formula_errors.title_limit',
        detailKey: 'spreadsheet_ui.formula_errors.detail_limit',
        detailParams: { maxDepth: FORMULA_LIMITS.maxDependencyDepth },
      };
    case '#N/A':
      return { code, titleKey: 'spreadsheet_ui.formula_errors.title_na', detailKey: 'spreadsheet_ui.formula_errors.detail_na' };
    case '#NUM!':
      return { code, titleKey: 'spreadsheet_ui.formula_errors.title_num', detailKey: 'spreadsheet_ui.formula_errors.detail_num' };
    case '#NULL!':
      return { code, titleKey: 'spreadsheet_ui.formula_errors.title_null', detailKey: 'spreadsheet_ui.formula_errors.detail_null' };
    case '#ERROR!':
      return { code, titleKey: 'spreadsheet_ui.formula_errors.title_error', detailKey: 'spreadsheet_ui.formula_errors.detail_error' };
  }
}
