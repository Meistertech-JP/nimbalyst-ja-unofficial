import { useTranslation } from '@nimbalyst/i18n/react';

interface SummaryBarProps {
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
}

export function SummaryBar({ passed, failed, skipped, flaky, durationMs }: SummaryBarProps) {
  const { t } = useTranslation('extensions', { keyPrefix: 'playwright.summary' });
  const total = passed + failed + skipped + flaky;
  const duration = durationMs < 1000
    ? `${durationMs}ms`
    : durationMs < 60000
    ? `${(durationMs / 1000).toFixed(1)}s`
    : `${Math.floor(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;

  return (
    <div className="pw-summary-bar">
      <div className="pw-summary-stats">
        {passed > 0 && (
          <span className="pw-stat pw-stat-passed">
            <span className="pw-stat-dot" style={{ background: '#4ade80' }} />
            {t('passed', { count: passed })}
          </span>
        )}
        {failed > 0 && (
          <span className="pw-stat pw-stat-failed">
            <span className="pw-stat-dot" style={{ background: '#ef4444' }} />
            {t('failed', { count: failed })}
          </span>
        )}
        {flaky > 0 && (
          <span className="pw-stat pw-stat-flaky">
            <span className="pw-stat-dot" style={{ background: '#fbbf24' }} />
            {t('flaky', { count: flaky })}
          </span>
        )}
        {skipped > 0 && (
          <span className="pw-stat pw-stat-skipped">
            <span className="pw-stat-dot" style={{ background: '#808080' }} />
            {t('skipped', { count: skipped })}
          </span>
        )}
      </div>
      <div className="pw-summary-meta">
        <span>{t('tests', { count: total })}</span>
        <span>{duration}</span>
      </div>
    </div>
  );
}
