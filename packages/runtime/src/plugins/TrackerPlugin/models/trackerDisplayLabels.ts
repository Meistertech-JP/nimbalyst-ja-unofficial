import { globalRegistry, type FieldDefinition, type TrackerDataModel } from '@nimbalyst/tracker-schema';
import { builtinTrackerOptionCopy, builtinTrackerTypeCopy } from './builtinTrackerCopy';

/** Presentation only: callers keep using original type and option identities. */
export type TrackerDisplayTranslate = (key: string) => string;
type DisplayModel = Pick<TrackerDataModel, 'type'> & Partial<Pick<TrackerDataModel, 'displayName' | 'displayNamePlural'>>;

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
  if (!seed || model.type !== seed.type || seed[property] !== label) return label;
  return builtinTrackerTypeCopy(type, label, t, property === 'displayNamePlural');
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
  if (!option || !seedOption || field?.type !== seedField?.type || option.label !== seedOption.label) return label;
  return builtinTrackerOptionCopy(type, fieldName, value, label, t);
}

/** Generic field controls must establish ownership, not guess from a field name. */
export function resolveTrackerFieldDefinitionDisplayLabel(
  field: FieldDefinition,
  value: string,
  t?: TrackerDisplayTranslate,
  fallback = value,
): string {
  const owner = globalRegistry.getAll().find(model => model.fields.includes(field));
  return owner
    ? resolveTrackerFieldDisplayLabel(owner.type, field.name, value, t, fallback)
    : field.options?.find(option => option.value === value)?.label ?? fallback;
}
