/**
 * Column Format Dialog
 *
 * Modal dialog for configuring column type and format options. Which controls
 * appear is driven by the selected type — a link column has nothing to say about
 * decimal places.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type {
  BooleanStyle,
  CellAlignment,
  ColumnFormat,
  ColumnType,
  CurrencyCode,
  DateFormat,
  NegativeStyle,
  NumberStyle,
  TimeFormat,
} from '../types';
import {
  formatCellValue,
  getDefaultFormatForType,
  isNumericColumnType,
  isTemporalColumnType,
} from '../utils/formatters';

interface ColumnFormatDialogProps {
  isOpen: boolean;
  columnIndex: number;
  columnLetter: string;
  currentFormat: ColumnFormat | undefined;
  onSave: (format: ColumnFormat | null) => void;
  onClose: () => void;
}

const COLUMN_TYPES: ColumnType[] = [
  'text', 'number', 'currency', 'percentage',
  'date', 'datetime', 'time', 'boolean', 'url', 'tracker',
];
const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'CNY'];
const DATE_FORMATS: DateFormat[] = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MMM D, YYYY'];
const TIME_FORMATS: TimeFormat[] = ['h:mm A', 'h:mm:ss A', 'HH:mm', 'HH:mm:ss'];
const NUMBER_STYLES: NumberStyle[] = ['standard', 'plain', 'scientific', 'accounting'];
const NEGATIVE_STYLES: NegativeStyle[] = ['minus', 'parens', 'red', 'parens-red'];
const BOOLEAN_STYLES: BooleanStyle[] = ['true-false', 'yes-no', 'check'];
const NEGATIVE_STYLE_KEYS = {
  minus: 'spreadsheet_ui.negative_style.minus',
  parens: 'spreadsheet_ui.negative_style.parens',
  red: 'spreadsheet_ui.negative_style.red',
  'parens-red': 'spreadsheet_ui.negative_style.parens_red',
} as const satisfies Record<NegativeStyle, string>;
const BOOLEAN_STYLE_KEYS = {
  'true-false': 'spreadsheet_ui.boolean_style.true_false',
  'yes-no': 'spreadsheet_ui.boolean_style.yes_no',
  check: 'spreadsheet_ui.boolean_style.check',
} as const satisfies Record<BooleanStyle, string>;
const ALIGNMENTS: (CellAlignment | 'auto')[] = ['auto', 'left', 'center', 'right'];

/** Representative value used to render the live preview for each type. */
const PREVIEW_VALUES: Record<ColumnType, string> = {
  text: 'Example',
  number: '-1234.567',
  currency: '-1234.567',
  percentage: '0.4567',
  date: '2026-08-18',
  datetime: '2026-08-18 13:30:00',
  time: '13:30:00',
  boolean: 'true',
  url: 'https://example.com/report',
  tracker: 'NIM-123',
};

const SELECT_CLASS =
  'px-3 py-2 text-sm bg-nim-secondary border border-nim rounded text-nim outline-none focus:border-[var(--nim-primary)] focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--nim-primary)_20%,transparent)]';
const LABEL_CLASS = 'text-[13px] font-medium text-nim-muted';

export function ColumnFormatDialog({
  isOpen,
  columnIndex: _columnIndex,
  columnLetter,
  currentFormat,
  onSave,
  onClose,
}: ColumnFormatDialogProps) {
  const { t } = useTranslation('editor');
  const [type, setType] = useState<ColumnType>(currentFormat?.type ?? 'text');
  const [decimals, setDecimals] = useState<number>(currentFormat?.decimals ?? 2);
  const [showThousandsSeparator, setShowThousandsSeparator] = useState<boolean>(
    currentFormat?.showThousandsSeparator ?? true
  );
  const [currency, setCurrency] = useState<CurrencyCode>(currentFormat?.currency ?? 'USD');
  const [dateFormat, setDateFormat] = useState<DateFormat>(currentFormat?.dateFormat ?? 'MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(currentFormat?.timeFormat ?? 'h:mm A');
  const [pattern, setPattern] = useState<string>(currentFormat?.pattern ?? '');
  const [numberStyle, setNumberStyle] = useState<NumberStyle>(currentFormat?.numberStyle ?? 'standard');
  const [negativeStyle, setNegativeStyle] = useState<NegativeStyle>(currentFormat?.negativeStyle ?? 'minus');
  const [valuesAreFractions, setValuesAreFractions] = useState<boolean>(currentFormat?.valuesAreFractions ?? true);
  const [booleanStyle, setBooleanStyle] = useState<BooleanStyle>(currentFormat?.booleanStyle ?? 'true-false');
  const [align, setAlign] = useState<CellAlignment | 'auto'>(currentFormat?.align ?? 'auto');

  // Reset state when dialog opens with new column
  useEffect(() => {
    if (isOpen) {
      setType(currentFormat?.type ?? 'text');
      setDecimals(currentFormat?.decimals ?? 2);
      setShowThousandsSeparator(currentFormat?.showThousandsSeparator ?? true);
      setCurrency(currentFormat?.currency ?? 'USD');
      setDateFormat(currentFormat?.dateFormat ?? 'MM/DD/YYYY');
      setTimeFormat(currentFormat?.timeFormat ?? 'h:mm A');
      setPattern(currentFormat?.pattern ?? '');
      setNumberStyle(currentFormat?.numberStyle ?? 'standard');
      setNegativeStyle(currentFormat?.negativeStyle ?? 'minus');
      setValuesAreFractions(currentFormat?.valuesAreFractions ?? true);
      setBooleanStyle(currentFormat?.booleanStyle ?? 'true-false');
      setAlign(currentFormat?.align ?? 'auto');
    }
  }, [isOpen, currentFormat]);

  // Handle type change - apply default format for new type
  const handleTypeChange = useCallback((newType: ColumnType) => {
    setType(newType);
    const defaults = getDefaultFormatForType(newType);
    setDecimals(defaults.decimals ?? 2);
    setShowThousandsSeparator(defaults.showThousandsSeparator ?? true);
    setCurrency(defaults.currency ?? 'USD');
    setDateFormat(defaults.dateFormat ?? 'MM/DD/YYYY');
    setTimeFormat(defaults.timeFormat ?? 'h:mm A');
    setPattern('');
    setNumberStyle(defaults.numberStyle ?? 'standard');
    setNegativeStyle(defaults.negativeStyle ?? 'minus');
    setValuesAreFractions(defaults.valuesAreFractions ?? true);
    setBooleanStyle(defaults.booleanStyle ?? 'true-false');
    setAlign('auto');
  }, []);

  /** The format the current controls describe. */
  const buildFormat = useCallback((): ColumnFormat | null => {
    if (type === 'text' && align === 'auto') {
      // Plain text with no alignment override carries no information.
      return null;
    }

    const format: ColumnFormat = { type };

    if (isNumericColumnType(type)) {
      format.decimals = decimals;
      format.negativeStyle = negativeStyle;
    }

    if (type === 'number' || type === 'currency') {
      format.showThousandsSeparator = showThousandsSeparator;
      format.numberStyle = numberStyle;
    }

    if (type === 'currency') format.currency = currency;
    if (type === 'percentage') format.valuesAreFractions = valuesAreFractions;

    if (isTemporalColumnType(type)) {
      const trimmedPattern = pattern.trim();
      if (trimmedPattern !== '') {
        format.pattern = trimmedPattern;
      } else {
        if (type !== 'time') format.dateFormat = dateFormat;
        if (type !== 'date') format.timeFormat = timeFormat;
      }
    }

    if (type === 'boolean') format.booleanStyle = booleanStyle;
    if (align !== 'auto') format.align = align;

    return format;
  }, [
    type, decimals, showThousandsSeparator, currency, dateFormat, timeFormat,
    pattern, numberStyle, negativeStyle, valuesAreFractions, booleanStyle, align,
  ]);

  /**
   * Live preview of a representative value. The point is that the options are
   * not self-explanatory — "Accounting" and a custom pattern both need to be
   * seen to be chosen.
   */
  const preview = useMemo(() => {
    const format = buildFormat();
    const sample = PREVIEW_VALUES[type];
    if (!format) return sample;
    if (type === 'url' || type === 'tracker') return sample;
    return formatCellValue(sample, format);
  }, [buildFormat, type]);

  const handleSave = useCallback(() => {
    onSave(buildFormat());
    onClose();
  }, [buildFormat, onSave, onClose]);

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        handleSave();
      }
    },
    [onClose, handleSave]
  );

  if (!isOpen) return null;

  const showsDecimals = isNumericColumnType(type);
  const showsSeparator = (type === 'number' || type === 'currency') && numberStyle !== 'plain' && numberStyle !== 'scientific';
  const temporal = isTemporalColumnType(type);
  const usingPattern = temporal && pattern.trim() !== '';

  return (
    <div className="csv-column-format-dialog fixed inset-0 bg-black/40 flex items-center justify-center z-[2000]" onClick={onClose}>
      <div
        className="bg-nim border border-nim rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.24)] min-w-[340px] max-w-[420px] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-nim">
          <h3 className="m-0 text-base font-semibold text-nim">{t('spreadsheet_ui.column_format.title', { column: columnLetter })}</h3>
          <button className="bg-none border-none text-xl text-nim-muted cursor-pointer p-0 leading-none hover:text-nim" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          {/* Column Type */}
          <div className="flex flex-col gap-1.5">
            <label className={LABEL_CLASS}>{t('spreadsheet_ui.column_format.type')}</label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as ColumnType)}
              className={SELECT_CLASS}
            >
              {COLUMN_TYPES.map((columnType) => (
                <option key={columnType} value={columnType}>
                  {t(`spreadsheet_ui.col_type.${columnType}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Number style (number, currency) */}
          {(type === 'number' || type === 'currency') && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>{t('spreadsheet_ui.column_format.style')}</label>
              <select
                value={numberStyle}
                onChange={(e) => setNumberStyle(e.target.value as NumberStyle)}
                className={SELECT_CLASS}
              >
                {NUMBER_STYLES.map((s) => (
                  <option key={s} value={s}>{t(`spreadsheet_ui.number_style.${s}`)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Decimal Places */}
          {showsDecimals && numberStyle !== 'plain' && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>{t('spreadsheet_ui.column_format.decimal_places')}</label>
              <input
                type="number"
                min={0}
                max={10}
                value={decimals}
                onChange={(e) => setDecimals(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                className={SELECT_CLASS}
              />
            </div>
          )}

          {/* Thousands Separator */}
          {showsSeparator && (
            <div className="flex flex-row items-center">
              <label className="flex items-center gap-2 cursor-pointer font-normal text-nim">
                <input
                  type="checkbox"
                  checked={showThousandsSeparator}
                  onChange={(e) => setShowThousandsSeparator(e.target.checked)}
                  className="w-4 h-4 accent-[var(--nim-primary)]"
                />
                {t('spreadsheet_ui.column_format.thousands')}
              </label>
            </div>
          )}

          {/* Currency */}
          {type === 'currency' && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>{t('spreadsheet_ui.column_format.currency')}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className={SELECT_CLASS}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`spreadsheet_ui.currency_name.${c}`)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Percentage: how stored values are scaled */}
          {type === 'percentage' && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>{t('spreadsheet_ui.column_format.stored_values')}</label>
              <select
                value={valuesAreFractions ? 'fraction' : 'whole'}
                onChange={(e) => setValuesAreFractions(e.target.value === 'fraction')}
                className={SELECT_CLASS}
              >
                <option value="fraction">{t('spreadsheet_ui.column_format.fractions')}</option>
                <option value="whole">{t('spreadsheet_ui.column_format.whole')}</option>
              </select>
            </div>
          )}

          {/* Negative style */}
          {showsDecimals && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>{t('spreadsheet_ui.column_format.negative')}</label>
              <select
                value={negativeStyle}
                onChange={(e) => setNegativeStyle(e.target.value as NegativeStyle)}
                className={SELECT_CLASS}
              >
                {NEGATIVE_STYLES.map((s) => (
                  <option key={s} value={s}>{t(NEGATIVE_STYLE_KEYS[s])}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Format */}
          {temporal && type !== 'time' && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>{t('spreadsheet_ui.column_format.date_format')}</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                disabled={usingPattern}
                className={`${SELECT_CLASS} disabled:opacity-50`}
              >
                {DATE_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Format */}
          {temporal && type !== 'date' && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>{t('spreadsheet_ui.column_format.time_format')}</label>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
                disabled={usingPattern}
                className={`${SELECT_CLASS} disabled:opacity-50`}
              >
                {TIME_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom pattern */}
          {temporal && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>{t('spreadsheet_ui.column_format.custom_pattern')}</label>
              <input
                type="text"
                value={pattern}
                placeholder="ddd, MMM D YYYY"
                onChange={(e) => setPattern(e.target.value)}
                className={SELECT_CLASS}
              />
              <span className="text-[11px] text-nim-muted">
                YYYY YY MMMM MMM MM M DD D dddd ddd HH H hh h mm ss A a
              </span>
            </div>
          )}

          {/* Boolean style */}
          {type === 'boolean' && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>{t('spreadsheet_ui.column_format.display_as')}</label>
              <select
                value={booleanStyle}
                onChange={(e) => setBooleanStyle(e.target.value as BooleanStyle)}
                className={SELECT_CLASS}
              >
                {BOOLEAN_STYLES.map((s) => (
                  <option key={s} value={s}>{t(BOOLEAN_STYLE_KEYS[s])}</option>
                ))}
              </select>
            </div>
          )}

          {type === 'tracker' && (
            <span className="text-[12px] text-nim-muted">
              {t('spreadsheet_ui.column_format.tracker_hint')}
            </span>
          )}

          {/* Alignment */}
          <div className="flex flex-col gap-1.5">
            <label className={LABEL_CLASS}>{t('spreadsheet_ui.column_format.alignment')}</label>
            <select
              value={align}
              onChange={(e) => setAlign(e.target.value as CellAlignment | 'auto')}
              className={SELECT_CLASS}
            >
              {ALIGNMENTS.map((a) => (
                <option key={a} value={a}>
                  {a === 'auto' ? t('spreadsheet_ui.column_format.automatic') : t(`spreadsheet_ui.toolbar.align_${a}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={LABEL_CLASS}>{t('spreadsheet_ui.column_format.preview')}</label>
            <div className="csv-format-preview px-3 py-2 text-sm bg-nim-tertiary border border-nim rounded text-nim font-mono">
              {preview}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-nim">
          <button
            className="px-4 py-2 text-sm font-medium rounded cursor-pointer transition-all bg-nim-secondary border border-nim text-nim hover:bg-nim-hover"
            onClick={onClose}
          >
            {t('spreadsheet_ui.column_format.cancel')}
          </button>
          <button
            className="px-4 py-2 text-sm font-medium rounded cursor-pointer transition-all bg-[var(--nim-primary)] border border-[var(--nim-primary)] text-white hover:opacity-90"
            onClick={handleSave}
          >
            {t('spreadsheet_ui.column_format.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
