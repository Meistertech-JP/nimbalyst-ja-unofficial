import React from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';

import { formatRelativeTimestamp } from './inboxViewModel';
import type { InboxStatus } from './inboxTypes';

/**
 * List-level connection state. Offline-with-cache keeps the rows navigable and
 * says how old they are; reconnecting says why the list has stopped moving.
 */
export function InboxStatusBanner({
  status,
  lastSyncedAt,
  now,
}: {
  status: InboxStatus;
  lastSyncedAt?: number;
  now: number;
}) {
  const { t, i18n } = useTranslation('collabSidebar', { keyPrefix: 'org_sidebar.inbox_status' });
  if (status === 'ready' || status === 'loading' || status === 'offlineWithoutCache') return null;

  const offline = status === 'offlineWithCache';

  return (
    <p
      className="inbox-status-banner m-0 flex items-center gap-1.5 border-b border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] px-5 py-2 text-[12px] text-[var(--nim-text-muted)]"
      data-testid="inbox-status-banner"
      data-status={status}
      role="status"
    >
      <MaterialSymbol icon={offline ? 'cloud_off' : 'sync'} size={14} className="shrink-0" />
      {offline
        ? (
          <>
            {t('offline_cached')}
            {lastSyncedAt ? t('synced_ago', { time: formatRelativeTimestamp(lastSyncedAt, now, i18n.language) }) : ''}
            {t('offline_queued_changes')}
          </>
        )
        : t('reconnecting')}
    </p>
  );
}
