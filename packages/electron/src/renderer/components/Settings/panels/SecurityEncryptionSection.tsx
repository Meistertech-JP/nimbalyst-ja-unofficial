import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import { TeamRecoverySection } from './TeamRecoverySection';

type KeyCustodyMode = 'server-managed' | 'unmigrated';

interface Props {
  orgId: string;
}

/**
 * Organization encryption is server-managed product infrastructure and is the
 * only supported mode. This surface reports whether the organization carries
 * the server-managed marker; one that does not was never converted and the
 * server refuses its team data. An unavailable probe is not a migration diagnosis.
 */
export function SecurityEncryptionSection({ orgId }: Props) {
  const { t } = useTranslation('orgSharing');
  const [mode, setMode] = useState<KeyCustodyMode | null>(null);
  const [loading, setLoading] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);
  const loadedOrgId = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Rechecking the same organization keeps its last mode, so an open recovery
    // section is not unmounted, which would release its collected sources.
    if (loadedOrgId.current !== orgId) { loadedOrgId.current = orgId; setMode(null); }
    void (async () => { try {
      const statusResult = await window.electronAPI.team.getKeyCustodyStatus(orgId);
      if (cancelled) return;
      setMode(statusResult?.success && (statusResult.mode === 'server-managed' || statusResult.mode === 'unmigrated')
        ? statusResult.mode : null);
    } catch {
      if (!cancelled) setMode(null);
    } finally {
      if (!cancelled) setLoading(false);
    } })();
    return () => { cancelled = true; };
  }, [orgId, refreshKey]);

  const unmigrated = mode === 'unmigrated';

  return (
    <section
      className="security-encryption-section rounded-lg border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-4"
      data-testid="organization-security-encryption"
      data-component="SecurityEncryptionSection"
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 ${unmigrated ? 'text-[var(--nim-warning)]' : 'text-[var(--nim-success)]'}`}>
          <MaterialSymbol icon="verified_user" size={22} fill />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-[15px] font-semibold text-[var(--nim-text)]">{t('security_encryption.title')}</h3>
          <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-[var(--nim-text-muted)]">
            {t('security_encryption.description')}
          </p>

          {loading ? (
            <p className="m-0 mt-3 text-xs text-[var(--nim-text-faint)]">{t('security_encryption.checking')}</p>
          ) : unmigrated ? (
            <div
              className="organization-encryption-diagnostic mt-3 rounded-md border border-[var(--nim-warning)] bg-[rgba(251,191,36,0.08)] p-3"
              data-testid="organization-encryption-unmigrated"
            >
              <p className="m-0 text-xs font-semibold text-[var(--nim-warning)]">
                {t('security_encryption.retired_title')}
              </p>
              <p className="m-0 mt-1 select-text text-xs text-[var(--nim-text-muted)]">
                {t('security_encryption.retired_description')}
              </p>
            </div>
          ) : mode === null ? (
            <p className="m-0 mt-3 text-xs text-[var(--nim-text-faint)]">
              {t('security_encryption.unavailable')}
            </p>
          ) : (
            <p className="m-0 mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--nim-success)]">
              <MaterialSymbol icon="check_circle" size={14} fill />
              {t('security_encryption.active')}
            </p>
          )}
          {!loading && <button type="button" className="mt-3 text-xs text-[var(--nim-primary)]" onClick={() => setRefreshKey(k => k + 1)}>{t('security_encryption.check_again')}</button>}
          {unmigrated && <TeamRecoverySection orgId={orgId} />}
        </div>
      </div>
    </section>
  );
}
