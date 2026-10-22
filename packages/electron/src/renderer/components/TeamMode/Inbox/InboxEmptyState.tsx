import React from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';

import type { InboxFilterId } from './inboxTypes';

interface EmptyCopy {
  icon: string;
  titleKey: string;
  bodyKey: string;
  actionKey?: string;
}

/**
 * Filter-specific empty states. A generic "nothing here" teaches nobody what
 * the filter means or how to get something into it, so each one explains its
 * own rule and offers the action that resolves it.
 */
const FILTER_EMPTY: Record<InboxFilterId, EmptyCopy> = {
  all: {
    icon: 'inbox',
    titleKey: 'inbox_empty.all_title',
    bodyKey: 'inbox_empty.all_body',
    actionKey: 'org_sidebar.browse_rooms',
  },
  mentions: {
    icon: 'alternate_email',
    titleKey: 'inbox_empty.mentions_title',
    bodyKey: 'inbox_empty.mentions_body',
    actionKey: 'org_sidebar.browse_rooms',
  },
  assigned: {
    icon: 'assignment_ind',
    titleKey: 'inbox_empty.assigned_title',
    bodyKey: 'inbox_empty.assigned_body',
    actionKey: 'inbox_empty.open_trackers',
  },
  awaiting: {
    icon: 'ballot',
    titleKey: 'inbox_empty.awaiting_title',
    bodyKey: 'inbox_empty.awaiting_body',
  },
  follows: {
    icon: 'visibility',
    titleKey: 'inbox_empty.follows_title',
    bodyKey: 'inbox_empty.follows_body',
    actionKey: 'org_sidebar.browse_rooms',
  },
  archived: {
    icon: 'archive',
    titleKey: 'inbox_empty.archived_title',
    bodyKey: 'inbox_empty.archived_body',
  },
};

/**
 * Read state is its own axis, so it gets its own empty copy — and it wins over
 * the reason's, because "nothing unread" is the more useful thing to hear when
 * the reason itself does have rows sitting in it.
 */
const UNREAD_EMPTY: EmptyCopy = {
  icon: 'mark_email_read',
  titleKey: 'inbox_empty.unread_title',
  bodyKey: 'inbox_empty.unread_body',
};

export function InboxEmptyState({
  filter,
  unreadOnly = false,
  query,
  scopeActive,
  onClearFilters,
  onBrowse,
  children,
}: {
  filter: InboxFilterId;
  unreadOnly?: boolean;
  query: string;
  scopeActive: boolean;
  onClearFilters: () => void;
  /** Absent when the host has no rooms directory to send the user to. */
  onBrowse?: () => void;
  /** Slot for the `Search all messages` escalation when a query is active. */
  children?: React.ReactNode;
}) {
  const { t } = useTranslation('collabSidebar');
  const copy = unreadOnly ? UNREAD_EMPTY : FILTER_EMPTY[filter];
  const narrowed = !!query || scopeActive || unreadOnly || filter !== 'all';

  return (
    <div
      className="inbox-empty-state flex flex-col items-center gap-2 px-8 py-14 text-center"
      data-testid="inbox-empty-state"
      data-filter={filter}
      data-component="InboxEmptyState"
    >
      <span className="inbox-empty-icon flex size-11 items-center justify-center rounded-full bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-faint)]">
        <MaterialSymbol icon={query ? 'search_off' : copy.icon} size={22} />
      </span>
      <h3 className="m-0 text-[14px] font-semibold text-[var(--nim-text)]">
        {query ? t('inbox_empty.search_title') : t(copy.titleKey)}
      </h3>
      <p className="m-0 max-w-[420px] text-[12px] leading-relaxed text-[var(--nim-text-muted)]">
        {query
          ? t('inbox_empty.search_body', {
            filter: filter === 'all'
              ? t('inbox_empty.your_inbox')
              : t(`org_sidebar.inbox_filter.${filter}`),
            query,
          })
          : t(copy.bodyKey)}
      </p>

      <div className="inbox-empty-actions mt-1 flex items-center gap-2">
        {narrowed && (
          <button
            type="button"
            className="inbox-empty-clear rounded-md border border-[var(--nim-border)] px-2.5 py-1 text-[12px] text-[var(--nim-text)] hover:bg-[var(--nim-bg-hover)]"
            data-testid="inbox-empty-clear-filters"
            onClick={onClearFilters}
          >
            {t('inbox_empty.clear_filters')}
          </button>
        )}
        {!query && copy.actionKey && onBrowse && (
          <button
            type="button"
            className="inbox-empty-browse rounded-md border border-[var(--nim-border)] px-2.5 py-1 text-[12px] text-[var(--nim-text)] hover:bg-[var(--nim-bg-hover)]"
            data-testid="inbox-empty-browse"
            onClick={onBrowse}
          >
            {t(copy.actionKey)}
          </button>
        )}
      </div>

      {children && <div className="inbox-empty-escalation mt-3">{children}</div>}
    </div>
  );
}

/** No connection and no cached rows to fall back on. */
export function InboxOfflineWithoutCache() {
  const { t } = useTranslation('collabSidebar');
  return (
    <div
      className="inbox-offline-empty flex flex-col items-center gap-2 px-8 py-14 text-center"
      data-testid="inbox-offline-empty"
      data-component="InboxOfflineWithoutCache"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-faint)]">
        <MaterialSymbol icon="cloud_off" size={22} />
      </span>
      <h3 className="m-0 text-[14px] font-semibold text-[var(--nim-text)]">{t('inbox_empty.offline_title')}</h3>
      <p className="m-0 max-w-[420px] text-[12px] leading-relaxed text-[var(--nim-text-muted)]">
        {t('inbox_empty.offline_body')}
      </p>
    </div>
  );
}
