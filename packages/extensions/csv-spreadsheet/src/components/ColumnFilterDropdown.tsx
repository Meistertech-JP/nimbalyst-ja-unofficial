/**
 * Per-column filter dropdown: distinct-value checklist or a single condition.
 *
 * `ColumnFilter` holds exactly one filter per column, so the two modes are
 * mutually exclusive rather than combinable -- the segmented control makes that
 * visible instead of letting a user build a state the engine can't represent.
 */

import { useMemo, useState } from 'react';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import type { ColumnFilter, ColumnFormat, DateFilterOperator, FilterScalar } from '../types';
import { columnIndexToLetter } from '../utils/csvParser';
import { useTranslation } from '@nimbalyst/i18n/react';
import { isTemporalColumnType, parseDateTime } from '../utils/formatters';

type ConditionOperator =
  | { kind: 'text'; operator: 'contains' | 'equals' | 'startsWith'; key: string }
  | { kind: 'number'; operator: 'equals' | 'notEquals' | 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual'; key: string }
  | { kind: 'date'; operator: DateFilterOperator; key: string }
  | { kind: 'blank'; operator: 'isBlank' | 'isNotBlank'; key: string };

/** Offered only on date/datetime/time columns, where they are the useful ones. */
const DATE_CONDITIONS: readonly ConditionOperator[] = [
  { kind: 'date', operator: 'on', key: 'spreadsheet_ui.filter.cond_date_is' },
  { kind: 'date', operator: 'before', key: 'spreadsheet_ui.filter.cond_date_before' },
  { kind: 'date', operator: 'after', key: 'spreadsheet_ui.filter.cond_date_after' },
  { kind: 'date', operator: 'between', key: 'spreadsheet_ui.filter.cond_date_between' },
];

const BASE_CONDITIONS: readonly ConditionOperator[] = [
  { kind: 'text', operator: 'contains', key: 'spreadsheet_ui.filter.cond_text_contains' },
  { kind: 'text', operator: 'equals', key: 'spreadsheet_ui.filter.cond_text_equals' },
  { kind: 'text', operator: 'startsWith', key: 'spreadsheet_ui.filter.cond_text_starts' },
  { kind: 'number', operator: 'equals', key: 'spreadsheet_ui.filter.cond_number_equals' },
  { kind: 'number', operator: 'notEquals', key: 'spreadsheet_ui.filter.cond_number_not' },
  { kind: 'number', operator: 'greaterThan', key: 'spreadsheet_ui.filter.cond_number_gt' },
  { kind: 'number', operator: 'greaterThanOrEqual', key: 'spreadsheet_ui.filter.cond_number_gte' },
  { kind: 'number', operator: 'lessThan', key: 'spreadsheet_ui.filter.cond_number_lt' },
  { kind: 'number', operator: 'lessThanOrEqual', key: 'spreadsheet_ui.filter.cond_number_lte' },
  { kind: 'blank', operator: 'isBlank', key: 'spreadsheet_ui.filter.cond_is_blank' },
  { kind: 'blank', operator: 'isNotBlank', key: 'spreadsheet_ui.filter.cond_not_blank' },
];

function conditionsFor(format: ColumnFormat | undefined): readonly ConditionOperator[] {
  return format && isTemporalColumnType(format.type)
    ? [...DATE_CONDITIONS, ...BASE_CONDITIONS]
    : BASE_CONDITIONS;
}

/** `YYYY-MM-DD` for an `<input type="date">`, from epoch millis. */
function toDateInputValue(epochMillis: number): string {
  const date = new Date(epochMillis);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const BUTTON_CLASS =
  'px-2 py-1 text-[12px] bg-transparent border border-nim rounded cursor-pointer text-nim-muted transition-colors duration-150 hover:enabled:bg-nim-hover hover:enabled:text-nim disabled:opacity-40 disabled:cursor-not-allowed';
const FIELD_CLASS =
  'w-full px-2 py-1 text-[12px] border border-nim rounded bg-nim text-nim outline-none focus:border-[var(--nim-primary)] placeholder:text-nim-faint';

/** Stable React key / lookup key for a scalar, so `1` and `"1"` stay distinct. */
function scalarKey(value: FilterScalar): string {
  return `${typeof value}:${String(value)}`;
}

function scalarLabel(value: FilterScalar): string {
  return value === null || value === '' ? '(Blank)' : String(value);
}

function conditionIndexOf(
  conditions: readonly ConditionOperator[],
  filter: ColumnFilter | undefined,
): number {
  if (!filter || filter.kind === 'values') return 0;
  return Math.max(0, conditions.findIndex((c) => c.kind === filter.kind && c.operator === filter.operator));
}

export interface ColumnFilterDropdownProps {
  columnIndex: number;
  anchor: HTMLElement;
  /** Every distinct value in the column, ignoring this column's own filter. */
  distinctValues: readonly FilterScalar[];
  currentFilter: ColumnFilter | undefined;
  /** The column's format, which decides whether date conditions are offered. */
  columnFormat?: ColumnFormat;
  onApply: (filter: ColumnFilter | null) => void;
  onClose: () => void;
}

export function ColumnFilterDropdown({
  columnIndex,
  anchor,
  distinctValues,
  currentFilter,
  columnFormat,
  onApply,
  onClose,
}: ColumnFilterDropdownProps) {
  const { t } = useTranslation('editor');
  const conditions = useMemo(() => conditionsFor(columnFormat), [columnFormat]);
  const [mode, setMode] = useState<'values' | 'condition'>(
    currentFilter && currentFilter.kind !== 'values' ? 'condition' : 'values',
  );
  const [conditionIndex, setConditionIndex] = useState(() => conditionIndexOf(conditions, currentFilter));
  const [conditionValue, setConditionValue] = useState(() => {
    if (!currentFilter || currentFilter.kind === 'values' || currentFilter.kind === 'blank') return '';
    return currentFilter.kind === 'date' ? toDateInputValue(currentFilter.value) : String(currentFilter.value);
  });
  const [conditionValueEnd, setConditionValueEnd] = useState(() =>
    currentFilter?.kind === 'date' && currentFilter.valueEnd !== undefined
      ? toDateInputValue(currentFilter.valueEnd)
      : '',
  );
  const [valueSearch, setValueSearch] = useState('');
  const [checked, setChecked] = useState<ReadonlySet<string>>(() =>
    currentFilter?.kind === 'values'
      ? new Set([...currentFilter.values].map(scalarKey))
      : new Set(distinctValues.map(scalarKey)),
  );

  const { refs, floatingStyles, context } = useFloating({
    open: true,
    onOpenChange: (open) => { if (!open) onClose(); },
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    elements: { reference: anchor },
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${Math.max(220, availableHeight)}px`;
        },
      }),
    ],
  });
  const { getFloatingProps } = useInteractions([useDismiss(context), useRole(context, { role: 'dialog' })]);

  const visibleValues = useMemo(() => {
    const query = valueSearch.trim().toLocaleLowerCase();
    if (!query) return distinctValues;
    return distinctValues.filter((value) => scalarLabel(value).toLocaleLowerCase().includes(query));
  }, [distinctValues, valueSearch]);

  const condition = conditions[conditionIndex] ?? conditions[0];

  const buildFilter = (): ColumnFilter | null => {
    if (mode === 'condition') {
      if (condition.kind === 'blank') return { kind: 'blank', operator: condition.operator };
      if (condition.kind === 'date') {
        const start = parseDateTime(conditionValue.trim());
        if (start === null) return null;
        if (condition.operator === 'between') {
          const end = parseDateTime(conditionValueEnd.trim());
          if (end === null) return null;
          // A bare end date means "through the end of that day".
          end.setHours(23, 59, 59, 999);
          return { kind: 'date', operator: 'between', value: start.getTime(), valueEnd: end.getTime() };
        }
        return { kind: 'date', operator: condition.operator, value: start.getTime() };
      }
      if (condition.kind === 'number') {
        const value = Number(conditionValue.trim());
        return Number.isFinite(value) && conditionValue.trim() !== ''
          ? { kind: 'number', operator: condition.operator, value }
          : null;
      }
      return conditionValue === '' ? null : { kind: 'text', operator: condition.operator, value: conditionValue };
    }

    // Every value checked is the same view as no filter at all.
    if (checked.size >= distinctValues.length) return null;
    const byKey = new Map(distinctValues.map((value) => [scalarKey(value), value]));
    const values = new Set<FilterScalar>();
    checked.forEach((key) => { if (byKey.has(key)) values.add(byKey.get(key)!); });
    return { kind: 'values', values };
  };

  const toggleValue = (key: string) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setAllVisible = (on: boolean) => {
    setChecked((current) => {
      const next = new Set(current);
      visibleValues.forEach((value) => {
        if (on) next.add(scalarKey(value));
        else next.delete(scalarKey(value));
      });
      return next;
    });
  };

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={floatingStyles}
        {...getFloatingProps()}
        className="csv-column-filter-dropdown z-50 flex flex-col w-64 overflow-hidden bg-nim-secondary border border-nim rounded shadow-lg text-nim"
      >
        <div className="csv-column-filter-title px-3 py-2 text-[12px] font-semibold text-nim-muted border-b border-nim">
          {t('spreadsheet_ui.filter.title', { column: columnIndexToLetter(columnIndex) })}
        </div>

        <div className="csv-column-filter-mode flex gap-1 px-3 pt-2">
          <button className={`${BUTTON_CLASS} flex-1 ${mode === 'values' ? 'bg-[var(--nim-primary)] border-[var(--nim-primary)] text-white' : ''}`} onClick={() => setMode('values')}>
            {t('spreadsheet_ui.filter.by_value')}
          </button>
          <button className={`${BUTTON_CLASS} flex-1 ${mode === 'condition' ? 'bg-[var(--nim-primary)] border-[var(--nim-primary)] text-white' : ''}`} onClick={() => setMode('condition')}>
            {t('spreadsheet_ui.filter.by_condition')}
          </button>
        </div>

        {mode === 'condition' ? (
          <div className="csv-column-filter-condition flex flex-col gap-2 p-3">
            <select
              className={FIELD_CLASS}
              value={conditionIndex}
              onChange={(event) => setConditionIndex(Number(event.target.value))}
            >
              {conditions.map((entry, index) => (
                <option key={entry.key} value={index}>{t(entry.key)}</option>
              ))}
            </select>
            {condition.kind === 'date' ? (
              <>
                <input
                  className={FIELD_CLASS}
                  type="date"
                  value={conditionValue}
                  onChange={(event) => setConditionValue(event.target.value)}
                  autoFocus
                />
                {condition.operator === 'between' && (
                  <input
                    className={FIELD_CLASS}
                    type="date"
                    value={conditionValueEnd}
                    onChange={(event) => setConditionValueEnd(event.target.value)}
                  />
                )}
              </>
            ) : condition.kind !== 'blank' && (
              <input
                className={FIELD_CLASS}
                value={conditionValue}
                onChange={(event) => setConditionValue(event.target.value)}
                placeholder={condition.kind === 'number' ? t('spreadsheet_ui.filter.placeholder_number') : t('spreadsheet_ui.filter.placeholder_text')}
                inputMode={condition.kind === 'number' ? 'decimal' : 'text'}
                autoFocus
              />
            )}
          </div>
        ) : (
          <div className="csv-column-filter-values flex flex-col gap-2 p-3 min-h-0">
            <input
              className={FIELD_CLASS}
              value={valueSearch}
              onChange={(event) => setValueSearch(event.target.value)}
              placeholder={t('spreadsheet_ui.filter.search_values')}
              autoFocus
            />
            <div className="flex gap-1">
              <button className={`${BUTTON_CLASS} flex-1`} onClick={() => setAllVisible(true)}>{t('spreadsheet_ui.filter.select_all')}</button>
              <button className={`${BUTTON_CLASS} flex-1`} onClick={() => setAllVisible(false)}>{t('spreadsheet_ui.filter.clear')}</button>
            </div>
            <div className="csv-column-filter-value-list flex flex-col gap-0.5 overflow-y-auto max-h-56 min-h-0">
              {visibleValues.map((value) => {
                const key = scalarKey(value);
                return (
                  <label key={key} className="flex items-center gap-2 px-1 py-0.5 text-[12px] rounded cursor-pointer hover:bg-nim-hover">
                    <input type="checkbox" checked={checked.has(key)} onChange={() => toggleValue(key)} />
                    <span className="truncate">{value === null || value === '' ? t('spreadsheet_ui.filter.blank') : String(value)}</span>
                  </label>
                );
              })}
              {visibleValues.length === 0 && (
                <span className="px-1 py-1 text-[12px] text-nim-faint">{t('spreadsheet_ui.filter.no_matching')}</span>
              )}
            </div>
          </div>
        )}

        <div className="csv-column-filter-actions flex gap-1 px-3 py-2 border-t border-nim">
          <button className={`${BUTTON_CLASS} flex-1`} onClick={() => { onApply(null); onClose(); }}>
            {t('spreadsheet_ui.filter.clear_filter')}
          </button>
          <button
            className={`${BUTTON_CLASS} flex-1 bg-[var(--nim-primary)] border-[var(--nim-primary)] text-white`}
            onClick={() => { onApply(buildFilter()); onClose(); }}
          >
            {t('spreadsheet_ui.filter.apply')}
          </button>
        </div>
      </div>
    </FloatingPortal>
  );
}
