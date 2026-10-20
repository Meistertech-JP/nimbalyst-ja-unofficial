import React, { useEffect } from 'react';
import { useRuntimeTranslation, type RuntimeTranslate } from '../../RuntimeTranslation';

// Inject rate limit widget styles once (for color-mix patterns)
const injectRateLimitStyles = () => {
  const styleId = 'rate-limit-widget-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .rate-limit-widget {
      background-color: color-mix(in srgb, var(--nim-warning) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--nim-warning) 25%, transparent);
    }
    .rate-limit-widget-blocked {
      background-color: color-mix(in srgb, var(--nim-error) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--nim-error) 25%, transparent);
    }
  `;
  document.head.appendChild(style);
};

interface RateLimitWidgetProps {
  content: string;
}

/**
 * Parses rate limit info from the HTML comment marker format:
 * <!-- [RATE_LIMIT_WARNING] limitType=5-hour session resetsAtUnix=1772233200 usage=91 -->
 * <!-- [RATE_LIMIT] limitType=5-hour session resetsAtUnix=1772233200 -->
 */
function parseRateLimitInfo(content: string): {
  isWarning: boolean;
  limitType: string;
  resetsAtMs: number | null;
  utilization: number | null;
  model: string | null;
} {
  const isWarning = content.includes('[RATE_LIMIT_WARNING]');
  const limitTypeMatch = content.match(/limitType=([^\s]+(?:\s+[^\s=]+)*?)(?:\s+resetsAtUnix=|\s+usage=|\s*-->)/);
  const resetsAtMatch = content.match(/resetsAtUnix=(\d+)/);
  const utilizationMatch = content.match(/usage=(\d+)/);
  const modelMatch = content.match(/model=([^\s>]+)/);

  return {
    isWarning,
    limitType: limitTypeMatch ? limitTypeMatch[1] : 'usage',
    // Convert Unix seconds to milliseconds for Date math
    resetsAtMs: resetsAtMatch ? parseInt(resetsAtMatch[1], 10) * 1000 : null,
    utilization: utilizationMatch ? parseInt(utilizationMatch[1], 10) : null,
    model: modelMatch ? modelMatch[1] : null,
  };
}

function formatResetTime(resetsAtMs: number, t: RuntimeTranslate): string {
  const diffMs = resetsAtMs - Date.now();

  if (diffMs <= 0) return t('errors:rate_limit.any_moment', 'any moment now');

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;

  if (diffHours > 0) {
    return t('errors:rate_limit.hours_minutes', '{{hours}}h {{minutes}}m', { hours: diffHours, minutes: remainingMinutes });
  }
  return t('errors:rate_limit.minutes', '{{minutes}}m', { minutes: diffMinutes });
}

export const RateLimitWidget: React.FC<RateLimitWidgetProps> = ({ content }) => {
  const { t } = useRuntimeTranslation();
  useEffect(() => {
    injectRateLimitStyles();
  }, []);

  const { isWarning, limitType, resetsAtMs, utilization, model } = parseRateLimitInfo(content);
  const accentVar = isWarning ? '--nim-warning' : '--nim-error';
  const is1mModel = model != null && model.includes('-1m');
  const limitLabels: Record<string, string> = {
    '5-hour session': t('errors:rate_limit.five_hour', '5-hour session'),
    usage: t('errors:rate_limit.usage', 'usage'),
    unknown: t('errors:rate_limit.unknown', 'unknown'),
  };
  const limitLabel = limitLabels[limitType] ?? limitType;

  return (
    <div className={isWarning ? 'rate-limit-widget my-4 p-4 rounded-lg flex flex-col gap-2' : 'rate-limit-widget-blocked my-4 p-4 rounded-lg flex flex-col gap-2'}>
      <div className="flex items-center gap-2">
        <span
          className="flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold"
          style={{ backgroundColor: `var(${accentVar})` }}
        >
          !
        </span>
        <span className="text-sm font-semibold" style={{ color: `var(${accentVar})` }}>
          {isWarning ? t('errors:rate_limit.warning', 'Approaching rate limit') : t('errors:rate_limit.reached', 'Rate limit reached')}
        </span>
      </div>
      <div className="text-[var(--nim-text-muted)] text-[0.85rem] leading-relaxed">
        {isWarning
          ? t('errors:rate_limit.warning_detail', "You're at {{usage}} of your {{limitType}} limit.", { usage: utilization != null ? `${utilization}%` : t('errors:rate_limit.near', 'near'), limitType: limitLabel })
          : t('errors:rate_limit.reached_detail', "You've hit your {{limitType}} rate limit.", { limitType: limitLabel })}
        {resetsAtMs && t('errors:rate_limit.resets_in', ' Resets in {{time}}.', { time: formatResetTime(resetsAtMs, t) })}
        {!isWarning && is1mModel && t('errors:rate_limit.model_plan', ' This 1M context model may not be available on your plan.')}
      </div>
    </div>
  );
};
