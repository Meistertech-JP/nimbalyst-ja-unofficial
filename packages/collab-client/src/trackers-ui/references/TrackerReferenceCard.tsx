/**
 * The embedded box: "Decision · Proposed" on the first line, the title, the
 * substance (a decision's choice, a question's position, a rejection's why
 * not), and a muted meta line with who, when, and what needs doing.
 *
 * Two encodings only: the state word's color says what attention the item
 * needs, and the border says whether it is settled. The state word is the
 * control (see `TrackerStateMenu`); agent proposals resolve in place.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX, MouseEvent, ReactNode } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';

import type { TrackerItem } from '../../trackers/dataSource';
import {
  boxBorder,
  cancelledStatus,
  isNormalState,
  personLabel,
  readAgentProposal,
  stateTone,
  transitionForProposal,
  type AgentProposal,
} from './trackerReferenceLifecycle';
import {
  displayKey,
  LiveChip,
  openHandlers,
  StatementObject,
  text,
  type ResolverProps,
} from './TrackerReferenceParts';
import { useTrackerReference } from './TrackerReferenceResolverContext';
import type { TrackerReferenceResolver } from './trackerReferenceResolver';
import {
  commitTrackerUpdates,
  runStateTransition,
  TrackerStateMenu,
  useStateTransitions,
  type TrackerPendingWrite,
  type TrackerStateChange,
  type TrackerStateMenuRequest,
} from './TrackerStateMenu';

/** How long "You accepted just now · Undo" stays. */
const RECENT_CHANGE_MS = 10_000;
/** How long the ring shows after someone else changes the state. */
const REMOTE_RING_MS = 1_600;

function localizedShortDate(value: unknown, locale: string): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

const keepFocus = (event: MouseEvent) => event.preventDefault();

type Note =
  | { kind: 'mine'; change: TrackerStateChange; error?: string }
  | { kind: 'theirs'; text: string };

function Lead({ children }: { children: ReactNode }): JSX.Element {
  return <span className="tracker-reference-card-lead">{children}</span>;
}

function CardContent({ resolver, item, t }: { resolver: TrackerReferenceResolver; item: TrackerItem; t: (key: string, options?: Record<string, unknown>) => string }): JSX.Element | null {
  switch (item.type) {
    case 'wiki-decision': {
      const whyNot = text(resolver, item, 'whyNot');
      if ((item.status === 'rejected' || item.status === 'superseded') && whyNot) {
        return <div className="tracker-reference-card-content"><Lead>{t('reference_card.why_not')}</Lead>{whyNot}</div>;
      }
      const chosen = text(resolver, item, 'chosen');
      return chosen ? <div className="tracker-reference-card-content">{chosen}</div> : null;
    }
    case 'question': {
      const position = text(resolver, item, 'position');
      if (!position) return <div className="tracker-reference-card-content" data-empty="true">{t('reference_card.no_position')}</div>;
      const accepted = resolver.fieldValue(item, 'positionState') === 'accepted';
      return (
        <div className="tracker-reference-card-content" data-tentative={accepted ? undefined : 'true'}>
          <Lead>{t(accepted ? 'reference_card.answer' : 'reference_card.proposed_position')}</Lead>{position}
        </div>
      );
    }
    case 'claim': {
      const subject = resolver.relationshipTargets(item, 'subject')[0];
      const predicate = text(resolver, item, 'predicate');
      const object = resolver.relationshipTargets(item, 'object')[0] ?? null;
      const valueText = text(resolver, item, 'valueText');
      if (!subject && !predicate && !object && !valueText) return null;
      return (
        <div className="tracker-reference-card-content tracker-reference-card-statement">
          {subject ? <LiveChip resolver={resolver} referenceKey={subject} /> : null}
          {predicate ? <span className="tracker-reference-card-predicate">{resolver.predicateLabel(predicate)}</span> : null}
          <StatementObject resolver={resolver} statement={{ objectItemId: object, valueText }} />
        </div>
      );
    }
    case 'entity':
    case 'finding': {
      const summary = text(resolver, item, 'summary') ?? text(resolver, item, 'scope');
      return summary ? <div className="tracker-reference-card-content">{summary}</div> : null;
    }
    default:
      return null;
  }
}

function joinMeta(parts: Array<string | null | undefined | false>): string | null {
  const present = parts.filter((part): part is string => Boolean(part));
  return present.length > 0 ? present.join(' · ') : null;
}

/** The resting meta line: who, when, and the one thing that needs doing. */
function restingMeta(resolver: TrackerReferenceResolver, item: TrackerItem, t: (key: string, options?: Record<string, unknown>) => string, formatDate: (value: unknown) => string | null): ReactNode {
  const field = (name: string) => resolver.fieldValue(item, name);
  const owner = personLabel(resolver, field('owner') ?? item.owner);
  const decidedBy = personLabel(resolver, field('decidedBy'));
  const decidedAt = formatDate(field('decidedAt'));
  const dateSuffix = (value: string | null) => value ? t('reference_card.date_suffix', { date: value }) : '';
  const settledBy = (key: string) => (decidedBy ? t(key, { person: decidedBy, date: dateSuffix(decidedAt) }) : null);

  if (item.type === 'wiki-decision') {
    switch (item.status) {
      case 'accepted': return settledBy('reference_card.accepted_by');
      case 'rejected': return settledBy('reference_card.rejected_by');
      case 'superseded': {
        const replacement = resolver.relationshipTargets(item, 'supersededBy')[0];
        return replacement ? <>{t('reference_card.superseded_by')}<LiveChip resolver={resolver} referenceKey={replacement} /></> : t('reference_card.superseded');
      }
      default:
        return owner ? joinMeta([owner, formatDate(item.created) && t('reference_card.proposed_on', { date: formatDate(item.created) })]) : t('reference_card.no_owner');
    }
  }
  if (item.type === 'question') {
    const revisit = text(resolver, item, 'revisitWhen');
    switch (item.status) {
      case 'answered': return settledBy('reference_card.answered_by');
      case 'deferred': return revisit ? t('reference_card.revisit', { when: revisit }) : t('reference_card.deferred');
      case 'abandoned': return null;
      default: {
        const due = formatDate(field('targetDate'));
        return joinMeta([owner ? t('reference_card.owner_owns', { owner }) : t('reference_card.no_owner_owns'), due && t('reference_card.decide_by', { date: due })]);
      }
    }
  }
  if (isNormalState(item.type, item.status)) return null;
  return owner ? t('reference_card.owner_owns', { owner }) : null;
}

/** What Delete did, so its stub can put the item back. */
interface Deletion {
  restore: () => Promise<void>;
}

function ProposalStrip({
  resolver,
  item,
  proposal,
  onChanged,
  onPending,
  onRequest,
  onDeleted,
}: {
  resolver: TrackerReferenceResolver;
  item: TrackerItem;
  proposal: AgentProposal;
  onChanged: (change: TrackerStateChange) => void;
  onPending: TrackerPendingWrite;
  onRequest: (request: TrackerStateMenuRequest) => void;
  onDeleted: (deletion: Deletion) => void;
}): JSX.Element {
  const { t } = useTranslation('tracker');
  const transitions = useStateTransitions(resolver, item);
  const [error, setError] = useState<string | null>(null);
  const editable = Boolean(resolver.updateItem);
  const statusOptions = resolver.statusOptions?.(item.type) ?? [];
  const labelFor = (value: string | undefined) =>
    statusOptions.find((option) => option.value === value)?.label ?? value ?? '';

  const run = (work: () => Promise<unknown>) => {
    setError(null);
    work().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  };
  const commit = (updates: Record<string, unknown>, verb: string) =>
    run(() => commitTrackerUpdates(resolver, item, updates, verb, onPending).then(onChanged));
  const clear = { agentProposal: null };

  let lead: ReactNode;
  let note: string | null = null;
  const actions: Array<{ label: string; negative?: boolean; onClick: () => void }> = [];
  if (proposal.kind === 'create') {
    lead = <span className="tracker-reference-proposal-who">{t('reference_card.proposed_by', { person: proposal.by })}</span>;
    actions.push({ label: t('reference_card.keep'), onClick: () => commit(clear, 'kept it') });
    // Delete is recoverable: archive when the host can, else the type's cancelled
    // status. With neither, there is no honest Delete to offer.
    const cancelled = cancelledStatus(statusOptions);
    const { archiveItem } = resolver;
    if (archiveItem) {
      actions.push({
        label: t('reference_card.delete'),
        negative: true,
        onClick: () => run(async () => {
          await archiveItem(item.id, true);
          onDeleted({ restore: () => archiveItem(item.id, false) });
        }),
      });
    } else if (cancelled) {
      actions.push({
        label: t('reference_card.delete'),
        negative: true,
        onClick: () => run(async () => {
          const change = await commitTrackerUpdates(resolver, item, { status: cancelled, ...clear }, 'deleted it', onPending);
          onDeleted({ restore: () => resolver.updateItem!(item.id, change.previous) });
        }),
      });
    }
  } else {
    const toStatus = proposal.toStatus!;
    const toTone = stateTone(item.type, statusOptions.find((option) => option.value === toStatus) ?? { value: toStatus });
    lead = (
      <>
        <span className="tracker-reference-proposal-who">{proposal.by} {t('reference_card.proposes')}</span>{' '}
        {labelFor(item.status)} <span className="tracker-reference-proposal-why">{'->'}</span>{' '}
        <span className="tracker-state-word" data-tone={toTone}>{labelFor(toStatus)}</span>
      </>
    );
    // Apply runs only what the menu would offer. A transition that asks for a
    // field opens that prompt, prefilled from the reason, for a person to confirm.
    const transition = transitionForProposal(transitions, toStatus);
    if (!transition) {
      note = t('reference_card.not_applicable');
    } else {
      actions.push({
        label: t('reference_card.apply'),
        onClick: () => (transition.prompt
          ? onRequest({ transitionId: transition.id, input: proposal.reason ?? '', extra: clear })
          : run(() => runStateTransition(resolver, item, transition, { extra: clear, onPending }).then(onChanged))),
      });
    }
    actions.push({ label: t('reference_card.dismiss'), negative: true, onClick: () => commit(clear, 'dismissed the proposal') });
  }

  return (
    <div className="tracker-reference-proposal" data-kind={proposal.kind}>
      <div>
        {lead}
        {proposal.reason ? <span className="tracker-reference-proposal-why"> · {proposal.reason}</span> : null}
      </div>
      {note ? <div className="tracker-reference-proposal-why">{note}</div> : null}
      {editable ? (
        <div className="tracker-reference-proposal-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="tracker-reference-proposal-action"
              data-negative={action.negative ? 'true' : undefined}
              onMouseDown={keepFocus}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <div className="tracker-state-menu-error" role="alert">{t('reference_card.action_failed', { error })}</div> : null}
    </div>
  );
}

/**
 * Tracks the after-change note: the actor's own "You accepted just now ·
 * Undo", or someone else's change with a brief ring on the box.
 */
function useChangeNotes(resolver: TrackerReferenceResolver, item: TrackerItem) {
  const { t } = useTranslation('tracker');
  const [note, setNote] = useState<Note | null>(null);
  const [ring, setRing] = useState(false);
  const expectedStatus = useRef<string | null>(null);
  const lastStatus = useRef(item.status);

  // Registered before the write: the data source publishes the change before
  // the write resolves, and that echo must not read as someone else's.
  const onPending = useCallback((updates: Record<string, unknown>) => {
    if (typeof updates.status === 'string') expectedStatus.current = updates.status;
  }, []);

  const onChanged = useCallback((change: TrackerStateChange) => {
    setNote({ kind: 'mine', change });
  }, []);

  useEffect(() => {
    if (lastStatus.current === item.status) return;
    lastStatus.current = item.status;
    if (expectedStatus.current === item.status) {
      expectedStatus.current = null;
      return;
    }
    const option = resolver.statusInfo(item);
    const who = item.lastModifiedBy?.displayName || t('reference_card.someone');
    setNote({ kind: 'theirs', text: t('reference_card.someone_changed', { person: who, status: option?.label ?? item.status }) });
    setRing(true);
  }, [item, resolver, t]);

  useEffect(() => {
    if (!ring) return;
    const timer = setTimeout(() => setRing(false), REMOTE_RING_MS);
    return () => clearTimeout(timer);
  }, [ring]);

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), RECENT_CHANGE_MS);
    return () => clearTimeout(timer);
  }, [note]);

  // Undo stays offered until the restore succeeds; a failure says why and keeps it.
  const undo = useCallback(async () => {
    if (note?.kind !== 'mine' || !resolver.updateItem) return;
    const { change } = note;
    onPending(change.previous);
    try {
      await resolver.updateItem(change.itemId, change.previous);
      setNote(null);
    } catch (cause) {
      setNote({ ...note, error: cause instanceof Error ? cause.message : String(cause) });
    }
  }, [note, onPending, resolver]);

  return { note, ring, onChanged, onPending, undo };
}

function UndoButton({ onUndo }: { onUndo: () => void }): JSX.Element {
  const { t } = useTranslation('tracker');
  return <button type="button" className="tracker-reference-card-undo" onMouseDown={keepFocus} onClick={onUndo}>{t('reference_card.undo')}</button>;
}

/** The one line a deleted proposal collapses to. */
function DeletedStub({ label, deletion, onRestored }: { label: string; deletion: Deletion | null; onRestored: () => void }): JSX.Element {
  const { t } = useTranslation('tracker');
  const [error, setError] = useState<string | null>(null);
  const restore = () => {
    if (!deletion) return;
    setError(null);
    deletion.restore().then(onRestored, (cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  };
  return (
    <div className="tracker-reference-card" data-state="deleted" data-border="bare">
      <div className="tracker-reference-card-meta">
        {t('reference_card.deleted', { label })}
        {deletion ? <>{' · '}<UndoButton onUndo={restore} /></> : null}
        {error ? <span className="tracker-state-menu-error" role="alert"> {t('reference_card.undo_failed', { error })}</span> : null}
      </div>
    </div>
  );
}

function ResolvedCard({ resolver, item, referenceKey }: { resolver: TrackerReferenceResolver; item: TrackerItem; referenceKey: string }): JSX.Element {
  const { t, i18n } = useTranslation('tracker');
  const typeInfo = resolver.typeInfo(item.type);
  const status = resolver.statusInfo(item);
  const normal = isNormalState(item.type, item.status);
  const tone = stateTone(item.type, status);
  const proposal = readAgentProposal(resolver.fieldValue(item, 'agentProposal'));
  const creating = proposal?.kind === 'create';
  const { note, ring, onChanged, onPending, undo } = useChangeNotes(resolver, item);
  const [request, setRequest] = useState<TrackerStateMenuRequest | null>(null);
  const [deletion, setDeletion] = useState<Deletion | null>(null);
  const clearRequest = useCallback(() => setRequest(null), []);

  if (deletion || item.archived) {
    return <DeletedStub label={displayKey(item, referenceKey)} deletion={deletion} onRestored={() => setDeletion(null)} />;
  }

  let meta: ReactNode = restingMeta(resolver, item, t, (value) => localizedShortDate(value, i18n.language === 'ja' ? 'ja-JP' : 'en-US'));
  if (note?.kind === 'mine') {
    meta = (
      <>
        {i18n.language === 'ja' ? t('reference_card.you_changed') : `You ${note.change.verb}`} <span className="tracker-reference-card-live">{t('reference_card.just_now')}</span>
        {resolver.updateItem ? <>{' · '}<UndoButton onUndo={() => void undo()} /></> : null}
        {note.error ? <span className="tracker-state-menu-error" role="alert"> {t('reference_card.undo_failed', { error: note.error })}</span> : null}
      </>
    );
  } else if (note?.kind === 'theirs') {
    meta = <>{note.text} <span className="tracker-reference-card-live">{t('reference_card.just_now')}</span></>;
  }

  return (
    <div
      className="tracker-reference-card"
      data-issue-key={referenceKey}
      data-state="resolved"
      data-type={item.type}
      data-tone={tone}
      data-border={creating ? 'agent' : boxBorder(tone, normal)}
      data-ring={ring ? 'true' : undefined}
    >
      <div className="tracker-reference-card-header">
        <span className="tracker-reference-card-kind">{typeInfo.displayName}</span>
        {(!normal || request) && status ? (
          <>
            <span className="tracker-reference-card-sep" aria-hidden="true">·</span>
            <TrackerStateMenu
              resolver={resolver}
              item={item}
              onChanged={onChanged}
              onPending={onPending}
              request={request}
              onRequestHandled={clearRequest}
              readOnly={creating}
            />
          </>
        ) : null}
        <span className="tracker-reference-card-key">{creating ? t('reference_card.not_created') : displayKey(item, referenceKey)}</span>
      </div>
      <div className="tracker-reference-card-title" {...openHandlers(resolver, item.id)}>
        {item.title || displayKey(item, referenceKey)}
      </div>
      <CardContent resolver={resolver} item={item} t={t} />
      {meta ? <div className="tracker-reference-card-meta">{meta}</div> : null}
      {proposal ? (
        <ProposalStrip
          resolver={resolver}
          item={item}
          proposal={proposal}
          onChanged={onChanged}
          onPending={onPending}
          onRequest={setRequest}
          onDeleted={setDeletion}
        />
      ) : null}
    </div>
  );
}

export function LiveCard({ resolver, referenceKey }: ResolverProps): JSX.Element {
  const { t } = useTranslation('tracker');
  const resolution = useTrackerReference(resolver, referenceKey);
  if (resolution.state !== 'resolved') {
    return (
      <div className="tracker-reference-card" data-issue-key={referenceKey} data-state={resolution.state} data-border="dashed">
        <div className="tracker-reference-card-empty">
          {resolution.state === 'loading' ? t('reference_card.loading', { key: referenceKey }) : t('reference_card.not_found', { key: referenceKey })}
        </div>
      </div>
    );
  }
  return <ResolvedCard resolver={resolver} item={resolution.item} referenceKey={referenceKey} />;
}
