/**
 * Storage retention controls: how much tool output to keep at full fidelity,
 * and how many backup generations to hold.
 *
 * Before this existed, backups were a hardcoded rolling-3 every 4 hours with
 * no user control, so a 4.6 GiB database silently occupied 18.5 GiB on disk
 * (#1248). Tool output is the other half: on a real install it was 87% of the
 * message table, against 5.5% for user prompts and agent text combined.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';

interface MaintenanceSettings {
  backupCopiesKept: number;
  backupIntervalHours: number;
  toolOutputRetentionDays: number;
}

interface RetentionEstimate {
  candidateRows: number;
  estimatedBytesSaved: number;
  sampledRows: number;
  /** `sampledRows / candidateRows`. Always small; shown rather than hidden. */
  sampleCoverage: number;
  /** Independent points in the id range the sample was drawn from. */
  probesTaken: number;
  lowConfidence: boolean;
  /** Structured caveat, localized by this renderer. */
  note?: RetentionEstimateNote;
}

type RetentionEstimateNote =
  | { kind: 'no_eligible_rows' }
  | { kind: 'sample_empty'; candidateRows: number }
  | { kind: 'sample_floor'; sampledRows: number; coveragePct: string; candidateRows: number; probesTaken: number }
  | { kind: 'thin_sample'; sampledRows: number; coveragePct: string; candidateRows: number };

interface RetentionRunResult {
  scanned: number;
  rewritten: number;
  bytesSaved: number;
  stoppedEarly: boolean;
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const RETENTION_CHOICES = [30, 90, 180];

const COPIES_CHOICES = [1, 2, 3];

const INTERVAL_CHOICES = [
  { value: 0, key: 'on_quit_only' },
  { value: 4, key: 'every_hours', count: 4 },
  { value: 12, key: 'every_hours', count: 12 },
  { value: 24, key: 'daily' },
];

type StorageRetentionErrorKey =
  | 'database.storage_retention.read_settings_failed'
  | 'database.storage_retention.save_settings_failed'
  | 'database.storage_retention.estimate_failed'
  | 'database.reclaim_failed';

type StorageRetentionError =
  | { kind: 'translation'; key: StorageRetentionErrorKey }
  | { kind: 'message'; message: string };

const selectClass =
  'text-xs bg-nim-primary border border-[var(--nim-border)] rounded px-2 py-1 text-[var(--nim-text)]';

export function StorageRetentionCard() {
  const { t } = useTranslation('common');
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
  const [estimate, setEstimate] = useState<RetentionEstimate | null>(null);
  const [result, setResult] = useState<RetentionRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<StorageRetentionError | null>(null);
  const [pendingDays, setPendingDays] = useState(30);
  const estimateNoteText = (() => {
    const note = estimate?.note;
    if (!note) return null;
    switch (note.kind) {
      case 'no_eligible_rows':
        return t('database.storage_retention.estimate_no_eligible_rows');
      case 'sample_empty':
        return t('database.storage_retention.estimate_sample_empty', {
          candidateRows: note.candidateRows.toLocaleString(),
        });
      case 'sample_floor':
        return t('database.storage_retention.estimate_sample_floor', {
          sampledRows: note.sampledRows.toLocaleString(),
          coveragePct: note.coveragePct,
          candidateRows: note.candidateRows.toLocaleString(),
          probesTaken: note.probesTaken.toLocaleString(),
        });
      case 'thin_sample':
        return t('database.storage_retention.estimate_thin_sample', {
          sampledRows: note.sampledRows.toLocaleString(),
          coveragePct: note.coveragePct,
          candidateRows: note.candidateRows.toLocaleString(),
        });
    }
  })();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // A rejected invoke here must surface as the card's error state, not an
      // unhandled rejection that takes out whatever else is mounted.
      try {
        const res = await window.electronAPI.invoke('database:maintenance:get');
        if (cancelled) return;
        if (res.success) {
          setSettings(res.settings);
          if (res.settings.toolOutputRetentionDays > 0) {
            setPendingDays(res.settings.toolOutputRetentionDays);
          }
        } else {
          setError(res.error
            ? { kind: 'message', message: res.error }
            : { kind: 'translation', key: 'database.storage_retention.read_settings_failed' });
        }
      } catch (err) {
        if (!cancelled) setError({ kind: 'message', message: String(err) });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const patch = async (next: Partial<MaintenanceSettings>) => {
    setError(null);
    try {
      const res = await window.electronAPI.invoke('database:maintenance:set', next);
      if (res.success) setSettings(res.settings);
      else setError(res.error
        ? { kind: 'message', message: res.error }
        : { kind: 'translation', key: 'database.storage_retention.save_settings_failed' });
    } catch (err) {
      setError({ kind: 'message', message: String(err) });
    }
  };

  const runEstimate = async () => {
    setError(null);
    setResult(null);
    try {
      const res = await window.electronAPI.invoke('database:toolRetention:estimate', {
        retentionDays: pendingDays,
      });
      if (res.success) setEstimate(res.estimate);
      else setError(res.error
        ? { kind: 'message', message: res.error }
        : { kind: 'translation', key: 'database.storage_retention.estimate_failed' });
    } catch (err) {
      setError({ kind: 'message', message: String(err) });
    }
  };

  const runPass = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await window.electronAPI.invoke('database:toolRetention:run', {
        retentionDays: pendingDays,
      });
      if (res.success) setResult(res.result);
      else setError(res.error
        ? { kind: 'message', message: res.error }
        : { kind: 'translation', key: 'database.reclaim_failed' });
    } catch (err) {
      setError({ kind: 'message', message: String(err) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border border-[var(--nim-border)] bg-nim-secondary storage-retention-card">
      <div className="text-sm font-semibold mb-1">{t('database.storage_retention.title')}</div>
      <div className="text-xs text-[var(--nim-text-muted)] mb-3">
        {t('database.storage_retention.description')}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between gap-3">
          <span className="text-xs">{t('database.storage_retention.cleanup_older_than')}</span>
          <select
            className={selectClass}
            value={pendingDays}
            onChange={(e) => setPendingDays(Number(e.target.value))}
          >
            {RETENTION_CHOICES.map((days) => (
              <option key={days} value={days}>{t('database.storage_retention.days', { count: days })}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs px-2 py-1 rounded border border-[var(--nim-border)] hover:bg-nim-hover"
            onClick={runEstimate}
            disabled={running}
          >
            {t('database.storage_retention.estimate_savings')}
          </button>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded border border-[var(--nim-border)] hover:bg-nim-hover"
            onClick={runPass}
            disabled={running}
          >
            {running ? t('database.storage_retention.reclaiming') : t('database.storage_retention.discard_older_output')}
          </button>
        </div>

        {/* A bare "0 B" reads as "your database is already clean" when what it
            often means is "the sample missed it". Always show what the estimate
            actually looked at, and surface its own caveat when it has one. */}
        {estimate && (
          <div className="text-xs text-[var(--nim-text-muted)] retention-estimate">
            {estimate.estimatedBytesSaved > 0 ? (
              <>
                {t('database.storage_retention.estimated_savings', {
                  bytes: formatBytes(estimate.estimatedBytesSaved),
                  count: estimate.candidateRows.toLocaleString(),
                })}
              </>
            ) : (
              <>{t('database.storage_retention.no_reclaimable_output')}</>
            )}{' '}
            <span className="opacity-75">
              {t('database.storage_retention.sampled_candidates', {
                sampled: estimate.sampledRows.toLocaleString(),
                count: estimate.candidateRows.toLocaleString(),
              })}
              {estimate.probesTaken > 0
                ? ` ${t('database.storage_retention.from_sample_points', { count: estimate.probesTaken.toLocaleString() })}`
                : ''}
              .
            </span>
            {estimateNoteText && (
              <div
                className={
                  estimate.lowConfidence
                    ? 'mt-1 text-[var(--nim-warning)] retention-estimate-note'
                    : 'mt-1 retention-estimate-note'
                }
              >
                {estimateNoteText}
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="text-xs text-[var(--nim-text-muted)]">
            {t('database.storage_retention.reclaimed_result', {
              bytes: formatBytes(result.bytesSaved),
              rewritten: result.rewritten.toLocaleString(),
              scanned: result.scanned.toLocaleString(),
            })}
            {result.stoppedEarly ? ` (${t('database.storage_retention.stopped_early')})` : ''}. {t('database.storage_retention.vacuum_hint')}
          </div>
        )}

        <hr className="border-[var(--nim-border)]" />

        <div className="text-xs text-[var(--nim-text-muted)]">
          {t('database.storage_retention.backup_copy_hint')}
        </div>

        <label className="flex items-center justify-between gap-3">
          <span className="text-xs">{t('database.storage_retention.backup_copies_kept')}</span>
          <select
            className={selectClass}
            value={settings?.backupCopiesKept ?? 2}
            onChange={(e) => void patch({ backupCopiesKept: Number(e.target.value) })}
          >
            {COPIES_CHOICES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-xs">{t('database.storage_retention.back_up')}</span>
          <select
            className={selectClass}
            value={settings?.backupIntervalHours ?? 12}
            onChange={(e) => void patch({ backupIntervalHours: Number(e.target.value) })}
          >
            {INTERVAL_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>{t(`database.storage_retention.${c.key}`, { count: c.count })}</option>
            ))}
          </select>
        </label>

        <div className="text-xs text-[var(--nim-text-muted)]">
          {t('database.storage_retention.restart_hint')}
        </div>
      </div>

      {error && (
        <div className="text-xs text-[var(--nim-error)] mt-2">
          {error.kind === 'translation' ? t(error.key) : error.message}
        </div>
      )}
    </div>
  );
}
