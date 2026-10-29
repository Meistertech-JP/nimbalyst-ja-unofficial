import type { TrackerRecord } from '../../../core/TrackerRecord';
import type { TrackerGroupBy } from './trackerGrouping';
import { type TrackerDisplayTranslate } from './trackerDisplayLabels';
interface DisplayGroup {
    key: string;
    label: string | null;
    value?: string | null;
    empty?: boolean;
}
/** Project labels only; grouping, lane order, membership and writes keep their original values. */
export declare function resolveTrackerGroupDisplayLabel(group: DisplayGroup, axis: TrackerGroupBy, items: readonly TrackerRecord[], t: TrackerDisplayTranslate, filterType?: string): string;
export {};
