import type { TFunction } from 'i18next';
import type { CollabProductStatus } from '../store/atoms/collabEditor';

/** Localize presentation only; the state kind and recovery/presence gates stay authoritative. */
export function getCollabStatusPresentation(status: CollabProductStatus, t: TFunction) {
  return {
    label: t(`editor:collab_status.${status.kind}.label`, { defaultValue: status.label }),
    detail: status.detail === null ? null : t(`editor:collab_status.${status.kind}.detail`, {
      defaultValue: status.detail,
    }),
  };
}
