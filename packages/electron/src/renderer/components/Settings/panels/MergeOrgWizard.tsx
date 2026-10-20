import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialSymbol } from '@nimbalyst/runtime';
import { bucketMemberCount, bucketProjectCount, categorizeTeamAnalyticsError } from '../../../../shared/analytics/teamAnalytics';
import { trackTeamAnalyticsEvent } from '../../../utils/teamAnalytics';

/**
 * Epic H3 P4 — "Merge into another org" wizard.
 *
 * Merge moves EVERY project of this (drained) org into a survivor org, unions
 * the rosters (higher role wins), and optionally deletes the drained org. It is
 * the most destructive consolidation action, so it requires a typed confirmation
 * of the drained org's name. Gated server-side on server-managed custody (both
 * orgs) and admin on both.
 */

interface MergeResultSummary {
  movedProjects: Array<{ projectId: string; destTeamProjectId: string }>;
  rosterElevated: number;
  rosterToInvite: number;
  drainedDeleted: boolean;
  partial: boolean;
  failedProjectId?: string;
  error?: string;
}

interface MergeOrgWizardProps {
  drainedOrg: { orgId: string; name: string };
  /** Survivor candidates — orgs the caller owns/admins (drained filtered out). */
  survivorCandidates: { orgId: string; name: string }[];
  /** Counts for the summary (read from already-loaded org state). */
  projectCount: number;
  memberCount: number;
  onClose: () => void;
  onMerged: (result: MergeResultSummary) => void;
}

type Step = 'configure' | 'running' | 'done';

export function MergeOrgWizard({ drainedOrg, survivorCandidates, projectCount, memberCount, onClose, onMerged }: MergeOrgWizardProps) {
  const { t } = useTranslation(['dialogs']);
  const candidates = survivorCandidates.filter(o => o.orgId !== drainedOrg.orgId);
  const [step, setStep] = useState<Step>('configure');
  const [survivorOrgId, setSurvivorOrgId] = useState<string | null>(null);
  const [deleteDrained, setDeleteDrained] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MergeResultSummary | null>(null);

  const survivorName = candidates.find(o => o.orgId === survivorOrgId)?.name ?? '';
  const confirmOk = !!survivorOrgId && confirmText.trim() === drainedOrg.name.trim() && drainedOrg.name.length > 0;

  const runMerge = async () => {
    if (!survivorOrgId) return;
    setStep('running');
    setError(null);
    try {
      const res = await (window as any).electronAPI.team.mergeOrg(drainedOrg.orgId, survivorOrgId, deleteDrained);
      if (res?.success && res.result) {
        const r = res.result as MergeResultSummary;
        trackTeamAnalyticsEvent('team_organization_merged', {
          surface: 'desktop',
          callerRole: 'admin',
          movedProjectCountBucket: bucketProjectCount(r.movedProjects.length),
          mergedMemberCountBucket: bucketMemberCount(memberCount),
        });
        setResult(r);
        setStep('done');
        onMerged(r);
      } else {
        trackTeamAnalyticsEvent('team_operation_failed', {
          surface: 'desktop',
          operation: 'merge_organization',
          entryPoint: 'organization_manager',
          callerRole: 'admin',
          errorCategory: categorizeTeamAnalyticsError('organization', res?.error),
        });
        setError(res?.error || t('dialogs:merge_org.error'));
        setStep('configure');
      }
    } catch (err) {
      trackTeamAnalyticsEvent('team_operation_failed', {
        surface: 'desktop',
        operation: 'merge_organization',
        entryPoint: 'organization_manager',
        callerRole: 'admin',
        errorCategory: categorizeTeamAnalyticsError('organization', err),
      });
      setError(err instanceof Error ? err.message : String(err));
      setStep('configure');
    }
  };

  return (
    <div
      className="merge-org-wizard-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"
      onClick={step === 'running' ? undefined : onClose}
      data-testid="merge-org-wizard-overlay"
    >
      <div
        className="merge-org-wizard bg-[var(--nim-bg)] rounded-xl p-6 max-w-[520px] w-full max-h-[85vh] overflow-y-auto relative shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
        data-testid="merge-org-wizard"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[16px] font-semibold text-[var(--nim-text)] flex items-center gap-2">
            <MaterialSymbol icon="merge" size={20} className="text-[var(--nim-primary)]" />
            {t('dialogs:merge_org.title')}
          </h3>
          {step !== 'running' && (
            <button className="text-[var(--nim-text-faint)] hover:text-[var(--nim-text)]" onClick={onClose} aria-label={t('dialogs:merge_org.close')} data-testid="merge-org-close">
              <MaterialSymbol icon="close" size={20} />
            </button>
          )}
        </div>
        <p className="text-[12px] text-[var(--nim-text-muted)] mb-4">
          {t('dialogs:merge_org.description', { name: drainedOrg.name, projects: projectCount, members: memberCount })}
        </p>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-md bg-[var(--nim-error-bg,rgba(220,38,38,0.12))] text-[12px] text-[var(--nim-error,#dc2626)]" data-testid="merge-org-error">
            {error}
          </div>
        )}

        {step === 'configure' && (
          <div data-testid="merge-org-configure">
            {candidates.length === 0 ? (
              <p className="text-[13px] text-[var(--nim-text-muted)]">
                {t('dialogs:merge_org.no_candidates')}
              </p>
            ) : (
              <>
                <label className="text-[12px] font-medium text-[var(--nim-text-muted)] block mb-1">{t('dialogs:merge_org.survivor')}</label>
                <div className="flex flex-col gap-1.5 mb-4">
                  {candidates.map(o => (
                    <button
                      key={o.orgId}
                      className={`text-left px-3.5 py-2.5 rounded-lg border transition-colors ${
                        survivorOrgId === o.orgId
                          ? 'border-[var(--nim-primary)] bg-[var(--nim-primary-bg,rgba(99,102,241,0.1))]'
                          : 'border-[var(--nim-border)] hover:bg-[var(--nim-bg-secondary)]'
                      }`}
                      onClick={() => setSurvivorOrgId(o.orgId)}
                      data-testid={`merge-org-survivor-${o.orgId}`}
                    >
                      <span className="text-[13px] font-medium text-[var(--nim-text)]">{o.name}</span>
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-[12px] text-[var(--nim-text-muted)] mb-4 cursor-pointer">
                  <input type="checkbox" checked={deleteDrained} onChange={(e) => setDeleteDrained(e.target.checked)} data-testid="merge-org-delete-drained" />
                  {t('dialogs:merge_org.delete_after', { name: drainedOrg.name })}
                </label>

                <label className="text-[12px] text-[var(--nim-text-muted)] block mb-1">
                  {t('dialogs:merge_org.type_confirm', { name: drainedOrg.name })}
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] rounded-md bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] text-[var(--nim-text)]"
                  placeholder={drainedOrg.name}
                  data-testid="merge-org-confirm-input"
                />
              </>
            )}
          </div>
        )}

        {step === 'running' && (
          <div className="py-6 text-center text-[13px] text-[var(--nim-text-muted)]" data-testid="merge-org-running">
            <MaterialSymbol icon="progress_activity" size={28} className="text-[var(--nim-primary)] animate-spin" />
            <div className="mt-2">{t('dialogs:merge_org.progress')}</div>
            <div className="mt-1 text-[11px] text-[var(--nim-text-faint)]">{t('dialogs:merge_org.do_not_close')}</div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="py-4 text-[13px] text-[var(--nim-text)]" data-testid="merge-org-done">
            <div className={`flex items-center gap-2 font-medium mb-2 ${result.partial ? 'text-[var(--nim-warning,#d97706)]' : 'text-[var(--nim-success,#16a34a)]'}`}>
              <MaterialSymbol icon={result.partial ? 'warning' : 'check_circle'} size={20} />
              {result.partial ? t('dialogs:merge_org.partial_done') : t('dialogs:merge_org.merged_into', { name: survivorName })}
            </div>
            <ul className="text-[12px] text-[var(--nim-text-muted)] list-disc pl-5 space-y-0.5">
              <li>{t('dialogs:merge_org.projects_moved', { count: result.movedProjects.length })}</li>
              {result.rosterElevated > 0 && <li>{t('dialogs:merge_org.roles_elevated', { count: result.rosterElevated })}</li>}
              {result.rosterToInvite > 0 && <li>{t('dialogs:merge_org.members_invited', { count: result.rosterToInvite })}</li>}
              <li>{result.drainedDeleted ? t('dialogs:merge_org.org_deleted', { name: drainedOrg.name }) : t('dialogs:merge_org.org_kept', { name: drainedOrg.name })}</li>
              {result.partial && <li className="text-[var(--nim-warning,#d97706)]">{t('dialogs:merge_org.stopped', { project: result.failedProjectId, error: result.error })}</li>}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          {step === 'configure' && (
            <>
              <button className="px-3.5 py-2 text-[13px] rounded-md text-[var(--nim-text-muted)] hover:bg-[var(--nim-bg-secondary)]" onClick={onClose} data-testid="merge-org-cancel">
                {t('dialogs:merge_org.cancel')}
              </button>
              <button
                className="px-3.5 py-2 text-[13px] rounded-md bg-[var(--nim-error,#dc2626)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={runMerge}
                disabled={!confirmOk}
                data-testid="merge-org-run"
              >
                {t('dialogs:merge_org.merge')}
              </button>
            </>
          )}
          {step === 'done' && (
            <button className="px-3.5 py-2 text-[13px] rounded-md bg-[var(--nim-primary)] text-white" onClick={onClose} data-testid="merge-org-finish">
              {t('dialogs:merge_org.done')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
