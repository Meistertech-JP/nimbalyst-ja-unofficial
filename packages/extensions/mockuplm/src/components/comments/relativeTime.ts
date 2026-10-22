const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Format the comment timestamp in the same language as the surrounding UI. */
export function formatRelativeTime(
  timestamp: number,
  language: string,
  now = Date.now(),
): string {
  const elapsed = now - timestamp;
  const formatter = new Intl.RelativeTimeFormat(language, {
    numeric: "auto",
    style: "short",
  });
  if (!Number.isFinite(elapsed) || elapsed < MINUTE) {
    return formatter.format(0, "second");
  }
  if (elapsed < HOUR) return formatter.format(-Math.floor(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return formatter.format(-Math.floor(elapsed / HOUR), "hour");
  if (elapsed < 7 * DAY) return formatter.format(-Math.floor(elapsed / DAY), "day");
  return new Date(timestamp).toLocaleDateString(language);
}
