/**
 * Conditional formatting side panel: the sheet's rules in order (the first
 * that applies to a cell wins), and an editor for one rule at a time. Rules
 * are value comparisons, text matches, blank checks, and two- or three-stop
 * color scales. Every save replaces the whole ordered list in one command.
 */

import { useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { CellColor } from '../types';
import type {
  ColorScaleRule, CompareOperator, ConditionalColor, ConditionalFormat, ConditionalRule, HexColor,
} from '../conditional/types';

type RuleKind = 'valueCompare' | 'textContains' | 'textNotContains' | 'textStartsWith' | 'textEndsWith' | 'isEmpty' | 'notEmpty' | 'colorScale';

const RULE_KINDS = Object.keys({
  valueCompare: 1, textContains: 1, textNotContains: 1, textStartsWith: 1,
  textEndsWith: 1, isEmpty: 1, notEmpty: 1, colorScale: 1,
}) as RuleKind[];

const kindKey = (kind: RuleKind): string => `spreadsheet_ui.conditional.kind_${kind.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
const OPERATORS: readonly (CompareOperator | 'between' | 'notBetween')[] = ['>', '>=', '<', '<=', '=', '!=', 'between', 'notBetween'];
const THEME: readonly CellColor[] = ['green', 'yellow', 'orange', 'red', 'blue', 'purple', 'gray'];

const FIELD = 'px-2 py-1 text-[12px] bg-nim-secondary border border-nim rounded text-nim outline-none focus:border-[var(--nim-primary)]';
const BUTTON = 'px-2 py-1 text-[12px] rounded border border-nim bg-transparent text-nim cursor-pointer hover:bg-nim-hover disabled:opacity-40';

/** One-line description of a rule for the list. */
export function describeRule(format: ConditionalFormat, translate: (key: string, params?: Record<string, unknown>) => string): string {
  const rule = format.rule;
  switch (rule.kind) {
    case 'valueCompare':
      return rule.operator === 'between' || rule.operator === 'notBetween'
        ? translate(rule.operator === 'between' ? 'spreadsheet_ui.conditional.desc_between' : 'spreadsheet_ui.conditional.desc_not_between', { value: rule.value, value2: rule.value2 ?? '' })
        : translate('spreadsheet_ui.conditional.desc_value', { operator: rule.operator, value: rule.value });
    case 'colorScale': return rule.mid ? translate('spreadsheet_ui.conditional.desc_color_scale_3') : translate('spreadsheet_ui.conditional.desc_color_scale');
    case 'isEmpty': case 'notEmpty': return translate(kindKey(rule.kind));
    case 'textContains': case 'textNotContains': case 'textStartsWith': case 'textEndsWith':
      return translate('spreadsheet_ui.conditional.desc_with_value', { label: translate(kindKey(rule.kind)), value: rule.value });
    case 'dateIs': return translate('spreadsheet_ui.conditional.desc_date_rule');
    case 'customFormula': return translate('spreadsheet_ui.conditional.desc_formula', { formula: rule.formula });
  }
}

function newFormat(range: string): ConditionalFormat {
  return {
    id: `cf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ranges: [range],
    rule: { kind: 'valueCompare', operator: '>', value: 0 },
    style: { fillColor: 'green' },
  };
}

function ruleForKind(kind: RuleKind, previous: ConditionalRule): ConditionalRule {
  if (kind === previous.kind) return previous;
  if (kind === 'valueCompare') return { kind, operator: '>', value: 0 };
  if (kind === 'colorScale') {
    return { kind, min: { type: 'min', color: '#f8696b' }, mid: { type: 'percentile', value: 50, color: '#ffeb84' }, max: { type: 'max', color: '#63be7b' } };
  }
  if (kind === 'isEmpty' || kind === 'notEmpty') return { kind };
  return { kind, value: 'value' in previous && typeof previous.value === 'string' ? previous.value : '' };
}

const asNumberOrText = (text: string): number | string => (text.trim() !== '' && Number.isFinite(Number(text)) ? Number(text) : text);

function ColorField({ value, onChange, label }: { value: ConditionalColor | undefined; onChange: (color: ConditionalColor | undefined) => void; label: string }) {
  const { t } = useTranslation('editor');
  const hex = value?.startsWith('#') ? value : '#ffffff';
  return (
    <label className="flex items-center justify-between gap-2 text-[12px] text-nim-muted">
      {label}
      <span className="flex items-center gap-1">
        <select className={FIELD} value={value?.startsWith('#') ? 'custom' : value ?? 'none'}
          onChange={(event) => onChange(event.target.value === 'none' ? undefined : event.target.value === 'custom' ? hex as HexColor : event.target.value as CellColor)}>
          <option value="none">{t('spreadsheet_ui.conditional.none')}</option>
          {THEME.map((color) => <option key={color} value={color}>{t(`spreadsheet_ui.colors.color_${color}`)}</option>)}
          <option value="custom">{t('spreadsheet_ui.conditional.custom')}</option>
        </select>
        {value?.startsWith('#') && (
          <input type="color" value={hex} aria-label={`${label} ${t('spreadsheet_ui.conditional.custom')}`} onChange={(event) => onChange(event.target.value as HexColor)} />
        )}
      </span>
    </label>
  );
}

function ScaleEditor({ rule, onChange }: { rule: ColorScaleRule; onChange: (rule: ColorScaleRule) => void }) {
  const { t } = useTranslation('editor');
  const stop = (name: 'min' | 'mid' | 'max', label: string) => {
    const point = rule[name];
    return (
      <label className="flex items-center justify-between gap-2 text-[12px] text-nim-muted">
        {label}
        <input type="color" value={point?.color ?? '#ffffff'} aria-label={`${label} ${t('spreadsheet_ui.colors.color')}`}
          onChange={(event) => onChange({ ...rule, [name]: { ...(point ?? { type: 'percentile', value: 50 }), color: event.target.value as HexColor } })} />
      </label>
    );
  };
  return (
    <div className="flex flex-col gap-2">
      {stop('min', t('spreadsheet_ui.conditional.min_point'))}
      {rule.mid ? stop('mid', t('spreadsheet_ui.conditional.mid_point')) : null}
      {stop('max', t('spreadsheet_ui.conditional.max_point'))}
      <label className="flex items-center gap-2 text-[12px] text-nim">
        <input type="checkbox" checked={!!rule.mid}
          onChange={(event) => onChange(event.target.checked
            ? { ...rule, mid: { type: 'percentile', value: 50, color: '#ffeb84' } }
            : { kind: 'colorScale', min: rule.min, max: rule.max })} />
        {t('spreadsheet_ui.conditional.use_midpoint')}
      </label>
    </div>
  );
}

export function ConditionalFormatPanel({ formats, selectionKey, onChange, onClose }: {
  formats: readonly ConditionalFormat[];
  selectionKey: string;
  onChange: (formats: ConditionalFormat[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('editor');
  const [draft, setDraft] = useState<ConditionalFormat | null>(null);
  const save = () => {
    if (!draft) return;
    const exists = formats.some((format) => format.id === draft.id);
    onChange(exists ? formats.map((format) => (format.id === draft.id ? draft : format)) : [...formats, draft]);
    setDraft(null);
  };
  const move = (index: number, delta: -1 | 1) => {
    const next = [...formats];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };
  const rule = draft?.rule;

  return (
    <aside className="conditional-format-panel w-[280px] flex-shrink-0 flex flex-col border-l border-nim bg-nim-secondary text-nim overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2 border-b border-nim">
        <h3 className="m-0 text-[13px] font-semibold">{t('spreadsheet_ui.conditional.title')}</h3>
        <button className="bg-none border-none text-lg text-nim-muted cursor-pointer leading-none hover:text-nim" onClick={onClose} aria-label={t('spreadsheet_ui.conditional.close')}>&times;</button>
      </div>
      {!draft && (
        <div className="flex flex-col gap-2 p-3">
          {formats.length === 0 && <p className="m-0 text-[12px] text-nim-muted">{t('spreadsheet_ui.conditional.no_rules')}</p>}
          {formats.map((format, index) => (
            <div key={format.id} className="conditional-format-rule flex flex-col gap-1 p-2 rounded border border-nim bg-nim">
              <div className="text-[12px] font-medium">{describeRule(format, t)}</div>
              <div className="text-[11px] text-nim-muted font-mono">{format.ranges.join(', ')}</div>
              <div className="flex gap-1">
                <button className={BUTTON} onClick={() => setDraft(format)}>{t('spreadsheet_ui.conditional.edit')}</button>
                <button className={BUTTON} disabled={index === 0} onClick={() => move(index, -1)} aria-label={t('spreadsheet_ui.conditional.move_up')}>&uarr;</button>
                <button className={BUTTON} disabled={index === formats.length - 1} onClick={() => move(index, 1)} aria-label={t('spreadsheet_ui.conditional.move_down')}>&darr;</button>
                <button className={BUTTON} onClick={() => onChange(formats.filter((other) => other.id !== format.id))}>{t('spreadsheet_ui.conditional.delete')}</button>
              </div>
            </div>
          ))}
          <button className={BUTTON} data-conditional="add" onClick={() => setDraft(newFormat(selectionKey || 'A1'))}>{t('spreadsheet_ui.conditional.add_rule')}</button>
        </div>
      )}
      {draft && rule && (
        <div className="flex flex-col gap-3 p-3">
          <label className="flex flex-col gap-1 text-[12px] text-nim-muted">
            {t('spreadsheet_ui.conditional.apply_to_range')}
            <input className={`${FIELD} font-mono`} value={draft.ranges.join(', ')}
              onChange={(event) => setDraft({ ...draft, ranges: event.target.value.split(',').map((key) => key.trim().toUpperCase()).filter(Boolean) })} />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-nim-muted">
            {t('spreadsheet_ui.conditional.format_if')}
            <select className={FIELD} value={rule.kind} data-conditional="kind"
              onChange={(event) => setDraft({ ...draft, rule: ruleForKind(event.target.value as RuleKind, rule) })}>
              {RULE_KINDS.map((kind) => <option key={kind} value={kind}>{t(kindKey(kind))}</option>)}
            </select>
          </label>
          {rule.kind === 'valueCompare' && (
            <div className="flex gap-1">
              <select className={FIELD} value={rule.operator}
                onChange={(event) => setDraft({ ...draft, rule: { ...rule, operator: event.target.value as typeof rule.operator } })}>
                {OPERATORS.map((operator) => <option key={operator} value={operator}>{operator}</option>)}
              </select>
              <input className={`${FIELD} w-full`} value={String(rule.value)} aria-label={t('spreadsheet_ui.conditional.value')}
                onChange={(event) => setDraft({ ...draft, rule: { ...rule, value: asNumberOrText(event.target.value) } })} />
              {(rule.operator === 'between' || rule.operator === 'notBetween') && (
                <input className={`${FIELD} w-full`} value={String(rule.value2 ?? '')} aria-label={t('spreadsheet_ui.conditional.and')}
                  onChange={(event) => setDraft({ ...draft, rule: { ...rule, value2: asNumberOrText(event.target.value) } })} />
              )}
            </div>
          )}
          {(rule.kind === 'textContains' || rule.kind === 'textNotContains' || rule.kind === 'textStartsWith' || rule.kind === 'textEndsWith') && (
            <input className={FIELD} value={rule.value} aria-label={t('spreadsheet_ui.conditional.text')}
              onChange={(event) => setDraft({ ...draft, rule: { ...rule, value: event.target.value } })} />
          )}
          {rule.kind === 'colorScale'
            ? <ScaleEditor rule={rule} onChange={(next) => setDraft({ ...draft, rule: next })} />
            : (
              <div className="flex flex-col gap-2">
                <ColorField label={t('spreadsheet_ui.conditional.fill')} value={draft.style?.fillColor} onChange={(fillColor) => setDraft({ ...draft, style: { ...draft.style, fillColor } })} />
                <ColorField label={t('spreadsheet_ui.conditional.text')} value={draft.style?.textColor} onChange={(textColor) => setDraft({ ...draft, style: { ...draft.style, textColor } })} />
                <label className="flex items-center gap-2 text-[12px] text-nim">
                  <input type="checkbox" checked={!!draft.style?.bold} onChange={(event) => setDraft({ ...draft, style: { ...draft.style, bold: event.target.checked } })} />
                  {t('spreadsheet_ui.conditional.bold')}
                </label>
              </div>
            )}
          <div className="flex justify-end gap-1">
            <button className={BUTTON} onClick={() => setDraft(null)}>{t('spreadsheet_ui.conditional.cancel')}</button>
            <button className={BUTTON} data-conditional="save" disabled={draft.ranges.length === 0} onClick={save}>{t('spreadsheet_ui.conditional.done')}</button>
          </div>
        </div>
      )}
    </aside>
  );
}
