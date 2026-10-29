import type { TrackerRecord } from '../../../core/TrackerRecord';
import { globalRegistry } from '@nimbalyst/tracker-schema';
import { resolveRoleFieldName } from '../trackerRecordAccessors';
import type { TrackerGroupBy } from './trackerGrouping';
import { resolveTrackerFieldDisplayLabel, resolveTrackerTypeDisplayLabel, type TrackerDisplayTranslate } from './trackerDisplayLabels';

interface DisplayGroup {
  key: string;
  label: string | null;
  value?: string | null;
  empty?: boolean;
}

/** Project labels only; grouping, lane order, membership and writes keep their original values. */
export function resolveTrackerGroupDisplayLabel(
  group: DisplayGroup,
  axis: TrackerGroupBy,
  items: readonly TrackerRecord[],
  t: TrackerDisplayTranslate,
  filterType?: string,
): string {
  const fallback = group.label ?? '';
  const translated = (key: string) => {
    const result = t(key);
    return result && result !== key ? result : fallback;
  };
  if (axis === 'none') return fallback;
  if (group.empty || group.key.endsWith(':empty')) {
    if (axis === 'assignee') return translated('groups.unassigned');
    if (axis === 'tag') return translated('tag_board.untagged');
    if (axis === 'milestone') return translated('milestone_chip.no_milestone');
    if (axis === 'goal') return translated('groups.no_goal');
    return translated('groups.none');
  }
  let value = group.value;
  if (value === undefined) {
    const marker = group.key.lastIndexOf(':value:');
    if (marker < 0) return fallback;
    try { value = decodeURIComponent(group.key.slice(marker + 7)); } catch { return fallback; }
  }
  if (!value) return fallback;
  const scalar = value;
  if (axis === 'type') return globalRegistry.get(scalar) ? resolveTrackerTypeDisplayLabel(scalar, t, true) : fallback;
  if (typeof axis === 'string' && axis !== 'status' && axis !== 'priority') return fallback;
  const types = [...new Set(items.map(item => item.primaryType))];
  if (types.length === 0 && filterType && filterType !== 'all') types.push(filterType);
  const labels = types.map(type => {
    const fieldName = typeof axis === 'object' ? axis.fieldId
      : resolveRoleFieldName(type, axis === 'status' ? 'workflowStatus' : 'priority');
    const field = globalRegistry.get(type)?.fields.find(field => field.name === fieldName);
    if (typeof axis === 'object' && field?.type === 'boolean' && ['true', 'false'].includes(scalar)) {
      return translated(scalar === 'true' ? 'grid.boolean_yes' : 'grid.boolean_no');
    }
    return resolveTrackerFieldDisplayLabel(type, fieldName, scalar, t, fallback);
  });
  // One scalar bucket may combine different schemas. Never choose one type's
  // translated/custom label on behalf of the other types sharing that bucket.
  return labels.length && labels.every(label => label === labels[0]) ? labels[0] : fallback;
}
