/**
 * Two things a person needs when a type they expected the team to see is not
 * there: a way to share a personal type (the same promotion Settings > Trackers
 * runs, with the same confirmation), and a word when the workspace's team types
 * are not reaching the team's server at all.
 *
 * Personal types stay on this machine by design; nothing here changes that
 * default. It only makes the state visible and the existing promotion closer.
 */

import { useEffect, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useAtomValue } from 'jotai';
import { store } from '@nimbalyst/runtime/store';
import { globalRegistry, type TrackerDataModel } from '@nimbalyst/tracker-schema';
import { trackerItemCountByTypeAtom } from '@nimbalyst/runtime/plugins/TrackerPlugin';
import { resolveTrackerPromotionEligibility } from '@nimbalyst/runtime/plugins/TrackerPlugin/models/trackerLifecycle';
import { requestConfirmation } from '../../dialogs/requestConfirmation';
import { errorNotificationService } from '../../services/ErrorNotificationService';
import { trackerSyncConnectionAtom } from '../../store/atoms/trackerSync';
import { TEAM_TYPES_NOT_SYNCING_GRACE_MS, teamTypesAreNotSyncing } from './teamTypesSyncState';

export function canShareTrackerTypeWithTeam(model: TrackerDataModel): boolean {
  return model.sharing === 'personal' && resolveTrackerPromotionEligibility(model).canPromote;
}

/** Confirm, then promote a personal type and its items to the team. Resolves true once it is the team's. */
export async function shareTrackerTypeWithTeam(
  workspacePath: string,
  model: TrackerDataModel,
  t: TFunction,
): Promise<boolean> {
  const itemCount = store.get(trackerItemCountByTypeAtom(model.type));
  const itemLabel = itemCount === 1
    ? t('config.lifecycle.one_item')
    : t('config.lifecycle.many_items', { count: itemCount });
  const isResume = model.sharing === 'team';
  const approved = await requestConfirmation({
    title: t(isResume ? 'config.lifecycle.resume_share_title' : 'config.lifecycle.promote_title', { name: model.displayNamePlural }),
    message: t(isResume ? 'config.lifecycle.resume_share_message' : 'config.lifecycle.promote_message', {
      name: model.displayNamePlural,
      itemLabel,
    }),
    confirmLabel: t(isResume ? 'config.lifecycle.resume_share_confirm' : 'config.lifecycle.promote_confirm'),
    cancelLabel: t('config.cancel'),
    destructive: false,
  });
  if (!approved) return false;
  try {
    const result = await window.electronAPI.trackerLifecycle.promoteToTeam({ workspacePath, type: model.type });
    if (!result?.success) throw new Error(result?.error || t('config.lifecycle.promote_failed'));
    const { publishedCount = 0, pendingKeyCount = 0 } = result.promotion ?? {};
    errorNotificationService.showInfo(
      errorNotificationService.getLocalizedText(
        'tracker',
        'config.lifecycle.promoted_title',
        "{{name}} is now your team's",
        { name: model.displayNamePlural },
      ),
      pendingKeyCount > 0
        ? errorNotificationService.getLocalizedText(
          'tracker',
          'config.lifecycle.promoted_pending',
          '{{publishedCount}} item(s) published. {{pendingKeyCount}} are waiting on the server for their keys.',
          { publishedCount, pendingKeyCount },
        )
        : errorNotificationService.getLocalizedText(
          'tracker',
          'config.lifecycle.promoted',
          '{{count}} item(s) published, each with its issue key.',
          { count: publishedCount },
        ),
      { duration: 4000 },
    );
    return true;
  } catch (error) {
    errorNotificationService.showError(
      errorNotificationService.getLocalizedText('tracker', 'config.lifecycle.update_failed', 'Tracker update failed'),
      error instanceof Error
        ? error.message
        : errorNotificationService.getLocalizedText(
          'tracker',
          'config.lifecycle.promote_failed',
          'Could not share this tracker with your team.',
        ),
    );
    return false;
  }
}

/** {@link teamTypesAreNotSyncing} for the current registry, held back for the grace period. */
export function useTeamTypesNotSyncing(workspacePath: string | null | undefined): boolean {
  const connection = useAtomValue(trackerSyncConnectionAtom);
  const [registryRevision, setRegistryRevision] = useState(0);
  useEffect(() => globalRegistry.onChange(() => setRegistryRevision((value) => value + 1)), []);
  // registryRevision invalidates the memo when types change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hasTeamTypes = useMemo(() => globalRegistry.getListed().some((type) => type.sharing === 'team'), [registryRevision]);
  const notSyncing = teamTypesAreNotSyncing(connection, workspacePath, hasTeamTypes);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!notSyncing) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), TEAM_TYPES_NOT_SYNCING_GRACE_MS);
    return () => clearTimeout(timer);
  }, [notSyncing]);
  return shown;
}
