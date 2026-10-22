/**
 * Marker-to-key maps for directory-miss fallbacks.
 *
 * Pure data on purpose: parsers and view models stay free of i18n, while
 * display components resolve `t(key)` in the viewer's locale. Keys live in
 * the `editor` namespace's `comments` group.
 */
import type { DisplayNameFallback, ReplyUnavailableReason } from './commentTypes';

export const DISPLAY_NAME_FALLBACK_KEY: Readonly<Record<DisplayNameFallback, string>> = {
  unknown_member: 'comments.unknown_member',
  agent_session: 'comments.agent_session',
  teammate: 'comments.teammate',
};

export const REPLY_UNAVAILABLE_KEY: Readonly<Record<ReplyUnavailableReason, string>> = {
  restricted: 'comments.reply_unavailable',
  earlier: 'comments.reply_earlier',
  deleted: 'comments.reply_deleted',
};

type RelativeTranslate = (key: string, options?: { count: number }) => string;

/** Resolve a view-model relative label (now, 4m, 2h, 3d) in the viewer's locale. */
export function localizeCommentRelativeTime(label: string, t: RelativeTranslate): string {
  if (label === 'now') return t('comments.relative_now');
  const match = /^(\d+)([mhd])$/.exec(label);
  if (!match) return label;
  const count = Number(match[1]);
  const key = match[2] === 'm'
    ? 'comments.relative_minute'
    : match[2] === 'h'
      ? 'comments.relative_hour'
      : 'comments.relative_day';
  return t(key, { count });
}
