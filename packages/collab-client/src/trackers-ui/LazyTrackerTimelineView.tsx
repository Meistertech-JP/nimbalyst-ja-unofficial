import { lazy, Suspense, type JSX } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { TrackerTimelineViewProps } from './TrackerTimelineView';
import { TrackerSurfaceMessage } from './primitives/TrackerSurfaceMessage';

const loadTrackerTimelineView = () => import('./TrackerTimelineView');
const TrackerTimelineViewImpl = lazy(() =>
  loadTrackerTimelineView().then((module) => ({
    default: module.TrackerTimelineView,
  }))
);

export function preloadTrackerTimelineView(): void {
  void loadTrackerTimelineView();
}

/** The timeline is a selected view mode, not part of the cold tracker route. */
export function LazyTrackerTimelineView(
  props: TrackerTimelineViewProps
): JSX.Element {
  const { t } = useTranslation('tracker');
  return (
    <Suspense
      fallback={
        <TrackerSurfaceMessage icon="timeline" message={t('view_modes.loading_timeline')} />
      }
    >
      <TrackerTimelineViewImpl {...props} />
    </Suspense>
  );
}
