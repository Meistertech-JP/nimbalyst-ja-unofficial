import { globalRegistry, type TrackerDataModel } from '@nimbalyst/tracker-schema';

/** Presentation only: callers keep using original type and option identities. */
export type TrackerDisplayTranslate = (key: string) => string;
type DisplayModel = Pick<TrackerDataModel, 'type'> & Partial<Pick<TrackerDataModel, 'displayName' | 'displayNamePlural'>>;
const BUILTIN_TYPES = new Set(['plan', 'bug', 'task', 'idea', 'decision', 'milestone', 'release', 'source', 'capture', 'citation']);

function translated(key: string, fallback: string, t?: TrackerDisplayTranslate): string {
  const result = t?.(key);
  return result && result !== key ? result : fallback;
}

/** Only the particular unmodified seed property is product-owned copy. */
export function resolveTrackerTypeDisplayLabel(
  type: string,
  t?: TrackerDisplayTranslate,
  plural = false,
  displayModel?: DisplayModel,
): string {
  const model = displayModel ?? globalRegistry.get(type);
  if (!model) return type;
  const property = plural && model.displayNamePlural ? 'displayNamePlural' : 'displayName';
  const label = model[property] || type;
  const seed = globalRegistry.getBuiltinModel(type);
  if (!seed || model.type !== seed.type || !BUILTIN_TYPES.has(type) || seed[property] !== label) return label;
  const prefix = ['source', 'capture', 'citation'].includes(type) ? 'builtin_display.types' : 'table.types';
  return translated(`${prefix}.${type}${property === 'displayNamePlural' ? '_plural' : ''}`, label, t);
}

/**
 * Respect current schema options, including renamed builtin options. Comparing
 * the exact field/value against the original seed prevents translating custom
 * fields or an unrelated user label merely because its text says "Medium".
 */
export function resolveTrackerFieldDisplayLabel(
  type: string,
  fieldName: string,
  value: string,
  t?: TrackerDisplayTranslate,
  fallback = value,
): string {
  const model = globalRegistry.get(type);
  const field = model?.fields.find(candidate => candidate.name === fieldName);
  const option = field?.options?.find(candidate => candidate.value === value);
  const label = option?.label ?? fallback;
  const seed = globalRegistry.getBuiltinModel(type);
  const seedField = seed?.fields.find(candidate => candidate.name === fieldName);
  const seedOption = seedField?.options?.find(candidate => candidate.value === value);
  if (!BUILTIN_TYPES.has(type) || !option || !seedOption || field?.type !== seedField?.type || option.label !== seedOption.label) return label;
  if (fieldName === 'priority' && ['critical', 'high', 'medium', 'low'].includes(value)) {
    return translated(`kanban.priority_${value}`, label, t);
  }
  if (fieldName !== 'status') return label;
  const statusType = type === 'task' ? 'bug' : type;
  const prefix = ['bug', 'decision', 'plan'].includes(statusType)
    ? `ontology_domain_display.statuses.${statusType}`
    : `builtin_display.statuses.${statusType}`;
  return translated(`${prefix}.${value}`, label, t);
}
