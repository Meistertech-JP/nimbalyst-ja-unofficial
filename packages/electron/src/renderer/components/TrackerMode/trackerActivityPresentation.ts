import type { TFunction } from 'i18next';

interface TrackerActivityLike {
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

function quoted(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  const bounded = compact.length > 80 ? `${compact.slice(0, 77)}…` : compact;
  return `“${bounded}”`;
}

function changed(label: string, entry: TrackerActivityLike, t?: TFunction): string {
  if (entry.oldValue !== undefined && entry.newValue !== undefined) {
    const oldValue = quoted(entry.oldValue);
    const newValue = quoted(entry.newValue);
    return t
      ? t('tracker:activity.changed_from', { field: label, oldValue, newValue })
      : `changed ${label} from ${oldValue} to ${newValue}`;
  }
  if (entry.newValue !== undefined) {
    const newValue = quoted(entry.newValue);
    return t
      ? t('tracker:activity.changed_to', { field: label, newValue })
      : `changed ${label} to ${newValue}`;
  }
  return t ? t('tracker:activity.updated', { field: label }) : `updated ${label}`;
}

export function formatTrackerActivity(entry: TrackerActivityLike, t?: TFunction): string {
  if (entry.action === 'created') {
    return t ? t('tracker:activity.created') : 'created this item';
  }
  if (entry.action === 'commented') {
    return t ? t('tracker:activity.commented') : 'added a comment';
  }
  if (entry.action === 'comment_updated') {
    if (entry.oldValue !== undefined && entry.newValue !== undefined) {
      const oldValue = quoted(entry.oldValue);
      const newValue = quoted(entry.newValue);
      return t
        ? t('tracker:activity.comment_updated_from', { oldValue, newValue })
        : `edited a comment from ${oldValue} to ${newValue}`;
    }
    return t ? t('tracker:activity.comment_updated') : 'edited a comment';
  }
  if (entry.action === 'comment_deleted') {
    if (entry.oldValue !== undefined) {
      const oldValue = quoted(entry.oldValue);
      return t
        ? t('tracker:activity.comment_deleted_value', { oldValue })
        : `deleted comment ${oldValue}`;
    }
    return t ? t('tracker:activity.comment_deleted') : 'deleted a comment';
  }
  if (entry.action === 'archived') {
    if (entry.newValue === 'true') {
      return t ? t('tracker:activity.archived') : 'archived this item';
    }
    return t ? t('tracker:activity.unarchived') : 'unarchived this item';
  }
  if (entry.action === 'status_changed') {
    return changed(t ? t('tracker:activity.field_status') : 'status', entry, t);
  }
  if (entry.action === 'type_changed') {
    return changed(t ? t('tracker:activity.field_type') : 'type', entry, t);
  }
  if (entry.field) return changed(entry.field, entry, t);
  return entry.action.replace(/_/g, ' ');
}
