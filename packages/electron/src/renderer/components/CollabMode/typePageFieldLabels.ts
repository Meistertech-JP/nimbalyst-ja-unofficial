import { globalRegistry } from '@nimbalyst/runtime/plugins/TrackerPlugin/models';
import { localizeTrackerColumns, resolveColumnsForType } from '@nimbalyst/runtime/plugins/TrackerPlugin/components/trackerColumns';

/** The type page's own field names, localized only for known fixed labels. */
export function typeFieldLabels(typeId: string, translate: (key: string) => string): string[] {
  const model = globalRegistry.get(typeId);
  if (!model) return [];
  const own = new Set(model.fields.map((field) => field.name));
  return localizeTrackerColumns(resolveColumnsForType(typeId), translate)
    .filter((column) => own.has(column.id) && column.role !== 'title' && column.id !== 'tags')
    .map((column) => column.label);
}
