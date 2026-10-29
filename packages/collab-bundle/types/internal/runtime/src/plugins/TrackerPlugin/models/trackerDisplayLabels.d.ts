import { type FieldDefinition, type TrackerDataModel } from '../../../../../tracker-schema/src/browser';
/** Presentation only: callers keep using original type and option identities. */
export type TrackerDisplayTranslate = (key: string) => string;
type DisplayModel = Pick<TrackerDataModel, 'type'> & Partial<Pick<TrackerDataModel, 'displayName' | 'displayNamePlural'>>;
/** Only the particular unmodified seed property is product-owned copy. */
export declare function resolveTrackerTypeDisplayLabel(type: string, t?: TrackerDisplayTranslate, plural?: boolean, displayModel?: DisplayModel): string;
/**
 * Respect current schema options, including renamed builtin options. Comparing
 * the exact field/value against the original seed prevents translating custom
 * fields or an unrelated user label merely because its text says "Medium".
 */
export declare function resolveTrackerFieldDisplayLabel(type: string, fieldName: string, value: string, t?: TrackerDisplayTranslate, fallback?: string): string;
/** Generic field controls must establish ownership, not guess from a field name. */
export declare function resolveTrackerFieldDefinitionDisplayLabel(field: FieldDefinition, value: string, t?: TrackerDisplayTranslate, fallback?: string): string;
export {};
