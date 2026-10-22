import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialSymbol, copyToClipboard } from '@nimbalyst/runtime';
import { buildShareUrl } from '../../../store/atoms/sessionShares';
import { useAtomValue } from 'jotai';
import { personalAccountsAtom } from '../../../store/atoms/settingsDomains';

interface SharedLink {
  shareId: string;
  sessionId: string;
  title: string;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string | null;
  viewCount: number;
  owningPersonalOrgId: string;
}

type PanelState = 'loading' | 'loaded' | 'unauthenticated' | 'error';

/**
 * Shared Links settings panel.
 * Displays and manages all shared file and session links for the current user.
 * Self-contained - fetches data via IPC, no props needed.
 */
export const SharedLinksPanel: React.FC = () => {
  const { t, i18n } = useTranslation('settings');
  const accounts = useAtomValue(personalAccountsAtom);
  const [shares, setShares] = useState<SharedLink[]>([]);
  const [shareKeys, setShareKeys] = useState<Record<string, string>>({});
  const [state, setState] = useState<PanelState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchShares = useCallback(async () => {
    setState('loading');
    try {
      const [result, keys] = await Promise.all([
        (window as any).electronAPI?.listShares(),
        (window as any).electronAPI?.getShareKeys(),
      ]);
      if (keys) {
        setShareKeys(keys);
      }
      if (result?.success && result.shares) {
        setShares(result.shares);
        setState('loaded');
      } else if (result?.error?.includes('Not signed in')) {
        setState('unauthenticated');
      } else {
        setErrorMessage(result?.error || t('shared_links.load_failed'));
        setState('error');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('shared_links.load_failed'));
      setState('error');
    }
  }, [t]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const handleDelete = async (share: SharedLink) => {
    setDeletingId(share.shareId);
    try {
      const result = await (window as any).electronAPI?.deleteShare({
        shareId: share.shareId,
        sessionId: typeof share.sessionId === 'string' ? share.sessionId : undefined,
        owningPersonalOrgId: share.owningPersonalOrgId,
      });
      if (result?.success) {
        setShares(prev => prev.filter(s => s.shareId !== share.shareId));
      }
    } catch (error) {
      console.error('[SharedLinksPanel] Delete failed:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = (share: SharedLink) => {
    const key = typeof share.sessionId === 'string' ? shareKeys[share.sessionId] : undefined;
    const url = buildShareUrl(share.shareId, key);
    copyToClipboard(url);
    setCopiedId(share.shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.resolvedLanguage || i18n.language, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return t('shared_links.no_expiration');
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs <= 0) return t('shared_links.expired');
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days === 1) return t('shared_links.expires_tomorrow');
    return t('shared_links.expires_in_days', { count: days });
  };

  const getShareKindLabel = (share: SharedLink) =>
    typeof share.sessionId === 'string' && share.sessionId.startsWith('file:')
      ? t('shared_links.file')
      : t('shared_links.session');

  return (
    <div className="provider-panel max-w-2xl">
      <div className="provider-panel-header flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--nim-text)] m-0">{t('shared_links.title')}</h3>
          <p className="text-[0.8125rem] text-[var(--nim-text-muted)] mt-1 mb-0">
            {t('shared_links.description')}
          </p>
        </div>
        {state === 'loaded' && shares.length > 0 && (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8125rem] text-[var(--nim-text-muted)] bg-transparent border border-[var(--nim-border)] rounded-md cursor-pointer transition-colors duration-150 hover:bg-[var(--nim-bg-hover)] hover:text-[var(--nim-text)]"
            onClick={fetchShares}
          >
            <MaterialSymbol icon="refresh" size={14} />
            {t('shared_links.refresh')}
          </button>
        )}
      </div>

      {/* Loading state */}
      {state === 'loading' && (
        <div className="flex items-center justify-center py-12 text-[var(--nim-text-muted)]">
          <MaterialSymbol icon="progress_activity" size={20} className="animate-spin mr-2" />
          {t('shared_links.loading')}
        </div>
      )}

      {/* Unauthenticated state */}
      {state === 'unauthenticated' && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MaterialSymbol icon="account_circle" size={32} className="text-[var(--nim-text-faint)] mb-3" />
          <p className="text-[0.8125rem] text-[var(--nim-text-muted)] mb-2">
            {t('shared_links.sign_in_required')}
          </p>
          <p className="text-[0.75rem] text-[var(--nim-text-faint)]">
            {t('shared_links.go_to_account')}
          </p>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MaterialSymbol icon="error" size={32} className="text-[var(--nim-error)] mb-3" />
          <p className="text-[0.8125rem] text-[var(--nim-text-muted)] mb-2">
            {errorMessage}
          </p>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8125rem] text-[var(--nim-text)] bg-transparent border border-[var(--nim-border)] rounded-md cursor-pointer transition-colors duration-150 hover:bg-[var(--nim-bg-hover)]"
            onClick={fetchShares}
          >
            <MaterialSymbol icon="refresh" size={14} />
            {t('shared_links.retry')}
          </button>
        </div>
      )}

      {/* Empty state */}
      {state === 'loaded' && shares.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MaterialSymbol icon="link" size={32} className="text-[var(--nim-text-faint)] mb-3" />
          <p className="text-[0.8125rem] text-[var(--nim-text-muted)] mb-1">
            {t('shared_links.no_links')}
          </p>
          <p className="text-[0.75rem] text-[var(--nim-text-faint)]">
            {t('shared_links.create_instruction')}
          </p>
        </div>
      )}

      {/* Shares list */}
      {state === 'loaded' && shares.length > 0 && (
        <div className="flex flex-col gap-0 border border-[var(--nim-border)] rounded-lg overflow-hidden">
          {shares.map((share, index) => (
            <div
              key={share.shareId}
              className={`flex items-start gap-3 px-4 py-3 bg-[var(--nim-bg)] ${index < shares.length - 1 ? 'border-b border-[var(--nim-border)]' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[0.8125rem] font-medium text-[var(--nim-text)] truncate">
                    {share.title || t('shared_links.untitled')}
                  </span>
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-[var(--nim-bg-hover)] text-[0.625rem] uppercase tracking-[0.04em] text-[var(--nim-text-faint)]">
                    {getShareKindLabel(share)}
                  </span>
                  <span className="shrink-0 text-[0.6875rem] text-[var(--nim-text-faint)]">
                    {t('shared_links.views', { count: share.viewCount })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[0.6875rem] text-[var(--nim-text-faint)]">
                  {/* Attribution only distinguishes something when more than one
                      account could have created the link. */}
                  {accounts.length > 1 && (
                    <span className="shared-link-owner select-text" data-testid="shared-link-owner">
                      {t('shared_links.created_by', { email: accounts.find((account) => account.personalOrgId === share.owningPersonalOrgId)?.email ?? t('shared_links.unknown_account') })}
                    </span>
                  )}
                  <span className="truncate">share.nimbalyst.com/share/{share.shareId.slice(0, 8)}...</span>
                  <span>{formatDate(share.createdAt)}</span>
                  <span>{formatSize(share.sizeBytes)}</span>
                  {formatExpiry(share.expiresAt) && (
                  <span className={formatExpiry(share.expiresAt) === t('shared_links.expired') ? 'text-[var(--nim-error)]' : ''}>
                      {formatExpiry(share.expiresAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1">
                <button
                  className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none text-[var(--nim-text-faint)] cursor-pointer transition-colors duration-150 hover:text-[var(--nim-text)] hover:bg-[var(--nim-bg-hover)]"
                  title={copiedId === share.shareId ? t('shared_links.copied') : t('shared_links.copy_link')}
                  onClick={() => handleCopyLink(share)}
                >
                  <MaterialSymbol icon={copiedId === share.shareId ? 'check' : 'content_copy'} size={14} />
                </button>
                <button
                  className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none text-[var(--nim-text-faint)] cursor-pointer transition-colors duration-150 hover:text-[var(--nim-error)] hover:bg-[var(--nim-bg-hover)] disabled:opacity-50 disabled:cursor-default"
                  title={t('shared_links.delete_link')}
                  onClick={() => handleDelete(share)}
                  disabled={deletingId === share.shareId}
                >
                  <MaterialSymbol
                    icon={deletingId === share.shareId ? 'progress_activity' : 'delete'}
                    size={14}
                    className={deletingId === share.shareId ? 'animate-spin' : ''}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
