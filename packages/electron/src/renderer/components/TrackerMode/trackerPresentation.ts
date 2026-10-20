import type { TFunction } from 'i18next';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import type { TrackerColumnDef, TrackerRecordGroup } from '@nimbalyst/runtime/plugins/TrackerPlugin';
import { getCellValue } from '@nimbalyst/runtime/plugins/TrackerPlugin';
import { getFieldByRole, getRecordPriority, getRecordStatus } from '@nimbalyst/runtime/plugins/TrackerPlugin/trackerRecordAccessors';

// Only runtime-generated, conventional captions are translated. Schema-specific
// field names and host-provided labels remain the user's vocabulary.
const COLUMN_CAPTIONS: Record<string, string> = {
  type: 'Type', key: 'Key', updated: 'Updated', viewed: 'Viewed', createdBy: 'Created by',
  updatedBy: 'Updated by', module: 'Source', shared: 'Shared', created: 'Created',
  title: 'Title', status: 'Status', priority: 'Priority', owner: 'Owner', assignee: 'Assignee',
  reporter: 'Reporter', tags: 'Tags', progress: 'Progress', startDate: 'Start Date', dueDate: 'Due Date',
};

const BUILTIN_TYPE_KEYS: Record<string, string> = {
  plan: 'tracker:table.types.plan',
  bug: 'tracker:table.types.bug',
  task: 'tracker:table.types.task',
  idea: 'tracker:table.types.idea',
  decision: 'tracker:table.types.decision',
  automation: 'tracker:table.types.automation',
  feature: 'tracker:table.types.feature',
  milestone: 'tracker:table.types.milestone',
  release: 'tracker:table.types.release',
};

export function trackerTypeLabel(
  type: string,
  t: TFunction,
  plural = false,
  fallback?: string,
): string {
  const key = BUILTIN_TYPE_KEYS[type];
  if (!key) return fallback ?? (type.charAt(0).toUpperCase() + type.slice(1));
  return t(`${key}${plural ? '_plural' : ''}`, {
    defaultValue: t(key),
  });
}

export function trackerColumnLabel(column: TrackerColumnDef, t: TFunction): string {
  return column.builtin && COLUMN_CAPTIONS[column.id] === column.label
    ? t(`tracker:columns.${column.id}`)
    : column.label;
}

export function localizeTrackerColumns(columns: TrackerColumnDef[], t: TFunction): TrackerColumnDef[] {
  return columns.map(column => ({ ...column, label: trackerColumnLabel(column, t) }));
}

function identityLabel(value: unknown): string {
  if (!value || typeof value !== 'object') return String(value ?? '');
  const identity = value as Record<string, unknown>;
  return String(identity.displayName ?? identity.email ?? identity.gitEmail ?? identity.gitName ?? '');
}

function hasGroupValue(record: TrackerRecord, groupBy: string): boolean {
  if (groupBy === 'status') return Boolean(getRecordStatus(record));
  if (groupBy === 'priority') return Boolean(getRecordPriority(record));
  if (groupBy === 'type') return Boolean(record.primaryType);
  if (groupBy === 'owner' || groupBy === 'assignee') return Boolean(identityLabel(getFieldByRole(record, 'assignee')));
  const value = getCellValue(record, groupBy);
  return Array.isArray(value) ? value.some(entry => Boolean(identityLabel(entry))) : Boolean(identityLabel(value));
}

/** This changes only a header caption, never the group's key or membership. */
export function trackerGroupLabel(group: TrackerRecordGroup, groupBy: string | null, t: TFunction): string | null {
  if (!groupBy || !group.label || group.items.length === 0 || group.items.some(item => hasGroupValue(item, groupBy))) {
    return group.label;
  }
  return t(groupBy === 'owner' || groupBy === 'assignee' ? 'tracker:groups.unassigned' : 'tracker:groups.none');
}

/** Matches the runtime table's relative-date boundaries and invalid-date rules. */
export function trackerRelativeDate(date: Date, t: TFunction): string {
  if (!date || date.getTime() === 0 || Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return t('sessions:relative_time.just_now');
  if (minutes < 60) return t('sessions:relative_time.compact_minutes', { count: minutes });
  if (hours < 24) return t('sessions:relative_time.compact_hours', { count: hours });
  if (days === 1) return t('sessions:history.yesterday');
  if (days < 7) return t('sessions:relative_time.compact_days', { count: days });
  if (days < 30) return t('sessions:relative_time.compact_weeks', { count: Math.floor(days / 7) });
  return date.toLocaleDateString();
}
