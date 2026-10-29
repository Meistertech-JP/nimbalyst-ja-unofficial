import type { TrackerReferenceStatusInfo } from './trackerReferenceResolver';
/** Preserve resolver-specific schema labels without loading any React/menu code. */
export declare function referenceStatusDisplayLabel(type: string, status: TrackerReferenceStatusInfo, t: (key: string) => string): string;
