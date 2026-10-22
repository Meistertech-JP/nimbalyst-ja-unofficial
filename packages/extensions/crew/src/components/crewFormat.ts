/** Display formatting shared by the roster, desk, feed and Hire dialog. */
import type { CrewMemberStatus, CrewScheduleSpec, CrewWeekday } from '../shared/types';

export function formatTokens(tokens: number): string {
  if (!Number.isFinite(tokens) || tokens <= 0) return '0';
  if (tokens >= 1_000_000) return `${trimZero((tokens / 1_000_000).toFixed(1))}M`;
  if (tokens >= 1_000) return `${trimZero((tokens / 1_000).toFixed(1))}k`;
  return String(Math.round(tokens));
}

function trimZero(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value;
}

function parseIso(iso: string | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "14:12" today, "Mon 09:00" within a week, "Sep 14" beyond that. */
export function formatWhen(iso: string | undefined, now: Date = new Date()): string {
  const date = parseIso(iso);
  if (!date) return '';
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (isSameDay(date, now)) return time;
  if (Math.abs(date.getTime() - now.getTime()) < 6 * 24 * 60 * 60 * 1000) {
    return `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatDay(iso: string | undefined): string {
  const date = parseIso(iso);
  return date ? date.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
}

/** "Sep 14 - Sep 21", or "Sep 22 - now" for an open range. */
export function formatDateRange(
  startIso: string,
  endIso: string | undefined,
  translate?: CrewTranslate,
): string {
  const start = formatDay(startIso);
  const end = endIso ? formatDay(endIso) : (translate ?? defaultCrewTranslate)('crew.desk.range_now');
  return start === end ? start : `${start} - ${end}`;
}

export const WEEKDAYS: readonly CrewWeekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const WEEKDAY_KEYS: Record<CrewWeekday, string> = {
  monday: 'mon', tuesday: 'tue', wednesday: 'wed', thursday: 'thu', friday: 'fri', saturday: 'sat', sunday: 'sun',
};

/** English fallbacks so the pure formatter stays testable without an i18n instance. */
const TIMING_DEFAULTS: Record<string, string> = {
  'crew.timing.daily': 'Daily {{time}}',
  'crew.timing.weekdays': 'Weekdays {{time}}',
  'crew.timing.interval': 'Every {{minutes}} min',
  'crew.timing.once': 'Once, {{when}}',
  'crew.timing.unscheduled': 'Unscheduled',
  'crew.timing.mon': 'Mon', 'crew.timing.tue': 'Tue', 'crew.timing.wed': 'Wed',
  'crew.timing.thu': 'Thu', 'crew.timing.fri': 'Fri', 'crew.timing.sat': 'Sat', 'crew.timing.sun': 'Sun',
  'crew.desk.range_now': 'now',
};

export type CrewTranslate = (key: string, params?: Record<string, unknown>) => string;

/** Localized roster status text without changing the persisted status/detail values. */
export function formatCrewStatus(
  status: CrewMemberStatus,
  detail: string,
  translate: CrewTranslate,
): string {
  if (status === 'sleeping' && detail.startsWith('Sleeping until ')) {
    const when = detail.slice('Sleeping until '.length).replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/, (day) =>
      translate(`crew.timing.${({ Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' } as const)[day]}`),
    );
    return translate('crew.status.sleeping_until', { when });
  }
  if (status === 'error' && detail.startsWith('Definition file has errors: ')) {
    return translate('crew.status.definition_errors', { errors: detail.slice('Definition file has errors: '.length) });
  }
  return translate(`crew.status.${status.replace(/-/g, '_')}`);
}

/** Translate generated chapter reasons at the display boundary; keep unknown/legacy values intact. */
export function formatChapterEndReason(reason: string, translate: CrewTranslate): string {
  if (reason === 'rolled') return translate('crew.desk.end_reason_rolled');
  const context = /^context is (\d+)% full$/.exec(reason);
  if (context) return translate('crew.desk.end_reason_context', { percent: context[1] });
  const age = /^chapter is (\d+) days old$/.exec(reason);
  if (age) return translate('crew.desk.end_reason_age', { days: age[1] });
  return reason;
}

function defaultCrewTranslate(key: string, params?: Record<string, unknown>): string {
  return (TIMING_DEFAULTS[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    params && name in params ? String(params[name]) : `{{${name}}}`);
}

/** The timing half of a schedule entry: "Daily 18:30", "Weekdays 09:00", "Every 90 min". */
export function formatScheduleTiming(spec: CrewScheduleSpec, translate?: CrewTranslate): string {
  const t = translate ?? defaultCrewTranslate;
  if (spec.daily) return t('crew.timing.daily', { time: spec.daily });
  if (spec.weekly) {
    const days = spec.weekly.days;
    const isWeekdays = days.length === 5 && !days.includes('saturday') && !days.includes('sunday');
    return isWeekdays
      ? t('crew.timing.weekdays', { time: spec.weekly.time })
      : [...days]
          .sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
          .map((day) => t(`crew.timing.${WEEKDAY_KEYS[day]}`))
          .join(', ') + ' ' + spec.weekly.time;
  }
  if (spec.interval) return t('crew.timing.interval', { minutes: spec.interval.minutes });
  if (spec.at) return t('crew.timing.once', { when: formatWhen(spec.at) });
  return t('crew.timing.unscheduled');
}

/** A filename-safe slug from a display name; the member file is `<slug>.md`. */
export function slugifyCrewName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

/** The name's slug, or the first free `name-2`, `name-3`, ... when it is taken. */
export function freeSlug(base: string, taken: ReadonlySet<string>): string {
  if (!base || !taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
