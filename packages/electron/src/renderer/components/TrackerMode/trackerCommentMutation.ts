import type { TFunction } from 'i18next';

export type TrackerCommentInvoke = (
  channel: string,
  payload: Record<string, unknown>,
) => Promise<unknown>;

export async function invokeTrackerCommentMutation(
  invoke: TrackerCommentInvoke,
  channel: string,
  payload: Record<string, unknown>,
  t?: TFunction,
): Promise<any> {
  const result = await invoke(channel, payload) as any;
  if (!result?.success) {
    throw new Error(result?.error || (t ? t('tracker:detail_extra.comment_update_failed') : 'Tracker comment update failed'));
  }
  return result;
}
