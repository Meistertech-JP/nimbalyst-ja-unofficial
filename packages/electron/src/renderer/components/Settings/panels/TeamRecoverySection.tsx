import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import { TEAM_RECOVERY_PASSPHRASE_COMMANDS, type TeamRecoveryCommand, type TeamRecoveryOverview } from '../../../../shared/teamRecovery';

const buttonClass = 'rounded border border-[var(--nim-border)] px-3 py-1.5 text-xs text-[var(--nim-text)] disabled:cursor-not-allowed disabled:opacity-40';

export function TeamRecoverySection({ orgId }: { orgId: string }) {
  const { t } = useTranslation('orgSharing');
  const [open, setOpen] = useState(false);
  const [overview, setOverview] = useState<TeamRecoveryOverview | null>(null);
  const [busy, setBusy] = useState<TeamRecoveryCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const generation = useRef(0);
  const opened = useRef(false);
  const previousOrgId = useRef(orgId);
  useEffect(() => {
    // Initial state is already empty. Resetting on the first passive effect
    // can discard a click (and its response) made just after the panel mounts.
    if (previousOrgId.current !== orgId) {
      previousOrgId.current = orgId;
      setOpen(false); setOverview(null); setBusy(null); setError(null); setPassword(''); setReviewed(false);
    }
    return () => {
      generation.current++;
      // Main holds this organization's decrypted recovery content between steps.
      // Leaving the section, or switching organization, drops it; resuming
      // re-imports the saved bundle and the server keeps every checkpoint.
      if (opened.current) {
        opened.current = false;
        try { void Promise.resolve(window.electronAPI.team.recovery(orgId, 'release')).catch(() => undefined); } catch { /* Unmounting must not throw. */ }
      }
    };
  }, [orgId]);

  const run = async (command: TeamRecoveryCommand) => {
    const current = generation.current;
    opened.current = true;
    setBusy(command); setError(null);
    if (['inspect', 'collect', 'import', 'reset'].includes(command)) setReviewed(false);
    try {
      const response = await window.electronAPI.team.recovery(orgId, command, TEAM_RECOVERY_PASSPHRASE_COMMANDS.has(command) ? { password } : {});
      if (current !== generation.current) return;
      if (response.overview && response.overview.orgId !== orgId) throw new Error(t('team_recovery.organization_changed'));
      if (response.overview) setOverview(response.overview);
      if (!response.success || !response.overview) throw new Error(response.error || t('team_recovery.unavailable'));
      if (response.overview.orgId !== orgId) throw new Error(t('team_recovery.organization_changed'));
      setOverview(response.overview);
      if (response.overview.operation?.phase === 'completed') setPassword('');
    } catch (failure) {
      if (current === generation.current) setError(failure instanceof Error ? failure.message : t('team_recovery.request_failed'));
    } finally { if (current === generation.current) setBusy(null); }
  };
  const operation = overview?.operation;
  const complete = operation?.phase === 'completed';
  const validPassword = password.length >= 16 && password.length <= 1024;
  const restored = operation?.rooms.filter(room => room.restored).length ?? 0;
  const verified = operation?.rooms.filter(room => room.verified).length ?? 0;
  const phases = {
    resetting: t('team_recovery.phase_resetting'),
    fenced: t('team_recovery.phase_fenced'),
    restoring: t('team_recovery.phase_restoring'),
    validating: t('team_recovery.phase_validating'),
    releasing: t('team_recovery.phase_releasing'),
    completed: t('team_recovery.phase_completed'),
  };

  return <div className="team-recovery-section mt-4 border-t border-[var(--nim-border)] pt-3">
    {!open ? <button className={buttonClass} type="button" onClick={() => { setOpen(true); void run('status'); }}>{t('team_recovery.open')}</button> : <div className="space-y-3 select-text">
      <h4 className="m-0 text-sm font-semibold text-[var(--nim-text)]">{t('team_recovery.title')}</h4>
      <p className="m-0 text-xs text-[var(--nim-text-muted)]">{t('team_recovery.description')}</p>
      <p className="m-0 break-all text-xs text-[var(--nim-text-faint)]">{t('team_recovery.organization', { orgId })}</p>
      {error && <p role="alert" className="m-0 text-xs text-[var(--nim-warning)]">{error}</p>}
      {busy && <p role="status" className="m-0 text-xs text-[var(--nim-text-muted)]">{busy === 'restore' ? t('team_recovery.restoring') : busy === 'verify' ? t('team_recovery.verifying') : t('team_recovery.checking')}</p>}
      {complete ? <p role="status" className="m-0 text-xs text-[var(--nim-success)]">{t('team_recovery.complete')}</p> : <>
        {!operation && <div className="flex flex-wrap gap-2">
          <button className={buttonClass} type="button" disabled={!!busy} onClick={() => void run('inspect')}>{t('team_recovery.inspect')}</button>
          <button className={buttonClass} type="button" disabled={!!busy || !overview?.diagnostics} onClick={() => void run('collect')}>{t('team_recovery.collect')}</button>
        </div>}
        {overview && <p className="m-0 text-xs text-[var(--nim-text)]">{t('team_recovery.counts', overview.counts)}</p>}
        {!!overview?.blockers.length && <div className="rounded border border-[var(--nim-warning)] p-2">
          <p className="m-0 text-xs font-medium text-[var(--nim-warning)]">{t('team_recovery.blocked', { count: overview.blockers.length })}</p>
          <ul className="my-2 max-h-40 overflow-y-auto pl-4 text-xs text-[var(--nim-text-muted)]">{overview.blockers.map((blocker, index) => <li key={`${blocker.id}-${index}`}><span>{blocker.reason}</span><span className="ml-1 break-all text-[var(--nim-text-faint)]">({blocker.id})</span></li>)}</ul>
          <p className="m-0 text-xs text-[var(--nim-text-muted)]">{t('team_recovery.missing_sources')}</p>
        </div>}
        {!!overview?.notices?.length && <ul className="team-recovery-notices m-0 pl-4 text-xs text-[var(--nim-text-muted)]">{overview.notices.map(notice => <li key={notice.id}>{notice.reason}</li>)}</ul>}
        {!!overview?.identityAssignments.length && <details>
          <summary className="cursor-pointer text-xs text-[var(--nim-text)]">{t('team_recovery.review_assignments', { count: overview.identityAssignments.length })}</summary>
          <ul className="max-h-48 overflow-y-auto pl-4 text-xs text-[var(--nim-text-muted)]">{overview.identityAssignments.map(item => <li className="break-all" key={`${item.projectId}:${item.itemId}`}><strong>{item.issueKey ?? t('team_recovery.unassigned')}</strong> → {item.itemId} ({item.existing ? t('team_recovery.existing_item') : t('team_recovery.local_item')})</li>)}</ul>
        </details>}
        <label className="block text-xs text-[var(--nim-text-muted)]">{t('team_recovery.passphrase')}
          <input className="mt-1 block w-full rounded border border-[var(--nim-border)] bg-[var(--nim-bg-primary)] p-2 text-[var(--nim-text)]" type="password" autoComplete="off" minLength={16} maxLength={1024} value={password} disabled={!!busy} onChange={event => setPassword(event.target.value)} placeholder={t('team_recovery.passphrase_placeholder')} />
        </label>
        <div className="flex flex-wrap gap-2">
          {!operation && <button className={buttonClass} type="button" disabled={!!busy || !overview?.diagnostics || !validPassword} onClick={() => void run('save')}>{t('team_recovery.save')}</button>}
          <button className={buttonClass} type="button" disabled={!!busy || !validPassword} onClick={() => void run('import')}>{t('team_recovery.import')}</button>
          <button className={buttonClass} type="button" disabled={!!busy} onClick={() => void run('status')}>{t('team_recovery.refresh')}</button>
          <button className={buttonClass} type="button" disabled={!!busy} onClick={() => void run('export-diagnostics')}>{t('team_recovery.export_diagnostics')}</button>
        </div>
        {overview?.saved && <p className="m-0 text-xs text-[var(--nim-success)]">{t('team_recovery.saved', { name: overview.artifactName ?? '' })}</p>}
        {!operation && overview && <>
          <p className="m-0 text-xs text-[var(--nim-text-muted)]">{t('team_recovery.start_description')}</p>
          <label className="flex items-start gap-2 text-xs text-[var(--nim-text)]"><input type="checkbox" checked={reviewed} disabled={!!busy || !overview.ready || !overview.saved} onChange={event => setReviewed(event.target.checked)} />{t('team_recovery.review_confirmation')}</label>
          <button className={buttonClass} type="button" disabled={!!busy || !overview.ready || !overview.saved || !reviewed || !validPassword} onClick={() => void run('restore')}>{t('team_recovery.start')}</button>
        </>}
        {operation && <>
          <p className="m-0 text-xs text-[var(--nim-text)]">{t('team_recovery.progress', { phase: phases[operation.phase], restored, verified, total: operation.rooms.length })}</p>
          <p className="m-0 text-xs text-[var(--nim-text-muted)]">{t('team_recovery.paused')}</p>
          {['fenced', 'restoring', 'resetting'].includes(operation.phase) && !operation.rooms.some(room => room.restored) && <div>
            <button className={buttonClass} type="button" disabled={!!busy} onClick={() => void run('reset')}>{t('team_recovery.reset')}</button>
            <p className="m-0 text-xs text-[var(--nim-text-muted)]">{t('team_recovery.reset_description')}</p>
          </div>}
          {['fenced', 'restoring'].includes(operation.phase) ? <button className={buttonClass} type="button" disabled={!!busy || !overview?.saved || !validPassword} onClick={() => void run('restore')}>{t('team_recovery.resume')}</button>
            : operation.phase === 'resetting' ? null : overview?.independentClient ? <button className={buttonClass} type="button" disabled={!!busy || !overview.saved || !validPassword} onClick={() => void run('verify')}>{t('team_recovery.verify')}</button>
              : <p className="m-0 text-xs text-[var(--nim-warning)]">{t('team_recovery.second_device')}</p>}
        </>}
      </>}
    </div>}
  </div>;
}
