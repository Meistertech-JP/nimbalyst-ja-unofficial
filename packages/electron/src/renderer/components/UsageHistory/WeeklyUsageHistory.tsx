/**
 * WeeklyUsageHistory - weekly usage history for the usage popovers.
 *
 * Collapsed by default. Shows a chart of utilization across the selected week
 * against an even-pace line, and a row per recorded week with its final value.
 * A completed week marked "at least" had its last reading long before the reset
 * (Nimbalyst was closed), so the true final value may be higher.
 */

import React, { useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { TFunction } from 'i18next';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import {
  USAGE_WEEK_MS,
  usageWeeksByMeter,
  type UsageWeek,
  type UsageWeekRecord,
} from '../../../shared/usageHistory';

const VISIBLE_WEEKS = 8;
const CHART_WIDTH = 200;
const CHART_HEIGHT = 56;

function usageColor(utilization: number): { bar: string; text: string } {
  if (utilization >= 80) return { bar: 'bg-red-500', text: 'text-red-500' };
  if (utilization >= 50) return { bar: 'bg-yellow-500', text: 'text-yellow-500' };
  return { bar: 'bg-green-500', text: 'text-green-500' };
}

function formatDate(ms: number, locale: string): string {
  return new Date(ms).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function meterLabel(meter: string, label: string, t: TFunction<'common'>): string {
  if (meter === 'claude:weekly' || label === 'Weekly') return t('weekly_history.weekly');
  if (meter.startsWith('claude:model:') && label.endsWith(' (Weekly)')) {
    return t('weekly_history.model_weekly', { model: label.slice(0, -9) });
  }
  if (meter.startsWith('codex:') && label.endsWith(' · Weekly')) {
    return t('weekly_history.model_weekly', { model: label.slice(0, -9) });
  }
  return label;
}

function weekKey(meter: string, week: UsageWeek): string {
  return `${meter}|${week.resetsAt}`;
}

/** Step line: each reading holds until the next one, and the line stops at the last reading. */
function usageStepPath(week: UsageWeek): string | null {
  const resetMs = Date.parse(week.resetsAt);
  const startMs = resetMs - USAGE_WEEK_MS;
  const points = week.points?.length ? week.points : [[week.lastSeenAt, week.utilization] as [number, number]];
  const x = (ms: number) => (Math.max(0, Math.min(USAGE_WEEK_MS, ms - startMs)) / USAGE_WEEK_MS) * CHART_WIDTH;
  const y = (value: number) => CHART_HEIGHT - (Math.max(0, Math.min(100, value)) / 100) * CHART_HEIGHT;

  const [[firstMs, firstValue], ...rest] = points;
  let path = `M ${x(firstMs)} ${y(firstValue)}`;
  for (const [ms, value] of rest) {
    path += ` H ${x(ms)} V ${y(value)}`;
  }
  path += ` H ${x(Math.max(week.lastSeenAt, points[points.length - 1][0]))}`;
  return path;
}

const WeekChart: React.FC<{ label: string; week: UsageWeek }> = ({ label, week }) => {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const resetMs = Date.parse(week.resetsAt);
  const path = usageStepPath(week);
  return (
    <div className="weekly-usage-chart">
      <div className="mb-1 flex items-baseline justify-between text-[11px]">
        <span className="font-medium text-nim">{label}</span>
        <span className="text-nim-muted">{week.inProgress ? t('weekly_history.this_week') : t('weekly_history.ended', { date: formatDate(resetMs, locale) })}</span>
      </div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="block h-14 w-full rounded bg-nim-tertiary"
        role="img"
        aria-label={t('weekly_history.chart_label', { label })}
      >
        {/* Even pace: where usage would be if spread evenly across the week */}
        <line
          x1={0} y1={CHART_HEIGHT} x2={CHART_WIDTH} y2={0}
          stroke="currentColor" strokeDasharray="3 3" vectorEffect="non-scaling-stroke"
          className="text-nim-faint"
        />
        {path && (
          <path
            d={path} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke"
            className={usageColor(week.utilization).text}
          />
        )}
      </svg>
      <div className="mt-0.5 flex justify-between text-[10px] text-nim-faint">
        <span>{formatDate(resetMs - USAGE_WEEK_MS, locale)}</span>
        <span>{formatDate(resetMs, locale)}</span>
      </div>
    </div>
  );
};

export const WeeklyUsageHistory: React.FC<{ history: UsageWeekRecord[] | undefined }> = ({ history }) => {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const meters = usageWeeksByMeter(history, Date.now());
  if (meters.length === 0) return null;

  const selected = meters
    .flatMap(meter => meter.weeks.map(week => ({ meter, week })))
    .find(({ meter, week }) => weekKey(meter.meter, week) === selectedKey)
    ?? { meter: meters[0], week: meters[0].weeks[0] };

  return (
    <div className="weekly-usage-history border-t border-nim px-4 py-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-[12px] font-medium text-nim-muted hover:text-nim transition-colors"
        aria-expanded={expanded}
      >
        <span>{t('weekly_history.title')}</span>
        <MaterialSymbol icon={expanded ? 'expand_less' : 'expand_more'} size={14} />
      </button>
      {expanded && (
        <div className="mt-2 flex flex-col gap-3 select-text">
          <WeekChart label={meterLabel(selected.meter.meter, selected.meter.label, t)} week={selected.week} />
          {meters.map(meter => {
            const weeks = showAll ? meter.weeks : meter.weeks.slice(0, VISIBLE_WEEKS);
            return (
              <div key={meter.meter} className="weekly-usage-history-meter">
                {meters.length > 1 && (
                  <div className="mb-1 text-[11px] font-medium text-nim">{meterLabel(meter.meter, meter.label, t)}</div>
                )}
                {weeks.map(week => {
                  const key = weekKey(meter.meter, week);
                  const isSelected = key === weekKey(selected.meter.meter, selected.week);
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedKey(key)}
                      className={`flex w-full items-center gap-2 rounded px-1 -mx-1 text-[11px] leading-5 text-nim-muted ${isSelected ? 'bg-nim-tertiary text-nim' : 'hover:bg-nim-tertiary'}`}
                      title={week.partial
                        ? t('weekly_history.partial_title', { date: new Date(week.lastSeenAt).toLocaleString(locale) })
                        : t(week.inProgress ? 'weekly_history.resets' : 'weekly_history.week_ended', { date: new Date(week.resetsAt).toLocaleString(locale) })}
                    >
                      <span className="w-14 shrink-0 text-left">
                        {week.inProgress ? t('weekly_history.this_week') : formatDate(Date.parse(week.resetsAt), locale)}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-nim-tertiary">
                        <div
                          className={`h-full rounded-full ${usageColor(week.utilization).bar}`}
                          style={{ width: `${Math.min(week.utilization, 100)}%` }}
                        />
                      </div>
                      <span className="w-11 shrink-0 text-right tabular-nums">
                        {week.partial ? '≥' : ''}{Math.round(week.utilization)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          {meters.some(meter => meter.weeks.length > VISIBLE_WEEKS) && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="self-start text-[11px] text-nim-muted hover:text-nim transition-colors"
            >
              {t(showAll ? 'weekly_history.show_fewer' : 'weekly_history.show_all')}
            </button>
          )}
          <div className="text-[10px] text-nim-faint">
            {t('weekly_history.note')}
          </div>
        </div>
      )}
    </div>
  );
};
