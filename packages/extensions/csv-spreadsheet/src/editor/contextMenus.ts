/**
 * Context menu item builders for the three right-click targets: a cell, a row
 * header, and a column header. Pure functions of the sheet state they are
 * given, so a menu's behavior can be tested without rendering the grid.
 */

import type { ColumnFormat, CellStyle, NormalizedSelectionRange } from '../types';
import type { ContextMenuItem } from '../components/ContextMenu';
import type { GridOperations } from '../utils/gridOperations';
import type { UseSpreadsheetMetadataResult } from '../hooks/useSpreadsheetMetadata';
import { columnIndexToLetter } from '../utils/csvParser';
import type { CellPosition } from './editorCore';
import { hideCols, hideRows, unhideCols, unhideRows } from '../format/formatActions';

/** English fallbacks so the pure builders stay testable without an i18n instance. */
const MENU_DEFAULTS: Record<string, string> = {
  'spreadsheet_ui.menu.cut': 'Cut',
  'spreadsheet_ui.menu.cut_count': 'Cut ({{count}} cells)',
  'spreadsheet_ui.menu.copy': 'Copy',
  'spreadsheet_ui.menu.copy_count': 'Copy ({{count}} cells)',
  'spreadsheet_ui.menu.paste': 'Paste',
  'spreadsheet_ui.menu.clear': 'Clear',
  'spreadsheet_ui.menu.clear_count': 'Clear ({{count}} cells)',
  'spreadsheet_ui.menu.format_cells': 'Format Cells...',
  'spreadsheet_ui.menu.format_cells_count': 'Format Cells ({{count}})...',
  'spreadsheet_ui.menu.clear_formatting': 'Clear formatting',
  'spreadsheet_ui.menu.insert_row_above': 'Insert Row Above',
  'spreadsheet_ui.menu.insert_row_below': 'Insert Row Below',
  'spreadsheet_ui.menu.delete_row': 'Delete Row',
  'spreadsheet_ui.menu.insert_col_left': 'Insert Column Left',
  'spreadsheet_ui.menu.insert_col_right': 'Insert Column Right',
  'spreadsheet_ui.menu.delete_col': 'Delete Column',
  'spreadsheet_ui.menu.remove_header_row': 'Remove Header Row',
  'spreadsheet_ui.menu.remove_all_header_rows': 'Remove All Header Rows',
  'spreadsheet_ui.menu.set_header_row': 'Set as Header Row',
  'spreadsheet_ui.menu.set_header_rows': 'Set Rows 1-{{row}} as Headers',
  'spreadsheet_ui.menu.format_column': 'Format Column ({{type}})...',
  'spreadsheet_ui.menu.detect_type': 'Detect Column Type',
  'spreadsheet_ui.menu.sort_asc': 'Sort {{column}} A -> Z',
  'spreadsheet_ui.menu.sort_desc': 'Sort {{column}} Z -> A',
  'spreadsheet_ui.menu.unfreeze_column': 'Unfreeze Column',
  'spreadsheet_ui.menu.unfreeze_all': 'Unfreeze All Columns',
  'spreadsheet_ui.menu.freeze_column': 'Freeze Column',
  'spreadsheet_ui.menu.freeze_columns': 'Freeze Columns A-{{column}}',
  'spreadsheet_ui.menu.unhide_all_rows': 'Unhide All Rows',
  'spreadsheet_ui.menu.unhide_all_cols': 'Unhide All Columns',
  'spreadsheet_ui.menu.text': 'Text',
  'spreadsheet_ui.toolbar.hide_row': 'Hide Row {{row}}',
  'spreadsheet_ui.toolbar.hide_rows': 'Hide Rows {{start}}-{{end}}',
  'spreadsheet_ui.toolbar.hide_column': 'Hide Column {{column}}',
  'spreadsheet_ui.toolbar.hide_columns': 'Hide Columns {{start}}-{{end}}',
  'spreadsheet_ui.toolbar.unhide_rows': 'Unhide Rows',
  'spreadsheet_ui.toolbar.unhide_columns': 'Unhide Columns',
};

export type MenuTranslate = (key: string, params?: Record<string, unknown>) => string;

function defaultMenuTranslate(key: string, params?: Record<string, unknown>): string {
  return (MENU_DEFAULTS[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    params && name in params ? String(params[name]) : `{{${name}}}`);
}

export interface ContextMenuDeps {
  gridOps: GridOperations | null;
  meta: Pick<UseSpreadsheetMetadataResult, 'setSortConfig'>;
  headerRowCount: number;
  updateSelection: (cell: CellPosition | null, range: NormalizedSelectionRange | null) => unknown;
  openCellFormat: () => void;
  openColumnFormat: (columnIndex: number) => void;
  applyCellStyle: (change: CellStyle) => void;
  applyDetectedColumnType: (columnIndex: number) => void;
  /** The current selection, so hide/unhide act on the selected block containing the clicked header. */
  selectionRange?: NormalizedSelectionRange | null;
  hiddenRows?: readonly number[];
  hiddenCols?: readonly number[];
  /** Optional translator; when omitted the builders fall back to English labels. */
  translate?: MenuTranslate;
}

function trFor(deps: ContextMenuDeps): MenuTranslate {
  return deps.translate ?? defaultMenuTranslate;
}

/** The span a header action applies to: the selected rows/columns when the click is inside them. */
function headerSpan(index: number, range: NormalizedSelectionRange | null | undefined, axis: 'row' | 'col'): [number, number] {
  if (!range) return [index, index];
  const [start, end] = axis === 'row' ? [range.startRow, range.endRow] : [range.startCol, range.endCol];
  return index >= start && index <= end ? [start, end] : [index, index];
}

function hideItems(index: number, deps: ContextMenuDeps, axis: 'row' | 'col'): ContextMenuItem[] {
  const tr = trFor(deps);
  const [start, end] = headerSpan(index, deps.selectionRange, axis);
  const name = (i: number) => (axis === 'row' ? String(i + 1) : columnIndexToLetter(i));
  const label = start === end
    ? (axis === 'row'
      ? tr('spreadsheet_ui.toolbar.hide_row', { row: name(start) })
      : tr('spreadsheet_ui.toolbar.hide_column', { column: name(start) }))
    : (axis === 'row'
      ? tr('spreadsheet_ui.toolbar.hide_rows', { start: name(start), end: name(end) })
      : tr('spreadsheet_ui.toolbar.hide_columns', { start: name(start), end: name(end) }));
  const hidden = (axis === 'row' ? deps.hiddenRows : deps.hiddenCols) ?? [];
  // A hidden block next to the clicked header, or inside the selection, is what "unhide" reveals.
  // The whole contiguous hidden block is revealed, not just its first row.
  const isHidden = new Set(hidden);
  let unhideStart = Math.max(0, start - 1);
  let unhideEnd = end + 1;
  while (unhideStart > 0 && isHidden.has(unhideStart - 1)) unhideStart -= 1;
  while (isHidden.has(unhideEnd + 1)) unhideEnd += 1;
  const nearby = hidden.some((i) => i >= unhideStart && i <= unhideEnd);
  const items: ContextMenuItem[] = [{
    label,
    action: () => void deps.gridOps?.setMeta((meta) => (axis === 'row' ? hideRows(meta, start, end) : hideCols(meta, start, end))),
  }];
  if (hidden.length > 0) {
    items.push({
      label: nearby
        ? (axis === 'row' ? tr('spreadsheet_ui.toolbar.unhide_rows') : tr('spreadsheet_ui.toolbar.unhide_columns'))
        : (axis === 'row' ? tr('spreadsheet_ui.menu.unhide_all_rows') : tr('spreadsheet_ui.menu.unhide_all_cols')),
      action: () => void deps.gridOps?.setMeta((meta) => (axis === 'row'
        ? unhideRows(meta, nearby ? unhideStart : 0, nearby ? unhideEnd : Number.MAX_SAFE_INTEGER)
        : unhideCols(meta, nearby ? unhideStart : 0, nearby ? unhideEnd : Number.MAX_SAFE_INTEGER))),
    });
  }
  return items;
}

const SEPARATOR: ContextMenuItem = { label: '', action: () => {}, separator: true };

/**
 * Row and column inserts/deletes are single structural commands: the header
 * row count, frozen columns, formats and formula refs are rewritten in the
 * same step as the grid, so the menu never adjusts metadata itself. (Doing it
 * here raced the asynchronous grid read: deleting the header row deleted the
 * first body row instead.)
 */
function insertRow(deps: ContextMenuDeps, rowIndex: number): void {
  void deps.gridOps?.addRow(rowIndex);
}

function deleteRow(deps: ContextMenuDeps, rowIndex: number): void {
  void deps.gridOps?.deleteRow(rowIndex);
  deps.updateSelection(null, null);
}

function setFrozenColumns(deps: ContextMenuDeps, count: number): void {
  void deps.gridOps?.setMeta((meta) => ({ frozenColumnCount: Math.max(0, Math.min(count, meta.columnCount)) }));
}

export function buildCellMenuItems(
  cell: CellPosition | null,
  range: NormalizedSelectionRange | null,
  deps: ContextMenuDeps,
): ContextMenuItem[] {
  const tr = trFor(deps);
  const hasSelection = !!cell;
  const { gridOps } = deps;
  const cellCount = range
    ? (range.endRow - range.startRow + 1) * (range.endCol - range.startCol + 1)
    : 0;
  const hasMultipleSelected = cellCount > 1;

  return [
    {
      label: hasMultipleSelected ? tr('spreadsheet_ui.menu.cut_count', { count: cellCount }) : tr('spreadsheet_ui.menu.cut'),
      action: () => {
        if (range && gridOps) gridOps.cutSelection(range);
      },
      disabled: !hasSelection,
    },
    {
      label: hasMultipleSelected ? tr('spreadsheet_ui.menu.copy_count', { count: cellCount }) : tr('spreadsheet_ui.menu.copy'),
      action: () => {
        if (range && gridOps) gridOps.copySelection(range);
      },
      disabled: !hasSelection,
    },
    {
      label: tr('spreadsheet_ui.menu.paste'),
      action: () => {
        const target = range ?? (cell && { startRow: cell.row, endRow: cell.row, startCol: cell.col, endCol: cell.col });
        if (target && gridOps) void gridOps.paste(target).catch(() => {});
      },
      disabled: !hasSelection,
    },
    {
      label: hasMultipleSelected ? tr('spreadsheet_ui.menu.clear_count', { count: cellCount }) : tr('spreadsheet_ui.menu.clear'),
      action: () => {
        if (range && gridOps) gridOps.clearCells(range);
      },
      disabled: !hasSelection,
    },
    SEPARATOR,
    // Styling is presentation only, so it is safe on a formula or a date --
    // neither of these touches the cell's value.
    {
      label: hasMultipleSelected ? tr('spreadsheet_ui.menu.format_cells_count', { count: cellCount }) : tr('spreadsheet_ui.menu.format_cells'),
      action: deps.openCellFormat,
      disabled: !hasSelection,
    },
    {
      label: tr('spreadsheet_ui.menu.clear_formatting'),
      action: () => deps.applyCellStyle({
        bold: false, italic: false, underline: false, strikethrough: false,
        textColor: 'default', fillColor: 'default',
      }),
      disabled: !hasSelection,
    },
    SEPARATOR,
    {
      label: tr('spreadsheet_ui.menu.insert_row_above'),
      action: () => {
        if (cell && gridOps) insertRow(deps, cell.row);
      },
      disabled: !hasSelection,
    },
    {
      label: tr('spreadsheet_ui.menu.insert_row_below'),
      action: () => {
        if (cell && gridOps) insertRow(deps, cell.row + 1);
      },
      disabled: !hasSelection,
    },
    {
      label: tr('spreadsheet_ui.menu.delete_row'),
      action: () => {
        if (cell && gridOps) deleteRow(deps, cell.row);
      },
      disabled: !hasSelection,
    },
    SEPARATOR,
    {
      label: tr('spreadsheet_ui.menu.insert_col_left'),
      action: () => {
        if (cell && gridOps) gridOps.addColumn(cell.col);
      },
      disabled: !hasSelection,
    },
    {
      label: tr('spreadsheet_ui.menu.insert_col_right'),
      action: () => {
        if (cell && gridOps) gridOps.addColumn(cell.col + 1);
      },
      disabled: !hasSelection,
    },
    {
      label: tr('spreadsheet_ui.menu.delete_col'),
      action: () => {
        if (cell && gridOps) {
          gridOps.deleteColumn(cell.col);
          deps.updateSelection(null, null);
        }
      },
      disabled: !hasSelection,
    },
  ];
}

export function buildRowHeaderMenuItems(rowIndex: number, deps: ContextMenuDeps): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];
  const tr = trFor(deps);
  const { gridOps, headerRowCount } = deps;

  // Header pinning is available again now that selection spans the pinned
  // boundary (see selection/crossSectionSelection.ts).
  const isCurrentlyHeader = rowIndex < headerRowCount;
  const isTopRowOrAdjacentToHeader = rowIndex === 0 || rowIndex === headerRowCount;

  const setHeaderCount = (count: number) => gridOps?.updateHeaderRowCount(count);

  if (isCurrentlyHeader) {
    if (rowIndex === headerRowCount - 1) {
      items.push({
        label: tr('spreadsheet_ui.menu.remove_header_row'),
        action: () => setHeaderCount(headerRowCount - 1),
      });
    }
    if (headerRowCount > 1) {
      items.push({
        label: tr('spreadsheet_ui.menu.remove_all_header_rows'),
        action: () => setHeaderCount(0),
      });
    }
  } else if (isTopRowOrAdjacentToHeader) {
    items.push({
      label: tr('spreadsheet_ui.menu.set_header_row'),
      action: () => setHeaderCount(rowIndex + 1),
    });
  } else {
    items.push({
      label: tr('spreadsheet_ui.menu.set_header_rows', { row: rowIndex + 1 }),
      action: () => setHeaderCount(rowIndex + 1),
    });
  }

  items.push(SEPARATOR);
  items.push({ label: tr('spreadsheet_ui.menu.insert_row_above'), action: () => insertRow(deps, rowIndex) });
  items.push({ label: tr('spreadsheet_ui.menu.insert_row_below'), action: () => insertRow(deps, rowIndex + 1) });
  items.push({ label: tr('spreadsheet_ui.menu.delete_row'), action: () => deleteRow(deps, rowIndex) });
  items.push(SEPARATOR, ...hideItems(rowIndex, deps, 'row'));

  return items;
}

export function buildColumnHeaderMenuItems(
  colIndex: number,
  { frozenColumnCount, columnFormats }: {
    frozenColumnCount: number;
    columnFormats: Record<number, ColumnFormat>;
  },
  deps: ContextMenuDeps,
): ContextMenuItem[] {
  const colLetter = columnIndexToLetter(colIndex);
  const currentFrozenCount = frozenColumnCount;
  const currentFormat = columnFormats[colIndex];
  const tr = trFor(deps);
  const formatTypeName = currentFormat ? tr(`spreadsheet_ui.col_type.${currentFormat.type}`) : tr('spreadsheet_ui.menu.text');
  const { gridOps, meta } = deps;

  const items: ContextMenuItem[] = [
    {
      label: tr('spreadsheet_ui.menu.format_column', { type: formatTypeName }),
      action: () => deps.openColumnFormat(colIndex),
    },
    {
      label: tr('spreadsheet_ui.menu.detect_type'),
      action: () => deps.applyDetectedColumnType(colIndex),
    },
    SEPARATOR,
    {
      label: tr('spreadsheet_ui.menu.sort_asc', { column: colLetter }),
      action: () => {
        gridOps?.sortByColumn(colIndex, 'asc');
        meta.setSortConfig({ columnIndex: colIndex, direction: 'asc' });
      },
    },
    {
      label: tr('spreadsheet_ui.menu.sort_desc', { column: colLetter }),
      action: () => {
        gridOps?.sortByColumn(colIndex, 'desc');
        meta.setSortConfig({ columnIndex: colIndex, direction: 'desc' });
      },
    },
    SEPARATOR,
  ];

  // Freeze is available again now that selection spans the frozen boundary
  // (see selection/crossSectionSelection.ts).
  const isCurrentlyFrozen = colIndex < currentFrozenCount;
  const isAtFrozenBoundary = colIndex === currentFrozenCount;

  if (isCurrentlyFrozen) {
    if (colIndex === currentFrozenCount - 1) {
      items.push({
        label: tr('spreadsheet_ui.menu.unfreeze_column'),
        action: () => setFrozenColumns(deps, currentFrozenCount - 1),
      });
    }
    if (currentFrozenCount > 1) {
      items.push({
        label: tr('spreadsheet_ui.menu.unfreeze_all'),
        action: () => setFrozenColumns(deps, 0),
      });
    }
  } else if (isAtFrozenBoundary) {
    items.push({
      label: tr('spreadsheet_ui.menu.freeze_column'),
      action: () => setFrozenColumns(deps, colIndex + 1),
    });
  } else {
    items.push({
      label: tr('spreadsheet_ui.menu.freeze_columns', { column: colLetter }),
      action: () => setFrozenColumns(deps, colIndex + 1),
    });
  }

  items.push(SEPARATOR);

  items.push({
    label: tr('spreadsheet_ui.menu.insert_col_left'),
    action: () => gridOps?.addColumn(colIndex),
  });
  items.push({
    label: tr('spreadsheet_ui.menu.insert_col_right'),
    action: () => gridOps?.addColumn(colIndex + 1),
  });
  items.push({
    label: tr('spreadsheet_ui.menu.delete_col'),
    action: () => {
      gridOps?.deleteColumn(colIndex);
      deps.updateSelection(null, null);
    },
  });
  items.push(SEPARATOR, ...hideItems(colIndex, deps, 'col'));

  return items;
}
