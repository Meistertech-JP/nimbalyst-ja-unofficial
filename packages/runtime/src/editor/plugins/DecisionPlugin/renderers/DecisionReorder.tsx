/**
 * `reorder`, in both states.
 *
 * Unanswered is a straight port: `ReorderList` from the transcript, same grip,
 * same mono index, same optional delete.
 *
 * Answered is the hard one, and the reason this file exists. N people submit N
 * orderings, and drawing four rankings at once produces something nobody reads.
 * So the answered state shows **one** order -- by mean position -- with a delta
 * chip against your own answer, and a Team/Yours toggle for the one case where
 * you want to check what you actually submitted. Mean position is also the only
 * aggregation that degrades correctly when someone has not answered: it just
 * averages fewer numbers.
 */

import React, { useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type {
  DecisionBlockSource,
  DecisionReorderTally,
  FeedbackAnswer,
} from '@nimbalyst/collab-protocol';

import { ReorderList } from '../../../../ui/AgentTranscript/components/CustomToolWidgets/shared/ReorderList';
import { AvatarStack } from './DecisionPrimitives';
import type { DecisionMember } from '../../../decisions/types';

interface ReorderProps {
  source: DecisionBlockSource;
  draft: FeedbackAnswer | undefined;
  onDraftChange: (answer: FeedbackAnswer) => void;
  disabled: boolean;
  tally: DecisionReorderTally | null;
  members: readonly DecisionMember[];
  myAnswer: FeedbackAnswer | undefined;
}

export function seedReorderDraft(source: DecisionBlockSource): FeedbackAnswer {
  return {
    type: 'reorder',
    orderedIds: source.entries.map((entry) => entry.id),
    removedIds: [],
  };
}

export const DecisionReorderControl: React.FC<ReorderProps> = ({
  source,
  draft,
  onDraftChange,
  disabled,
}) => {
  const state =
    draft?.type === 'reorder'
      ? { orderedIds: draft.orderedIds, removedIds: draft.removedIds }
      : { orderedIds: source.entries.map((entry) => entry.id), removedIds: [] };

  return (
    <ReorderList
      items={source.entries.map((entry) => ({
        id: entry.id,
        title: entry.label ?? entry.title ?? entry.id,
        ...(entry.subtitle !== undefined ? { subtitle: entry.subtitle } : {}),
        ...(entry.removable !== undefined ? { removable: entry.removable } : {}),
      }))}
      state={state}
      onChange={(next) =>
        onDraftChange({
          type: 'reorder',
          orderedIds: next.orderedIds,
          removedIds: next.removedIds,
        })
      }
      {...(source.minItems !== undefined ? { minItems: source.minItems } : {})}
      disabled={disabled}
      rootClassName="decision-reorder-list"
    />
  );
};

/** "Ranked first by 3 of 4" is the only aggregate worth spelling out in words. */
function firstPlaceNote(
  firstPlaceCount: number,
  respondentCount: number,
  t: (key: string, options?: Record<string, unknown>) => string
): string | undefined {
  if (respondentCount === 0 || firstPlaceCount === 0) return undefined;
  if (firstPlaceCount === respondentCount) return t('decision.reorder.everyone_first');
  return t('decision.reorder.first_by', { count: firstPlaceCount, total: respondentCount });
}

export const DecisionReorderTeamOrder: React.FC<{
  source: DecisionBlockSource;
  tally: DecisionReorderTally;
  members: readonly DecisionMember[];
  myAnswer: FeedbackAnswer | undefined;
}> = ({ source, tally, members, myAnswer }) => {
  const { t } = useTranslation('editor');
  const [view, setView] = useState<'team' | 'yours'>('team');
  const labelFor = (entryId: string): string => {
    const entry = source.entries.find((candidate) => candidate.id === entryId);
    return entry?.label ?? entry?.title ?? entryId;
  };

  const yourOrder = myAnswer?.type === 'reorder' ? myAnswer.orderedIds : [];
  const rows =
    view === 'yours'
      ? yourOrder.map((entryId, index) => ({
          entryId,
          rank: index + 1,
          note: undefined as string | undefined,
          viewerPosition: undefined as number | undefined,
          voterIds: [] as readonly string[],
        }))
      : tally.entries.map((entry) => ({
          entryId: entry.entryId,
          rank: entry.teamRank,
          note: firstPlaceNote(entry.firstPlaceCount, tally.respondentCount, t),
          viewerPosition: entry.viewerPosition,
          voterIds: entry.firstPlaceVoterIds,
        }));

  return (
    <div className="decision-reorder-result">
      <div className="decision-view-toggle-row">
        <span className="decision-view-toggle" role="group" aria-label={t('decision.reorder.aria_label')}>
          <button
            type="button"
            className={view === 'team' ? 'decision-view-on' : undefined}
            onClick={() => setView('team')}
          >
            {t('decision.reorder.team_order')}
          </button>
          <button
            type="button"
            className={view === 'yours' ? 'decision-view-on' : undefined}
            onClick={() => setView('yours')}
            disabled={yourOrder.length === 0}
          >
            {t('decision.reorder.yours')}
          </button>
        </span>
        <span className="decision-grow" />
        <span className="decision-quiet">
          {view === 'team'
            ? t('decision.reorder.mean_position', { count: tally.respondentCount, unit: t(tally.respondentCount === 1 ? 'decision.reorder.ranking_one' : 'decision.reorder.ranking_other') })
            : t('decision.reorder.submitted_order')}
        </span>
      </div>

      <ol className="decision-rank-list">
        {rows.map((row) => (
          <li key={row.entryId} className="decision-rank-row">
            <span className="decision-rank-num">{row.rank}</span>
            <span className="decision-row-main">
              <span className="decision-row-title">{labelFor(row.entryId)}</span>
              {row.note ? <span className="decision-row-sub">{row.note}</span> : null}
            </span>
            {row.viewerPosition !== undefined ? (
              <span
                className={`decision-delta decision-delta--${
                  row.viewerPosition === row.rank
                    ? 'same'
                    : row.viewerPosition > row.rank
                      ? 'up'
                      : 'down'
                }`}
              >
                {/* The team moved it up relative to you, or down, or neither. */}
                {row.viewerPosition === row.rank ? t('decision.reorder.same') : t('decision.reorder.you_had', { position: row.viewerPosition })}
              </span>
            ) : null}
            <AvatarStack voterIds={row.voterIds} members={members} />
          </li>
        ))}
      </ol>

      {tally.entries.some((entry) => entry.removedByVoterIds.length > 0) ? (
        <ul className="decision-dropped">
          {tally.entries
            .filter((entry) => entry.removedByVoterIds.length > 0)
            .map((entry) => (
              <li key={entry.entryId}>
                <s>{labelFor(entry.entryId)}</s>
                <span className="decision-quiet">
                  {t('decision.reorder.dropped_by', { count: entry.removedByVoterIds.length })}
                </span>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
};
