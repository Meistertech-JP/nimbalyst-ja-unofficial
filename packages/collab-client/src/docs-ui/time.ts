export function getRelativeTimeString(timestamp: number, translate: (key: string, options?: { count: number }) => string, locale: string): string {
  const delta = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return translate('sync_status.just_now');
  if (minutes < 60) return translate('sync_status.minutes_ago', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return translate('sync_status.hours_ago', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return translate('sync_status.days_ago', { count: days });
  return new Date(timestamp).toLocaleDateString(locale);
}
