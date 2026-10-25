import type { FieldDefinition } from '@nimbalyst/tracker-schema';

const TRACKER_FIELD_LABEL_KEYS: Record<string, string> = {
  tags: 'columns.tags',
  owner: 'columns.owner',
  status: 'columns.status',
  priority: 'columns.priority',
  assignee: 'columns.assignee',
  reporter: 'columns.reporter',
  reporterEmail: 'columns.reporter',
  progress: 'columns.progress',
  startDate: 'columns.startDate',
  dueDate: 'columns.dueDate',
  dependsOn: 'relationship.depends_on',
  blocks: 'relationship.blocks',
  collection: 'columns.collection',
  goal: 'display.group_goal',
};

/** Header text for a field: explicit custom label, localized built-in, else formatted name. */
export function trackerFieldDisplayLabel(
  field: FieldDefinition,
  translate?: (key: string) => string,
): string {
  const displayLabel = (field as { displayLabel?: unknown }).displayLabel;
  if (typeof displayLabel === 'string' && displayLabel) return displayLabel;

  const translationKey = Object.prototype.hasOwnProperty.call(TRACKER_FIELD_LABEL_KEYS, field.name)
    ? TRACKER_FIELD_LABEL_KEYS[field.name]
    : undefined;
  return translationKey && translate
    ? translate(translationKey)
    : formatTrackerFieldLabel(field.name);
}

/**
 * Format a display label from a camelCase field name.
 * e.g. "publishDate" -> "Publish Date", "storyPoints" -> "Story Points"
 */
export function formatTrackerFieldLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (character) => character.toUpperCase())
    .trim();
}
