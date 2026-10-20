import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

interface TableStat {
  name: string;
  rowCount: number;
  size: string;
  sizeBytes: number;
}

interface BackupInfo {
  timestamp: string;
  size?: number;
  sizeBytes?: number;
  verified: boolean;
}

interface BackupStatus {
  currentBackup: BackupInfo | null;
  previousBackup: BackupInfo | null;
  oldestBackup: BackupInfo | null;
  lastBackupAttempt: string | null;
  lastSuccessfulBackup: string | null;
}

interface WalStats {
  backend?: 'pglite' | 'sqlite';
  autoCheckpointPages?: number;
  pageSizeBytes?: number;
  fileCount: number;
  totalBytes: number;
  totalSize: string;
  minWalSize: string;
  maxWalSize: string;
  checkpointTimeout: string;
  // Backend-specific blurb -- explains how WAL is trimmed for the active engine
  // (PGLite has no background checkpointer; SQLite auto-checkpoints by page).
  description?: string;
}

interface DashboardStats {
  tableStats: TableStat[];
  totalSize: string;
  totalSizeBytes: number;
  basicStats: {
    ai_sessions_count: string;
    history_count: string;
    database_size: string;
  };
  backupStatus: BackupStatus | null;
  walStats: WalStats | null;
}

interface Props {
  onTableSelect: (tableName: string) => void;
}

function formatBytes(bytes: number | null | undefined, t: TFunction): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return t('common:database.unknown');
  }
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getBackupSizeBytes(backup: BackupInfo): number | null {
  if (typeof backup.size === 'number' && Number.isFinite(backup.size)) {
    return backup.size;
  }
  if (typeof backup.sizeBytes === 'number' && Number.isFinite(backup.sizeBytes)) {
    return backup.sizeBytes;
  }
  return null;
}

// Parse a Postgres-style size string ("80MB", "1GB", "5kB") into bytes.
// Used to render the WAL progress bar against min/max bounds.
function parsePostgresSize(s: string | undefined): number {
  if (!s) return 0;
  const match = s.trim().match(/^(\d+(?:\.\d+)?)\s*(B|kB|MB|GB|TB)?$/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'B').toLowerCase();
  const multipliers: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 };
  return value * (multipliers[unit] ?? 1);
}

function formatRelativeTime(timestamp: string, t: TFunction): string {
  // Handle timestamps that were sanitized for file paths (dashes instead of colons)
  // e.g., "2024-01-15T10-30-45-123Z" -> "2024-01-15T10:30:45.123Z"
  let normalized = timestamp;
  const match = timestamp.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z?$/);
  if (match) {
    normalized = `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`;
  }

  const date = new Date(normalized);
  if (isNaN(date.getTime())) {
    return t('common:database.unknown');
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return t('common:database.just_now');
  if (diffMins < 60) return t(`common:database.minutes_ago_${diffMins === 1 ? 'one' : 'other'}`, { count: diffMins });
  if (diffHours < 24) return t(`common:database.hours_ago_${diffHours === 1 ? 'one' : 'other'}`, { count: diffHours });
  return t(`common:database.days_ago_${diffDays === 1 ? 'one' : 'other'}`, { count: diffDays });
}

interface ReclaimResult {
  scanned: number;
  rewritten: number;
  bytesSaved: number;
  vacuumed: boolean;
  vacuumError?: string;
  durationMs: number;
}

/**
 * One-time maintenance: rewrite bloated claude-code raw rows (the SDK's
 * tool_use_result original-file/patch sidecar + thinking signatures that nothing
 * reads) and optionally VACUUM to return the space to disk.
 */
function RawLogMaintenanceCard() {
  const { t } = useTranslation(['common']);
  const [candidateRows, setCandidateRows] = useState<number | null>(null);
  const [vacuum, setVacuum] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReclaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = async () => {
    setError(null);
    setResult(null);
    const res = await window.electronAPI.invoke('database:reclaimRawLog:preview');
    if (res.success) setCandidateRows(res.candidateRows);
    else setError(res.error || t('common:database.preview_failed'));
  };

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await window.electronAPI.invoke('database:reclaimRawLog:run', { vacuum });
      if (res.success) setResult(res.result);
      else setError(res.error || t('common:database.reclaim_failed'));
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border border-[var(--nim-border)] bg-nim-secondary database-raw-log-maintenance">
      <div className="text-sm font-semibold mb-1">{t('common:database.reclaim_title')}</div>
      <div className="text-xs text-[var(--nim-text-muted)] mb-3">
        {t('common:database.reclaim_description')}
      </div>

      {candidateRows !== null && (
        <div className="text-xs text-[var(--nim-text-muted)] mb-2">
          {t('common:database.rows_trimmed', { count: candidateRows.toLocaleString() })}
        </div>
      )}

      <label className="flex items-center gap-2 text-xs mb-3 cursor-pointer">
        <input type="checkbox" checked={vacuum} onChange={(e) => setVacuum(e.target.checked)} />
        {t('common:database.vacuum_after_rewrite')}
      </label>

      <div className="flex items-center gap-2">
        <button
          onClick={preview}
          disabled={running}
          className="py-1 px-3 rounded text-sm border border-[var(--nim-border)] bg-[var(--nim-bg-tertiary)] text-[var(--nim-text)] hover:bg-[var(--nim-bg-hover)] disabled:opacity-50"
        >
          {t('common:database.preview')}
        </button>
        <button
          onClick={run}
          disabled={running}
          className="py-1 px-3 rounded text-sm border border-[var(--nim-border)] bg-[var(--nim-bg-tertiary)] text-[var(--nim-text)] hover:bg-[var(--nim-bg-hover)] disabled:opacity-50"
        >
          {running ? t('common:database.running') : t('common:database.reclaim_space')}
        </button>
      </div>

      {error && <div className="text-xs text-[var(--nim-error)] mt-2">{error}</div>}
      {result && (
        <div className="text-xs text-[var(--nim-text-muted)] mt-2">
          {t('common:database.reclaim_result_prefix', { rewritten: result.rewritten.toLocaleString(), scanned: result.scanned.toLocaleString() })}
          {t('common:database.reclaim_saved', { bytes: formatBytes(result.bytesSaved, t) })}{' '}
          {result.vacuumed ? t('common:database.vacuum_complete') : result.vacuumError ? t('common:database.vacuum_failed', { error: result.vacuumError }) : ''}
          {' '}({(result.durationMs / 1000).toFixed(1)}s).
        </div>
      )}
    </div>
  );
}

export function DatabaseDashboard({ onTableSelect }: Props) {
  const { t, i18n } = useTranslation(['common']);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electronAPI.invoke('database:getDashboardStats');

      if (result.success) {
        setStats(result);
      } else {
        setError(result.error || t('common:database.load_failed'));
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--nim-text-muted)]">
        {t('common:database.loading_dashboard')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-[var(--nim-error)] text-sm">{error}</div>
        <button
          onClick={loadStats}
          className="py-1.5 px-4 rounded text-sm border border-[var(--nim-border)] bg-[var(--nim-bg-tertiary)] text-[var(--nim-text)] hover:bg-[var(--nim-bg-hover)]"
        >
          {t('common:database.retry')}
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const totalRows = stats.tableStats.reduce((sum, t) => sum + t.rowCount, 0);
  const backupCount = [stats.backupStatus?.currentBackup, stats.backupStatus?.previousBackup, stats.backupStatus?.oldestBackup].filter(Boolean).length;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('common:database.overview')}</h2>
          <button
            onClick={loadStats}
            className="py-1 px-3 rounded text-sm border border-[var(--nim-border)] bg-[var(--nim-bg-tertiary)] text-[var(--nim-text)] hover:bg-[var(--nim-bg-hover)]"
          >
            {t('common:database.refresh')}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-[var(--nim-border)] bg-nim-secondary">
            <div className="text-sm text-[var(--nim-text-muted)] mb-1">{t('common:database.total_size')}</div>
            <div className="text-2xl font-semibold">{stats.totalSize}</div>
          </div>
          <div className="p-4 rounded-lg border border-[var(--nim-border)] bg-nim-secondary">
            <div className="text-sm text-[var(--nim-text-muted)] mb-1">{t('common:database.tables')}</div>
            <div className="text-2xl font-semibold">{stats.tableStats.length}</div>
          </div>
          <div className="p-4 rounded-lg border border-[var(--nim-border)] bg-nim-secondary">
            <div className="text-sm text-[var(--nim-text-muted)] mb-1">{t('common:database.total_rows')}</div>
            <div className="text-2xl font-semibold">{totalRows.toLocaleString()}</div>
          </div>
        </div>

        {/* Backup Status */}
        {stats.backupStatus && (
          <div className="p-4 rounded-lg border border-[var(--nim-border)] bg-nim-secondary">
            <h3 className="text-sm font-semibold mb-3">{t('common:database.backup_status')}</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--nim-text-muted)]">{t('common:database.available_backups')}</span>
                <span>{t('common:database.backup_count', { count: backupCount, total: 3 })}</span>
              </div>
              {stats.backupStatus.lastSuccessfulBackup && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--nim-text-muted)]">{t('common:database.last_successful_backup')}</span>
                  <span>{formatRelativeTime(stats.backupStatus.lastSuccessfulBackup, t)}</span>
                </div>
              )}
              {stats.backupStatus.currentBackup && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--nim-text-muted)]">{t('common:database.current_backup_size')}</span>
                  <span>{formatBytes(getBackupSizeBytes(stats.backupStatus.currentBackup), t)}</span>
                </div>
              )}
              {backupCount === 0 && (
                <div className="text-sm text-[var(--nim-text-faint)]">
                  {t('common:database.no_backups')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WAL (Write-Ahead Log) */}
        {stats.walStats && (() => {
          const wal = stats.walStats;
          const checkpointPages = typeof wal.autoCheckpointPages === 'number'
            ? wal.autoCheckpointPages.toLocaleString(i18n.resolvedLanguage)
            : undefined;
          const checkpointTimeout = wal.backend === 'sqlite' && checkpointPages !== undefined
            ? t('common:database.auto_checkpoint_pages', { pages: checkpointPages })
            : wal.checkpointTimeout;
          const description = wal.backend === 'pglite'
            ? t('common:database.wal_pglite_description')
            : wal.backend === 'sqlite' && checkpointPages !== undefined && typeof wal.pageSizeBytes === 'number'
              ? t('common:database.wal_sqlite_description', {
                pages: checkpointPages,
                maxSize: wal.maxWalSize,
                pageSize: formatBytes(wal.pageSizeBytes, t),
              })
              : wal.description;
          const minBytes = parsePostgresSize(stats.walStats.minWalSize);
          const maxBytes = parsePostgresSize(stats.walStats.maxWalSize);
          const cur = stats.walStats.totalBytes;
          // Bar shows position between min and max. min is the floor that Postgres
          // always retains; growth beyond max triggers an inline checkpoint.
          const range = Math.max(maxBytes - minBytes, 1);
          const pct = Math.min(100, Math.max(0, ((cur - minBytes) / range) * 100));
          const overFloor = cur > minBytes * 1.05;
          return (
            <div className="database-dashboard-wal p-4 rounded-lg border border-[var(--nim-border)] bg-nim-secondary">
              <h3 className="text-sm font-semibold mb-3">{t('common:database.wal')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--nim-text-muted)]">{t('common:database.current_size')}</span>
                  <span data-testid="wal-current-size">
                    {stats.walStats.totalSize} ({t(`common:database.segments_${stats.walStats.fileCount === 1 ? 'one' : 'other'}`, { count: stats.walStats.fileCount })})
                  </span>
                </div>
                <div className="h-1.5 bg-[var(--nim-bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${overFloor ? 'bg-[var(--nim-warning)]' : 'bg-[var(--nim-primary)]'}`}
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--nim-text-faint)]">
                  <span>{t('common:database.min', { value: stats.walStats.minWalSize })}</span>
                  <span>{t('common:database.max', { value: stats.walStats.maxWalSize })}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[var(--nim-text-muted)]">{t('common:database.checkpoint_timeout')}</span>
                  <span>{checkpointTimeout}</span>
                </div>
                {description && (
                  <div className="text-xs text-[var(--nim-text-faint)] pt-1">
                    {description}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Table Statistics */}
        <div className="rounded-lg border border-[var(--nim-border)] bg-nim-secondary overflow-hidden">
          <div className="p-4 border-b border-[var(--nim-border)]">
            <h3 className="text-sm font-semibold">{t('common:database.tables_by_size')}</h3>
          </div>
          <div className="divide-y divide-[var(--nim-border)]">
            {stats.tableStats.length === 0 ? (
              <div className="p-4 text-sm text-[var(--nim-text-muted)]">{t('common:database.no_tables')}</div>
            ) : (
              stats.tableStats.map((table) => {
                const percentage = stats.totalSizeBytes > 0
                  ? (table.sizeBytes / stats.totalSizeBytes) * 100
                  : 0;

                return (
                  <div
                    key={table.name}
                    className="p-3 hover:bg-[var(--nim-bg-hover)] cursor-pointer"
                    onClick={() => onTableSelect(table.name)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{table.name}</span>
                      <div className="flex items-center gap-4 text-sm text-[var(--nim-text-muted)]">
                        <span>{t(`common:database.rows_${table.rowCount === 1 ? 'one' : 'other'}`, { count: table.rowCount.toLocaleString() })}</span>
                        <span className="w-20 text-right">{table.size}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[var(--nim-bg-tertiary)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--nim-primary)] rounded-full transition-all"
                        style={{ width: `${Math.max(percentage, 1)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-[var(--nim-border)] bg-nim-secondary">
            <div className="text-sm text-[var(--nim-text-muted)] mb-1">{t('common:database.ai_sessions')}</div>
            <div className="text-xl font-semibold">
              {parseInt(stats.basicStats?.ai_sessions_count || '0').toLocaleString()}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[var(--nim-border)] bg-nim-secondary">
            <div className="text-sm text-[var(--nim-text-muted)] mb-1">{t('common:database.history_entries')}</div>
            <div className="text-xl font-semibold">
              {parseInt(stats.basicStats?.history_count || '0').toLocaleString()}
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <RawLogMaintenanceCard />
      </div>
    </div>
  );
}
