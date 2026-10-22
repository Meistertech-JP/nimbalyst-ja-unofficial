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

type TrackerTranslator = TFunction<'tracker'>;

function changed(label: string, entry: TrackerActivityLike, t: TrackerTranslator): string {
  if (entry.oldValue !== undefined && entry.newValue !== undefined) {
    return t('activity.changed_from', { field: label, oldValue: quoted(entry.oldValue), newValue: quoted(entry.newValue) });
  }
  if (entry.newValue !== undefined) return t('activity.changed_to', { field: label, newValue: quoted(entry.newValue) });
  return t('activity.updated', { field: label });
}

export function formatTrackerActivity(entry: TrackerActivityLike, t: TrackerTranslator): string {
  if (entry.action === 'created') return t('activity.created');
  if (entry.action === 'commented') return t('activity.commented');
  if (entry.action === 'comment_updated') {
    if (entry.oldValue !== undefined && entry.newValue !== undefined) {
      return t('activity.comment_updated_from', { oldValue: quoted(entry.oldValue), newValue: quoted(entry.newValue) });
    }
    return t('activity.comment_updated');
  }
  if (entry.action === 'comment_deleted') {
    return entry.oldValue !== undefined
      ? t('activity.comment_deleted_value', { oldValue: quoted(entry.oldValue) })
      : t('activity.comment_deleted');
  }
  if (entry.action === 'archived') {
    return entry.newValue === 'true' ? t('activity.archived') : t('activity.unarchived');
  }
  if (entry.action === 'status_changed') return changed(t('activity.field_status'), entry, t);
  if (entry.action === 'type_changed') return changed(t('activity.field_type'), entry, t);
  if (entry.field) return changed(entry.field, entry, t);
  return entry.action.replace(/_/g, ' ');
}
