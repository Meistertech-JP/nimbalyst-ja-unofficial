import type { TFunction } from 'i18next';
import {
  formatCodexWindowLabel,
  formatCodexWindowSubtitle,
} from '../../store/atoms/codexUsageAtoms';

/** Translate presentation only; the usage atoms remain authoritative for durations. */
export function localizeUsageResetTime(value: string, t: TFunction): string {
  if (value === 'Unknown') return t('common:usage_indicator.reset_unknown');
  if (value === 'Now') return t('common:usage_indicator.reset_now');
  const days = value.match(/^(\d+)d (\d+)h$/);
  if (days) return t('common:usage_indicator.reset_days_hours', { days: days[1], hours: days[2] });
  const hours = value.match(/^(\d+)h (\d+)m$/);
  if (hours) return t('common:usage_indicator.reset_hours_minutes', { hours: hours[1], minutes: hours[2] });
  const minutes = value.match(/^(\d+)m$/);
  if (minutes) return t('common:usage_indicator.reset_minutes', { minutes: minutes[1] });
  return value;
}

export function formatUsageLastUpdated(timestamp: number, t: TFunction): string {
  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSeconds < 60) return t('common:usage_indicator.just_now');
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return t('common:usage_indicator.minutes_ago', { count: diffMinutes });
  return t('common:usage_indicator.hours_ago', { count: Math.floor(diffMinutes / 60) });
}

const CODEX_WINDOW_LABEL_KEYS: Record<string, string> = {
  Session: 'session',
  Daily: 'daily',
  Weekly: 'weekly',
  Monthly: 'monthly',
  Annual: 'annual',
  'Secondary usage': 'secondary_usage',
  Usage: 'usage',
};

export function localizeCodexWindowLabel(window: Parameters<typeof formatCodexWindowLabel>[0], t: TFunction): string {
  const label = formatCodexWindowLabel(window);
  const key = CODEX_WINDOW_LABEL_KEYS[label];
  return key ? t(`common:usage_indicator.${key}`) : label;
}

export function localizeCodexWindowSubtitle(window: Parameters<typeof formatCodexWindowSubtitle>[0], t: TFunction): string {
  const subtitle = formatCodexWindowSubtitle(window);
  if (subtitle === 'Usage window') return t('common:usage_indicator.usage_window');
  const duration = subtitle.match(/^(\d+)-(hour|day|minute) window$/);
  return duration
    ? t(`common:usage_indicator.window_${duration[2]}`, { count: Number(duration[1]) })
    : subtitle;
}
