/**
 * DatabasePanel
 *
 * Settings → Database. Shows the current storage backend, lets alpha users
 * dry-run the PGLite → SQLite migration (zero-risk: never touches the live
 * database), and stages the eventual "Migrate" CTA.
 *
 * IPC contract (see packages/electron/src/main/ipc/MigrationHandlers.ts):
 *   - db:migration:get-status   -> { activeBackend, pgliteDirExists, sqliteDirExists, migratedDirs, runningDryRun }
 *   - db:migration:dry-run      -> { success, result: DryRunResult } | { success: false, error }
 *   - db:migration:start        -> kicks off real migration; gated behind translator work
 *   - db:migration:rollback     -> restores pglite-db/ from a preserved sibling
 *   - db:migration:progress/phase/complete/failed (events) -> live updates
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAtom } from 'jotai';
import { MaterialSymbol } from '@nimbalyst/runtime';
import {
  dbMigrationFailureAtom,
  dbMigrationPhaseAtom,
  dbMigrationProgressAtom,
  dbMigrationRunningAtom,
  dbMigrationSummaryAtom,
  type MigrationFailure,
  type MigrationPhaseEvent as PhaseEvent,
  type MigrationProgressEvent as ProgressEvent,
  type MigrationSummary,
} from '../../../store/atoms/dbMigration';

type Backend = 'pglite' | 'sqlite';

interface MigrationStatus {
  activeBackend: Backend;
  pgliteDirExists: boolean;
  sqliteDirExists: boolean;
  migratedDirs: string[];
  running: boolean;
  runningDryRun: boolean;
}

interface DryRunResult {
  summary: {
    tablesCopied: Array<{ name: string; rows: number }>;
    totalRowsCopied: number;
    durationMs: number;
    foreignKeyViolations: number;
    integrityCheck: string;
    spotCheckCount: number;
  };
  dryRunDir: string;
  sqliteFileBytes: number;
  pgliteDirBytes: number;
}

interface PreflightResult {
  ok: boolean;
  reason?: string;
  pgliteDirBytes: number;
  freeBytes: number;
  requiredBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(ms: number, t: TFunction): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return t('settings:database.duration_seconds', { seconds: (ms / 1000).toFixed(1) });
  const mins = Math.floor(ms / 60_000);
  const secs = ((ms % 60_000) / 1000).toFixed(0);
  return t('settings:database.duration_minutes_seconds', { minutes: mins, seconds: secs });
}

export function DatabasePanel(): React.ReactElement {
  const { t } = useTranslation(['settings']);
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [dryRunError, setDryRunError] = useState<string | null>(null);
  const [dryRunRunning, setDryRunRunning] = useState(false);
  // Migration progress lives in atoms fed by dbMigrationListeners, so it
  // survives the settings dialog being closed mid-run.
  const [phase, setPhase] = useAtom(dbMigrationPhaseAtom);
  const [progress, setProgress] = useAtom(dbMigrationProgressAtom);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [migrationRunning, setMigrationRunning] = useAtom(dbMigrationRunningAtom);
  const [migrationSummary, setMigrationSummary] = useAtom(dbMigrationSummaryAtom);
  const [migrationFailure, setMigrationFailure] = useAtom(dbMigrationFailureAtom);
  const [dryRunAvailable, setDryRunAvailable] = useState<{
    completedAt: string;
    totalRows: number;
  } | null>(null);
  const [adoptRunning, setAdoptRunning] = useState(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);
  const [adoptResult, setAdoptResult] = useState<{
    rowsAdded: number;
    durationMs: number;
  } | null>(null);

  const loadStatus = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const resp = (await window.electronAPI.invoke('db:migration:get-status')) as
        | (MigrationStatus & { success: true })
        | { success: false; error: string };
      if (!resp.success) {
        setStatusError(resp.error);
        return;
      }
      setStatusError(null);
      setStatus({
        activeBackend: resp.activeBackend,
        pgliteDirExists: resp.pgliteDirExists,
        sqliteDirExists: resp.sqliteDirExists,
        migratedDirs: resp.migratedDirs,
        running: resp.running,
        runningDryRun: resp.runningDryRun,
      });
    } catch (err) {
      setStatusError(String((err as Error).message ?? err));
    }

    // Detect whether a previous dry-run is sitting on disk and adoptable.
    try {
      const resp = (await window.electronAPI.invoke('db:migration:dry-run-status')) as
        | { success: true; available: false }
        | { success: true; available: true; completedAt: string; totalRows: number }
        | { success: false; error: string };
      if (resp.success && resp.available) {
        setDryRunAvailable({ completedAt: resp.completedAt, totalRows: resp.totalRows });
      } else {
        setDryRunAvailable(null);
      }
    } catch {
      setDryRunAvailable(null);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const startDryRun = useCallback(async () => {
    if (
      !window.electronAPI
      || dryRunRunning
      || status?.activeBackend !== 'pglite'
    ) return;
    setDryRunRunning(true);
    setDryRunError(null);
    setDryRunResult(null);
    setPhase(null);
    setProgress(null);
    try {
      const resp = (await window.electronAPI.invoke('db:migration:dry-run')) as
        | { success: true; result: DryRunResult }
        | { success: false; error: string };
      if (!resp.success) {
        setDryRunError(resp.error);
      } else {
        setDryRunResult(resp.result);
      }
    } catch (err) {
      setDryRunError(String((err as Error).message ?? err));
    } finally {
      setDryRunRunning(false);
      void loadStatus();
    }
  }, [dryRunRunning, loadStatus, status?.activeBackend]);

  const adoptDryRun = useCallback(async () => {
    if (!window.electronAPI || adoptRunning) return;
    const ageHrs = dryRunAvailable
      ? (Date.now() - new Date(dryRunAvailable.completedAt).getTime()) / 3_600_000
      : 0;
    const ageBlurb = ageHrs < 1
      ? t('settings:database.age_less_than_hour')
      : t('settings:database.age_about_hours', { count: Math.round(ageHrs) });
    const ok = window.confirm(
      t('settings:database.adopt_confirm', { age: ageBlurb }),
    );
    if (!ok) return;
    setAdoptRunning(true);
    setAdoptError(null);
    setAdoptResult(null);
    setPhase(null);
    setProgress(null);
    try {
      const resp = (await window.electronAPI.invoke('db:migration:adopt-dry-run')) as
        | { success: true; result: { rowsAdded: number; durationMs: number } }
        | { success: false; error: string };
      if (!resp.success) {
        setAdoptError(resp.error);
      } else {
        setAdoptResult({
          rowsAdded: resp.result.rowsAdded,
          durationMs: resp.result.durationMs,
        });
        setDryRunAvailable(null);
        setDryRunResult(null);
      }
    } catch (err) {
      setAdoptError(String((err as Error).message ?? err));
    } finally {
      setAdoptRunning(false);
      void loadStatus();
    }
  }, [adoptRunning, dryRunAvailable, loadStatus, t]);

  const rollback = useCallback(async () => {
    if (!window.electronAPI) return;
    if (!window.confirm(t('settings:database.rollback_confirm'))) {
      return;
    }
    const resp = (await window.electronAPI.invoke('db:migration:rollback')) as
      | { success: true; restoredFrom: string }
      | { success: false; error: string };
    if (!resp.success) {
      window.alert(t('settings:database.rollback_failed', { error: resp.error }));
    } else {
      window.alert(t('settings:database.rollback_success', { path: resp.restoredFrom }));
    }
    void loadStatus();
  }, [loadStatus, t]);

  const openMigrationModal = useCallback(async () => {
    if (!window.electronAPI) return;
    setShowMigrationModal(true);
    setPreflight(null);
    setPreflightError(null);
    setMigrationFailure(null);
    setMigrationSummary(null);
    setPhase(null);
    setProgress(null);
    try {
      const resp = (await window.electronAPI.invoke('db:migration:preflight')) as
        | ({ success: true } & PreflightResult)
        | { success: false; error: string };
      if (!resp.success) {
        setPreflightError(resp.error);
        return;
      }
      setPreflight(resp);
    } catch (err) {
      setPreflightError(String((err as Error).message ?? err));
    }
  }, []);

  const startMigration = useCallback(async () => {
    if (!window.electronAPI || migrationRunning || !preflight?.ok) return;
    setMigrationRunning(true);
    setMigrationFailure(null);
    setMigrationSummary(null);
    try {
      const resp = (await window.electronAPI.invoke('db:migration:start')) as
        | { success: true; summary: MigrationSummary }
        | { success: false; error: string };
      if (!resp.success) {
        setMigrationRunning(false);
        setMigrationFailure({ phase: phase?.phase ?? 'start', message: resp.error });
      } else {
        setMigrationSummary(resp.summary);
        setMigrationRunning(false);
        void loadStatus();
      }
    } catch (err) {
      setMigrationRunning(false);
      setMigrationFailure({
        phase: phase?.phase ?? 'start',
        message: String((err as Error).message ?? err),
      });
    }
  }, [loadStatus, migrationRunning, phase?.phase, preflight?.ok]);

  const copyDiagnosticInfo = useCallback(async () => {
    const diagnostic = JSON.stringify({
      preflight,
      phase,
      progress,
      failure: migrationFailure,
    }, null, 2);
    await navigator.clipboard.writeText(diagnostic);
  }, [migrationFailure, phase, preflight, progress]);

  const backendLabel = useMemo(() => {
    if (!status) return t('settings:database.loading');
    return status.activeBackend === 'pglite' ? t('settings:database.backend_pglite') : t('settings:database.backend_sqlite');
  }, [status, t]);

  return (
    <div className="provider-panel flex flex-col">
      <div className="provider-panel-header mb-6 pb-4 border-b border-[var(--nim-border)]">
        <h3 className="provider-panel-title text-xl font-semibold leading-tight mb-2 text-[var(--nim-text)]">
          {t('settings:database.title')}
        </h3>
        <p className="provider-panel-description text-sm leading-relaxed text-[var(--nim-text-muted)]">
          {t('settings:database.description')}
        </p>
      </div>

      {/* Current backend section ----------------------------------------- */}
      <div className="provider-panel-section mb-6">
        <h4 className="provider-panel-section-title text-base font-semibold mb-2 text-[var(--nim-text)]">
          {t('settings:database.active_backend')}
        </h4>
        {statusError ? (
          <div className="p-3 rounded-md bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] text-sm text-[var(--nim-text)]">
            {t('settings:database.status_failed', { error: statusError })}
          </div>
        ) : (
          <div className="setting-item py-2 flex items-center justify-between gap-4 nim-database-status">
            <div className="flex flex-col gap-0 min-w-0">
              <span className="setting-name text-sm font-medium text-[var(--nim-text)]">
                {backendLabel}
              </span>
              <span className="setting-description text-xs leading-snug text-[var(--nim-text-muted)]">
                {status?.pgliteDirExists && status?.sqliteDirExists
                  ? t('settings:database.status_both')
                  : status?.pgliteDirExists
                    ? t('settings:database.status_pglite_only')
                    : status?.sqliteDirExists
                      ? t('settings:database.status_sqlite_only')
                      : t('settings:database.status_none')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Dry run section ------------------------------------------------- */}
      {status?.activeBackend === 'pglite' && (
        <div className="provider-panel-section mb-6">
        <h4 className="provider-panel-section-title text-base font-semibold mb-2 text-[var(--nim-text)]">
          {t('settings:database.dry_run_title')}
        </h4>
        <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-3">
          {t('settings:database.dry_run_description')}
        </p>

          <button
            type="button"
            onClick={startDryRun}
            disabled={dryRunRunning}
            className="nim-database-dry-run-button setting-button inline-flex items-center gap-2 py-1.5 px-3 rounded-md text-sm font-medium bg-[var(--nim-primary)] text-white border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--nim-primary-hover)]"
          >
            <MaterialSymbol icon={dryRunRunning ? 'sync' : 'play_arrow'} size={16} />
            {dryRunRunning ? t('settings:database.running_dry_run') : t('settings:database.run_dry_run')}
          </button>

          {(dryRunRunning && (phase || progress)) && (
            <DryRunProgress phase={phase} progress={progress} />
          )}

          {dryRunError && (
            <div className="mt-3 p-3 rounded-md bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] text-sm text-[var(--nim-text)] nim-database-dry-run-error">
              {t('settings:database.dry_run_failed', { error: dryRunError })}
            </div>
          )}

          {dryRunResult && (
            <div className="mt-3 nim-database-dry-run-result">
              <DryRunResultCard result={dryRunResult} />
            </div>
          )}

          {dryRunAvailable && (
            <AdoptDryRunSection
              available={dryRunAvailable}
              running={adoptRunning}
              phase={phase}
              progress={progress}
              error={adoptError}
              result={adoptResult}
              onAdopt={() => { void adoptDryRun(); }}
            />
          )}
        </div>
      )}

      {/* Migrate (gated) section ----------------------------------------- */}
      {status?.activeBackend === 'pglite' && (
        <div className="provider-panel-section mb-6">
        <h4 className="provider-panel-section-title text-base font-semibold mb-2 text-[var(--nim-text)]">
          {t('settings:database.migrate_title')}
        </h4>
        <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-3">
          {t('settings:database.migrate_description_1')}{' '}
          <code className="px-1 py-0.5 rounded bg-[var(--nim-bg-tertiary)] text-xs">pglite-db.migrated-&lt;timestamp&gt;/</code>{' '}
          {t('settings:database.migrate_description_2')}
        </p>

          <button
            type="button"
            onClick={() => { void openMigrationModal(); }}
            className="setting-button inline-flex items-center gap-2 py-1.5 px-3 rounded-md text-sm font-medium bg-[var(--nim-primary)] text-white border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--nim-primary-hover)]"
          >
            <MaterialSymbol icon="upgrade" size={16} />
            {t('settings:database.migrate_title')}
          </button>
        </div>
      )}

      {status?.activeBackend === 'sqlite' && (
        <div className="provider-panel-section mb-6 nim-database-already-migrated">
          <h4 className="provider-panel-section-title text-base font-semibold mb-2 text-[var(--nim-text)]">
            {t('settings:database.migrated_title')}
          </h4>
          <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] flex items-start gap-2">
            <MaterialSymbol icon="check_circle" size={16} />
            <span>
              {t('settings:database.migrated_description')}
            </span>
          </p>
        </div>
      )}

      {/* Rollback section (only visible if a migrated dir exists) -------- */}
      {status && status.migratedDirs.length > 0 && (
        <div className="provider-panel-section mb-6">
          <h4 className="provider-panel-section-title text-base font-semibold mb-2 text-[var(--nim-text)]">
            {t('settings:database.restore_title')}
          </h4>
          <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-3">
            {t('settings:database.snapshots_hint', { count: status.migratedDirs.length })}
          </p>
          <button
            type="button"
            onClick={rollback}
            className="setting-button inline-flex items-center gap-2 py-1.5 px-3 rounded-md text-sm font-medium bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] border border-[var(--nim-border)] cursor-pointer hover:bg-[var(--nim-hover)]"
          >
            <MaterialSymbol icon="restore" size={16} />
            {t('settings:database.restore_cta')}
          </button>
        </div>
      )}

      {showMigrationModal && (
        <MigrationModal
          preflight={preflight}
          preflightError={preflightError}
          phase={phase}
          progress={progress}
          running={migrationRunning}
          summary={migrationSummary}
          failure={migrationFailure}
          onClose={() => {
            if (migrationRunning) return;
            setShowMigrationModal(false);
            void loadStatus();
          }}
          onStart={() => { void startMigration(); }}
          onCopyDiagnostic={() => { void copyDiagnosticInfo(); }}
        />
      )}
    </div>
  );
}

function DryRunResultCard({ result }: { result: DryRunResult }): React.ReactElement {
  const { t } = useTranslation(['settings']);
  const sizeChange = result.sqliteFileBytes - result.pgliteDirBytes;
  const sizeChangePct = result.pgliteDirBytes > 0
    ? ((sizeChange / result.pgliteDirBytes) * 100).toFixed(1)
    : '0';
  return (
    <div className="p-3 rounded-md bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)]">
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <Stat label={t('settings:database.rows_copied')} value={result.summary.totalRowsCopied.toLocaleString()} />
        <Stat label={t('settings:database.tables')} value={String(result.summary.tablesCopied.length)} />
        <Stat label={t('settings:database.duration')} value={formatDuration(result.summary.durationMs, t)} />
        <Stat label={t('settings:database.fk_violations')} value={String(result.summary.foreignKeyViolations)} ok={result.summary.foreignKeyViolations === 0} />
        <Stat label={t('settings:database.integrity')} value={result.summary.integrityCheck} ok={result.summary.integrityCheck === 'ok'} />
        <Stat
          label={t('settings:database.on_disk')}
          value={t('settings:database.size_comparison', {
            sqlite: formatBytes(result.sqliteFileBytes),
            pglite: formatBytes(result.pgliteDirBytes),
            change: `${sizeChange >= 0 ? '+' : ''}${sizeChangePct}`,
          })}
        />
      </div>

      <details className="mt-2 nim-database-dry-run-per-table">
        <summary className="cursor-pointer text-xs text-[var(--nim-text-muted)] hover:text-[var(--nim-text)]">
          {t('settings:database.per_table_breakdown', { count: result.summary.tablesCopied.length })}
        </summary>
        <table className="w-full mt-2 text-xs">
          <thead>
            <tr className="text-left text-[var(--nim-text-muted)] border-b border-[var(--nim-border)]">
              <th className="py-1 pr-2">{t('settings:database.panel.table_header')}</th>
              <th className="py-1 text-right">{t('settings:database.panel.rows_copied_header')}</th>
            </tr>
          </thead>
          <tbody>
            {result.summary.tablesCopied.map((t) => (
              <tr key={t.name} className="border-b border-[var(--nim-border)] last:border-b-0">
                <td className="py-1 pr-2 text-[var(--nim-text)] font-mono">{t.name}</td>
                <td className="py-1 text-right text-[var(--nim-text)]">{t.rows.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }): React.ReactElement {
  const colorClass = ok === false ? 'text-[var(--nim-error)]' : 'text-[var(--nim-text)]';
  return (
    <div className="flex flex-col gap-0">
      <span className="text-xs text-[var(--nim-text-muted)]">{label}</span>
      <span className={`text-sm font-medium ${colorClass}`}>{value}</span>
    </div>
  );
}

function MigrationModal(props: {
  preflight: PreflightResult | null;
  preflightError: string | null;
  phase: PhaseEvent | null;
  progress: ProgressEvent | null;
  running: boolean;
  summary: MigrationSummary | null;
  failure: MigrationFailure | null;
  onClose: () => void;
  onStart: () => void;
  onCopyDiagnostic: () => void;
}): React.ReactElement {
  const { t } = useTranslation(['settings']);
  const { preflight, preflightError, phase, progress, running, summary, failure, onClose, onStart, onCopyDiagnostic } = props;
  const currentTable = progress?.currentTable ?? progress?.table ?? t('settings:database.phase.preparing');
  const isVerifying = phase?.phase?.startsWith('verifying') ?? false;
  const isCutover = phase?.phase === 'finalizing';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-2xl rounded-xl border border-[var(--nim-border)] bg-[var(--nim-bg-primary)] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h4 className="text-lg font-semibold text-[var(--nim-text)]">{t('settings:database.panel.migrate_title')}</h4>
            <p className="mt-1 text-sm text-[var(--nim-text-muted)]">
              {t('settings:database.migration_warning')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="rounded-md px-2 py-1 text-sm text-[var(--nim-text-muted)] hover:bg-[var(--nim-bg-secondary)] disabled:opacity-40"
          >
            {t('settings:database.close')}
          </button>
        </div>

        {preflightError && (
          <div className="rounded-md border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.1)] p-3 text-sm text-[var(--nim-text)]">
            {t('settings:database.panel.preflight_failed_message', { error: preflightError })}
          </div>
        )}

        {!running && !summary && !failure && preflight && (
          <div className="space-y-4">
            <div className="rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-4 text-sm">
              <div className="mb-2 font-medium text-[var(--nim-text)]">{t('settings:database.panel.preflight_title')}</div>
              <div className="space-y-2 text-[var(--nim-text-muted)]">
                <div>{t('settings:database.panel.disk_space', {
                  free: formatBytes(preflight.freeBytes),
                  required: formatBytes(preflight.requiredBytes),
                  status: preflight.ok ? t('settings:database.panel.disk_space_ok') : t('settings:database.panel.disk_space_fail'),
                })}</div>
                <div>{t('settings:database.panel.pglite_size', { size: formatBytes(preflight.pgliteDirBytes) })}</div>
                {!preflight.ok && preflight.reason && <div className="text-[var(--nim-error)]">{preflight.reason}</div>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-md border border-[var(--nim-border)] px-3 py-2 text-sm text-[var(--nim-text)]">
                {t('settings:database.cancel')}
              </button>
              <button
                type="button"
                onClick={onStart}
                disabled={!preflight.ok}
                className="rounded-md bg-[var(--nim-primary)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {t('settings:database.start_migration')}
              </button>
            </div>
          </div>
        )}

        {running && (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-[var(--nim-text)]">
                {isCutover ? t('settings:database.switching_database') : isVerifying ? t('settings:database.verifying_migration') : t('settings:database.migrating_data')}
              </div>
              <div className="mt-1 text-sm text-[var(--nim-text-muted)]">
                {isCutover ? t('settings:database.preserve_and_switch') : isVerifying ? t('settings:database.phase_value', { phase: getPhaseLabel(t, phase?.phase ?? '') }) : t('settings:database.migration_progress_detail', { table: currentTable, copied: progress?.tableRowsCopied ?? 0, expected: progress?.tableRowsExpected ?? 0 })}
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--nim-bg-secondary)]">
                <div className="h-full bg-[var(--nim-primary)]" style={{ width: `${progress?.percentOfTotal ?? 0}%` }} />
              </div>
              <div className="flex justify-between text-xs text-[var(--nim-text-muted)]">
                <span>{t('settings:database.panel.tables_progress', {
                  done: progress?.tablesCompleted ?? 0,
                  total: progress?.tablesTotal ?? 0,
                })}</span>
                <span>{Math.round(progress?.percentOfTotal ?? 0)}%</span>
              </div>
              <div className="text-xs text-[var(--nim-text-muted)]">
                {t('settings:database.rows_elapsed', { rows: (progress?.totalRowsCopied ?? 0).toLocaleString(), elapsed: formatDuration(progress?.elapsedMs ?? 0, t) })}
              </div>
            </div>
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            <div className="rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-4">
              <div className="text-sm font-medium text-[var(--nim-text)]">{t('settings:database.panel.migration_complete')}</div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <Stat label={t('settings:database.rows_transferred')} value={summary.totalRowsCopied.toLocaleString()} />
                <Stat label={t('settings:database.tables_migrated')} value={String(summary.tablesCopied.length)} />
                <Stat label={t('settings:database.duration')} value={formatDuration(summary.durationMs, t)} />
                <Stat label={t('settings:database.integrity')} value={summary.integrityCheck} ok={summary.integrityCheck === 'ok'} />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="rounded-md bg-[var(--nim-primary)] px-3 py-2 text-sm font-medium text-white">
                {t('settings:database.continue')}
              </button>
            </div>
          </div>
        )}

        {failure && (
          <div className="space-y-4">
            <div className="rounded-md border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.1)] p-4 text-sm text-[var(--nim-text)]">
              <div className="font-medium">{t('settings:database.panel.migration_incomplete')}</div>
              <div className="mt-2">{t('settings:database.panel.failure_phase', { phase: getPhaseLabel(t, failure.phase) })}</div>
              <div className="mt-1">{failure.message}</div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onCopyDiagnostic} className="rounded-md border border-[var(--nim-border)] px-3 py-2 text-sm text-[var(--nim-text)]">
                {t('settings:database.copy_diagnostic')}
              </button>
              <button type="button" onClick={onClose} className="rounded-md bg-[var(--nim-primary)] px-3 py-2 text-sm font-medium text-white">
                {t('settings:database.continue_pglite')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getPhaseLabel(t: (k: string) => string, phaseKey: string): string {
  const key = phaseKey.replace(/-/g, '_');
  const translated = t(`settings:database.phase.${key}`);
  return translated && translated !== `settings:database.phase.${key}` ? translated : phaseKey;
}

function DryRunProgress({
  phase,
  progress,
}: {
    phase: PhaseEvent | null;
    progress: ProgressEvent | null;
  }): React.ReactElement {
    const { t } = useTranslation(['settings']);
    const phaseKey = phase?.phase ?? progress?.phase ?? 'preparing';
  const phaseLabel = getPhaseLabel(t, phaseKey);
  const currentTable = progress?.currentTable ?? phase?.info?.currentTable;
  const tableRowsCopied = progress?.tableRowsCopied ?? 0;
  const tableRowsExpected = progress?.tableRowsExpected ?? 0;
  const rowsCopied = progress?.rowsCopied ?? 0;
  const rowsExpected = progress?.rowsExpected ?? 0;
  const tablesCompleted = progress?.tablesCompleted ?? 0;
  const tablesTotal = progress?.tablesTotal ?? 0;
  const percent = progress?.percentOfTotal ?? 0;
  const elapsed = progress?.elapsedMs ?? 0;
  const isCopying = phaseKey === 'copying';

  return (
    <div className="mt-3 space-y-2 rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-3 text-xs nim-database-dry-run-progress">
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-medium text-[var(--nim-text)]">{phaseLabel}</div>
        {currentTable && (
          <div className="text-[var(--nim-text-muted)]">{currentTable}</div>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--nim-bg-primary)]">
        <div
          className="h-full bg-[var(--nim-primary)] transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[var(--nim-text-muted)]">
        <span>
          {t('settings:database.panel.tables_progress', { done: tablesCompleted, total: tablesTotal })}
        </span>
        <span>
          {rowsExpected > 0
            ? t('settings:database.panel.rows_with_total', { copied: rowsCopied.toLocaleString(), expected: rowsExpected.toLocaleString() })
            : t('settings:database.panel.rows_only', { copied: rowsCopied.toLocaleString() })}
        </span>
        <span>{t('settings:database.panel.elapsed', { duration: formatDuration(elapsed, t) })}</span>
      </div>
      {isCopying && tableRowsExpected > 0 && (
        <div className="text-[var(--nim-text-muted)]">
          {t('settings:database.this_table', { copied: tableRowsCopied.toLocaleString(), expected: tableRowsExpected.toLocaleString() })}
        </div>
      )}
    </div>
  );
}

function AdoptDryRunSection({
  available,
  running,
  phase,
  progress,
  error,
  result,
  onAdopt,
}: {
  available: { completedAt: string; totalRows: number };
  running: boolean;
  phase: PhaseEvent | null;
  progress: ProgressEvent | null;
  error: string | null;
  result: { rowsAdded: number; durationMs: number } | null;
    onAdopt: () => void;
  }): React.ReactElement {
  const { t } = useTranslation(['settings']);
  const ageHrs = (Date.now() - new Date(available.completedAt).getTime()) / 3_600_000;
  const ageBlurb = ageHrs < 1
    ? t('settings:database.age_less_than_hour_ago')
    : ageHrs < 24
      ? t('settings:database.age_hours_ago', { count: Math.round(ageHrs) })
      : t('settings:database.age_days_ago', { count: Math.round(ageHrs / 24) });
  return (
    <div className="mt-4 p-4 rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] nim-database-adopt-dry-run">
      <div className="text-sm font-medium text-[var(--nim-text)] mb-1">
        {t('settings:database.adopt_dry_run')}
      </div>
      <p className="text-xs text-[var(--nim-text-muted)] mb-3">
        {t('settings:database.adopt_description', { age: ageBlurb, rows: available.totalRows.toLocaleString() })}
      </p>
      <button
        type="button"
        onClick={onAdopt}
        disabled={running}
        className="setting-button inline-flex items-center gap-2 py-1.5 px-3 rounded-md text-sm font-medium bg-[var(--nim-primary)] text-white border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--nim-primary-hover)] nim-database-adopt-button"
      >
        <MaterialSymbol icon={running ? 'sync' : 'swap_horiz'} size={16} />
        {running ? t('settings:database.switching_copy') : t('settings:database.switch_to_copy')}
      </button>

      {running && (phase || progress) && (
        <DryRunProgress phase={phase} progress={progress} />
      )}

      {error && (
          <div className="mt-3 p-3 rounded-md bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] text-sm text-[var(--nim-text)]">
          {t('settings:database.switch_failed', { error: error })}
        </div>
      )}

      {result && (
          <div className="mt-3 p-3 rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg-primary)] text-sm text-[var(--nim-text)]">
          {t('settings:database.switch_success', { rows: result.rowsAdded.toLocaleString(), duration: formatDuration(result.durationMs, t) })}
        </div>
      )}
    </div>
  );
}
