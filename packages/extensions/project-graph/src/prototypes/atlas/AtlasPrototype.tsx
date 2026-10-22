/**
 * Project Atlas -- a stable, labeled territory map of the project's areas.
 *
 * Design constraints this file is built around:
 *  - Geography never moves. Territory order comes from `atlasModel` and is keyed
 *    on area identity, so the date range, the selection, a rename, and a
 *    refreshed snapshot all repaint overlays without rearranging the map.
 *  - No hairball. Connectors are drawn for the selected area only, capped, and
 *    each one names the relation family that produced it.
 *  - Bounded detail. Every list states "showing X of Y" and pages.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { PrototypeViewProps } from '../contracts';
import {
  areaActivityInRange,
  areaConnections,
  areaStandings,
  buildAreaIndex,
  connectorPath,
  layoutTerritories,
  moveTerritoryFocus,
  type TerritoryBox,
} from './atlasModel';
import { AreaDetailPanel, type RelationLens } from './AreaDetailPanel';
import './atlas.css';

/** Bridges drawn on the map. The panel still lists every connection. */
const MAX_CONNECTORS = 6;
/** Evidence carried per connection; the true total is reported separately. */
const EVIDENCE_CAP = 200;
/** Used until the ResizeObserver reports (and in environments without one). */
const FALLBACK_MAP_WIDTH = 880;

export function AtlasPrototype(props: PrototypeViewProps) {
  const { t } = useTranslation('extensions');
  const recordCount = (count: number) => t('project_graph.atlas.record_count', { count: count.toLocaleString() });
  const {
    model, range, selectedAreaId, selectedNodeId,
    onSelectArea, onSelectNode, onOpenNode, onNavigate, onRenameArea,
  } = props;

  const mapRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());
  const [mapWidth, setMapWidth] = useState(FALLBACK_MAP_WIDTH);
  // Recorded links, not everything. Connections sort by volume, and on a real
  // index the directory rollups outnumber recorded links by three orders of
  // magnitude — an "all relations" default fills all six drawn routes with
  // path-derived edges and hides every link a record actually asserts. The
  // other families stay one selection away.
  const [lens, setLens] = useState<RelationLens>('recorded-link');
  const [openConnectionId, setOpenConnectionId] = useState<string | null>(null);
  const [tab, setTab] = useState<'connections' | 'activity' | 'records'>('connections');

  const index = useMemo(() => buildAreaIndex(model), [model]);
  const standings = useMemo(() => areaStandings(model, index), [model, index]);
  const activity = useMemo(() => areaActivityInRange(model, index, range), [model, index, range]);
  const layout = useMemo(() => layoutTerritories(index.order, mapWidth), [index.order, mapWidth]);

  const boxById = useMemo(() => {
    const map = new Map<string, TerritoryBox>();
    for (const box of layout.boxes) map.set(box.areaId, box);
    return map;
  }, [layout]);

  const connectionResult = useMemo(
    () =>
      selectedAreaId
        ? areaConnections(model, index, selectedAreaId, {
            evidenceCap: EVIDENCE_CAP,
            translate: (key, values) => t(key, values),
          })
        : { connections: [], internalEdges: { total: 0, byFamily: {} } },
    [model, index, selectedAreaId, t],
  );

  // Each drawn connection carries its place in the bundle its pair of areas
  // forms, so two families joining the same pair get two routes and two
  // controls instead of one drawn on top of the other.
  const drawnConnections = useMemo(() => {
    const filtered =
      lens === 'all'
        ? connectionResult.connections
        : connectionResult.connections.filter((c) => c.family === lens);
    const shown = filtered.slice(0, MAX_CONNECTORS);
    const perPair = new Map<string, number>();
    for (const connection of shown) {
      perPair.set(connection.otherAreaId, (perPair.get(connection.otherAreaId) ?? 0) + 1);
    }
    const seen = new Map<string, number>();
    return shown.map((connection) => {
      const index = seen.get(connection.otherAreaId) ?? 0;
      seen.set(connection.otherAreaId, index + 1);
      return { connection, offset: { index, count: perPair.get(connection.otherAreaId) ?? 1 } };
    });
  }, [connectionResult, lens]);

  // A selection made elsewhere (Pulse/Trails hand-off) must not leave a stale
  // expanded bridge from the previous area behind.
  useEffect(() => {
    setOpenConnectionId(null);
  }, [selectedAreaId]);

  useEffect(() => {
    const el = mapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width > 0) setMapWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const selectedArea = selectedAreaId ? index.byId.get(selectedAreaId) ?? null : null;
  const connectedAreaIds = useMemo(
    () => new Set(drawnConnections.map((d) => d.connection.otherAreaId)),
    [drawnConnections],
  );

  const focusTile = useCallback((areaId: string | undefined) => {
    if (!areaId) return;
    tileRefs.current.get(areaId)?.focus();
  }, []);

  const onTileKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, areaId: string) => {
      // Arrow / Home / End only, and only while a territory has focus. This view
      // installs no window-level listeners and swallows no application keys --
      // a modified chord (Cmd/Ctrl/Alt + arrow) belongs to the app, so bail out
      // before anything here could call preventDefault on it.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Resolved against the drawn boxes: persistent slots leave holes, so
      // index arithmetic would aim at ground no territory occupies.
      const next = moveTerritoryFocus(layout.boxes, areaId, event.key);
      if (!next) return;
      event.preventDefault();
      focusTile(next);
    },
    [layout.boxes, focusTile],
  );

  const totalRecords = model.nodeById.size;

  if (index.order.length === 0) {
    return (
      <div className="pga-root">
        <p className="pga-empty pga-empty-page">
          {t('project_graph.atlas.empty_model', { count: totalRecords.toLocaleString() })}
        </p>
      </div>
    );
  }

  return (
    <div className="pga-root">
      <header className="pga-header">
        <div>
          <h1 className="pga-title">{t('project_graph.atlas_title')}</h1>
          <p className="pga-subtitle">{t('project_graph.atlas.subtitle')}</p>
        </div>
        <p className="pga-header-stats">
          {t('project_graph.atlas.header_stats', { areas: index.order.length, records: totalRecords.toLocaleString() })}
          {index.unclaimedNodeCount > 0
            ? ` · ${t('project_graph.atlas.unassigned_count', { count: index.unclaimedNodeCount.toLocaleString() })}`
            : ''}
          {model.coverage.length > 0
            ? ` · ${t('project_graph.atlas.source_limitations', { count: model.coverage.length })}`
            : ''}
        </p>
      </header>

      <div className="pga-body">
        <div className="pga-map-scroll">
          <div className="pga-map" ref={mapRef} style={{ height: layout.height }}>
            <svg
              className="pga-connectors"
              width={layout.width}
              height={layout.height}
              aria-hidden="true"
              focusable="false"
            >
              {selectedArea &&
                drawnConnections.map(({ connection, offset }) => {
                  const from = boxById.get(selectedArea.id);
                  const to = boxById.get(connection.otherAreaId);
                  if (!from || !to) return null;
                  const path = connectorPath(from, to, offset);
                  return (
                    <path
                      key={connection.id}
                      d={path.d}
                      className={[
                        'pga-connector',
                        `pga-connector-${connection.family}`,
                        connection.id === openConnectionId ? 'is-open' : '',
                      ].filter(Boolean).join(' ')}
                    />
                  );
                })}
            </svg>

            {index.order.map((area) => {
              const box = boxById.get(area.id);
              if (!box) return null;
              const standing = standings.get(area.id);
              const stats = activity.byArea.get(area.id);
              const isSelected = area.id === selectedAreaId;
              const isDim = Boolean(selectedArea) && !isSelected && !connectedAreaIds.has(area.id);
              const events = stats?.events ?? 0;
              const touched = stats?.touched ?? 0;
              // Fraction of this area's own records, not a share of the busiest
              // area -- see the note on AreaActivity.share.
              const share = stats?.share ?? 0;
              const recordedShare = touched > 0 ? (stats?.touchedRecorded ?? 0) / touched : 0;
              const activityText =
                events > 0
                  ? t('project_graph.atlas.area_activity_summary', { touched: touched.toLocaleString(), members: (stats?.members ?? 0).toLocaleString(), percent: Math.round(share * 100), events: events.toLocaleString() })
                  : t('project_graph.atlas.no_activity_in_range');

              return (
                <button
                  key={area.id}
                  type="button"
                  ref={(el) => {
                    if (el) tileRefs.current.set(area.id, el);
                    else tileRefs.current.delete(area.id);
                  }}
                  className={[
                    'pga-territory',
                    isSelected ? 'is-selected' : '',
                    isDim ? 'is-dim' : '',
                    area === index.unassigned ? 'is-unassigned' : '',
                  ].filter(Boolean).join(' ')}
                  style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
                  aria-pressed={isSelected}
                  aria-label={t('project_graph.atlas.area_accessible_label', { name: area.label, records: recordCount(standing?.total ?? 0), activity: activityText })}
                  onClick={() => onSelectArea(isSelected ? null : area.id)}
                  onKeyDown={(e) => onTileKeyDown(e, area.id)}
                >
                  <span className="pga-territory-name">{area.label}</span>
                  <span className="pga-territory-basis" title={area.basis}>{area.basis}</span>
                  <span className="pga-territory-counts">
                    {t('project_graph.atlas.open_records_count', { records: recordCount(standing?.total ?? 0), count: (standing?.open ?? 0).toLocaleString() })}
                  </span>
                  <span className="pga-activity-bar" aria-hidden="true">
                    {touched > 0 ? (
                      <span className="pga-activity-fill" style={{ width: `${Math.max(share * 100, 3)}%` }}>
                        <span className="pga-activity-recorded" style={{ width: `${recordedShare * 100}%` }} />
                      </span>
                    ) : (
                      <span className="pga-activity-none" />
                    )}
                  </span>
                  <span className={events > 0 ? 'pga-territory-activity' : 'pga-territory-activity is-quiet'}>
                    {activityText}
                  </span>
                  {standing && standing.topTypes.length > 0 && (
                    <span className="pga-territory-types">
                      {standing.topTypes.map((t) => `${t.type} ×${t.count}`).join(' · ')}
                    </span>
                  )}
                </button>
              );
            })}

            {selectedArea &&
              drawnConnections.map(({ connection, offset }) => {
                const from = boxById.get(selectedArea.id);
                const to = boxById.get(connection.otherAreaId);
                if (!from || !to) return null;
                const path = connectorPath(from, to, offset);
                return (
                  <button
                    key={connection.id}
                    type="button"
                    className={[
                      'pga-bridge',
                      `pga-bridge-${connection.family}`,
                      connection.id === openConnectionId ? 'is-open' : '',
                    ].filter(Boolean).join(' ')}
                    style={{ left: path.midX, top: path.midY }}
                    aria-label={t('project_graph.atlas.connection_accessible_label', {
                      from: selectedArea.label,
                      to: connection.otherAreaLabel,
                      explanation: connection.explanation,
                    })}
                    onClick={() => {
                      setTab('connections');
                      setOpenConnectionId(openConnectionId === connection.id ? null : connection.id);
                    }}
                  >
                    {t('project_graph.atlas.connection_count', { count: connection.count.toLocaleString(), family: t(`project_graph.atlas.family_short.${connection.family.replace('-', '_')}`) })}
                  </button>
                );
              })}
          </div>
        </div>

        {selectedArea ? (
          <AreaDetailPanel
            key={selectedArea.id}
            model={model}
            index={index}
            area={selectedArea}
            standing={standings.get(selectedArea.id)}
            activity={activity.byArea.get(selectedArea.id)}
            range={range}
            connections={connectionResult.connections}
            internalEdges={connectionResult.internalEdges}
            lens={lens}
            onLensChange={setLens}
            openConnectionId={openConnectionId}
            onOpenConnection={setOpenConnectionId}
            tab={tab}
            onTabChange={setTab}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            onOpenNode={onOpenNode}
            onNavigate={onNavigate}
            onRenameArea={onRenameArea}
          />
        ) : (
          <aside className="pga-detail pga-detail-empty" aria-label={t('project_graph.atlas.area_detail_label')}>
            <div className="pga-eyebrow">{t('project_graph.atlas.no_area_selected')}</div>
            <p>
              {t('project_graph.atlas.select_area_hint')}
            </p>
            <p className="pga-hint">
              {t('project_graph.atlas.overlapping_areas_hint')}
            </p>
            {activity.totalEvents > 0 && (
              <p className="pga-detail-counts">
                {t('project_graph.atlas.events_in_range', { count: activity.totalEvents.toLocaleString() })}
                {activity.unmappedEvents > 0
                  ? ` · ${t('project_graph.atlas.unmapped_events', { count: activity.unmappedEvents.toLocaleString() })}`
                  : ''}
              </p>
            )}
            {/* The shell's Sources & limitations disclosure is the authority on
                coverage; restating all of it here just crowds the map. */}
            {model.coverage.length > 0 && (
              <p className="pga-hint">
                {t('project_graph.atlas.source_limitations_inherited')}
              </p>
            )}
          </aside>
        )}
      </div>

      <footer className="pga-footer">
        <span className="pga-legend">
          <i className="pga-swatch pga-swatch-recorded" /> {t('project_graph.atlas.recorded_event_legend')}
          <i className="pga-swatch pga-swatch-observed" /> {t('project_graph.atlas.last_observed_legend')}
        </span>
        <span className="pga-footer-note">
          {t('project_graph.atlas.bar_explanation')}
        </span>
        <span className="pga-footer-spacer" />
        {index.unassigned ? (
          <button
            type="button"
            className="pga-mini-btn"
            onClick={() => onSelectArea(index.unassigned!.id)}
          >
            {t('project_graph.atlas.unassigned_area', { records: recordCount(index.unassigned.nodeIds.length) })}
          </button>
        ) : (
          <span className="pga-footer-note">{t('project_graph.atlas.no_unassigned_area')}</span>
        )}
      </footer>
    </div>
  );
}
