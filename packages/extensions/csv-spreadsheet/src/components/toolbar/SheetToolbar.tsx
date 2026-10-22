/**
 * The compact sheet toolbar: history, number formats, text styles, colors,
 * borders, alignment, wrap, freeze, hide, filter, conditional formatting,
 * validation and insert-function.
 *
 * Every button is a metadata command through `FormatActions` (one undo step,
 * published to collab), except undo/redo, filter and insert-function, which
 * call the executor, the filter dropdown and the cell editor respectively.
 * Button state (bold on, wrap on, current format) is read from the active cell.
 */

import { useRef, type ReactNode } from 'react';
import type { CellAlignment, CellStyle, CellVerticalAlignment, ColumnFormat } from '../../types';
import type { SpreadsheetMetadata } from '../../hooks/useSpreadsheetMetadata';
import type { EditorCore } from '../../editor/editorCore';
import type { FormatActions } from '../../editor/useFormatActions';
import { useSelectionVersion } from '../../editor/useSelectionVersion';
import { CellStyleIndex } from '../../cells/cellStyles';
import { columnIndexToLetter } from '../../utils/csvParser';
import {
  adjustDecimals, applyBorders, effectiveFormat, freezeCols, freezeRows, hideCols, hideRows, isWrapped,
  presetFormat, setCellFormat, setStyle, setWrap, toggleStyle, unhideCols, unhideRows,
  type BorderPreset, type NumberFormatPreset, type ToggleStyle,
} from '../../format/formatActions';
import type { BorderLineStyle } from '../../sheetMeta/formatting';
import { useTranslation } from '@nimbalyst/i18n/react';
import { ToolbarMenu, MenuItem, MenuSeparator } from './ToolbarMenu';
import { ColorPalette } from './ColorPalette';
import * as Icons from './toolbarIcons';

const NUMBER_PRESETS: readonly { preset: NumberFormatPreset; sample: string }[] = [
  { preset: 'automatic', sample: '' },
  { preset: 'text', sample: '' },
  { preset: 'number', sample: '1,000.12' },
  { preset: 'percent', sample: '10.12%' },
  { preset: 'scientific', sample: '1.01E+03' },
  { preset: 'accounting', sample: '$ (1,000.12)' },
  { preset: 'currency', sample: '$1,000.12' },
  { preset: 'currencyRounded', sample: '$1,000' },
  { preset: 'date', sample: '9/26/2008' },
  { preset: 'time', sample: '3:59 PM' },
  { preset: 'datetime', sample: '9/26/2008 15:59' },
];

const BORDER_PRESETS: readonly { preset: BorderPreset }[] = [
  { preset: 'all' },
  { preset: 'outer' },
  { preset: 'inner' },
  { preset: 'horizontal' },
  { preset: 'vertical' },
  { preset: 'top' },
  { preset: 'bottom' },
  { preset: 'left' },
  { preset: 'right' },
  { preset: 'none' },
];
const BORDER_STYLES: readonly BorderLineStyle[] = ['thin', 'medium', 'thick', 'dashed', 'dotted', 'double'];

const FUNCTIONS = ['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'IF', 'VLOOKUP', 'CONCATENATE'] as const;

function presetOf(format: ColumnFormat | undefined, hasOwn: boolean): NumberFormatPreset | null {
  if (!format) return 'automatic';
  if (!hasOwn && format.type === 'text') return 'automatic';
  if (format.type === 'currency') {
    if (format.numberStyle === 'accounting') return 'accounting';
    return format.decimals === 0 ? 'currencyRounded' : 'currency';
  }
  if (format.type === 'number') return format.numberStyle === 'scientific' ? 'scientific' : 'number';
  if (format.type === 'percentage') return 'percent';
  if (format.type === 'text') return 'text';
  if (format.type === 'date' || format.type === 'time' || format.type === 'datetime') return format.type;
  return null;
}

export interface SheetToolbarProps {
  core: EditorCore;
  metadata: SpreadsheetMetadata;
  actions: FormatActions;
  disabled: boolean;
  onFilter: (columnIndex: number, anchor: HTMLElement) => void;
  onInsertFunction: (name: string) => void;
  onOpenConditional: () => void;
  onOpenValidation: () => void;
  onOpenNamedRanges: () => void;
  /** Right-aligned extras (View Source). */
  trailing?: ReactNode;
}

function Button({ title, name, on, disabled, onClick, children }: {
  title: string; name: string; on?: boolean; disabled?: boolean; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void; children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`sheet-toolbar-button ${on ? 'sheet-toolbar-button-on' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={on}
      data-toolbar={name}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const Separator = () => <span className="sheet-toolbar-separator" aria-hidden="true" />;

export function SheetToolbar(props: SheetToolbarProps) {
  const { core, metadata, actions, disabled } = props;
  const { t } = useTranslation('editor');
  useSelectionVersion(core);
  const borderStyleRef = useRef<BorderLineStyle>('thin');
  const selected = actions.target();
  const active = selected?.active ?? null;
  const range = selected?.range ?? null;
  const style: CellStyle = (active && new CellStyleIndex(metadata.cellStyles).styleAt(active.row, active.col)) || {};
  const meta = { ...metadata };
  const format = active ? effectiveFormat(meta, active) : undefined;
  const ownFormat = !!active && format !== metadata.columnFormats[active.col];
  const currentPreset = presetOf(format, ownFormat);
  const wrapped = !!active && isWrapped(meta, active);
  const off = disabled || !selected;

  const toggle = (name: ToggleStyle) => () => actions.apply((m, r, a) => toggleStyle(m, r, a, name));
  const styleButton = (name: ToggleStyle, title: string, label: ReactNode) => (
    <Button title={title} name={name} on={!!style[name]} disabled={off} onClick={toggle(name)}>{label}</Button>
  );
  const align = (value: CellAlignment) => actions.apply((m, r) => setStyle(m, r, { align: value }));
  const valign = (value: CellVerticalAlignment) => actions.apply((m, r) => setStyle(m, r, { verticalAlign: value }));
  const activeRow = active ? active.row + 1 : 1;
  const activeCol = active ? columnIndexToLetter(active.col) : 'A';

  return (
    <div className="sheet-toolbar" role="toolbar" aria-label={t('spreadsheet_ui.toolbar.label')}>
      <Button title={t('spreadsheet_ui.toolbar.undo')} name="undo" disabled={disabled} onClick={() => void core.gridOpsRef.current?.executor.undo()}><Icons.UndoIcon /></Button>
      <Button title={t('spreadsheet_ui.toolbar.redo')} name="redo" disabled={disabled} onClick={() => void core.gridOpsRef.current?.executor.redo()}><Icons.RedoIcon /></Button>
      <Separator />
      <Button title={t('spreadsheet_ui.toolbar.currency')} name="currency" on={currentPreset === 'currency'} disabled={off}
        onClick={() => actions.apply((m, r) => setCellFormat(m, r, presetFormat('currency')))}><span className="sheet-toolbar-text">$</span></Button>
      <Button title={t('spreadsheet_ui.toolbar.percent')} name="percent" on={currentPreset === 'percent'} disabled={off}
        onClick={() => actions.apply((m, r) => setCellFormat(m, r, presetFormat('percent')))}><span className="sheet-toolbar-text">%</span></Button>
      <Button title={t('spreadsheet_ui.toolbar.decimals_less')} name="decimals-less" disabled={off}
        onClick={() => actions.apply((m, r, a) => adjustDecimals(m, r, a, -1))}><span className="sheet-toolbar-small">.0</span><Icons.DecimalsLessIcon /></Button>
      <Button title={t('spreadsheet_ui.toolbar.decimals_more')} name="decimals-more" disabled={off}
        onClick={() => actions.apply((m, r, a) => adjustDecimals(m, r, a, 1))}><span className="sheet-toolbar-small">.00</span><Icons.DecimalsMoreIcon /></Button>
      <ToolbarMenu name="number-format" title={t('spreadsheet_ui.toolbar.more_formats')} disabled={off} label={<span className="sheet-toolbar-small">123</span>}>
        {(close) => NUMBER_PRESETS.map(({ preset, sample }) => (
          <MenuItem key={preset} label={t(`spreadsheet_ui.number_preset.${preset}`)} hint={sample} checked={currentPreset === preset}
            onSelect={() => { actions.apply((m, r) => setCellFormat(m, r, presetFormat(preset))); close(); }} />
        ))}
      </ToolbarMenu>
      <Separator />
      {styleButton('bold', t('spreadsheet_ui.toolbar.bold'), <span className="sheet-toolbar-text font-extrabold">B</span>)}
      {styleButton('italic', t('spreadsheet_ui.toolbar.italic'), <span className="sheet-toolbar-text italic font-serif">I</span>)}
      {styleButton('underline', t('spreadsheet_ui.toolbar.underline'), <span className="sheet-toolbar-text underline">U</span>)}
      {styleButton('strikethrough', t('spreadsheet_ui.toolbar.strikethrough'), <span className="sheet-toolbar-text line-through">S</span>)}
      <ToolbarMenu name="text-color" title={t('spreadsheet_ui.toolbar.text_color')} disabled={off}
        label={<span className="sheet-toolbar-stack"><span className="sheet-toolbar-text">A</span><ColorBar color={style.textColor} /></span>}>
        {(close) => <ColorPalette kind="text" value={style.textColor}
          onPick={(color) => { actions.apply((m, r) => setStyle(m, r, { textColor: color })); close(); }} />}
      </ToolbarMenu>
      <ToolbarMenu name="fill-color" title={t('spreadsheet_ui.toolbar.fill_color')} disabled={off}
        label={<span className="sheet-toolbar-stack"><Icons.FillIcon /><ColorBar color={style.fillColor} /></span>}>
        {(close) => <ColorPalette kind="fill" value={style.fillColor}
          onPick={(color) => { actions.apply((m, r) => setStyle(m, r, { fillColor: color })); close(); }} />}
      </ToolbarMenu>
      <Separator />
      <ToolbarMenu name="borders" title={t('spreadsheet_ui.toolbar.borders')} disabled={off} label={<Icons.BordersIcon />}>
        {(close) => (
          <>
            {BORDER_PRESETS.map(({ preset }) => (
              <MenuItem key={preset} label={t(`spreadsheet_ui.border_preset.${preset}`)} onSelect={() => {
                actions.apply((m, r) => applyBorders(m, r, preset, { style: borderStyleRef.current }));
                close();
              }} />
            ))}
            <MenuSeparator />
            <div className="sheet-toolbar-menu-row">
              <span className="sheet-toolbar-menu-hint">{t('spreadsheet_ui.toolbar.line')}</span>
              <select className="sheet-toolbar-select" defaultValue={borderStyleRef.current} aria-label={t('spreadsheet_ui.toolbar.border_line_style')}
                onChange={(event) => { borderStyleRef.current = event.target.value as BorderLineStyle; }}>
                {BORDER_STYLES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
          </>
        )}
      </ToolbarMenu>
      <Separator />
      <ToolbarMenu name="align" title={t('spreadsheet_ui.toolbar.align_horizontal')} disabled={off}
        label={style.align === 'center' ? <Icons.AlignCenterIcon /> : style.align === 'right' ? <Icons.AlignRightIcon /> : <Icons.AlignLeftIcon />}>
        {(close) => (['left', 'center', 'right'] as const).map((value) => (
          <MenuItem key={value} label={t(`spreadsheet_ui.toolbar.align_${value}`)} checked={style.align === value}
            onSelect={() => { align(value); close(); }} />
        ))}
      </ToolbarMenu>
      <ToolbarMenu name="valign" title={t('spreadsheet_ui.toolbar.align_vertical')} disabled={off}
        label={style.verticalAlign === 'middle' ? <Icons.VAlignMiddleIcon /> : style.verticalAlign === 'bottom' ? <Icons.VAlignBottomIcon /> : <Icons.VAlignTopIcon />}>
        {(close) => (['top', 'middle', 'bottom'] as const).map((value) => (
          <MenuItem key={value} label={t(`spreadsheet_ui.toolbar.valign_${value}`)} checked={style.verticalAlign === value}
            onSelect={() => { valign(value); close(); }} />
        ))}
      </ToolbarMenu>
      <Button title={wrapped ? t('spreadsheet_ui.toolbar.wrap_on') : t('spreadsheet_ui.toolbar.wrap_off')} name="wrap" on={wrapped} disabled={off}
        onClick={() => actions.apply((m, r) => setWrap(m, r, !wrapped))}><Icons.WrapIcon /></Button>
      <Separator />
      <ToolbarMenu name="freeze" title={t('spreadsheet_ui.toolbar.freeze')} disabled={disabled} label={<Icons.FreezeIcon />}>
        {(close) => {
          const rows = metadata.headerRowCount + metadata.frozenRowCount;
          const run = (patch: Parameters<FormatActions['applyMeta']>[0]) => { actions.applyMeta(patch); close(); };
          return (
            <>
              <MenuItem label={t('spreadsheet_ui.toolbar.freeze_no_rows')} checked={rows === 0} disabled={metadata.headerRowCount > 0}
                onSelect={() => run((m) => freezeRows(m, 0))} />
              <MenuItem label={t('spreadsheet_ui.toolbar.freeze_one_row')} checked={rows === 1} disabled={metadata.headerRowCount > 1} onSelect={() => run((m) => freezeRows(m, 1))} />
              <MenuItem label={t('spreadsheet_ui.toolbar.freeze_two_rows')} checked={rows === 2} disabled={metadata.headerRowCount > 2} onSelect={() => run((m) => freezeRows(m, 2))} />
              <MenuItem label={t('spreadsheet_ui.toolbar.freeze_up_to_row', { row: activeRow })} checked={rows === activeRow} disabled={!active || metadata.headerRowCount > activeRow}
                onSelect={() => run((m) => freezeRows(m, activeRow))} />
              <MenuSeparator />
              <MenuItem label={t('spreadsheet_ui.toolbar.freeze_no_columns')} checked={metadata.frozenColumnCount === 0} onSelect={() => run((m) => freezeCols(m, 0))} />
              <MenuItem label={t('spreadsheet_ui.toolbar.freeze_one_column')} checked={metadata.frozenColumnCount === 1} onSelect={() => run((m) => freezeCols(m, 1))} />
              <MenuItem label={t('spreadsheet_ui.toolbar.freeze_two_columns')} checked={metadata.frozenColumnCount === 2} onSelect={() => run((m) => freezeCols(m, 2))} />
              <MenuItem label={t('spreadsheet_ui.toolbar.freeze_up_to_column', { column: activeCol })} checked={!!active && metadata.frozenColumnCount === active.col + 1} disabled={!active}
                onSelect={() => run((m) => freezeCols(m, (active?.col ?? 0) + 1))} />
            </>
          );
        }}
      </ToolbarMenu>
      <ToolbarMenu name="hide" title={t('spreadsheet_ui.toolbar.hide')} disabled={off} label={<Icons.HideIcon />}>
        {(close) => range && (
          <>
            <MenuItem label={range.startRow === range.endRow
              ? t('spreadsheet_ui.toolbar.hide_row', { row: range.startRow + 1 })
              : t('spreadsheet_ui.toolbar.hide_rows', { start: range.startRow + 1, end: range.endRow + 1 })}
              onSelect={() => { actions.apply((m, r) => hideRows(m, r.startRow, r.endRow)); close(); }} />
            <MenuItem label={range.startCol === range.endCol
              ? t('spreadsheet_ui.toolbar.hide_column', { column: columnIndexToLetter(range.startCol) })
              : t('spreadsheet_ui.toolbar.hide_columns', { start: columnIndexToLetter(range.startCol), end: columnIndexToLetter(range.endCol) })}
              onSelect={() => { actions.apply((m, r) => hideCols(m, r.startCol, r.endCol)); close(); }} />
            <MenuSeparator />
            <MenuItem label={t('spreadsheet_ui.toolbar.unhide_rows')} disabled={metadata.hiddenRows.length === 0}
              onSelect={() => { actions.apply((m, r) => unhideRows(m, r.startRow, r.endRow)); close(); }} />
            <MenuItem label={t('spreadsheet_ui.toolbar.unhide_columns')} disabled={metadata.hiddenCols.length === 0}
              onSelect={() => { actions.apply((m, r) => unhideCols(m, r.startCol, r.endCol)); close(); }} />
          </>
        )}
      </ToolbarMenu>
      <Button title={t('spreadsheet_ui.toolbar.filter_column')} name="filter" disabled={!active} onClick={(event) => {
        if (active) props.onFilter(active.col, event.currentTarget);
      }}><Icons.FilterIcon /></Button>
      <Button title={t('spreadsheet_ui.toolbar.conditional')} name="conditional" disabled={disabled} onClick={props.onOpenConditional}><Icons.ConditionalIcon /></Button>
      <Button title={t('spreadsheet_ui.toolbar.validation')} name="validation" disabled={off} onClick={props.onOpenValidation}><Icons.ValidationIcon /></Button>
      <Button title={t('spreadsheet_ui.toolbar.named_ranges')} name="named-ranges" disabled={disabled} onClick={props.onOpenNamedRanges}><Icons.NamedRangesIcon /></Button>
      <Separator />
      <ToolbarMenu name="function" title={t('spreadsheet_ui.toolbar.insert_function')} disabled={off} label={<span className="sheet-toolbar-sigma">&Sigma;</span>}>
        {(close) => FUNCTIONS.map((name) => (
          <MenuItem key={name} label={name} onSelect={() => { props.onInsertFunction(name); close(); }} />
        ))}
      </ToolbarMenu>
      <span className="sheet-toolbar-spacer" />
      {props.trailing}
    </div>
  );
}

function ColorBar({ color }: { color: CellStyle['textColor'] }) {
  if (!color || color === 'default') return <span className="sheet-toolbar-color-bar sheet-toolbar-color-bar-empty" />;
  if (color.startsWith('#')) return <span className="sheet-toolbar-color-bar" style={{ backgroundColor: color }} />;
  return <span className={`sheet-toolbar-color-bar csv-swatch csv-fill-${color}`} />;
}
