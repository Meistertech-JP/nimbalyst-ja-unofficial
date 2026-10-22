/**
 * Pulse -- "what changed recently, and where did attention move?"
 *
 * Rows are areas (or the artifacts inside one selected area), columns are
 * local-calendar buckets, and a cell counts distinct artifacts with a recorded
 * event loaded for that bucket. An empty cell means no loaded events, which is
 * not evidence that nothing happened. Nothing here draws a status lifetime as
 * if it were activity, and current state is reported separately from it.
 */
import React from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { PrototypeRange, PrototypeViewProps } from '../contracts';
import { bucketRangeLabel, type PulseBucketUnit } from './pulseBuckets';
import { formatInterval, type PulseTranslate } from './pulseFormat';
import {
  bucketSignature,
  buildPulseMatrix,
  comparePeriods,
  heatLegend,
  heatStep,
  moveGridFocusById,
  pruneSelection,
  rowIdsBetween,
  selectionColumns,
  summarizeSelection,
  validRowIds,
  type GridFocus,
  type PulseRow,
  type PulseSelection,
  type PulseSortMode,
} from './pulseModel';
import { PulseInspector, formatRelative } from './PulseInspector';
import './pulse.css';

const UNIT_OPTIONS: Array<{ value: PulseBucketUnit | 'auto' }> = [
  { value: 'auto' },
  { value: 'day' },
  { value: 'week' },
  { value: 'month' },
];

const SORT_OPTIONS: Array<{ value: PulseSortMode }> = [
  { value: 'recent' },
  { value: 'volume' },
  { value: 'name' },
];

/**
 * Cells stretch to fill the pane, so a seven-day view should read as a wide
 * weekly strip while a ninety-day view stays dense and scrollable. Only the
 * minimum and the height vary; the stretching itself is grid `1fr`.
 *
 * These land on `--pgp-*-fit` custom properties, never on the properties the
 * stylesheet's container queries own. An inline custom property beats every
 * rule in the sheet, so writing `--pgp-cell-min` here would make the narrow
 * container's smaller floor unreachable; `pulse.css` takes the min of the two.
 */
function gridMetrics(colCount: number): { cellMin: string; cellHeight: string; cellFont: string } {
  if (colCount <= 8) return { cellMin: '56px', cellHeight: '52px', cellFont: '14px' };
  if (colCount <= 16) return { cellMin: '44px', cellHeight: '40px', cellFont: '12px' };
  if (colCount <= 40) return { cellMin: '34px', cellHeight: '32px', cellFont: '11px' };
  return { cellMin: '26px', cellHeight: '28px', cellFont: '11px' };
}

export function PulsePrototype({
  model,
  range,
  comparisonRange,
  selectedAreaId,
  selectedNodeId,
  onSelectArea,
  onSelectNode,
  onOpenNode,
  onNavigate,
  onRenameArea,
}: PrototypeViewProps) {
  const { t, i18n } = useTranslation('extensions');
  const translatePulse = React.useCallback<PulseTranslate>(
    (key, options) => String(t(`project_graph.pulse.${key}`, options)),
    [t],
  );
  const [unitChoice, setUnitChoice] = React.useState<PulseBucketUnit | 'auto'>('auto');
  const [sort, setSort] = React.useState<PulseSortMode>('recent');
  const [selection, setSelection] = React.useState<PulseSelection | null>(null);
  // Held by row id for the same reason the selection is: re-sorting the grid
  // moves every index, and an index-anchored focus would quietly come to mean
  // a different artifact than the one the reader put it on.
  const [focus, setFocus] = React.useState<GridFocus>({ rowId: '', col: 0 });
  const [renaming, setRenaming] = React.useState(false);
  const [renameDraft, setRenameDraft] = React.useState('');
  const [dragging, setDragging] = React.useState(false);
  const cellRefs = React.useRef(new Map<string, HTMLDivElement>());
  const pendingFocusRef = React.useRef(false);

  const nowMs = model.snapshot.generatedAt || Date.now();

  const matrix = React.useMemo(
    () =>
      buildPulseMatrix(model, range, {
        selectedAreaId,
        unit: unitChoice === 'auto' ? null : unitChoice,
        sort,
        translate: translatePulse,
      }),
    [model, range, selectedAreaId, unitChoice, sort, translatePulse],
  );

  const rowCount = matrix.rows.length;
  const colCount = matrix.buckets.length;

  // Only a genuinely incompatible axis invalidates the reader's work: a
  // different scope, or a column axis whose indices no longer name the same
  // buckets. Model identity does NOT — a progressive index republishes the
  // model on every tick, and resetting on that threw the selection and the
  // focus away several times a second while the first index ran. Re-sorting
  // does not either: both are held by row id.
  const columnAxis = React.useMemo(() => bucketSignature(matrix), [matrix]);
  React.useEffect(() => {
    setSelection(null);
    setFocus({ rowId: '', col: Math.max(0, colCount - 1) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- colCount is a
    // function of the column axis; listing it would not add an invalidation.
  }, [selectedAreaId, columnAxis]);

  // A surviving selection still has to shed ids the refreshed model dropped.
  // Rows merely below the display cap are kept: they are still real rows, and
  // the inspector reports them as out of view rather than silently omitted.
  const rowUniverse = React.useMemo(
    () => [...validRowIds(model, matrix)].sort().join('\u0000'),
    [model, matrix],
  );
  React.useEffect(() => {
    setSelection((current) => (current ? pruneSelection(model, matrix, current) : current));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the id
    // set, not on the model object, so a progress tick that changes nothing
    // relevant does not re-run this.
  }, [rowUniverse]);

  React.useEffect(() => {
    if (!pendingFocusRef.current) return;
    pendingFocusRef.current = false;
    cellRefs.current.get(`${focus.rowId}:${focus.col}`)?.focus();
  }, [focus]);

  // Only while a brush is in progress; no listener exists at rest.
  React.useEffect(() => {
    if (!dragging) return undefined;
    const stop = () => setDragging(false);
    window.addEventListener('pointerup', stop);
    return () => window.removeEventListener('pointerup', stop);
  }, [dragging]);

  const summary = React.useMemo(
    () => (selection ? summarizeSelection(matrix, selection, model.nodeById, translatePulse) : null),
    [matrix, selection, model.nodeById, translatePulse],
  );

  const columns = selection ? selectionColumns(selection) : null;
  const selectedRowIds = React.useMemo(
    () => new Set(selection ? selection.rowIds : []),
    [selection],
  );
  const legend = React.useMemo(() => heatLegend(matrix.maxCellValue), [matrix.maxCellValue]);
  const metrics = gridMetrics(colCount);
  const comparison = React.useMemo(
    () =>
      comparisonRange ? comparePeriods(model, range, comparisonRange, { selectedAreaId, translate: translatePulse }) : null,
    [model, range, comparisonRange, selectedAreaId, translatePulse],
  );

  // A focus whose row has left the display (a scope change, or the row cap)
  // re-anchors on the first row, so the grid always has exactly one tab stop.
  const focusedRowId = matrix.rows.some((row) => row.id === focus.rowId)
    ? focus.rowId
    : matrix.rows[0]?.id ?? '';

  const beginSelection = (rowIndex: number, col: number) => {
    const row = matrix.rows[rowIndex];
    if (!row) return;
    setSelection({
      rowIds: [row.id],
      anchorRowId: row.id,
      headRowId: row.id,
      anchorCol: col,
      headCol: col,
    });
    setFocus({ rowId: row.id, col });
  };

  const extendSelection = (rowIndex: number, col: number) => {
    const row = matrix.rows[rowIndex];
    if (!row) return;
    setSelection((current) => {
      if (!current) {
        return {
          rowIds: [row.id],
          anchorRowId: row.id,
          headRowId: row.id,
          anchorCol: col,
          headCol: col,
        };
      }
      const anchorIndex = matrix.rows.findIndex((entry) => entry.id === current.anchorRowId);
      const from = anchorIndex >= 0 ? anchorIndex : rowIndex;
      return {
        ...current,
        rowIds: rowIdsBetween(matrix.rows, from, rowIndex),
        headRowId: row.id,
        headCol: col,
      };
    });
    setFocus({ rowId: row.id, col });
  };

  const selectColumn = (col: number) => {
    if (rowCount === 0) return;
    setSelection({
      rowIds: matrix.rows.map((row) => row.id),
      anchorRowId: matrix.rows[0].id,
      headRowId: matrix.rows[rowCount - 1].id,
      anchorCol: col,
      headCol: col,
    });
    setFocus({ rowId: matrix.rows[0].id, col });
  };

  const selectRow = (rowIndex: number) => {
    const row = matrix.rows[rowIndex];
    if (!row || colCount === 0) return;
    setSelection({
      rowIds: [row.id],
      anchorRowId: row.id,
      headRowId: row.id,
      anchorCol: 0,
      headCol: colCount - 1,
    });
    setFocus({ rowId: row.id, col: colCount - 1 });
    if (row.nodeId) onSelectNode(row.nodeId);
  };

  const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Leave every modifier chord to the application; only plain (or shifted)
    // navigation keys belong to this grid.
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Escape') {
      if (!selection) return;
      event.preventDefault();
      setSelection(null);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      beginSelection(
        matrix.rows.findIndex((row) => row.id === focusedRowId),
        focus.col,
      );
      return;
    }
    const next = moveGridFocusById(matrix.rows, { rowId: focusedRowId, col: focus.col }, event.key, colCount, {
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
    });
    if (!next) return;
    event.preventDefault();
    pendingFocusRef.current = true;
    if (event.shiftKey && selection) {
      extendSelection(
        matrix.rows.findIndex((row) => row.id === next.rowId),
        next.col,
      );
    } else setFocus(next);
  };

  const onRenameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Same rule as the grid: a modifier chord belongs to the application.
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      commitRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setRenaming(false);
    }
  };

  const commitRename = () => {
    const trimmed = renameDraft.trim();
    if (selectedAreaId && trimmed.length > 0) onRenameArea(selectedAreaId, trimmed);
    setRenaming(false);
  };

  return (
    // `.pgp-pulse` is the query container and `.pgp-shell` is everything the
    // container queries style: `@container` never matches the element that
    // declares the container itself.
    <div className="pgp-pulse project-pulse-prototype">
     <div className="pgp-shell">
      <header className="pgp-header">
        <div className="pgp-header-titles">
          <h2 className="pgp-title">
            {matrix.scopeAreaLabel ? `${t('project_graph.pulse.title')} · ${matrix.scopeAreaLabel}` : t('project_graph.pulse.title')}
          </h2>
          <p className="pgp-subtitle">
            {t('project_graph.pulse.subtitle', { unit: t(`project_graph.pulse.unit.${matrix.unit}`) })}
            {matrix.scopeAreaBasis ? ` ${t('project_graph.pulse.area_membership', { basis: matrix.scopeAreaBasis })}` : ''}
          </p>
        </div>
        <div className="pgp-header-controls">
          {selectedAreaId && (
            <>
              <button type="button" className="pgp-btn" onClick={() => onSelectArea(null)}>
                {t('project_graph.pulse.all_areas')}
              </button>
              <button
                type="button"
                className="pgp-btn"
                onClick={() => onNavigate('atlas', undefined, selectedAreaId)}
              >
                {t('project_graph.pulse.show_in_atlas')}
              </button>
              {renaming ? (
                <span className="pgp-rename">
                  <input
                    className="pgp-input"
                    aria-label={t('project_graph.pulse.area_display_name')}
                    value={renameDraft}
                    autoFocus
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onKeyDown={onRenameKeyDown}
                  />
                  <button type="button" className="pgp-btn" onClick={commitRename}>
                    {t('project_graph.pulse.save')}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="pgp-btn"
                  onClick={() => {
                    setRenameDraft(matrix.scopeAreaLabel ?? '');
                    setRenaming(true);
                  }}
                >
                  {t('project_graph.pulse.rename')}
                </button>
              )}
            </>
          )}
          <label className="pgp-field">
            <span>{t('project_graph.pulse.buckets')}</span>
            <select
              className="pgp-select"
              value={unitChoice}
              onChange={(event) => setUnitChoice(event.target.value as PulseBucketUnit | 'auto')}
            >
              {UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(`project_graph.pulse.unit.${option.value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="pgp-field">
            <span>{t('project_graph.pulse.rows_by')}</span>
            <select
              className="pgp-select"
              value={sort}
              onChange={(event) => setSort(event.target.value as PulseSortMode)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(`project_graph.pulse.sort.${option.value}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="pgp-facts">
        <span className="pgp-fact">
          <strong>{matrix.eventsInRange.toLocaleString()}</strong> {t('project_graph.pulse.loaded_events')}
        </span>
        <span className="pgp-fact">
          <strong>{matrix.distinctArtifactsInRange.toLocaleString()}</strong> {t('project_graph.pulse.distinct_artifacts')}
        </span>
        <span className="pgp-fact">
          {t('project_graph.pulse.bucket_count', { count: matrix.buckets.length, unit: t(`project_graph.pulse.unit.${matrix.unit}`) })}
        </span>
        {matrix.lastObservedOnlyArtifacts > 0 && (
          <span className="pgp-fact pgp-fact-observed">
            {t('project_graph.pulse.last_observed_only_count', { count: matrix.lastObservedOnlyArtifacts })}
          </span>
        )}
        <span className="pgp-fact pgp-fact-quiet">
          {t('project_graph.pulse.non_additive_counts')}
        </span>
      </div>

      {comparison && (
        <ComparisonStrip
          comparison={comparison}
          comparisonRange={comparisonRange!}
          scopeLabel={matrix.scopeAreaLabel}
          locale={i18n.language}
        />
      )}

      {(matrix.escalatedFrom || matrix.hasPartialEdgeBucket || matrix.rowsTotal > rowCount) && (
        <div className="pgp-coverage">
          {matrix.escalatedFrom && (
            <span>
              {t('project_graph.pulse.range_widened', { from: t(`project_graph.pulse.unit.${matrix.escalatedFrom}`), to: t(`project_graph.pulse.unit.${matrix.unit}`) })}
            </span>
          )}
          {matrix.hasPartialEdgeBucket && (
            <span>
              {t('project_graph.pulse.partial_edge_bucket')}
            </span>
          )}
          {matrix.rowsTotal > rowCount && (
            <span>
              {t('project_graph.pulse.showing_rows', { shown: rowCount, total: matrix.rowsTotal })}
            </span>
          )}
        </div>
      )}

      <div className="pgp-body">
        <div className="pgp-grid-scroll">
          {colCount === 0 || rowCount === 0 ? (
            <div className="pgp-grid-empty">
              {colCount === 0
                ? t('project_graph.pulse.no_buckets')
                : t('project_graph.pulse.no_areas')}
            </div>
          ) : (
            <div
              className="pgp-grid"
              role="grid"
              aria-label={t('project_graph.pulse.loaded_events_grid')}
              aria-rowcount={rowCount + 1}
              aria-colcount={colCount + 1}
              style={
                {
                  '--pgp-cols': String(colCount),
                  '--pgp-cell-min-fit': metrics.cellMin,
                  '--pgp-cell-h-fit': metrics.cellHeight,
                  '--pgp-cell-font-fit': metrics.cellFont,
                } as React.CSSProperties
              }
              onKeyDown={onGridKeyDown}
            >
              <div className="pgp-row pgp-row-head" role="row">
                <div className="pgp-rowlabel pgp-corner" role="columnheader">
                  {selectedAreaId ? t('project_graph.pulse.artifact') : t('project_graph.pulse.area')}
                </div>
                {matrix.buckets.map((bucket) => (
                  <button
                    key={bucket.index}
                    type="button"
                    role="columnheader"
                    className={
                      bucket.partial ? 'pgp-colhead pgp-colhead-partial' : 'pgp-colhead'
                    }
                    title={`${bucket.fullLabel}${bucket.partial ? ` · ${t('project_graph.pulse.clipped_by_range')}` : ''}`}
                    onClick={() => selectColumn(bucket.index)}
                  >
                    <span className="pgp-colhead-sub">{bucket.sublabel}</span>
                    <span className="pgp-colhead-main">{bucket.label}</span>
                  </button>
                ))}
              </div>

              {matrix.rows.map((row, rowIndex) => (
                <MatrixRow
                  key={row.id}
                  row={row}
                  matrixMax={matrix.maxCellValue}
                  nowMs={nowMs}
                  selectedRowIds={selectedRowIds}
                  columns={columns}
                  focusedRowId={focusedRowId}
                  focusCol={focus.col}
                  cellRefs={cellRefs.current}
                  scoped={Boolean(selectedAreaId)}
                  bucketLabels={matrix.buckets}
                  onScopeArea={onSelectArea}
                  onSelectRow={() => selectRow(rowIndex)}
                  onCellDown={(col) => {
                    setDragging(true);
                    beginSelection(rowIndex, col);
                  }}
                  onCellEnter={(col) => {
                    if (dragging) extendSelection(rowIndex, col);
                  }}
                />
              ))}
            </div>
          )}

          <div className="pgp-legend" aria-label={t('project_graph.pulse.legend')}>
            <span className="pgp-legend-title">{t('project_graph.pulse.artifacts_active_per', { unit: t(`project_graph.pulse.unit.${matrix.unit}`) })}</span>
            {legend.map((entry) => (
              <span key={entry.step} className="pgp-legend-item">
                <i className={`pgp-swatch pgp-heat-${entry.step}`} aria-hidden="true" />
                {entry.label}
              </span>
            ))}
            <span className="pgp-legend-item">
              <i className="pgp-swatch pgp-heat-0" aria-hidden="true" />
              {t('project_graph.pulse.no_loaded_events')}
            </span>
            <span className="pgp-legend-item">
              <i className="pgp-swatch pgp-swatch-unknown" aria-hidden="true" />
              {t('project_graph.pulse.before_earliest_loaded_event')}
            </span>
            <span className="pgp-legend-item">
              <i className="pgp-swatch pgp-swatch-observed" aria-hidden="true" />
              {t('project_graph.pulse.last_observed_only')}
            </span>
          </div>
          <p className="pgp-legend-caveat">
            {t('project_graph.pulse.empty_cell_explanation')}
            {matrix.earliestLoadedEventAt !== null
              ? ` ${t('project_graph.pulse.earliest_event_bound', { date: new Date(
                  matrix.earliestLoadedEventAt,
                ).toLocaleDateString(i18n.language) })}`
              : ''}
          </p>
        </div>

        <PulseInspector
          model={model}
          matrix={matrix}
          summary={summary}
          buckets={matrix.buckets}
          nowMs={nowMs}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onOpenNode={onOpenNode}
          onNavigate={onNavigate}
        />
      </div>

      <footer className="pgp-footer">
        <span>
          {selection
            ? bucketRangeLabel(matrix.buckets, columns!.colStart, columns!.colEnd)
            : t('project_graph.pulse.drag_select_help')}
        </span>
        <span className="pgp-footer-right">
          {model.source === 'sample' ? t('project_graph.pulse.sample_records') : t('project_graph.pulse.live_records')} ·{' '}
          {t('project_graph.pulse.source_limitations_count', { count: model.coverage.length })}
        </span>
      </footer>
     </div>
    </div>
  );
}

function countPhrase(t: ReturnType<typeof useTranslation>['t'], totals: { events: number; artifacts: number }): string {
  return t('project_graph.pulse.count_phrase', totals);
}

function signed(t: ReturnType<typeof useTranslation>['t'], value: number, noun: string): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return t('project_graph.pulse.signed_count', { sign, count: Math.abs(value), noun });
}

/**
 * The current period against the one immediately before it. The shell owns the
 * comparison window — including how much of the previous period to take when
 * the current one is still running — so this only reports what it is given, and
 * shows no delta at all when the model says the earlier window is not loaded.
 */
function ComparisonStrip({
  comparison,
  comparisonRange,
  scopeLabel,
  locale,
}: {
  comparison: NonNullable<ReturnType<typeof comparePeriods>>;
  comparisonRange: PrototypeRange;
  scopeLabel: string | null;
  locale: string;
}) {
  const { t } = useTranslation('extensions');
  return (
    <div className="pgp-compare" aria-label={t('project_graph.pulse.comparison_label')}>
      <span className="pgp-compare-cell">
        <strong>{t('project_graph.pulse.this_period')}{scopeLabel ? ` · ${scopeLabel}` : ''}:</strong>{' '}
        {countPhrase(t, comparison.current)}
      </span>
      <span className="pgp-compare-cell">
        <strong>{t('project_graph.pulse.preceding_period')}:</strong> {countPhrase(t, comparison.previous)}
      </span>
      {/* The window is the exact interval before this one, so it is named
          outright: it is not a calendar week and must not read as one. */}
      <span className="pgp-compare-cell" aria-label={t('project_graph.pulse.preceding_interval')}>
        {formatInterval(comparisonRange.startMs, comparisonRange.endMs, locale)}
      </span>
      {/* An observed delta is still shown — the counts are a fact about what
          was loaded. What the label withholds is the comprehensive claim. */}
      {comparison.deltaBasis !== null &&
      comparison.deltaEvents !== null &&
      comparison.deltaArtifacts !== null ? (
        <span
          className={
            comparison.deltaBasis === 'complete'
              ? 'pgp-compare-delta'
              : 'pgp-compare-delta pgp-compare-delta-observed'
          }
        >
          {signed(t, comparison.deltaEvents, t('project_graph.pulse.event_noun'))} · {signed(t, comparison.deltaArtifacts, t('project_graph.pulse.artifact_noun'))}
          {comparison.deltaBasis === 'observed' ? ` ${t('project_graph.pulse.in_loaded_records')}` : ''}
        </span>
      ) : null}
      {/* Never `pgp-fact-quiet`: that class is hidden on a narrow container,
          and the caveat is the part of this strip that must not disappear. */}
      <span className="pgp-compare-note">
        {t('project_graph.pulse.exact_preceding_interval')}{' '}
        {comparison.note}
      </span>
    </div>
  );
}

interface MatrixRowProps {
  row: PulseRow;
  matrixMax: number;
  nowMs: number;
  selectedRowIds: Set<string>;
  columns: { colStart: number; colEnd: number } | null;
  focusedRowId: string;
  focusCol: number;
  cellRefs: Map<string, HTMLDivElement>;
  scoped: boolean;
  bucketLabels: Array<{ fullLabel: string }>;
  onScopeArea: PrototypeViewProps['onSelectArea'];
  onSelectRow: () => void;
  onCellDown: (col: number) => void;
  onCellEnter: (col: number) => void;
}

function MatrixRow({
  row,
  matrixMax,
  nowMs,
  selectedRowIds,
  columns,
  focusedRowId,
  focusCol,
  cellRefs,
  scoped,
  bucketLabels,
  onScopeArea,
  onSelectRow,
  onCellDown,
  onCellEnter,
}: MatrixRowProps) {
  const { t } = useTranslation('extensions');
  return (
    <div className="pgp-row" role="row">
      <div className="pgp-rowlabel">
        <button type="button" className="pgp-rowlabel-btn" onClick={onSelectRow}>
          <span className="pgp-rowlabel-text">{row.label}</span>
          <span className="pgp-rowlabel-meta">
            {row.eventsInRange > 0
              ? t('project_graph.pulse.row_event_summary', { artifacts: row.activeArtifactsInRange, events: row.eventsInRange })
              : t('project_graph.pulse.no_loaded_events_in_range')}
            {row.lastEventAt !== null && !row.lastEventInRange
              ? ` · ${t('project_graph.pulse.last_seen', { time: formatRelative(row.lastEventAt, nowMs, (key, options) => String(t(`project_graph.pulse.${key}`, options))) })}`
              : ''}
            {row.lastEventAt === null ? ` · ${t('project_graph.pulse.no_dated_event')}` : ''}
          </span>
        </button>
        {!scoped && row.areaId && (
          <button
            type="button"
            className="pgp-scope-btn"
            title={t('project_graph.pulse.scope_to_area', { area: row.label })}
            aria-label={t('project_graph.pulse.scope_to_area', { area: row.label })}
            onClick={() => onScopeArea(row.areaId!)}
          >
            ›
          </button>
        )}
      </div>

      {row.cells.map((cell) => {
        const selected =
          columns !== null &&
          selectedRowIds.has(row.id) &&
          cell.bucketIndex >= columns.colStart &&
          cell.bucketIndex <= columns.colEnd;
        const step = heatStep(cell.activeArtifacts, matrixMax);
        const classes = ['pgp-cell', `pgp-heat-${step}`];
        if (cell.coverage === 'outside-loaded' && cell.eventCount === 0) {
          classes.push('pgp-cell-unknown');
        }
        if (cell.lastObservedOnly > 0) classes.push('pgp-cell-observed');
        if (selected) classes.push('pgp-cell-selected');
        const isFocus = focusedRowId === row.id && focusCol === cell.bucketIndex;
        const bucketLabel = bucketLabels[cell.bucketIndex]?.fullLabel ?? '';
        const description =
          cell.eventCount === 0
            ? cell.coverage === 'outside-loaded'
              ? t('project_graph.pulse.cell_outside_loaded')
              : t('project_graph.pulse.no_loaded_events')
            : t('project_graph.pulse.cell_event_summary', { artifacts: cell.activeArtifacts, lastObserved: cell.lastObservedOnly, events: cell.eventCount });

        return (
          <div
            key={cell.bucketIndex}
            role="gridcell"
            className={classes.join(' ')}
            tabIndex={isFocus ? 0 : -1}
            aria-selected={selected}
            aria-label={`${row.label}, ${bucketLabel}: ${description}`}
            title={`${bucketLabel} · ${description}`}
            ref={(element) => {
              const key = `${row.id}:${cell.bucketIndex}`;
              if (element) cellRefs.set(key, element);
              else cellRefs.delete(key);
            }}
            onMouseDown={() => onCellDown(cell.bucketIndex)}
            onMouseEnter={() => onCellEnter(cell.bucketIndex)}
          >
            {cell.activeArtifacts > 0 && (
              <span className="pgp-cell-value">{cell.activeArtifacts}</span>
            )}
            {cell.activeArtifacts === 0 && cell.lastObservedOnly > 0 && (
              <span className="pgp-cell-value pgp-cell-value-observed">
                {cell.lastObservedOnly}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default PulsePrototype;
