/**
 * A view placed in a page (a placed-view link of a type, see `placedViewUrl.ts`),
 * drawn live from the items. The definition comes from the link title
 * (`placedViewDefinition`): a table whose cells edit the items, a 2x2 of
 * two number fields with pinned extra points, or a chart of the items
 * grouped by one field.
 *
 * The host mounts it inside a `TrackersUIProvider`. Loaded lazily
 * (`LazyPlacedViewEmbed`) so a page with no view does not pay for the grid.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type JSX, type ReactNode } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { CollabOpenOptions } from '@nimbalyst/collab-client/core';
import { createPlacedViewUrl, type PlacedViewTarget } from '@nimbalyst/runtime/core/placedViewUrl';
import { QuadrantChart } from '@nimbalyst/runtime/ui/quadrant/QuadrantChart';
import { globalRegistry } from '@nimbalyst/runtime/plugins/TrackerPlugin/models';
import type { SavedView } from '@nimbalyst/collab-client/trackers';
import { useTrackersUI } from '../TrackersUIProvider';
import { useTrackerDataSelector } from '../useTrackerData';
import { useTrackerViewRows } from '../useTrackerViewRows';
import { TrackerViewEmbed } from './TrackerViewEmbed';
import { placedViewDefinition, placedViewInReach, type PlacedQuadrant, type PlacedViewReach } from './placedViewDefinition';
import { quadrantData } from './quadrantData';
import { ChartViewEmbed } from './ChartViewEmbed';
import { PlacedViewNote } from './PlacedViewNote';
import { MarksListEmbed } from './MarksListEmbed';
import { getDefaultColumnConfig, resolveColumnsForType } from '@nimbalyst/runtime/plugins/TrackerPlugin/components/trackerColumns';
import { PlacedViewSettings } from './PlacedViewSettings';
import type { PlacedViewHandoff } from '../page/placedViewHandoff';
import { createTrackerFilterFields } from '../createTrackerFilterFields';

import './ViewEmbedHeader.css';

const subscribeSchema = (listener: () => void) => globalRegistry.onChange(listener);

export interface PlacedViewEmbedProps {
  target: PlacedViewTarget;
  label: string;
  attrs: Readonly<Record<string, string>>;
  onAttrsChange?: (patch: Readonly<Record<string, string | null>>) => void;
  /**
   * The scopes the mounted data source serves. A link naming any other scope
   * is never drawn from (or edited through) this host's items.
   */
  reach?: PlacedViewReach;
  onOpenItem?: (itemId: string, options?: CollabOpenOptions) => void;
  onOpenAsTable?: (view: SavedView) => void;
  onOpenFullView?: (typeId: string, view: PlacedViewHandoff) => void;
  variant?: 'card' | 'page';
  settingsTemporary?: boolean;
  /** Opens the page a listed mark is on, by its tab uri. */
  onOpenPage?: (uri: string, options?: CollabOpenOptions) => void;
  /** Opens the view's own console link, for a view this host cannot draw. */
  onOpenLink?: (href: string) => void;
}

function parseHeight(value: string | undefined): number | undefined {
  const parsed = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) ? Math.max(parsed, 120) : undefined;
}

export function PlacedViewEmbed({ target, label, attrs, onAttrsChange, reach, onOpenItem, onOpenAsTable, onOpenFullView, variant, settingsTemporary, onOpenPage, onOpenLink }: PlacedViewEmbedProps): JSX.Element {
  if (!placedViewInReach(target.scope, reach)) {
    return <OutOfScopeViewNote target={target} label={label} onOpenLink={onOpenLink} />;
  }
  if (target.kind === 'marks') {
    return <MarksListEmbed kind={target.marks} label={label} attrs={attrs} onOpenPage={onOpenPage} />;
  }
  return <TypeViewEmbed typeId={target.typeId} label={label} attrs={attrs} onAttrsChange={onAttrsChange} onOpenItem={onOpenItem} onOpenAsTable={onOpenAsTable} onOpenFullView={onOpenFullView} variant={variant} settingsTemporary={settingsTemporary} />;
}

/** A view of another project (or of someone's own items, on a shared page): its link, never these items. */
function OutOfScopeViewNote({ target, label, onOpenLink }: {
  target: PlacedViewTarget;
  label: string;
  onOpenLink?: (href: string) => void;
}): JSX.Element {
  const { t } = useTranslation('tracker');
  const href = createPlacedViewUrl(target);
  const name = label || (target.kind === 'type' ? target.typeId : 'View');
  const open = onOpenLink
    ? <button type="button" className="ml-1 text-nim-link hover:underline" data-testid="placed-view-open-link" onClick={() => onOpenLink(href)}>{t('placed_view_embed.open')}</button>
    : <a className="ml-1 text-nim-link hover:underline" data-testid="placed-view-open-link" href={href} target="_blank" rel="noreferrer">{t('placed_view_embed.open')}</a>;
  return (
    <div
      className="placed-view-out-of-scope my-3 rounded-lg border border-nim bg-nim-secondary px-3 py-2 text-xs text-nim-muted"
      contentEditable={false}
      data-testid="placed-view-out-of-scope"
    >
      {t('placed_view_embed.out_of_scope', { name })}{open}
    </div>
  );
}

function TypeViewEmbed({ typeId, label, attrs: savedAttrs, onAttrsChange, onOpenItem, onOpenAsTable, onOpenFullView, variant, settingsTemporary }: {
  typeId: string;
  label: string;
  attrs: Readonly<Record<string, string>>;
  onAttrsChange?: (patch: Readonly<Record<string, string | null>>) => void;
  onOpenItem?: (itemId: string, options?: CollabOpenOptions) => void;
  onOpenAsTable?: (view: SavedView) => void;
  onOpenFullView?: (typeId: string, view: PlacedViewHandoff) => void;
  variant?: 'card' | 'page';
  settingsTemporary?: boolean;
}): JSX.Element {
  const { t } = useTranslation('tracker');
  const [day, setDay] = useState(() => new Date().toDateString());
  useEffect(() => {
    const timer = setInterval(() => setDay(new Date().toDateString()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const [temporary, setTemporary] = useState<Record<string, string | null>>({});
  const [writeError, setWriteError] = useState<string | null>(null);
  const attrs = Object.fromEntries(Object.entries({ ...savedAttrs, ...(!onAttrsChange ? temporary : {}) }).filter((entry): entry is [string, string] => entry[1] !== null));
  const change = (patch: Readonly<Record<string, string | null>>) => {
    setWriteError(null);
    try {
      const next = Object.fromEntries(Object.entries({ ...attrs, ...patch }).filter((entry): entry is [string, string] => entry[1] !== null));
      placedViewDefinition(typeId, label, next, model ? createTrackerFilterFields(resolveColumnsForType(typeId), typeId, [model]) : undefined);
      if (onAttrsChange) onAttrsChange(patch);
      else setTemporary(current => ({ ...current, ...patch }));
    } catch (error) { setWriteError(error instanceof Error ? error.message : t('placed_view_embed.save_failed')); }
  };
  const loaded = useTrackerDataSelector((state) => state.loaded);
  const model = useSyncExternalStore(subscribeSchema, () => globalRegistry.get(typeId), () => globalRegistry.get(typeId));
  // Re-read when the attrs change; the object identity changes on every node update.
  const attrsKey = JSON.stringify(attrs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const parsed = useMemo(() => {
    try {
      const fields = model ? createTrackerFilterFields(resolveColumnsForType(typeId), typeId, [model]) : undefined;
      return { placed: placedViewDefinition(typeId, label, attrs, fields) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : t('placed_view_embed.invalid_definition') };
    }
  }, [typeId, label, attrsKey, model, day]);

  if (loaded && !model) {
    return <PlacedViewNote>{t('placed_view_embed.no_type', { name: label || typeId, type: typeId })}</PlacedViewNote>;
  }
  if (!model) return <PlacedViewNote>{t('placed_view_embed.loading_type', { name: label || typeId })}</PlacedViewNote>;
  const fields = createTrackerFilterFields(resolveColumnsForType(typeId), typeId, [model]);
  const actions = <div className="placed-view-actions flex shrink-0 items-center gap-1">
    <PlacedViewSettings availableColumns={resolveColumnsForType(typeId)} defaultColumns={getDefaultColumnConfig(typeId).visibleColumns} attrs={attrs} fields={fields} temporary={settingsTemporary || !onAttrsChange} onChange={change} />
    {onOpenFullView && parsed.placed ? <button type="button" className="whitespace-nowrap rounded border-none bg-transparent px-2 py-1 text-xs text-nim-muted hover:bg-nim-hover hover:text-nim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => onOpenFullView(typeId, { label, attrs: { ...attrs } })}>{t('placed_view_embed.open_full_view')}</button> : null}
  </div>;
  const notice = writeError ? <div role="alert" className="px-3 py-2 text-xs text-nim-error">{writeError}</div> : null;
  const wrap = (view: JSX.Element) => <div className={variant === 'page' ? "placed-view-configurable flex min-h-0 flex-1 flex-col" : "placed-view-configurable"}>{view}</div>;
  if (parsed.error || !parsed.placed) return wrap(<PlacedViewNote><div className="placed-view-invalid-head flex items-center justify-between gap-2"><span role="alert">{label || typeId}: {parsed.error}</span>{actions}</div>{notice}</PlacedViewNote>);
  const placed = parsed.placed;
  if (placed.mode === 'chart' && placed.chart) {
    return wrap(<ChartViewEmbed view={placed.view} chart={placed.chart} fields={fields} height={parseHeight(attrs.height)} headerActions={actions} headerNotice={notice} />);
  }
  if (placed.mode === '2x2' && placed.quadrant) {
    return wrap(<QuadrantViewEmbed view={placed.view} quadrant={placed.quadrant} height={parseHeight(attrs.height)} onOpenItem={onOpenItem} headerActions={actions} headerNotice={notice} />);
  }
  return wrap(
    <TrackerViewEmbed
      view={placed.view}
      variant={variant}
      headerActions={actions}
      headerNotice={notice}
      height={parseHeight(attrs.height)}
      hiddenColumns={attrs.hide?.split(',')}
      onSortChange={(field, direction) => change({ sort: `${field}:${direction}` })}
      onWidthsChange={widths => change({ w: Object.entries({ ...placed.view.definition.columnConfig?.columnWidths, ...widths }).map(([field, width]) => `${field}:${Math.round(width)}`).join(',') })}
      onOpenItem={onOpenItem}
      onOpenAsTable={onOpenAsTable}
    />
  );
}

function QuadrantViewEmbed({ view, quadrant, height, onOpenItem, headerActions, headerNotice }: {
  headerActions?: ReactNode;
  headerNotice?: ReactNode;
  view: SavedView;
  quadrant: PlacedQuadrant;
  /** The chart's height; unset uses the chart's default. */
  height?: number;
  onOpenItem?: (itemId: string, options?: CollabOpenOptions) => void;
}): JSX.Element {
  const { t } = useTranslation('tracker');
  const { identity } = useTrackersUI();
  // The chart frame is the sized body a page's resize grip drags; the chart
  // re-lays itself out as the frame changes.
  const frameRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => { frameRef.current?.setAttribute('data-placed-view-body', ''); }, []);
  const records = useTrackerDataSelector((state) => state.records);
  const { rows } = useTrackerViewRows(records, view.definition, { identity });
  const data = useMemo(() => quadrantData(rows, quadrant), [rows, quadrant]);
  const placedCount = data.points.filter((point) => !point.pinned).length;
  return (
    <div
      className="placed-view-quadrant my-3 flex flex-col overflow-hidden rounded-lg border border-nim bg-nim-secondary"
      contentEditable={false}
      data-testid="placed-view-quadrant"
    >
      <div className="placed-view-quadrant-head flex shrink-0 items-center gap-2.5 border-b border-nim px-3 py-1.5 text-xs">
        <span className="min-w-0 truncate font-medium text-nim" title={view.name}>{view.name}</span>
        <span className="placed-view-query min-w-0 truncate rounded bg-nim-tertiary px-2 py-0.5 font-mono text-[11px] text-nim-muted">
          {t('placed_view_embed.quadrant_fields', { x: quadrant.xField, y: quadrant.yField })}
        </span>
        <div className="ml-auto shrink-0">{headerActions}</div>
      </div>
      {headerNotice}
      <div className="placed-view-quadrant-body bg-nim p-2">
        <QuadrantChart
          points={data.points}
          xLabel={quadrant.xLabel ?? quadrant.xField}
          yLabel={quadrant.yLabel ?? quadrant.yField}
          quadrants={quadrant.quadrants}
          height={height}
          frameRef={frameRef}
          onOpenPoint={onOpenItem}
        />
      </div>
      <div className="placed-view-quadrant-foot flex items-center gap-3.5 px-3 py-1.5 text-[11px] text-nim-faint">
        <span>{t('placed_view_embed.placed_count', { count: placedCount })}</span>
        {data.skipped > 0 ? <span>{t('placed_view_embed.missing_axis_values', { count: data.skipped })}</span> : null}
      </div>
    </div>
  );
}
