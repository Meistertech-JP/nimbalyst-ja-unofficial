import { builtinTrackerOptionCopy } from '@nimbalyst/runtime/plugins/TrackerPlugin/models/builtinTrackerCopy';
import type { TrackerReferenceStatusInfo } from './trackerReferenceResolver';

/** Preserve resolver-specific schema labels without loading any React/menu code. */
export function referenceStatusDisplayLabel(type: string, status: TrackerReferenceStatusInfo, t: (key: string) => string): string {
  return status.fieldName
    ? builtinTrackerOptionCopy(type, status.fieldName, status.value, status.label, t)
    : status.label;
}
