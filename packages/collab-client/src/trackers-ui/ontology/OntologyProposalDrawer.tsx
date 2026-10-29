/**
 * The proposal drawer. Opened from a gap it shows what the request will ask an
 * agent to fix and writes it as an `ontology-proposal` request. Opened on a
 * proposal it shows each drafted change with the pages it touches and a
 * before/after, accept or reject per change, apply and undo. Every decision is
 * written back to the proposal, so a rejected change stays on record.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import { displayPartialWriteReason } from './partialWriteNotice';
import { displayGap, type GapDisplay } from './ontologyGapCopy';
import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import type { KnowledgeGraph } from './ontologyKnowledge';
import {
  decideChange,
  decisionOf,
  isLive,
  parseProposalChanges,
  parseUndoRecord,
  planOntologyChange,
  SCHEMA_CHANGE_TYPES,
  type ChangeDecision,
  type ChangePlan,
  type OntologyChange,
  type PlanEnv,
  type ProposalRequestDraft,
} from './ontologyProposals';
import { ontologyFieldValue, ontologyRecordTitle, type OntologyRecordLike } from './ontologyRecords';
import { applyAcceptedChanges, createProposalRequest, saveDecisions, undoAppliedChanges, type WriteContext } from './ontologyWriter';
import { proposalStatusLabel } from './OntologyRail';

export type DrawerTarget =
  | { kind: 'request'; draft: ProposalRequestDraft; detail: string; pages: readonly OntologyRecordLike[]; gapDisplay?: GapDisplay }
  | { kind: 'proposal'; id: string };

const PAGE_PREVIEW = 10;

function text(record: OntologyRecordLike, field: string): string {
  const value = ontologyFieldValue(record, field);
  return typeof value === 'string' ? value.trim() : '';
}

function PageLinks({ pages, onOpenItem, limit = PAGE_PREVIEW }: { pages: readonly OntologyRecordLike[]; onOpenItem?: (id: string) => void; limit?: number }) {
  const { t } = useTranslation('tracker');
  if (!pages.length) return null;
  const shown = pages.slice(0, limit);
  return (
    <div className="ontology-change-pages">
      {shown.map((page) => (onOpenItem
        ? <button key={page.id} type="button" className="ontology-link" onClick={() => onOpenItem(page.id)}>{ontologyRecordTitle(page)}</button>
        : <span key={page.id}>{ontologyRecordTitle(page)}</span>))}
      {pages.length > shown.length && <span className="ontology-empty">{t('ontology_proposals.more_pages', { count: pages.length - shown.length })}</span>}
    </div>
  );
}

export function OntologyProposalDrawer({ target, onClose, proposals, graph, env, context, onOpenItem, onOpenProposal }: {
  target: DrawerTarget;
  onClose: () => void;
  proposals: ReadonlyMap<string, OntologyRecordLike>;
  graph: KnowledgeGraph;
  env: PlanEnv;
  context: WriteContext | null;
  onOpenItem?: (itemId: string) => void;
  /** Switch the drawer to a proposal, e.g. the request just written. */
  onOpenProposal: (id: string) => void;
}) {
  const { t } = useTranslation('tracker');
  const { refs, context: floating } = useFloating({ open: true, onOpenChange: (open) => { if (!open) onClose(); } });
  const dismiss = useDismiss(floating, { outsidePressEvent: 'mousedown' });
  const role = useRole(floating, { role: 'dialog' });
  const { getFloatingProps } = useInteractions([dismiss, role]);
  const proposal = target.kind === 'proposal' ? proposals.get(target.id) ?? null : null;
  return (
    <FloatingPortal>
      <FloatingOverlay className="ontology-scrim" lockScroll>
        <FloatingFocusManager context={floating} initialFocus={-1}>
          <aside ref={refs.setFloating} className="ontology-drawer" aria-label={t('ontology_proposals.drawer_label')} {...getFloatingProps()}>
            {target.kind === 'request' ? (
              <RequestPanel target={target} context={context} onClose={onClose} onOpenItem={onOpenItem} onCreated={onOpenProposal} />
            ) : proposal ? (
              <ProposalPanel key={proposal.id} proposal={proposal} graph={graph} env={env} context={context} onClose={onClose} onOpenItem={onOpenItem} />
            ) : (
              <>
                <DrawerHead kicker={t('ontology_proposals.proposal_kicker')} title={t('ontology_proposals.waiting_title')} onClose={onClose} />
                <div className="ontology-drawer-body"><p className="ontology-empty">{t('ontology_proposals.waiting_body')}</p></div>
              </>
            )}
          </aside>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}

function DrawerHead({ kicker, title, reason, onClose }: { kicker: string; title: string; reason?: string; onClose: () => void }) {
  const { t } = useTranslation('common');
  return (
    <div className="ontology-drawer-head">
      <div className="ontology-drawer-kicker">
        <span>{kicker}</span>
        <button type="button" className="ontology-drawer-close" aria-label={t('close')} title={t('close')} onClick={onClose}>&#x2715;</button>
      </div>
      <h3>{title}</h3>
      {reason && <p>{reason}</p>}
    </div>
  );
}

function RequestPanel({ target, context, onClose, onOpenItem, onCreated }: {
  target: Extract<DrawerTarget, { kind: 'request' }>;
  context: WriteContext | null;
  onClose: () => void;
  onOpenItem?: (itemId: string) => void;
  onCreated: (id: string) => void;
}) {
  const { t, i18n } = useTranslation('tracker');
  const gapText = target.gapDisplay ? displayGap(target.gapDisplay, i18n.resolvedLanguage, (key, options) => t(key, options)) : null;
  const { t: tCommon } = useTranslation('common');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    if (!context) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createProposalRequest(context, target.draft, globalThis.crypto.randomUUID());
      onCreated(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  };
  return (
    <>
      <DrawerHead kicker={t('ontology_proposals.new_kicker')} title={gapText?.title ?? target.draft.title.replace(/^Improve: /, '')} reason={gapText?.detail ?? target.detail} onClose={onClose} />
      <div className="ontology-drawer-body">
        {target.pages.length > 0 && (
          <>
            <div className="ontology-label">{t(target.pages.length === 1 ? 'ontology_proposals.affects_one' : 'ontology_proposals.affects_other', { count: target.pages.length })}</div>
            <PageLinks pages={target.pages} onOpenItem={onOpenItem} />
          </>
        )}
        <div className="ontology-request">
          <span>{t('ontology_proposals.request_label')}</span>
          <pre>{target.draft.request}</pre>
        </div>
      </div>
      <div className="ontology-drawer-note">
        {t('ontology_proposals.request_note')}
      </div>
      <div className="ontology-drawer-foot">
        <span className="ontology-drawer-status">{context ? '' : t('ontology_proposals.read_only')}</span>
        <button type="button" className="ontology-button ontology-button-ghost" onClick={onClose}>{tCommon('cancel')}</button>
        <button type="button" className="ontology-button ontology-button-primary" disabled={!context || busy} onClick={() => { void send(); }}>
          {busy ? t('ontology_proposals.sending') : t('ontology_proposals.send_request')}
        </button>
        {error && <div className="ontology-drawer-error" role="alert">{error}</div>}
      </div>
    </>
  );
}

function ProposalPanel({ proposal, graph, env, context, onClose, onOpenItem }: {
  proposal: OntologyRecordLike;
  graph: KnowledgeGraph;
  env: PlanEnv;
  context: WriteContext | null;
  onClose: () => void;
  onOpenItem?: (itemId: string) => void;
}) {
  const { t } = useTranslation('tracker');
  const { t: tCommon } = useTranslation('common');
  const parsed = useMemo(() => parseProposalChanges(ontologyFieldValue(proposal, 'changes')), [proposal]);
  const plans = useMemo(() => new Map(parsed.changes.map((change) => [change.id, planOntologyChange(change, graph, env)])), [parsed, graph, env]);
  const undoRecord = useMemo(() => parseUndoRecord(ontologyFieldValue(proposal, 'undo')), [proposal]);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<'apply' | 'undo' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const status = text(proposal, 'status') || 'proposed';
  const request = text(proposal, 'request');
  const reason = text(proposal, 'reason');
  const ready = parsed.changes.filter((change) => decisionOf(change) === 'accepted' && !isLive(change) && !plans.get(change.id)?.blocked);
  const writes = ready.reduce((sum, change) => sum + (plans.get(change.id)?.ops.length ?? 0), 0);
  const canUndo = undoRecord.entries.some((entry) => !entry.undoneAt);
  const accepted = parsed.changes.filter((change) => decisionOf(change) === 'accepted').length;
  const rejected = parsed.changes.filter((change) => decisionOf(change) === 'rejected').length;
  const pending = parsed.changes.length - accepted - rejected;
  const statusLabel = status === 'proposed' ? t('ontology_proposals.status_proposed')
    : status === 'accepted' ? t('ontology_proposals.status_accepted')
    : status === 'applied' ? t('ontology_proposals.status_applied')
    : status === 'rejected' ? t('ontology_proposals.status_rejected')
    : status === 'undone' ? t('ontology_proposals.status_undone')
    : proposalStatusLabel(status);

  const run = async (work: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setMessage(await work());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };
  const decide = (change: OntologyChange, decision: ChangeDecision, rejectReason?: string) => context && run(async () => {
    await saveDecisions(context, proposal.id, decideChange(parsed.changes, change.id, decision, context.actor, context.now().toISOString(), rejectReason));
    return null;
  });
  const apply = () => context && run(async () => {
    const result = await applyAcceptedChanges(proposal, graph, env, context);
    if (result.error) throw new Error(t('ontology_proposals.apply_stopped', { error: result.error }));
    const applied = t(result.applied.length === 1 ? 'ontology_proposals.applied_one' : 'ontology_proposals.applied_other', { count: result.applied.length });
    const blocked = result.blocked.length ? ` ${t('ontology_proposals.blocked_suffix', { count: result.blocked.length })}` : '';
    return `${applied}${blocked}`;
  });
  const undo = () => context && run(async () => {
    const result = await undoAppliedChanges(proposal, context);
    if (result.error) throw new Error(t('ontology_proposals.undo_stopped', { error: result.error }));
    return t(result.undone.length === 1 ? 'ontology_proposals.undone_one' : 'ontology_proposals.undone_other', { count: result.undone.length });
  });

  return (
    <>
      <DrawerHead
        kicker={`${t('ontology_proposals.proposal_kicker')} · ${statusLabel}${proposal.issueKey ? ` · ${proposal.issueKey}` : ''}`}
        title={ontologyRecordTitle(proposal).replace(/^Improve: /, '')}
        reason={reason || undefined}
        onClose={onClose}
      />
      <div className="ontology-drawer-body">
        {parsed.changes.length === 0 && (
          <div className="ontology-request">
            <strong>{t('ontology_proposals.empty_waiting_title')}</strong>
            <div>{t('ontology_proposals.empty_waiting_body')}</div>
            {request && <pre>{request}</pre>}
          </div>
        )}
        {parsed.errors.length > 0 && (
          <ul className="ontology-drawer-error">{parsed.errors.map((line) => <li key={line}>{line}</li>)}</ul>
        )}
        {parsed.changes.map((change, index) => (
          <ChangeRow
            key={change.id}
            index={index}
            change={change}
            plan={plans.get(change.id)!}
            canDecide={Boolean(context) && !busy}
            onDecide={(decision, why) => { void decide(change, decision, why); }}
            onOpenItem={onOpenItem}
          />
        ))}
      </div>
      <div className="ontology-drawer-note">{t('ontology_proposals.proposal_note')}</div>
      <div className="ontology-drawer-foot">
        <span className="ontology-drawer-status">
          {!context ? t('ontology_proposals.read_only') : busy ? t('ontology_proposals.writing') : message ?? (parsed.changes.length === 0 ? '' : pending ? t('ontology_proposals.pending_count', { pending, total: parsed.changes.length }) : t('ontology_proposals.decisions_count', { accepted, rejected }))}
        </span>
        {confirming ? (
          <>
            <span className="ontology-drawer-status">
              {confirming === 'apply'
                ? ready.length === 1
                  ? writes === 1
                    ? t('ontology_proposals.confirm_apply_one_one')
                    : t('ontology_proposals.confirm_apply_one_other', { writes })
                  : writes === 1
                    ? t('ontology_proposals.confirm_apply_other_one', { changes: ready.length })
                    : t('ontology_proposals.confirm_apply_other_other', { changes: ready.length, writes })
                : t('ontology_proposals.confirm_undo')}
            </span>
            <button type="button" className="ontology-button ontology-button-ghost" disabled={busy} onClick={() => setConfirming(null)}>{tCommon('cancel')}</button>
            <button type="button" className="ontology-button ontology-button-primary" disabled={busy} onClick={() => { void (confirming === 'apply' ? apply() : undo()); }}>
              {confirming === 'apply' ? t('ontology_proposals.apply') : t('ontology_proposals.undo')}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="ontology-button ontology-button-ghost" onClick={onClose}>{tCommon('close')}</button>
            {canUndo && <button type="button" className="ontology-button" disabled={!context || busy} onClick={() => setConfirming('undo')}>{t('ontology_proposals.undo_applied')}</button>}
            {parsed.changes.length > 0 && (
              <button type="button" className="ontology-button ontology-button-primary" disabled={!context || busy || ready.length === 0} onClick={() => setConfirming('apply')}>
                {ready.length ? t(ready.length === 1 ? 'ontology_proposals.apply_one' : 'ontology_proposals.apply_other', { count: ready.length }) : t('ontology_proposals.apply')}
              </button>
            )}
          </>
        )}
        {error && <div className="ontology-drawer-error" role="alert">{error}</div>}
      </div>
    </>
  );
}

function ChangeRow({ index, change, plan, canDecide, onDecide, onOpenItem }: {
  index: number;
  change: OntologyChange;
  plan: ChangePlan;
  canDecide: boolean;
  onDecide: (decision: ChangeDecision, rejectReason?: string) => void;
  onOpenItem?: (itemId: string) => void;
}) {
  const { t } = useTranslation('tracker');
  const { t: tCommon } = useTranslation('common');
  const decision = decisionOf(change);
  const live = isLive(change);
  const schema = SCHEMA_CHANGE_TYPES.has(change.type);
  const [preview, setPreview] = useState(false);
  // Rejecting asks why, inline: the agent reads the reason before proposing again.
  const [rejecting, setRejecting] = useState<string | null>(null);
  const marker = live || decision === 'accepted' ? '✓' : decision === 'rejected' ? '✕' : String(index + 1);
  return (
    <div className="ontology-change" data-decision={live ? 'accepted' : decision}>
      <div className="ontology-change-top">
        <span className="ontology-change-no">{marker}</span>
        <div>
          <div className="ontology-change-title">{plan.summary}</div>
          <div className="ontology-change-meta">
            {schema ? t('ontology_proposals.schema_applied') : t(plan.pages.length === 1 ? 'ontology_proposals.affects_one' : 'ontology_proposals.affects_other', { count: plan.pages.length })}
            {plan.pages.length > 0 && <> · <button type="button" className="ontology-link" onClick={() => setPreview(!preview)}>{preview ? t('ontology_proposals.hide_pages') : t('ontology_proposals.preview_pages')}</button></>}
            {live && <> · {t('ontology_proposals.applied_status')}</>}
            {change.undoneAt && !live && <> · {t('ontology_proposals.undone_status')}</>}
          </div>
          {change.reason && <div className="ontology-change-meta">{displayPartialWriteReason(change, (key, options) => t(key, options))}</div>}
        </div>
      </div>
      {preview && <div className="ontology-change-indent"><PageLinks pages={plan.pages} onOpenItem={onOpenItem} limit={40} /></div>}
      {plan.example && (
        <div className="ontology-change-indent ontology-change-example">
          {plan.example.before.map((line, i) => <div key={`b${i}`} className="ontology-change-before">{t('ontology_proposals.before')}: {line.label}: {line.value}</div>)}
          {plan.example.after.map((line, i) => <div key={`a${i}`} className="ontology-change-after">{t('ontology_proposals.after')}: {line.label}: {line.value}</div>)}
        </div>
      )}
      {decision === 'accepted' && !live && plan.blocked && <div className="ontology-change-indent ontology-change-blocked">{plan.blocked}</div>}
      {decision === 'rejected' && change.rejectReason && <div className="ontology-change-indent ontology-change-meta">{t('ontology_proposals.rejected_reason', { reason: change.rejectReason })}</div>}
      {!live && (
        <div className="ontology-change-indent ontology-change-actions">
          {rejecting === null ? (
            <>
              <button
                type="button"
                className={`ontology-button ontology-button-sm${decision === 'accepted' ? ' ontology-button-accepted' : ''}`}
                aria-pressed={decision === 'accepted'}
                disabled={!canDecide}
                onClick={() => onDecide(decision === 'accepted' ? 'pending' : 'accepted')}
              >
                {t('ontology_proposals.accept')}
              </button>
              <button
                type="button"
                className={`ontology-button ontology-button-sm${decision === 'rejected' ? ' ontology-button-rejected' : ''}`}
                aria-pressed={decision === 'rejected'}
                disabled={!canDecide}
                onClick={() => (decision === 'rejected' ? onDecide('pending') : setRejecting(''))}
              >
                {t('ontology_proposals.reject')}
              </button>
            </>
          ) : (
            <form className="ontology-change-actions" onSubmit={(event) => { event.preventDefault(); onDecide('rejected', rejecting); setRejecting(null); }}>
              <input
                placeholder={t('ontology_proposals.reason_placeholder')}
                aria-label={t('ontology_proposals.reason_aria')}
                value={rejecting}
                onChange={(event) => setRejecting(event.target.value)}
                autoFocus
              />
              <button type="submit" className="ontology-button ontology-button-sm" disabled={!canDecide}>{t('ontology_proposals.reject')}</button>
              <button type="button" className="ontology-button ontology-button-sm ontology-button-ghost" onClick={() => setRejecting(null)}>{tCommon('cancel')}</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
