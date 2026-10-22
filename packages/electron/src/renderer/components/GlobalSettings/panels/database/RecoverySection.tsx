/**
 * Settings > Database > databases set aside on this computer.
 *
 * The tone here is the feature. In #1347 a dialog told users with total
 * confidence that their database was corrupt and instructed them to delete it,
 * and 64 people in 30 days read that and acted on it. So this surface reports
 * what was found and what the product can and cannot conclude from it, and
 * nothing more:
 *
 *   - Only `recovery_recommended` is allowed to lead with a recommendation.
 *     `needs_review` is shown without claiming anything was lost, because a
 *     copy existing is evidence to look at, not proof of damage.
 *   - The confirmation names every copy the transaction will leave behind
 *     before the user can commit to it, and none of them is ever deleted by
 *     Nimbalyst.
 *   - Restore is one of three explicit actions, is not the default, and is
 *     inert until the user acknowledges what they just read.
 */

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import {
  dbRecoveryCandidatesAtom,
  dbRecoveryLiveAtom,
  dbRecoveryOfferAtom,
  type LiveDatabaseView,
  type RecoveryCandidateView,
  type RecoveryVerdict,
} from '../../../../store/atoms/dbMigration';
import { formatArtifactDate, formatBytes, sizeBucketLabel } from './dbFormat';

const VERDICT_KEYS: Record<RecoveryVerdict, string> = {
  recovery_recommended: 'verdict_recommended',
  needs_review: 'verdict_review',
  not_actionable: 'verdict_none',
  assessment_blocked: 'verdict_blocked',
};

/**
 * One sentence per reason code, each saying only what the assessment actually
 * established. None of these asserts that data was lost except
 * `live_empty_on_established_install`, which is the single code the assessment
 * will let become a recommendation.
 */
const REASON_KEYS: Record<string, string> = {
  candidate_missing: 'reason_candidate_missing',
  already_resolved: 'reason_already_resolved',
  candidate_empty: 'reason_candidate_empty',
  candidate_invalid: 'reason_candidate_invalid',
  candidate_not_materially_richer: 'reason_candidate_not_richer',
  candidate_unreadable: 'reason_candidate_unreadable',
  live_unreadable: 'reason_live_unreadable',
  facts_changed_while_reading: 'reason_facts_changed',
  both_databases_have_content: 'reason_both_have_content',
  live_empty_but_install_looks_new: 'reason_live_empty_new',
  live_empty_on_established_install: 'reason_live_empty_established',
};

function reasonText(code: string, t: (key: string) => string): string {
  const key = REASON_KEYS[code];
  return key ? t(`database.recovery.${key}`) : t('database.recovery.reason_unknown');
}

export interface RecoverySectionProps {
  /** Re-pull candidates, the live database, and migrated copies. */
  onRefresh: () => void;
}

type RestoreResult =
  | { ok: true; name: string }
  | { ok: false; name: string; message: string; rolledBack: boolean };

export function RecoverySection({ onRefresh }: RecoverySectionProps): React.ReactElement | null {
  const { t } = useTranslation('settings');
  const candidates = useAtomValue(dbRecoveryCandidatesAtom);
  const live = useAtomValue(dbRecoveryLiveAtom);
  const offer = useAtomValue(dbRecoveryOfferAtom);
  const [confirming, setConfirming] = useState<RecoveryCandidateView | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);

  const reveal = useCallback(async (name: string) => {
    await window.electronAPI?.invoke('db:recovery:reveal', { name });
  }, []);

  const markResolved = useCallback(async (name: string) => {
    await window.electronAPI?.invoke('db:recovery:mark-resolved', { name });
    onRefresh();
  }, [onRefresh]);

  const restore = useCallback(async (candidate: RecoveryCandidateView) => {
    if (!window.electronAPI) return;
    setRestoring(true);
    try {
      const resp = (await window.electronAPI.invoke('db:recovery:recover', {
        candidateId: candidate.id,
        // The fingerprint of the facts this row was rendered from. The
        // transaction re-gathers facts and refuses if they moved, so consent
        // is tied to what the user was actually shown.
        expectedFingerprint: candidate.factsFingerprint,
      })) as
        | {
            success: true;
            outcome:
              | { ok: true }
              | { ok: false; message: string; rolledBack: boolean };
          }
        | { success: false; error: string };
      if (!resp.success) {
        setResult({ ok: false, name: candidate.name, message: resp.error, rolledBack: false });
      } else if (resp.outcome.ok) {
        setResult({ ok: true, name: candidate.name });
      } else {
        setResult({
          ok: false,
          name: candidate.name,
          message: resp.outcome.message,
          rolledBack: resp.outcome.rolledBack,
        });
      }
    } catch (err) {
      setResult({
        ok: false,
        name: candidate.name,
        message: String((err as Error).message ?? err),
        rolledBack: false,
      });
    } finally {
      setRestoring(false);
      setConfirming(null);
      onRefresh();
    }
  }, [onRefresh]);

  if (candidates.length === 0) return null;

  return (
    <div className="provider-panel-section nim-database-recovery mb-6 select-text">
      <h4 className="provider-panel-section-title text-base font-semibold mb-2 text-[var(--nim-text)]">
        {t('database.recovery.title')}
      </h4>
      <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-3">
        {t('database.recovery.description')}
      </p>

      {offer && (
        <div className="nim-database-recovery-offer mb-3 rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-3">
          <div className="text-sm font-medium text-[var(--nim-text)]">
            {t('database.recovery.offer_title')}
          </div>
          <p className="mt-1 text-xs text-[var(--nim-text-muted)]">
            {reasonText(offer.reasonCode, t)} {t('database.recovery.offer_review')}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {candidates.map((candidate) => (
          <CandidateRow
            key={candidate.id}
            candidate={candidate}
            onReview={() => { setResult(null); setConfirming(candidate); }}
            onReveal={() => { void reveal(candidate.name); }}
            onKeep={() => { void markResolved(candidate.name); }}
          />
        ))}
      </div>

      {result && (
        <div
          className={`nim-database-recovery-result mt-3 rounded-md border p-3 text-sm text-[var(--nim-text)] ${
            result.ok
              ? 'border-[var(--nim-border)] bg-[var(--nim-bg-secondary)]'
              : 'border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.1)]'
          }`}
        >
          {result.ok ? (
            <>{t('database.recovery.restored', { name: result.name })}</>
          ) : (
            <>
              <div className="font-medium">{t('database.recovery.nothing_restored')}</div>
              <div className="mt-1">{result.message}</div>
              <div className="mt-1 text-[var(--nim-text-muted)]">
                {result.rolledBack
                  ? t('database.recovery.rolled_back')
                  : t('database.recovery.not_changed')}
              </div>
            </>
          )}
        </div>
      )}

      {confirming && live && (
        <RestoreConfirmation
          candidate={confirming}
          live={live}
          restoring={restoring}
          onCancel={() => setConfirming(null)}
          onReveal={() => { void reveal(confirming.name); }}
          onRestore={() => { void restore(confirming); }}
        />
      )}
    </div>
  );
}

function CandidateRow({
  candidate,
  onReview,
  onReveal,
  onKeep,
}: {
  candidate: RecoveryCandidateView;
  onReview: () => void;
  onReveal: () => void;
  onKeep: () => void;
}): React.ReactElement {
  const { t } = useTranslation('settings');
  const canReview = candidate.verdict === 'recovery_recommended'
    || candidate.verdict === 'needs_review';
  return (
    <div className="nim-database-recovery-candidate rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-medium text-[var(--nim-text)] font-mono">
          {candidate.name}
        </span>
        <span className="text-xs text-[var(--nim-text-muted)]">
          {t(`database.recovery.${VERDICT_KEYS[candidate.verdict]}`)}
        </span>
      </div>
      <div className="mt-1 text-xs text-[var(--nim-text-muted)]">
        {t('database.recovery.set_aside', { date: formatArtifactDate(candidate.createdAt), size: formatBytes(candidate.sizeBytes), sizeBucket: sizeBucketLabel(candidate.sizeBucket) })}
      </div>
      <p className="mt-2 text-sm text-[var(--nim-text)]">{reasonText(candidate.reasonCode, t)}</p>

      {!candidate.restoreAvailable && (
        <p className="mt-2 text-xs text-[var(--nim-text-muted)]">
          {t('database.recovery.cannot_restore_sqlite')}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {canReview && candidate.restoreAvailable && (
          <button
            type="button"
            onClick={onReview}
            className="nim-database-recovery-review-button setting-button inline-flex items-center gap-2 rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg-primary)] px-3 py-1.5 text-sm text-[var(--nim-text)] hover:bg-[var(--nim-hover)]"
          >
            <MaterialSymbol icon="restore" size={16} />
            {t('database.recovery.review_restore')}
          </button>
        )}
        <button
          type="button"
          onClick={onReveal}
          className="nim-database-recovery-reveal-button setting-button inline-flex items-center gap-2 rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg-primary)] px-3 py-1.5 text-sm text-[var(--nim-text)] hover:bg-[var(--nim-hover)]"
        >
          <MaterialSymbol icon="folder_open" size={16} />
          {t('database.recovery.show_finder')}
        </button>
        <button
          type="button"
          onClick={onKeep}
          className="nim-database-recovery-keep-button setting-button inline-flex items-center gap-2 rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg-primary)] px-3 py-1.5 text-sm text-[var(--nim-text)] hover:bg-[var(--nim-hover)]"
        >
          <MaterialSymbol icon="check" size={16} />
          {t('database.recovery.keep_stop_asking')}
        </button>
      </div>
    </div>
  );
}

/**
 * Everything the user needs before committing, in the order the plan asks for
 * it: which copy, how big and how old, what it displaces, and what is kept.
 *
 * The acknowledgement gate exists because the list above it is the whole point
 * of the screen. Without it the destructive action is reachable by one click on
 * the button the eye lands on, which is how the previous dialog worked.
 */
function RestoreConfirmation({
  candidate,
  live,
  restoring,
  onCancel,
  onReveal,
  onRestore,
}: {
  candidate: RecoveryCandidateView;
  live: LiveDatabaseView;
  restoring: boolean;
  onCancel: () => void;
  onReveal: () => void;
  onRestore: () => void;
}): React.ReactElement {
  const { t } = useTranslation('settings');
  const [acknowledged, setAcknowledged] = useState(false);
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/45 px-4">
      <div className="nim-database-restore-confirmation w-full max-w-2xl select-text rounded-xl border border-[var(--nim-border)] bg-[var(--nim-bg-primary)] p-6 shadow-2xl">
        <h4 className="text-lg font-semibold text-[var(--nim-text)]">
          {t('database.recovery.confirm_title')}
        </h4>
        <p className="mt-1 text-sm text-[var(--nim-text-muted)]">
          {t('database.recovery.confirm_description')}
        </p>

        <dl className="mt-4 space-y-3 rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-4 text-sm">
          <Fact label={t('database.recovery.copy_to_restore')}>
            <span className="font-mono">{candidate.name}</span>
            <br />
            {t('database.recovery.set_aside', { date: formatArtifactDate(candidate.createdAt), size: formatBytes(candidate.sizeBytes), sizeBucket: sizeBucketLabel(candidate.sizeBucket) })}
          </Fact>
          <Fact label={t('database.recovery.database_replaced')}>
            <span className="font-mono">{live.path}</span>
            <br />
            {formatBytes(live.sizeBytes)} ({sizeBucketLabel(live.sizeBucket)}) ·{' '}
            {t('database.recovery.currently_active', { backend: live.backend === 'pglite' ? 'PGLite' : 'SQLite' })}
          </Fact>
          <Fact label={t('database.recovery.kept_afterwards')}>
            <ul className="list-disc pl-5">
              <li>
                {t('database.recovery.copy_unchanged')}
              </li>
              <li>
                {t('database.recovery.snapshot_kept')}
              </li>
              <li>
                {t('database.recovery.displaced_kept')}
              </li>
            </ul>
          </Fact>
        </dl>

        <p className="mt-3 text-sm text-[var(--nim-text-muted)]">
          {t('database.recovery.restore_safety')}
        </p>

        <label className="nim-database-restore-acknowledge mt-4 flex items-start gap-2 text-sm text-[var(--nim-text)]">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            {t('database.recovery.ack_restore')}
          </span>
        </label>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={restoring}
            className="nim-database-restore-cancel-button rounded-md border border-[var(--nim-border)] px-3 py-2 text-sm text-[var(--nim-text)] disabled:opacity-40"
          >
            {t('database.cancel')}
          </button>
          <button
            type="button"
            onClick={onReveal}
            className="nim-database-restore-reveal-button rounded-md border border-[var(--nim-border)] px-3 py-2 text-sm text-[var(--nim-text)]"
          >
            {t('database.recovery.show_finder')}
          </button>
          <button
            type="button"
            onClick={onRestore}
            disabled={!acknowledged || restoring}
            className="nim-database-restore-confirm-button rounded-md bg-[var(--nim-primary)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {restoring ? t('database.recovery.restoring') : t('database.recovery.restore_from_copy')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <dt className="text-xs text-[var(--nim-text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-[var(--nim-text)]">{children}</dd>
    </div>
  );
}
