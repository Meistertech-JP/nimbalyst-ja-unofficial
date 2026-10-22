/**
 * The status bar: Sum / Average / Count / Count numbers / Min / Max of the
 * visible cells in the selection (filtered and hidden rows are skipped, as in
 * Sheets), a picker for which of them to show, and the zoom control.
 *
 * Zoom scales the font, row heights and column widths that RevoGrid lays out,
 * rather than CSS-transforming the grid: RevoGrid hit-tests pointer positions
 * against its own sizes, which a transform would put out of step.
 */

import { useMemo, useState } from 'react';
import type { ColumnFormat } from '../types';
import type { EditorCore } from '../editor/editorCore';
import type { SheetPaint } from '../editor/useSheetPaint';
import { useSelectionVersion } from '../editor/useSelectionVersion';
import { computeRangeStats, type SelectionStats } from '../status/selectionStats';
import { conditionalSnapshot } from '../cells/paintContext';
import { formatCellValue } from '../utils/formatters';
import { ToolbarMenu, MenuItem, MenuSeparator } from './toolbar/ToolbarMenu';
import { useTranslation } from '@nimbalyst/i18n/react';

export type Aggregate = 'sum' | 'average' | 'count' | 'countNumbers' | 'min' | 'max';

const LABEL_KEYS: Record<Aggregate, string> = {
  sum: 'spreadsheet_ui.status_bar.sum', average: 'spreadsheet_ui.status_bar.average',
  count: 'spreadsheet_ui.status_bar.count', countNumbers: 'spreadsheet_ui.status_bar.count_numbers',
  min: 'spreadsheet_ui.status_bar.min', max: 'spreadsheet_ui.status_bar.max',
};
const ORDER: readonly Aggregate[] = ['sum', 'average', 'count', 'countNumbers', 'min', 'max'];
export const ZOOM_LEVELS = [0.5, 0.75, 0.9, 1, 1.25, 1.5, 2] as const;
/** Selections larger than this are not summed live; the bar says so instead of stalling a drag. */
const MAX_STATS_CELLS = 2_000_000;

function isoDate(epoch: number): string {
  const date = new Date(epoch);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The value for one aggregate, formatted like the selection's first numeric cell when it has a number format. */
export function aggregateText(stats: SelectionStats, aggregate: Aggregate, format: ColumnFormat | undefined): string {
  const number = (value: number | null) => {
    if (value === null) return '';
    if (format && (format.type === 'number' || format.type === 'currency' || format.type === 'percentage')) return formatCellValue(value, format);
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };
  switch (aggregate) {
    case 'sum': return number(stats.countNumbers > 0 ? stats.sum : null);
    case 'average': return number(stats.average);
    case 'count': return String(stats.count);
    case 'countNumbers': return String(stats.countNumbers);
    case 'min': return stats.min === null ? '' : stats.minIsDate ? isoDate(stats.min) : number(stats.min);
    case 'max': return stats.max === null ? '' : stats.maxIsDate ? isoDate(stats.max) : number(stats.max);
  }
}

export function SheetStatusBar({ core, paint, zoom, onZoom }: {
  core: EditorCore;
  paint: SheetPaint;
  zoom: number;
  onZoom: (zoom: number) => void;
}) {
  const { t } = useTranslation('editor');
  const version = useSelectionVersion(core);
  const [shown, setShown] = useState<readonly Aggregate[]>(['sum', 'average', 'count']);
  const range = core.selectionRangeRef.current;

  const result = useMemo(() => {
    if (!range || (range.startRow === range.endRow && range.startCol === range.endCol)) return null;
    const rows = core.rowSpaceRef.current.expandLogicalRange(range.startRow, range.endRow).logicalRows;
    if (rows.length * (range.endCol - range.startCol + 1) > MAX_STATS_CELLS) return 'tooLarge' as const;
    const display = (model: object, prop: string) => core.formulaViewState.getDisplayValue(model, prop);
    let format: ColumnFormat | undefined;
    const stats = computeRangeStats(
      rows.map((row) => ({ startRow: row, endRow: row, startCol: range.startCol, endCol: range.endCol })),
      (row, col) => {
        const cell = conditionalSnapshot(paint.rows.modelAt(row), col, display);
        if (!format && cell.numeric !== null && cell.numeric !== undefined) format = paint.decorations.formatAt(row, col);
        return cell;
      },
    );
    return { stats, format };
    // `version` is the selection change signal; the refs are read fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, paint, range]);

  return (
    <div className="sheet-status-bar" role="status">
      <span className="sheet-status-spacer" />
      {result === 'tooLarge' && <span className="sheet-status-item">{t('spreadsheet_ui.status_bar.too_large')}</span>}
      {result && result !== 'tooLarge' && (
        <>
          {shown.map((aggregate) => {
            const text = aggregateText(result.stats, aggregate, result.format);
            return text === '' ? null : (
              <span key={aggregate} className="sheet-status-item" data-aggregate={aggregate}>
                {t(LABEL_KEYS[aggregate])}: <b>{text}</b>
              </span>
            );
          })}
          <ToolbarMenu name="aggregates" title={t('spreadsheet_ui.status_bar.choose')} label={<span>{t(LABEL_KEYS[shown[0] ?? 'sum'])}</span>}>
            {() => ORDER.map((aggregate) => (
              <MenuItem
                key={aggregate}
                label={t(LABEL_KEYS[aggregate])}
                hint={aggregateText(result.stats, aggregate, result.format)}
                checked={shown.includes(aggregate)}
                onSelect={() => setShown((current) => (current.includes(aggregate)
                  ? current.filter((item) => item !== aggregate)
                  : ORDER.filter((item) => item === aggregate || current.includes(item))))}
              />
            ))}
          </ToolbarMenu>
        </>
      )}
      <span className="sheet-toolbar-separator" />
      <ToolbarMenu name="zoom" title={t('spreadsheet_ui.status_bar.zoom')} label={<span>{Math.round(zoom * 100)}%</span>}>
        {(close) => (
          <>
            {ZOOM_LEVELS.map((level) => (
              <MenuItem key={level} label={`${Math.round(level * 100)}%`} checked={level === zoom} onSelect={() => { onZoom(level); close(); }} />
            ))}
            <MenuSeparator />
            <MenuItem label={t('spreadsheet_ui.status_bar.reset')} disabled={zoom === 1} onSelect={() => { onZoom(1); close(); }} />
          </>
        )}
      </ToolbarMenu>
    </div>
  );
}
