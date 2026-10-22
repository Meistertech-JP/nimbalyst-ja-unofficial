/**
 * Evidence Trails prototype.
 *
 * One focused artifact at a time, its recorded relations grouped into named
 * lanes, and an inspector that says what supports each connection. It is not a
 * whole-project picture and does not try to be: the hairball is the thing this
 * view exists to avoid.
 *
 * Shared state comes from the shell — the selected node is the trail's centre,
 * the selected area scopes the starting list, and the date range highlights
 * recent evidence without hiding older context.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { ProjectGraphNode } from '../../types';
import type { PrototypeViewProps } from '../contracts';
import {
  buildNeighborhood,
  buildSecondHop,
  buildTrailsIndex,
  degreeOf,
  describeCreation,
  describeEvent,
  describeGaps,
  explicitDegreeOf,
  findStartingArtifacts,
  formatRange,
  latestEvent,
  type NeighborRef,
} from './trailsModel';
import './trails.css';

const START_LIMIT = 60;
const LANE_LIMIT = 6;
const LANE_PAGE = 5;
const SECOND_HOP_LIMIT = 6;
const CRUMB_LIMIT = 4;

function kindLabel(node: ProjectGraphNode): string {
  return node.type.replace(/[_-]+/g, ' ');
}

/** Coarse tone from the record's source, which is a closed enum (types are not). */
function toneFor(node: ProjectGraphNode): string {
  return `pg-trails-tone-${node.source}`;
}

export function TrailsPrototype(props: PrototypeViewProps): JSX.Element {
  const { t, i18n } = useTranslation('extensions');
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const countText = (shown: number, total: number, unit: string) => t('project_graph.trails.count', { shown, total, unit });
  const { model, range, selectedAreaId, selectedNodeId } = props;
  const { onSelectArea, onSelectNode, onOpenNode, onNavigate, onResolveNode } = props;

  const index = useMemo(() => buildTrailsIndex(model), [model]);

  const [focusId, setFocusId] = useState<string | null>(selectedNodeId);
  const [trail, setTrail] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [inspectedKey, setInspectedKey] = useState<string | null>(null);
  const [perLane, setPerLane] = useState<Record<string, number>>({});
  const [laneLimit, setLaneLimit] = useState(LANE_LIMIT);
  const [includePathDerived, setIncludePathDerived] = useState(true);
  const [scopeToArea, setScopeToArea] = useState(true);
  const [activeStart, setActiveStart] = useState(0);

  // The shell owns selection. When it changes the node under us the trail is a
  // new trail, not a continuation of the old one.
  const externalRef = useRef(selectedNodeId);
  useEffect(() => {
    if (selectedNodeId === externalRef.current) return;
    externalRef.current = selectedNodeId;
    setFocusId(selectedNodeId);
    setTrail([]);
    setInspectedKey(null);
    setPerLane({});
    setLaneLimit(LANE_LIMIT);
  }, [selectedNodeId]);

  const area = useMemo(
    () => model.areas.find(a => a.id === selectedAreaId) ?? null,
    [model.areas, selectedAreaId],
  );
  const areaNodeIds = useMemo(
    () => (area && scopeToArea ? new Set(area.nodeIds) : null),
    [area, scopeToArea],
  );

  const starting = useMemo(
    () => findStartingArtifacts(model, index, { query, areaNodeIds, limit: START_LIMIT, range }),
    [model, index, query, areaNodeIds, range],
  );

  const neighborhood = useMemo(
    () =>
      buildNeighborhood(model, index, focusId, range, {
        perLane: key => perLane[key] ?? LANE_PAGE,
        laneLimit,
        includePathDerived,
        translate: t,
      }),
    [model, index, focusId, range, perLane, laneLimit, includePathDerived, t],
  );

  const inspected: NeighborRef | null = useMemo(() => {
    if (!inspectedKey) return null;
    for (const lane of neighborhood.lanes) {
      const hit = lane.neighbors.find(n => n.key === inspectedKey);
      if (hit) return hit;
    }
    return null;
  }, [inspectedKey, neighborhood]);

  const secondHop = useMemo(() => {
    if (!inspected || !focusId) return null;
    return buildSecondHop(model, index, inspected.node.id, focusId, range, SECOND_HOP_LIMIT, t);
  }, [model, index, inspected, focusId, range, t]);

  const gaps = useMemo(() => describeGaps(model, neighborhood, t), [model, neighborhood, t]);

  const recenter = useCallback(
    (id: string) => {
      setTrail(prev => (focusId && focusId !== id ? [...prev, focusId] : prev));
      externalRef.current = id;
      setFocusId(id);
      setInspectedKey(null);
      setPerLane({});
      setLaneLimit(LANE_LIMIT);
      onSelectNode(id);
    },
    [focusId, onSelectNode],
  );

  // Both of these rewind the trail rather than extending it, so they slice the
  // history outside the state updater -- an updater that called `onSelectNode`
  // would fire it twice under StrictMode's double invocation.
  const rewindTo = useCallback(
    (position: number) => {
      const target = trail[position];
      if (!target) return;
      setTrail(trail.slice(0, position));
      externalRef.current = target;
      setFocusId(target);
      setInspectedKey(null);
      setPerLane({});
      setLaneLimit(LANE_LIMIT);
      onSelectNode(target);
    },
    [trail, onSelectNode],
  );

  const goBack = useCallback(() => rewindTo(trail.length - 1), [rewindTo, trail.length]);

  const startItems = starting.items;
  const activeIndex = startItems.length === 0 ? -1 : Math.min(activeStart, startItems.length - 1);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-start-index="${activeIndex}"]`);
    // jsdom has no scrollIntoView; guard rather than depend on a global stub.
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  // Scoped to the listbox: no document-level listener, and nothing the
  // surrounding application would otherwise act on. A held modifier means the
  // chord belongs to the app (Cmd+Arrow, Alt+Arrow, Ctrl+Enter), so bail before
  // any preventDefault rather than swallowing it inside the list.
  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (startItems.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveStart(Math.min(activeIndex + 1, startItems.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveStart(Math.max(activeIndex - 1, 0));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveStart(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveStart(startItems.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const node = startItems[activeIndex];
      if (node) recenter(node.id);
    }
  };

  const focus = neighborhood.focus;
  const memberships = focus ? (model.memberships.get(focus.id) ?? []) : [];
  const focusEvent = focus ? latestEvent(index, focus.id) : null;
  const crumbs = trail.slice(-CRUMB_LIMIT);
  const crumbOffset = trail.length - crumbs.length;

  return (
    <div className="pg-trails">
      <section className="pg-trails-start" aria-label={t('project_graph.trails.starting_artifacts')}>
        <header className="pg-trails-start-head">
          <h2>{t('project_graph.trails.start_from')}</h2>
          {area ? (
            <button
              type="button"
              className="pg-trails-toggle"
              aria-pressed={scopeToArea}
              onClick={() => setScopeToArea(v => !v)}
              title={area.basis}
            >
              {scopeToArea ? t('project_graph.trails.scoped_to', { area: area.label }) : t('project_graph.trails.all_records')}
            </button>
          ) : null}
        </header>
        <input
          type="search"
          className="pg-trails-search"
          placeholder={t('project_graph.trails.search_records')}
          aria-label={t('project_graph.trails.search_starting_artifacts')}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setActiveStart(0);
          }}
          onKeyDown={e => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.key === 'ArrowDown' && startItems.length > 0) {
              e.preventDefault();
              setActiveStart(0);
              listRef.current?.focus();
            }
          }}
        />
        <p className="pg-trails-note">
          {countText(startItems.length, starting.total, t('project_graph.trails.matches'))}
          {area && scopeToArea ? ` ${t('project_graph.trails.in_area_scope', { area: area.label, count: starting.scopeTotal })}` : ` ${t('project_graph.trails.of_scope', { count: starting.scopeTotal })}`}
          {starting.total > startItems.length ? ` · ${t('project_graph.trails.narrow_search')}` : ''}
        </p>
        <p className="pg-trails-note">
          {query.trim()
            ? t('project_graph.trails.search_ranking')
            : t('project_graph.trails.suggestion_ranking')}
        </p>
        <div
          className="pg-trails-list"
          role="listbox"
          tabIndex={0}
          ref={listRef}
          aria-label={t('project_graph.trails.starting_artifacts')}
          aria-activedescendant={activeIndex >= 0 ? `pg-trails-start-${activeIndex}` : undefined}
          onKeyDown={onListKeyDown}
        >
          {startItems.length === 0 ? (
            <p className="pg-trails-empty">{t('project_graph.trails.no_search_matches')}</p>
          ) : null}
          {startItems.map((node, i) => {
            const linked = degreeOf(index, node.id);
            const explicit = explicitDegreeOf(model, index, node.id);
            return (
              <div
                key={node.id}
                id={`pg-trails-start-${i}`}
                data-start-index={i}
                role="option"
                aria-selected={node.id === focusId}
                className={`pg-trails-start-item ${i === activeIndex ? 'is-active' : ''} ${node.id === focusId ? 'is-focus' : ''}`}
                onClick={() => {
                  setActiveStart(i);
                  recenter(node.id);
                }}
              >
                <span className={`pg-trails-kind ${toneFor(node)}`}>{kindLabel(node)}</span>
                <span className="pg-trails-start-label">{node.label}</span>
                <span className="pg-trails-start-meta">
                  {linked === 0
                    ? t('project_graph.trails.no_recorded_connections')
                    : t('project_graph.trails.explicit_connections', { explicit, total: linked })}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pg-trails-canvas" aria-label={t('project_graph.trails.evidence_trail')}>
        <div className="pg-trails-crumbs">
          <button type="button" className="pg-trails-btn" onClick={goBack} disabled={trail.length === 0}>
            {t('project_graph.trails.back')}
          </button>
          {crumbOffset > 0 ? <span className="pg-trails-note">{t('project_graph.trails.earlier_items', { count: crumbOffset })}</span> : null}
          {crumbs.map((id, i) => (
            <button
              key={`${id}-${i}`}
              type="button"
              className="pg-trails-crumb"
              onClick={() => rewindTo(crumbOffset + i)}
            >
              {model.nodeById.get(id)?.label ?? id}
            </button>
          ))}
          {focus ? <span className="pg-trails-crumb is-current">{focus.label}</span> : null}
        </div>

        {!focus ? (
          <div className="pg-trails-blank">
            <h2>{t('project_graph.trails.pick_starting_artifact')}</h2>
            <p>
              {t('project_graph.trails.starting_artifact_help')}
            </p>
            <p className="pg-trails-note">
              {t('project_graph.trails.suggestion_ranking_help')}
            </p>
            <p className="pg-trails-note">
              {t('project_graph.trails.range_help', { range: formatRange(range, locale, t) })}
            </p>
          </div>
        ) : (
          <>
            <article className={`pg-trails-focus ${toneFor(focus)}`}>
              <div className="pg-trails-focus-head">
                <span className={`pg-trails-kind ${toneFor(focus)}`}>{kindLabel(focus)}</span>
                <span className="pg-trails-note">{focus.source} · {focus.visibility}</span>
                {focus.status ? <span className="pg-trails-status">{focus.status}</span> : null}
              </div>
              <h2 className="select-text">{focus.label}</h2>
              {focus.sublabel ? <p className="pg-trails-note select-text">{focus.sublabel}</p> : null}
              {/* Dates come from recorded events only. `node.createdAt` and
                  `node.closedAt` can be inferred (loader back-fills undated
                  nodes from a neighbor), so neither is printed as observed. */}
              <p className="pg-trails-note">
                {describeCreation(index, focus.id, t, locale)} · {describeEvent(focusEvent, t, locale)}
              </p>
              <div className="pg-trails-actions">
                <button type="button" className="pg-trails-btn" onClick={() => onOpenNode(focus)}>
                  {t('project_graph.trails.open_source_record')}
                </button>
                <button type="button" className="pg-trails-btn" onClick={() => onNavigate('atlas', focus.id, selectedAreaId ?? undefined)}>
                  {t('project_graph.trails.show_in_atlas')}
                </button>
                <button type="button" className="pg-trails-btn" onClick={() => onNavigate('pulse', focus.id, selectedAreaId ?? undefined)}>
                  {t('project_graph.trails.show_in_pulse')}
                </button>
              </div>
              {memberships.length > 0 ? (
                <div className="pg-trails-membership">
                  <span className="pg-trails-eyebrow">{t('project_graph.trails.area_membership')}</span>
                  <div className="pg-trails-chiprow">
                    {memberships.map(m => {
                      const label = model.areas.find(a => a.id === m.areaId)?.label ?? m.areaId;
                      return (
                        <button
                          key={m.areaId}
                          type="button"
                          className="pg-trails-chip"
                          title={m.basis}
                          onClick={() => onSelectArea(m.areaId)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </article>

            <div className="pg-trails-summary">
              <span>
                {countText(neighborhood.connectionShown, neighborhood.connectionTotal, t('project_graph.trails.recorded_connections'))} {t('project_graph.trails.shown')}
              </span>
              <span className="pg-trails-note">
                {t('project_graph.trails.evidence_in_range', { count: neighborhood.inRangeTotal, range: formatRange(range, locale, t) })}
              </span>
              {neighborhood.census.resolved > 0 ? (
                <span className="pg-trails-note">
                  {t('project_graph.trails.relation_basis_counts', { explicit: neighborhood.census.explicit, derived: neighborhood.census.pathDerived })}
                </span>
              ) : null}
              <button
                type="button"
                className="pg-trails-toggle"
                aria-pressed={includePathDerived}
                onClick={() => setIncludePathDerived(v => !v)}
              >
                {includePathDerived
                  ? t('project_graph.trails.path_containment_shown')
                  : t('project_graph.trails.path_containment_hidden', { count: neighborhood.hiddenPathDerived })}
              </button>
            </div>

            {neighborhood.connectionTotal === 0 ? (
              <div className="pg-trails-unlinked">
                <h3>{t('project_graph.trails.no_loaded_links')}</h3>
                <p>
                  {t('project_graph.trails.no_loaded_links_help')}
                </p>
                <p className="pg-trails-note">
                  {memberships.length > 0
                    ? t('project_graph.trails.member_area_explanation')
                    : t('project_graph.trails.no_area_membership_explanation')}
                </p>
              </div>
            ) : null}

            {neighborhood.unresolvedRefs.length > 0 ? (
              <section
                className="pg-trails-unresolved"
                aria-label={t('project_graph.trails.unresolved_endpoints_count', { count: neighborhood.unresolved })}
              >
                <header className="pg-trails-unresolved-head">
                  <span className="pg-trails-relation">{t('project_graph.trails.unresolved_endpoints')}</span>
                  <span className="pg-trails-note">
                    {countText(neighborhood.unresolvedRefs.length, neighborhood.unresolved, t('project_graph.trails.links'))}
                  </span>
                </header>
                <p className="pg-trails-note">
                  {t('project_graph.trails.unresolved_explanation')}
                </p>
                <ul className="pg-trails-unresolved-list">
                  {neighborhood.unresolvedRefs.map(ref => (
                    <li key={ref.key} className="pg-trails-unresolved-row">
                      <span className="pg-trails-relation">
                        {ref.direction === 'out' ? '→' : '←'} {ref.descriptor.label}
                      </span>
                      <code className="pg-trails-unresolved-id">{ref.missingId}</code>
                      {onResolveNode ? (
                        <button
                          type="button"
                          className="pg-trails-btn"
                          onClick={() => onResolveNode(ref.missingId)}
                        >
                          {t('project_graph.trails.open_this_record')}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="pg-trails-lanes">
              {neighborhood.lanes.map(lane => {
                const shown = lane.neighbors.length;
                return (
                  <section
                    key={lane.key}
                    className={`pg-trails-lane pg-trails-basis-${lane.descriptor.kind}`}
                    aria-label={t('project_graph.trails.lane_accessible_label', { relation: lane.descriptor.label, direction: t(`project_graph.trails.${lane.direction === 'out' ? 'outgoing' : 'incoming'}`), count: lane.total })}
                  >
                    <header className="pg-trails-lane-head">
                      <span className="pg-trails-relation">
                        {lane.direction === 'out' ? '→' : '←'} {lane.descriptor.label}
                      </span>
                      <span className="pg-trails-basis-tag">{lane.descriptor.kind}</span>
                      <span className="pg-trails-note">{countText(shown, lane.total, t('project_graph.trails.records'))}</span>
                      {lane.inRangeCount > 0 ? (
                        <span className="pg-trails-note">{t('project_graph.trails.recent_count', { count: lane.inRangeCount })}</span>
                      ) : null}
                    </header>
                    <p className="pg-trails-note pg-trails-lane-basis">{lane.descriptor.basis}</p>
                    <div className="pg-trails-chiprow">
                      {lane.neighbors.map(ref => (
                        <button
                          key={ref.key}
                          type="button"
                          className={`pg-trails-node ${toneFor(ref.node)} ${ref.key === inspectedKey ? 'is-inspected' : ''}`}
                          aria-pressed={ref.key === inspectedKey}
                          onClick={() => setInspectedKey(ref.key === inspectedKey ? null : ref.key)}
                        >
                          <span className="pg-trails-node-kind">{kindLabel(ref.node)}</span>
                          <span className="pg-trails-node-label">{ref.node.label}</span>
                          <span className="pg-trails-node-meta">
                            {ref.inRange ? `${t('project_graph.trails.recent_evidence')} · ` : ''}
                            {t('project_graph.trails.connection_count', { count: ref.degree })}
                          </span>
                        </button>
                      ))}
                    </div>
                    {shown < lane.total ? (
                      <button
                        type="button"
                        className="pg-trails-btn pg-trails-more"
                        onClick={() => setPerLane(prev => ({ ...prev, [lane.key]: shown + LANE_PAGE }))}
                      >
                        {t('project_graph.trails.show_more_of', { shown: Math.min(LANE_PAGE, lane.total - shown), total: lane.total })}
                      </button>
                    ) : null}
                  </section>
                );
              })}
              {neighborhood.laneTotal > neighborhood.lanes.length ? (
                <button
                  type="button"
                  className="pg-trails-btn pg-trails-more"
                  onClick={() => setLaneLimit(neighborhood.laneTotal)}
                >
                  {t('project_graph.trails.show_more_relation_types', { count: neighborhood.laneTotal - neighborhood.lanes.length })}
                </button>
              ) : null}
            </div>

            {gaps.length > 0 ? (
              <section className="pg-trails-gaps" aria-label={t('project_graph.trails.what_trail_does_not_establish')}>
                <span className="pg-trails-eyebrow">{t('project_graph.trails.what_trail_does_not_establish')}</span>
                <ul>
                  {gaps.map(gap => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </section>

      <aside className="pg-trails-inspect" aria-label={t('project_graph.trails.connection_inspector')}>
        {inspected && focus ? (
          <>
            <span className="pg-trails-eyebrow">
              {focus.label} {inspected.direction === 'out' ? '→' : '←'} {inspected.descriptor.label}
            </span>
            <h2 className="select-text">{inspected.node.label}</h2>
            <p className="pg-trails-note select-text">
              {kindLabel(inspected.node)} · {inspected.node.source}
              {inspected.node.status ? ` · ${inspected.node.status}` : ''}
            </p>
            <div className="pg-trails-rule" />
            <h3>{t('project_graph.trails.what_supports_connection')}</h3>
            <p className={`pg-trails-basis-line pg-trails-basis-${inspected.descriptor.kind}`}>
              {inspected.descriptor.basis}
            </p>
            <p className="pg-trails-note">
              {t('project_graph.trails.recorded_as')} <code>{inspected.edge.type}</code>
              {inspected.edge.strength != null ? ` · strength ${inspected.edge.strength}` : ''} ·{' '}
              {inspected.descriptor.kind === 'explicit'
                ? t('project_graph.trails.explicit_link_in_source')
                : inspected.descriptor.kind === 'derived'
                  ? t('project_graph.trails.derived_by_rule')
                  : t('project_graph.trails.basis_not_stated')}
            </p>
            <div className="pg-trails-rule" />
            <h3>{t('project_graph.trails.this_record')}</h3>
            <p className="pg-trails-note">
              {describeCreation(index, inspected.node.id, t, locale)} · {describeEvent(inspected.latest, t, locale)}
            </p>
            <p className="pg-trails-note">
              {inspected.inRange
                ? t('project_graph.trails.has_evidence_in_range', { range: formatRange(range, locale, t) })
                : t('project_graph.trails.no_evidence_in_range', { range: formatRange(range, locale, t) })}
            </p>
            <div className="pg-trails-actions">
              <button type="button" className="pg-trails-btn" onClick={() => onOpenNode(inspected.node)}>
                {t('project_graph.trails.open_source')}
              </button>
              <button type="button" className="pg-trails-btn" onClick={() => recenter(inspected.node.id)}>
                {t('project_graph.trails.recenter_trail')}
              </button>
            </div>
            <div className="pg-trails-rule" />
            <h3>
              {t('project_graph.trails.from_here')}{' '}
              <span className="pg-trails-note">
                {secondHop ? countText(secondHop.items.length, secondHop.total, t('project_graph.trails.further_connections')) : ''}
              </span>
            </h3>
            {secondHop && secondHop.total === 0 ? (
              <p className="pg-trails-note">{t('project_graph.trails.no_further_connections')}</p>
            ) : null}
            {secondHop?.items.map(ref => (
              <button
                key={ref.key}
                type="button"
                className="pg-trails-hop"
                onClick={() => recenter(ref.node.id)}
              >
                <span className="pg-trails-relation">
                  {ref.direction === 'out' ? '→' : '←'} {ref.descriptor.label}
                </span>
                <span className="pg-trails-node-label">{ref.node.label}</span>
                <span className="pg-trails-node-meta">{kindLabel(ref.node)}</span>
              </button>
            ))}
          </>
        ) : (
          <>
            <span className="pg-trails-eyebrow">{t('project_graph.trails.inspector')}</span>
            <p>
              {t('project_graph.trails.inspector_help')}
            </p>
            <div className="pg-trails-rule" />
            <h3>{t('project_graph.trails.how_to_read_lane')}</h3>
            <p className="pg-trails-note">
              {t('project_graph.trails.lane_reading_help')}
            </p>
            <div className="pg-trails-rule" />
            <h3>{t('project_graph.trails.time_scope')}</h3>
            <p className="pg-trails-note">
              {t('project_graph.trails.time_scope_help', { range: formatRange(range, locale, t) })}
            </p>
            {model.source === 'sample' ? (
              <p className="pg-trails-note">{t('project_graph.trails.sample_records_notice')}</p>
            ) : (
              <p className="pg-trails-note">
                {t('project_graph.trails.live_records_notice')}
              </p>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

export default TrailsPrototype;
