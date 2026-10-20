import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialSymbol } from '@nimbalyst/runtime';

type KeyCustodyMode = 'legacy-e2e' | 'server-managed';
type MigrationDiagnostic =
  | { status: 'migrating'; startedAt: string; documentsCompleted?: number; documentsTotal?: number; phase?: 'custody' | 'titles' | 'documents' | 'verifying' }
  | { status: 'complete'; finishedAt: string }
  | { status: 'stuck'; failedAt: string; message: string; retryAt?: string };

interface Props {
  orgId: string;
  workspacePath?: string;
  isAdmin: boolean;
}

/**
 * Organization encryption is server-managed product infrastructure. Legacy
 * organizations migrate silently in main. This surface exposes status plus an
 * admin-only retry for a stuck background finalizer; custody is never optional.
 */
export function SecurityEncryptionSection({ orgId, isAdmin }: Props) {
  const { t } = useTranslation(['project']);
  const [mode, setMode] = useState<KeyCustodyMode | null>(null);
  const [migration, setMigration] = useState<MigrationDiagnostic | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [statusResult, migrationResult] = await Promise.all([
        window.electronAPI.team.getKeyCustodyStatus(orgId),
        window.electronAPI.team.getEncryptionMigrationStatus?.(orgId),
      ]);
      setMode(statusResult?.success && statusResult.mode ? statusResult.mode : null);
      setMigration(migrationResult?.success ? migrationResult.migration ?? null : null);
    } catch {
      setMode(null);
      setMigration(null);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const retry = useCallback(async () => {
    if (!window.electronAPI.team.retryEncryptionMigration) return;
    setRetrying(true);
    try {
      const result = await window.electronAPI.team.retryEncryptionMigration(orgId);
      if (result?.migration) {
        setMigration(result.migration as MigrationDiagnostic);
        if (result.success) setMode('server-managed');
      } else {
        await refresh();
      }
    } finally {
      setRetrying(false);
    }
  }, [orgId, refresh]);

  const updating = mode === 'legacy-e2e' || migration?.status === 'migrating';
  const stuck = migration?.status === 'stuck' ? migration : null;

  return (
    <section
      className="security-encryption-section rounded-lg border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-4"
      data-testid="organization-security-encryption"
      data-component="SecurityEncryptionSection"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-[var(--nim-success)]">
          <MaterialSymbol icon="verified_user" size={22} fill />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-[15px] font-semibold text-[var(--nim-text)]">{t('project:team.encrypted_by_nimbalyst')}</h3>
          <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-[var(--nim-text-muted)]">
            {t('project:team.server_managed_description')}
          </p>

          {loading ? (
            <p className="m-0 mt-3 text-xs text-[var(--nim-text-faint)]">{t('project:team.h2_checking_status')}</p>
          ) : stuck ? (
            <div
              className="organization-encryption-diagnostic mt-3 rounded-md border border-[var(--nim-warning)] bg-[rgba(251,191,36,0.08)] p-3"
              data-testid="organization-encryption-stuck"
            >
              <p className="m-0 text-xs font-semibold text-[var(--nim-warning)]">{t('project:team.encryption_needs_support')}</p>
              <p className="m-0 mt-1 select-text text-xs text-[var(--nim-text-muted)]">
                {stuck.message}
              </p>
              {isAdmin && window.electronAPI.team.retryEncryptionMigration ? (
                <button
                  type="button"
                  className="mt-3 rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg)] px-3 py-1.5 text-xs font-medium text-[var(--nim-text)] hover:bg-[var(--nim-bg-tertiary)] disabled:opacity-50"
                  disabled={retrying}
                  onClick={() => { void retry(); }}
                >
                  {retrying ? t('project:team.retrying') : t('project:team.retry_now')}
                </button>
              ) : null}
            </div>
          ) : updating ? (
            <p className="m-0 mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--nim-text-muted)]">
              <MaterialSymbol icon="progress_activity" size={14} className="animate-spin" />
              {migration?.status === 'migrating' && migration.phase === 'documents' && migration.documentsTotal
                ? t('project:team.finalizing_documents', { completed: migration.documentsCompleted ?? 0, total: migration.documentsTotal })
                : t('project:team.encryption_updating_background')}
            </p>
          ) : (
            <p className="m-0 mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--nim-success)]">
              <MaterialSymbol icon="check_circle" size={14} fill />
              {t('project:team.encryption_active')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
