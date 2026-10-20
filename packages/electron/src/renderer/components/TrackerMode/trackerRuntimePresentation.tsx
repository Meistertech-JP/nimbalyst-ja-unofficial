import React, { type ComponentProps } from 'react';
import { Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { TrackerRowContextMenu, TrackerTable } from '@nimbalyst/runtime/plugins/TrackerPlugin';
import { trackerColumnLabel, trackerGroupLabel, trackerRelativeDate, trackerTypeLabel } from './trackerPresentation';

const BUILTIN_TYPES = new Set([
  'plan', 'bug', 'task', 'idea', 'decision', 'automation', 'feature', 'milestone', 'release',
]);
const PRIORITIES = new Set(['critical', 'high', 'medium', 'low']);
const codeClassName = 'px-1 py-0.5 bg-[var(--nim-bg-secondary)] rounded text-[10px]';

function priorityLabel(priority: string, t: TFunction): string {
  return PRIORITIES.has(priority)
    ? t(`tracker:kanban.priority_${priority}`)
    : priority.charAt(0).toUpperCase() + priority.slice(1);
}

function statusLabel(status: string, t: TFunction): string {
  const key = status.replace(/-/g, '_');
  const translated = t(`tracker:plans.status_${key}`, { defaultValue: '' });
  return translated || status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function createTrackerContextMenuPresentation(t: TFunction): NonNullable<ComponentProps<typeof TrackerRowContextMenu>['presentation']> {
  return {
    selectedCount: count => t('tracker:kanban.selected_count', { count }),
    setStatus: t('tracker:kanban.set_status'),
    setPriority: t('tracker:kanban.set_priority'),
    priorityLabel: priority => priorityLabel(priority, t),
    addToCollection: t('tracker:kanban.add_to_collection'),
    copyLink: t('tracker:kanban.copy_link'),
    archive: t('tracker:kanban.archive'),
    delete: t('tracker:kanban.delete'),
    deleteConfirm: count => t('tracker:kanban.delete_confirm', { count }),
  };
}

/** Presentation-only adapter: the shared runtime never acquires an i18next dependency. */
export function createTrackerTablePresentation(t: TFunction): NonNullable<ComponentProps<typeof TrackerTable>['presentation']> {
  return {
    columnLabel: column => trackerColumnLabel(column, t),
    groupLabel: (group, groupBy) => trackerGroupLabel(group, groupBy, t),
    relativeDate: date => trackerRelativeDate(date, t),
    cell: {
      database: t('tracker:detail.database'),
      storedInDatabase: t('tracker:table.stored_in_database'),
      shared: t('tracker:config.shared'),
      local: t('tracker:config.local'),
      sharedTitle: t('tracker:table.shared_title'),
      localTitle: t('tracker:table.local_title'),
      priorityLabel: priority => priorityLabel(priority, t),
      statusOptionLabel: status => statusLabel(status, t),
    },
    favoriteLabel: isFavorite => t(isFavorite ? 'tracker:grid.remove_favorite' : 'tracker:grid.add_favorite'),
    contextMenu: createTrackerContextMenuPresentation(t),
    loading: t('tracker:grid.loading'),
    loadingShort: t('tracker:detail.loading'),
    warning: message => t('tracker:table.warning', { message }),
    noMatches: t('tracker:table.no_matches'),
    clearFilters: t('tracker:grid.clear_filters'),
    newItem: type => t('tracker:grid.new_item', {
      type: BUILTIN_TYPES.has(type) ? trackerTypeLabel(type, t) : type.charAt(0).toUpperCase() + type.slice(1),
    }),
    typeDescription: type => t(`tracker:table.descriptions.${BUILTIN_TYPES.has(type) ? type : 'task'}`),
    typeHint: type => type === 'plan'
      ? <Trans t={t} i18nKey="tracker:table.plan_hint" values={{ command: '/plan' }} components={{ command: <code className={codeClassName} /> }} />
      : <Trans t={t} i18nKey="tracker:table.type_hint" values={{ marker: `#${type}`, command: `/track ${type}` }} components={{ marker: <code className={codeClassName} />, command: <code className={codeClassName} /> }} />,
    noItems: t('tracker:table.no_items'),
    creationHint: t('tracker:table.creation_hint'),
    table: {
      allLabel: t('tracker:sidebar.all', 'All'),
      selectedLabel: count => t(count === 1 ? 'tracker:filters.item_count_one' : 'tracker:filters.item_count_other', { count }),
      clearAllLabel: t('tracker:filters.clear_all'),
      emptyValueLabel: t('tracker:filters.no_value'),
      filterLabel: t('tracker:filters.filter'),
      statusLabel: t('tracker:columns.status'),
      priorityLabel: t('tracker:columns.priority'),
      clearAllFiltersLabel: t('tracker:filters.clear_all'),
      displayOptionsLabel: t('tracker:filters.display_options'),
      itemCountLabel: count => t(count === 1 ? 'tracker:filters.item_count_one' : 'tracker:filters.item_count_other', { count }),
      typeLabel: type => trackerTypeLabel(type, t),
      statusOptionLabel: status => statusLabel(status, t),
    },
  };
}
