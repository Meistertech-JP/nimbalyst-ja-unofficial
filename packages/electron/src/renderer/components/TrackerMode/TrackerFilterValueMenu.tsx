import type { JSX, RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FloatingPortal } from '@floating-ui/react';
import { MaterialSymbol } from '@nimbalyst/runtime';
import type { TrackerFilterOp } from '@nimbalyst/runtime/plugins/TrackerPlugin/models';
import type { TrackerFilterField } from './TrackerViewHeaderControls';

interface TrackerFilterValueMenuProps {
  field: TrackerFilterField;
  anchorRect: DOMRect | null;
  placement?: 'left' | 'below';
  selectedValues?: ReadonlySet<string>;
  onSelect: (value: string | string[] | number, op?: TrackerFilterOp) => void;
  onClear?: () => void;
  onClose: () => void;
  dismissOnOutsideClick?: boolean;
  menuRef?: RefObject<HTMLDivElement | null>;
  testIdPrefix?: 'tracker-filter' | 'tracker-column-filter';
}

function iconForField(field: TrackerFilterField): string {
  const key = `${field.id} ${field.label}`.toLowerCase();
  if (key.includes('status')) return 'progress_activity';
  if (key.includes('priority')) return 'signal_cellular_alt';
  if (key.includes('assignee') || key.includes('owner') || field.type === 'user') return 'person';
  if (key.includes('tag') || key.includes('label')) return 'sell';
  if (key.includes('relation') || field.type === 'relationship' || field.type === 'reference') return 'account_tree';
  if (key.includes('date') || key.includes('created') || key.includes('updated')) return 'calendar_today';
  if (key.includes('type')) return 'category';
  if (key.includes('source') || key.includes('module')) return 'deployed_code';
  if (field.type === 'boolean') return 'toggle_on';
  if (field.type === 'number') return 'numbers';
  if (field.type === 'array' || field.type === 'multiselect') return 'list';
  return 'text_fields';
}

export function TrackerFilterValueMenu({
  field,
  anchorRect,
  placement = 'left',
  selectedValues = new Set(),
  onSelect,
  onClear,
  onClose,
  dismissOnOutsideClick = true,
  menuRef,
  testIdPrefix = 'tracker-filter',
}: TrackerFilterValueMenuProps): JSX.Element {
  const { t } = useTranslation(['tracker']);
  const [query, setQuery] = useState('');
  const [relativeDays, setRelativeDays] = useState('7');
  const [pendingValues, setPendingValues] = useState<Set<string>>(
    () => new Set(selectedValues),
  );
  const localRef = useRef<HTMLDivElement>(null);
  const allowsMultiple = field.type === 'array'
    || field.type === 'multiselect'
    || field.multiValue === true;
  const options = useMemo(() => {
    if (field.type === 'boolean') {
      return [
        { value: 'true', label: t('tracker:filters.true') },
        { value: 'false', label: t('tracker:filters.false') },
      ];
    }
    return field.options ?? [];
  }, [field, t]);
  const matchingOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(normalized)
      || option.value.toLowerCase().includes(normalized));
  }, [options, query]);
  const matchingOptionsWithIssues = useMemo(
    () => matchingOptions.filter(option =>
      selectedValues.has(option.value)
      || (option.count ?? 0) > 0
      || option.count === undefined),
    [matchingOptions, selectedValues],
  );
  const unmatchedOptionCount = useMemo(
    () => options.filter(option => option.count === 0).length,
    [options],
  );

  useEffect(() => {
    setQuery('');
    setRelativeDays('7');
  }, [field.id]);

  useEffect(() => {
    if (!dismissOnOutsideClick) return;
    const closeOnOutsideClick = (event: MouseEvent): void => {
      if (!localRef.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [dismissOnOutsideClick, onClose]);

  const viewportWidth = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 900 : window.innerHeight;
  const left = placement === 'left'
    ? Math.max(8, (anchorRect?.left ?? 376) - 368)
    : Math.max(8, Math.min(viewportWidth - 368, anchorRect?.left ?? 8));
  const top = placement === 'left'
    ? Math.max(8, Math.min(viewportHeight - 180, (anchorRect?.top ?? 180) - 86))
    : Math.max(8, Math.min(viewportHeight - 180, (anchorRect?.bottom ?? 40) + 6));

  return (
    <FloatingPortal>
      <div
        ref={(node) => {
          localRef.current = node;
          if (menuRef) menuRef.current = node;
        }}
        className="fixed z-[60] w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-nim bg-nim-secondary shadow-xl"
        style={{ left, top }}
        data-testid={`${testIdPrefix}-value-submenu`}
        data-tracker-filter-value-menu
      >
        {field.type !== 'date' && field.type !== 'datetime' && (
          <div className="relative border-b border-nim p-3">
            <input
              autoFocus={placement === 'below'}
              className="h-9 w-full rounded-md bg-transparent px-1 text-[15px] text-nim outline-none placeholder:text-nim-faint"
              placeholder={t('tracker:filters.search')}
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  onClose();
                } else if (event.key === 'Enter' && matchingOptionsWithIssues.length === 1) {
                  const value = matchingOptionsWithIssues[0].value;
                  if (allowsMultiple) {
                    setPendingValues(current => {
                      const next = new Set(current);
                      if (next.has(value)) next.delete(value);
                      else next.add(value);
                      return next;
                    });
                  } else {
                    onSelect(value, '=');
                  }
                }
              }}
              data-testid={`${testIdPrefix}-option-search`}
            />
          </div>
        )}

        {field.type === 'date' || field.type === 'datetime' ? (
          <div className="p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] text-nim-muted">
              <MaterialSymbol icon="calendar_today" size={15} />
              {t('tracker:filters.relative_days')}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1}
                className="min-w-0 flex-1 rounded border border-nim bg-nim px-2 py-2 text-[13px] text-nim outline-none focus:border-nim-focus"
                value={relativeDays}
                onChange={event => setRelativeDays(event.target.value)}
                aria-label={t('tracker:filters.number_of_days')}
                data-testid={`${testIdPrefix}-relative-days`}
              />
              <span className="text-[12px] text-nim-muted">{t('tracker:filters.days_unit')}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-md bg-[var(--nim-primary)] px-3 py-2 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40"
                disabled={!relativeDays || Number(relativeDays) < 0}
                onClick={() => onSelect(Number(relativeDays), 'in-last')}
                data-testid={`${testIdPrefix}-relative-in-last`}
              >
                {t('tracker:filters.in_last')}
              </button>
              <button
                type="button"
                className="rounded-md border border-nim px-3 py-2 text-[12px] font-medium text-nim hover:bg-nim-tertiary disabled:opacity-40"
                disabled={!relativeDays || Number(relativeDays) < 0}
                onClick={() => onSelect(Number(relativeDays), 'not-in-last')}
                data-testid={`${testIdPrefix}-relative-not-in-last`}
              >
                {t('tracker:filters.not_in_last')}
              </button>
            </div>
            {onClear && (
              <button
                type="button"
                className="mt-2 w-full px-3 py-1 text-[11px] text-nim-muted hover:text-nim"
                onClick={onClear}
                data-testid={`${testIdPrefix}-clear`}
              >
                {t('tracker:filters.clear')}
              </button>
            )}
          </div>
        ) : options.length > 0 || field.type === 'user' ? (
          <>
            <div className="max-h-[360px] overflow-y-auto p-2">
              {field.type === 'user' && (
                <div className="mb-2 border-b border-nim pb-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] text-nim hover:bg-nim-tertiary"
                    onClick={() => onSelect('', 'is-current-user')}
                    data-testid={`${testIdPrefix}-relative-current-user`}
                  >
                    <MaterialSymbol icon="person" size={17} className="text-nim-muted" />
                    {t('tracker:filters.current_user')}
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] text-nim hover:bg-nim-tertiary"
                    onClick={() => onSelect('', 'is-not-current-user')}
                    data-testid={`${testIdPrefix}-relative-not-current-user`}
                  >
                    <MaterialSymbol icon="person_off" size={17} className="text-nim-muted" />
                    {t('tracker:filters.not_current_user')}
                  </button>
                </div>
              )}
              {matchingOptionsWithIssues.map(option => {
                const selected = allowsMultiple
                  ? pendingValues.has(option.value)
                  : selectedValues.has(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] text-nim hover:bg-nim-tertiary"
                    onClick={() => {
                      if (!allowsMultiple) {
                        onSelect(option.value, '=');
                        return;
                      }
                      setPendingValues(current => {
                        const next = new Set(current);
                        if (next.has(option.value)) next.delete(option.value);
                        else next.add(option.value);
                        return next;
                      });
                    }}
                    role={allowsMultiple ? 'checkbox' : 'radio'}
                    aria-checked={selected}
                    data-testid={`${testIdPrefix}-option-${option.value}`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center border-2 ${
                        allowsMultiple ? 'rounded' : 'rounded-full'
                      } ${
                        selected ? 'bg-[var(--nim-primary)]' : ''
                      }`}
                      style={{ borderColor: selected ? 'var(--nim-primary)' : option.color ?? 'var(--nim-text-faint)' }}
                    >
                      {selected && <MaterialSymbol icon="check" size={10} className="text-white" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.count !== undefined && (
                      <span className="shrink-0 text-[12px] tabular-nums text-nim-faint">
                        {t('tracker:filters.issues_count', { count: option.count })}
                      </span>
                    )}
                  </button>
                );
              })}
              {matchingOptionsWithIssues.length === 0 && field.type !== 'user' && (
                <div className="px-3 py-8 text-center text-[12px] text-nim-faint">
                  {t('tracker:filters.no_matching_values')}
                </div>
              )}
            </div>
            {(unmatchedOptionCount > 0 || onClear || allowsMultiple) && (
              <div className="flex items-center gap-3 border-t border-nim px-4 py-3 text-[13px] text-nim-muted">
                {unmatchedOptionCount > 0 && (
                  <>
                    <MaterialSymbol icon="progress_activity" size={17} className="text-nim-faint" />
                    <span className="flex-1">
                      {t('tracker:filters.unmatched_options', { count: unmatchedOptionCount })}
                    </span>
                  </>
                )}
                {onClear && (
                  <button
                    type="button"
                    className="ml-auto shrink-0 text-[12px] text-nim-muted hover:text-nim"
                    onClick={onClear}
                    data-testid={`${testIdPrefix}-clear`}
                  >
                    {t('tracker:filters.clear')}
                  </button>
                )}
                {allowsMultiple && (
                  <button
                    type="button"
                    className="ml-auto shrink-0 rounded bg-[var(--nim-primary)] px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40"
                    disabled={pendingValues.size === 0}
                    onClick={() => onSelect(Array.from(pendingValues), 'in')}
                    data-testid={`${testIdPrefix}-apply-multiple`}
                  >
                    {pendingValues.size > 0
                      ? t('tracker:filters.apply_count', { count: pendingValues.size })
                      : t('tracker:filters.apply')}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] text-nim-muted">
              <MaterialSymbol icon={iconForField(field)} size={15} />
              {field.label}
            </div>
            <button
              type="button"
              className="w-full rounded-md bg-[var(--nim-primary)] px-3 py-2 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40"
              disabled={!query.trim()}
              onClick={() => onSelect(query, '=')}
              data-testid={`${testIdPrefix}-quick-apply`}
            >
              {t('tracker:filters.filter_for', { query: query || '…' })}
            </button>
            {onClear && (
              <button
                type="button"
                className="mt-2 w-full px-3 py-1 text-[11px] text-nim-muted hover:text-nim"
                onClick={onClear}
                data-testid={`${testIdPrefix}-clear`}
              >
                {t('tracker:filters.clear')}
              </button>
            )}
          </div>
        )}
      </div>
    </FloatingPortal>
  );
}
