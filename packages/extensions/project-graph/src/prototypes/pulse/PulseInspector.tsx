import React from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { PrototypeModel, PrototypeViewProps } from '../contracts';
import type { PulseBucket } from './pulseBuckets';
import { bucketRangeLabel } from './pulseBuckets';
import type { PulseMatrix, PulseSelectionSummary, PulseStateItem } from './pulseModel';
import { openStateItems } from './pulseModel';
import { formatRelative, formatStamp } from './pulseFormat';

const MAX_EPISODES = 10;
const MAX_EVENTS_PER_EPISODE = 6;
const MAX_OPEN_ITEMS = 10;

export { formatRelative, formatStamp } from './pulseFormat';

function StateList({
  items,
  nowMs,
  onSelectNode,
  onOpenNode,
}: {
  items: PulseStateItem[];
  nowMs: number;
  onSelectNode: PrototypeViewProps['onSelectNode'];
  onOpenNode: PrototypeViewProps['onOpenNode'];
}) {
  const { t } = useTranslation('extensions');
  const translatePulse = (key: string, options?: Record<string, string | number>) =>
    String(t(`project_graph.pulse.${key}`, options));
  return (
    <ul className="pgp-open-list">
      {items.map((item) => (
        <li key={item.node.id}>
          <button
            type="button"
            className="pgp-link-btn"
            onClick={() => onSelectNode(item.node.id)}
            onDoubleClick={() => onOpenNode(item.node)}
          >
            <span className="pgp-open-status">{item.node.status}</span>
            <span className="pgp-open-label">{item.node.label}</span>
          </button>
          <span className="pgp-open-when">
            {item.lastEventAt === null
              ? t('project_graph.pulse.no_dated_event')
              : formatRelative(item.lastEventAt, nowMs, translatePulse)}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface Props {
  model: PrototypeModel;
  matrix: PulseMatrix;
  summary: PulseSelectionSummary | null;
  buckets: PulseBucket[];
  nowMs: number;
  onSelectNode: PrototypeViewProps['onSelectNode'];
  onOpenNode: PrototypeViewProps['onOpenNode'];
  onNavigate: PrototypeViewProps['onNavigate'];
  selectedNodeId: string | null;
}

export function PulseInspector({
  model,
  matrix,
  summary,
  buckets,
  nowMs,
  onSelectNode,
  onOpenNode,
  onNavigate,
  selectedNodeId,
}: Props) {
  const { t } = useTranslation('extensions');
  const census = React.useMemo(
    () => openStateItems(model, matrix, MAX_OPEN_ITEMS),
    [model, matrix],
  );

  return (
    <aside className="pgp-inspector" aria-label={t('project_graph.pulse.selection_detail')}>
      {summary === null ? (
        <div className="pgp-inspector-empty">
          <h3>{t('project_graph.pulse.nothing_selected')}</h3>
          <p>
            {t('project_graph.pulse.selection_help')}
          </p>
        </div>
      ) : (
        <SelectionDetail
          summary={summary}
          buckets={buckets}
          model={model}
          nowMs={nowMs}
          onSelectNode={onSelectNode}
          onOpenNode={onOpenNode}
          onNavigate={onNavigate}
          selectedNodeId={selectedNodeId}
        />
      )}

      <section className="pgp-open-state" aria-label={t('project_graph.pulse.current_state_census')}>
        <div className="pgp-eyebrow">{t('project_graph.pulse.open_now')}</div>
        <p className="pgp-note">
          {t('project_graph.pulse.state_census_help', { count: census.scopeSize.toLocaleString() })}
        </p>
        {census.openTotal === 0 ? (
          <p className="pgp-empty-line">
            {t('project_graph.pulse.no_open_records')}
          </p>
        ) : (
          <>
            <StateList
              items={census.open}
              nowMs={nowMs}
              onSelectNode={onSelectNode}
              onOpenNode={onOpenNode}
            />
            <div className="pgp-count-line">
              {t('project_graph.pulse.showing_open_records', { shown: census.open.length, total: census.openTotal })}
            </div>
          </>
        )}

        {census.unrecognizedTotal > 0 && (
          <div className="pgp-unrecognized">
            <p className="pgp-note">
              {t('project_graph.pulse.unrecognized_status_count', { count: census.unrecognizedTotal })}
              {/* Examples, already clipped and bounded by the model: status is
                  free text and live data puts whole notes in the field. */}
              {census.unrecognizedStatuses.length > 0
                ? ` (${census.unrecognizedStatuses.join(', ')}${
                    census.unrecognizedStatusTotal > census.unrecognizedStatuses.length
                      ? ` ${t('project_graph.pulse.other_status_values', { count: census.unrecognizedStatusTotal - census.unrecognizedStatuses.length })}`
                      : ''
                  })`
                : ''}
              {t('project_graph.pulse.unrecognized_status_explanation')}
            </p>
            <StateList
              items={census.unrecognized}
              nowMs={nowMs}
              onSelectNode={onSelectNode}
              onOpenNode={onOpenNode}
            />
            <div className="pgp-count-line">
              {t('project_graph.pulse.showing_unrecognized_records', { shown: census.unrecognized.length, total: census.unrecognizedTotal })}
            </div>
          </div>
        )}

        {census.archivedTotal > 0 && (
          <div className="pgp-archived">
            <p className="pgp-note">
              {t('project_graph.pulse.archived_explanation', { count: census.archivedTotal })}
            </p>
            <StateList
              items={census.archived}
              nowMs={nowMs}
              onSelectNode={onSelectNode}
              onOpenNode={onOpenNode}
            />
            <div className="pgp-count-line">
              {t('project_graph.pulse.showing_archived_records', { shown: census.archived.length, total: census.archivedTotal })}
            </div>
          </div>
        )}

        <div className="pgp-count-line">
          {t('project_graph.pulse.terminal_and_statusless', { terminal: census.closedTotal, statusless: census.statuslessTotal })}
        </div>
        {census.closureConflicts > 0 && (
          <p className="pgp-note">
            {t('project_graph.pulse.closure_conflicts', { count: census.closureConflicts })}
          </p>
        )}
      </section>
    </aside>
  );
}

function SelectionDetail({
  summary,
  buckets,
  model,
  nowMs,
  onSelectNode,
  onOpenNode,
  onNavigate,
  selectedNodeId,
}: {
  summary: PulseSelectionSummary;
  buckets: PulseBucket[];
  model: PrototypeModel;
  nowMs: number;
  onSelectNode: PrototypeViewProps['onSelectNode'];
  onOpenNode: PrototypeViewProps['onOpenNode'];
  onNavigate: PrototypeViewProps['onNavigate'];
  selectedNodeId: string | null;
}) {
  const { t, i18n } = useTranslation('extensions');
  const period = bucketRangeLabel(buckets, summary.colStart, summary.colEnd);
  const rowScope =
    summary.rowLabels.length === 1
      ? summary.rowLabels[0]
      : t('project_graph.pulse.selection.row_count', { count: summary.rowLabels.length });
  const shownEpisodes = summary.episodes.slice(0, MAX_EPISODES);

  return (
    <section className="pgp-selection" aria-label={t('project_graph.pulse.selected_period')}>
      <div className="pgp-eyebrow">
        {period} · {rowScope}
      </div>
      <h3 className="pgp-selection-heading">{summary.heading}</h3>
      <p className="pgp-note">
        {t('project_graph.pulse.counted_from_source')}
      </p>

      {summary.rowsOutOfView > 0 && (
        <p className="pgp-warn-line">
          {t('project_graph.pulse.rows_below_cap', { count: summary.rowsOutOfView, selected: summary.rowsSelected })}
        </p>
      )}
      {summary.includesPartialBucket && (
        <p className="pgp-warn-line">
          {t('project_graph.pulse.partial_bucket_warning')}
        </p>
      )}
      {summary.includesOutsideLoaded && (
        <p className="pgp-warn-line">
          {t('project_graph.pulse.outside_loaded_warning')}
        </p>
      )}
      {summary.lastObservedCount > 0 && (
        <p className="pgp-note">
          {t('project_graph.pulse.observed_vs_recorded', { recorded: summary.recordedCount, observed: summary.lastObservedCount })}
        </p>
      )}

      {summary.episodes.length === 0 ? (
        <p className="pgp-empty-line">
          {t('project_graph.pulse.no_events_loaded_period')}
        </p>
      ) : (
        <>
          <div className="pgp-eyebrow pgp-eyebrow-sub">
            {t('project_graph.pulse.grouped_by_artifact')}
          </div>
          <ul className="pgp-episodes">
            {shownEpisodes.map((episode) => {
              const node = model.nodeById.get(episode.nodeId);
              const isSelected = selectedNodeId === episode.nodeId;
              return (
                <li
                  key={episode.nodeId}
                  className={isSelected ? 'pgp-episode pgp-episode-selected' : 'pgp-episode'}
                >
                  <button
                    type="button"
                    className="pgp-episode-head"
                    onClick={() => onSelectNode(episode.nodeId)}
                  >
                    <span className="pgp-episode-title">{episode.label}</span>
                  <span className="pgp-episode-meta">
                      {episode.type} · {t('project_graph.pulse.event_count', { count: episode.events.length })} ·{' '}
                      {formatRelative(episode.lastAt, nowMs, (key, options) => String(t(`project_graph.pulse.${key}`, options)))}
                    </span>
                  </button>
                  <ul className="pgp-episode-events">
                    {episode.events.slice(0, MAX_EVENTS_PER_EPISODE).map((event) => (
                      <li key={event.id}>
                        <span
                          className={
                            event.provenance === 'last-observed'
                              ? 'pgp-kind pgp-kind-observed'
                              : 'pgp-kind'
                          }
                        >
          {t(`project_graph.pulse.event_kind.${event.kind}`)}
                        </span>
                        <span className="pgp-event-label">{event.label}</span>
                        <span className="pgp-event-when">{formatStamp(event.at, i18n.language)}</span>
                      </li>
                    ))}
                  </ul>
                  {episode.events.length > MAX_EVENTS_PER_EPISODE && (
                    <div className="pgp-count-line">
                      {t('project_graph.pulse.showing_events', { shown: MAX_EVENTS_PER_EPISODE, total: episode.events.length })}
                    </div>
                  )}
                  <div className="pgp-episode-actions">
                    {node && (
                      <button type="button" className="pgp-btn" onClick={() => onOpenNode(node)}>
                        {t('project_graph.pulse.open_source')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="pgp-btn"
                      onClick={() => onNavigate('trails', episode.nodeId)}
                    >
                      {t('project_graph.pulse.evidence_trail')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="pgp-count-line">
            {t('project_graph.pulse.showing_artifacts_events', { shown: shownEpisodes.length, total: summary.episodes.length, count: summary.eventCount })}
          </div>
        </>
      )}
    </section>
  );
}
