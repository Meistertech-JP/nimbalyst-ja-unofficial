/**
 * ClaudeUsageIndicator - Circular progress indicator for Claude Code usage
 *
 * Displays the 5-hour session utilization as a circular progress ring
 * in the navigation gutter. Clicking opens a popover with full details.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import {
  claudeUsageAtom,
  claudeUsageAvailableAtom,
  claudeUsageSessionColorAtom,
  formatResetTime,
} from '../../store/atoms/claudeUsageAtoms';
import { ClaudeUsagePopover } from './ClaudeUsagePopover';
import { refreshClaudeUsage } from '../../store/listeners/claudeUsageListeners';
import { localizeUsageResetTime } from './usagePresentation';

const RING_RADIUS = 12;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface ClaudeUsageIndicatorProps {
  className?: string;
}

export const ClaudeUsageIndicator: React.FC<ClaudeUsageIndicatorProps> = ({ className }) => {
  const { t } = useTranslation(['common']);
  const usage = useAtomValue(claudeUsageAtom);
  const isAvailable = useAtomValue(claudeUsageAvailableAtom);
  const sessionColor = useAtomValue(claudeUsageSessionColorAtom);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  const handleRefresh = useCallback(async () => {
    await refreshClaudeUsage();
  }, []);

  if (!isAvailable) {
    return null;
  }

  const hasLoadError = Boolean(usage?.error);
  const utilization = hasLoadError ? 0 : usage?.fiveHour?.utilization ?? 0;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - utilization / 100);

  // Color mapping
  const colorClasses: Record<string, string> = {
    green: 'stroke-green-500',
    yellow: 'stroke-yellow-500',
    red: 'stroke-red-500',
    muted: 'stroke-nim-muted',
  };

  const effectiveSessionColor = hasLoadError ? 'muted' : sessionColor;
  const strokeColor = colorClasses[effectiveSessionColor] || colorClasses.muted;

  const tooltipContent = usage?.error
    ? t('common:usage_indicator.error_unavailable', { provider: 'Claude', error: usage.error })
    : usage
      ? t('common:usage_indicator.session_tooltip', { percent: Math.round(utilization), time: localizeUsageResetTime(formatResetTime(usage.fiveHour.resetsAt), t) })
      : t('common:usage_indicator.unavailable', { provider: 'Claude' });

  return (
    <div className={`relative ${className || ''}`}>
      <button
        ref={buttonRef}
        onClick={handleClick}
        title={tooltipContent}
        className="relative w-9 h-9 flex items-center justify-center bg-transparent border-none rounded-md cursor-pointer transition-all duration-150 p-0 hover:bg-nim-tertiary active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--nim-primary)] focus-visible:outline-offset-2"
        aria-label={t('common:usage_indicator.claude_title')}
        data-testid="claude-usage-indicator"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx="16"
            cy="16"
            r={RING_RADIUS}
            fill="none"
            className="stroke-nim-tertiary"
            strokeWidth="3"
          />
          {/* Progress ring */}
          <circle
            cx="16"
            cy="16"
            r={RING_RADIUS}
            fill="none"
            className={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        {/* Percentage text */}
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-nim">
          {hasLoadError ? '--' : `${Math.round(utilization)}%`}
        </span>
      </button>

      {/* Popover */}
      {isPopoverOpen && (
        <ClaudeUsagePopover
          anchorRef={buttonRef}
          onClose={() => setIsPopoverOpen(false)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
};
