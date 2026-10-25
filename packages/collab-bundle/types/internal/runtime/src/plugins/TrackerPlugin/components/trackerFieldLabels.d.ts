import type { FieldDefinition } from '../../../../../tracker-schema/src/browser';
/** Header text for a field: explicit custom label, localized built-in, else formatted name. */
export declare function trackerFieldDisplayLabel(field: FieldDefinition, translate?: (key: string) => string): string;
/**
 * Format a display label from a camelCase field name.
 * e.g. "publishDate" -> "Publish Date", "storyPoints" -> "Story Points"
 */
export declare function formatTrackerFieldLabel(name: string): string;
