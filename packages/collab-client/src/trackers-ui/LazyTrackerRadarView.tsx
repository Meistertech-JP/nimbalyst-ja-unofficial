import { lazy, Suspense, type JSX } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { TrackerRadarViewProps } from './TrackerRadarView';
import { TrackerSurfaceMessage } from './primitives/TrackerSurfaceMessage';

const TrackerRadarViewImpl = lazy(() => import('./TrackerRadarView').then(module => ({
  default: module.TrackerRadarView,
})));

/** Radar is loaded only when selected, not on the cold tracker route. */
export function LazyTrackerRadarView(props: TrackerRadarViewProps): JSX.Element {
  const { t } = useTranslation('tracker');
  return (
    <Suspense fallback={<TrackerSurfaceMessage icon="radar" message={t('detail.loading_item')} />}>
      <TrackerRadarViewImpl {...props} />
    </Suspense>
  );
}
