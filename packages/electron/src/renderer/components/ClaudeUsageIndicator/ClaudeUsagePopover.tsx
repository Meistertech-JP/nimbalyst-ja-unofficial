/**
 * ClaudeUsagePopover - Detailed usage information popover
 *
 * Shows both session (5-hour) and weekly (7-day) usage with progress bars
 * and reset times.
 */

import React, { useEffect, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue, useSetAtom } from 'jotai';
import { MaterialSymbol, ProviderIcon } from '@nimbalyst/runtime';
import {
  claudeUsageAtom,
  claudeUsageSessionColorAtom,
  claudeUsageWeeklyColorAtom,
  formatResetTime,
} from '../../store/atoms/claudeUsageAtoms';
import { toggleGutterItemHiddenAtom } from '../../store/atoms/appSettings';
import { useFloatingMenu, FloatingPortal } from '../../hooks/useFloatingMenu';
import { formatUsageLastUpdated, localizeUsageResetTime } from './usagePresentation';

interface ClaudeUsagePopoverProps {
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

interface UsageSectionProps {
  title: string;
  subtitle: string;
  utilization: number;
  resetsAt: string | null;
  color: 'green' | 'yellow' | 'red' | 'muted';
  windowDurationMs: number; // Duration of the window in milliseconds
}

/**
 * Calculate the percentage of time elapsed in the current window.
 * Returns a value between 0-100.
 */
function calculateTimeElapsedPercent(resetsAt: string | null, windowDurationMs: number): number {
  if (!resetsAt) return 0;

  const resetTime = new Date(resetsAt).getTime();
  const now = Date.now();
  const windowStartTime = resetTime - windowDurationMs;
  const elapsedMs = now - windowStartTime;

  // Clamp to 0-100
  const percent = (elapsedMs / windowDurationMs) * 100;
  return Math.max(0, Math.min(100, percent));
}

const UsageSection: React.FC<UsageSectionProps> = ({
  title,
  subtitle,
  utilization,
  resetsAt,
  color,
  windowDurationMs,
}) => {
  const { t } = useTranslation(['common']);
  const colorClasses: Record<string, { text: string; bar: string }> = {
    green: { text: 'text-green-500', bar: 'bg-green-500' },
    yellow: { text: 'text-yellow-500', bar: 'bg-yellow-500' },
    red: { text: 'text-red-500', bar: 'bg-red-500' },
    muted: { text: 'text-nim-muted', bar: 'bg-nim-muted' },
  };

  const colors = colorClasses[color] || colorClasses.muted;
  const timeElapsedPercent = calculateTimeElapsedPercent(resetsAt, windowDurationMs);
  const isOverPacing = utilization > timeElapsedPercent;

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-baseline mb-1">
        <div>
          <div className="text-[13px] font-semibold text-nim">{title}</div>
          <div className="text-[11px] text-nim-muted">{subtitle}</div>
        </div>
        <div className={`text-[16px] font-semibold ${colors.text}`}>
          {Math.round(utilization)}%
        </div>
      </div>
      <div className="relative h-1.5 bg-nim-tertiary rounded-full overflow-hidden mb-1.5">
        {/* Usage fill bar */}
        <div
          className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
          style={{ width: `${Math.min(utilization, 100)}%` }}
        />
        {/* Pace marker - vertical line showing where you "should be" based on time elapsed */}
        <div
          className={`absolute top-0 h-full w-0.5 transition-all duration-300 ${isOverPacing ? 'bg-red-400' : 'bg-nim-text-muted'}`}
          style={{ left: `${timeElapsedPercent}%` }}
          title={t('common:usage_indicator.pace_elapsed', { percent: Math.round(timeElapsedPercent) })}
        />
      </div>
      <div className="flex items-center gap-1 text-[11px] text-nim-muted">
        <MaterialSymbol icon="schedule" size={12} className="opacity-70" />
        <span>{t('common:usage_indicator.resets_in', { time: localizeUsageResetTime(formatResetTime(resetsAt), t) })}</span>
      </div>
    </div>
  );
};

export const ClaudeUsagePopover: React.FC<ClaudeUsagePopoverProps> = ({
  anchorRef,
  onClose,
  onRefresh,
}) => {
  const { t } = useTranslation(['common']);
  const usage = useAtomValue(claudeUsageAtom);
  const sessionColor = useAtomValue(claudeUsageSessionColorAtom);
  const weeklyColor = useAtomValue(claudeUsageWeeklyColorAtom);
  const toggleGutterItemHidden = useSetAtom(toggleGutterItemHiddenAtom);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const menu = useFloatingMenu({
    placement: 'right-end',
    open: true,
    onOpenChange: (open) => { if (!open) onClose(); },
  });

  // Set the anchor element as the position reference
  useEffect(() => {
    if (anchorRef.current) {
      menu.refs.setReference(anchorRef.current);
    }
  }, [anchorRef, menu.refs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!usage) {
    return null;
  }

  return (
    <FloatingPortal>
      <div
        ref={menu.refs.setFloating}
        style={menu.floatingStyles}
        {...menu.getFloatingProps()}
        className="w-60 bg-nim-secondary border border-nim rounded-lg shadow-lg z-50 overflow-y-auto"
        data-testid="claude-usage-popover"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-nim">
          <div className="flex items-center gap-2">
            <ProviderIcon provider="claude-code" size={18} className="shrink-0 text-amber-500" />
            <span className="text-[14px] font-semibold text-nim">{t('common:usage_indicator.claude_title')}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1 rounded hover:bg-nim-tertiary text-nim-muted hover:text-nim transition-colors disabled:opacity-50"
              aria-label={t('common:usage_indicator.refresh')}
            >
              <MaterialSymbol icon="refresh" size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-nim-tertiary text-nim-muted hover:text-nim transition-colors"
              aria-label={t('common:usage_indicator.close')}
            >
              <MaterialSymbol icon="close" size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {usage.error ? (
            <div className="text-[13px] text-nim-error">{usage.error}</div>
          ) : (
            <>
              <UsageSection
                title={t('common:usage_indicator.session')}
                subtitle={t('common:usage_indicator.five_hour')}
                utilization={usage.fiveHour.utilization}
                resetsAt={usage.fiveHour.resetsAt}
                color={sessionColor as 'green' | 'yellow' | 'red' | 'muted'}
                windowDurationMs={5 * 60 * 60 * 1000} // 5 hours
              />
              <UsageSection
                title={t('common:usage_indicator.weekly')}
                subtitle={t('common:usage_indicator.seven_day')}
                utilization={usage.sevenDay.utilization}
                resetsAt={usage.sevenDay.resetsAt}
                color={weeklyColor as 'green' | 'yellow' | 'red' | 'muted'}
                windowDurationMs={7 * 24 * 60 * 60 * 1000} // 7 days
              />
              {usage.sevenDayOpus && usage.sevenDayOpus.utilization > 0 && (
                <UsageSection
                  title={t('common:usage_indicator.opus_weekly')}
                  subtitle={t('common:usage_indicator.seven_day')}
                  utilization={usage.sevenDayOpus.utilization}
                  resetsAt={usage.sevenDayOpus.resetsAt}
                  color={
                    usage.sevenDayOpus.utilization >= 80
                      ? 'red'
                      : usage.sevenDayOpus.utilization >= 50
                        ? 'yellow'
                        : 'green'
                  }
                  windowDurationMs={7 * 24 * 60 * 60 * 1000} // 7 days
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-nim flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            {usage.lastUpdated && (
              <span className="text-[10px] text-nim-faint">
                {t('common:usage_indicator.updated', { time: formatUsageLastUpdated(usage.lastUpdated, t) })}
              </span>
            )}
            <button
              onClick={() => {
                toggleGutterItemHidden({ id: 'claude-usage', hidden: true });
                onClose();
              }}
              className="text-[11px] text-nim-muted hover:text-nim transition-colors"
            >
              {t('common:usage_indicator.disable')}
            </button>
          </div>
          <button
            onClick={() => window.electronAPI.openExternal('https://status.anthropic.com')}
            className="flex items-center gap-1 text-[11px] text-nim-muted hover:text-nim transition-colors"
          >
            <MaterialSymbol icon="open_in_new" size={12} />
            <span>{t('common:usage_indicator.anthropic_status')}</span>
          </button>
        </div>
      </div>
    </FloatingPortal>
  );
};
