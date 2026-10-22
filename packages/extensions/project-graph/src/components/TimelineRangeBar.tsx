import { useEffect, useState } from 'react';
import {
  dateRangeFromInputs,
  formatDateInput,
  recentDateRange,
  recentHoursRange,
  type TimelineDateRange,
} from '../timeline/dateRange';
import { useTranslation } from '@nimbalyst/i18n/react';

interface TimelineRangeBarProps {
  range: TimelineDateRange | null;
  onChange: (range: TimelineDateRange | null) => void;
  onClose: () => void;
}

function rangeLabel(range: TimelineDateRange): string {
  // Sub-two-day windows (the 24-hour preset) need the time to be meaningful.
  const withTime = range.endMs - range.startMs < 2 * 24 * 60 * 60 * 1000;
  const format = new Intl.DateTimeFormat(undefined, withTime
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' });
  return `${format.format(range.startMs)} – ${format.format(range.endMs)}`;
}

export function TimelineRangeBar({ range, onChange, onClose }: TimelineRangeBarProps) {
  const { t } = useTranslation('extensions');
  const fallback = recentDateRange(30);
  const [start, setStart] = useState(() => formatDateInput(range?.startMs ?? fallback.startMs));
  const [end, setEnd] = useState(() => formatDateInput(range?.endMs ?? fallback.endMs));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!range) return;
    setStart(formatDateInput(range.startMs));
    setEnd(formatDateInput(range.endMs));
  }, [range]);

  const applyRange = (next: TimelineDateRange): void => {
    setStart(formatDateInput(next.startMs));
    setEnd(formatDateInput(next.endMs));
    setError(null);
    onChange(next);
  };

  const applyCustom = (): void => {
    const next = dateRangeFromInputs(start, end);
    if (!next) {
      setError(t('project_graph.ui.invalid_range'));
      return;
    }
    applyRange(next);
  };

  return (
    <section className="pg-time-range-bar" aria-label={t('project_graph.ui.timeline_range')}>
      <span className="pg-time-range-heading">{t('project_graph.ui.time_range')}</span>
      <div className="pg-time-range-presets" aria-label={t('project_graph.ui.time_range_presets')}>
        <button
          type="button"
          onClick={() => { setError(null); onChange(null); }}
          className={!range ? 'is-active' : ''}
        >
          {t('project_graph.ui.all_time')}
        </button>
        <button type="button" onClick={() => applyRange(recentHoursRange(24))}>
          {t('project_graph.ui.hours', { count: 24 })}
        </button>
        {[7, 30, 90].map(days => (
          <button key={days} type="button" onClick={() => applyRange(recentDateRange(days))}>
            {t('project_graph.ui.days', { count: days })}
          </button>
        ))}
      </div>
      <span className="pg-time-range-divider" />
      <label>
        {t('project_graph.ui.from')}
        <input type="date" value={start} onChange={event => { setStart(event.target.value); setError(null); }} />
      </label>
      <label>
        {t('project_graph.ui.to')}
        <input type="date" value={end} onChange={event => { setEnd(event.target.value); setError(null); }} />
      </label>
      <button type="button" className="pg-time-range-apply" onClick={applyCustom}>{t('project_graph.ui.apply')}</button>
      {range && <span className="pg-time-range-current" title={rangeLabel(range)}>{rangeLabel(range)}</span>}
      {error && <span className="pg-time-range-error" role="alert">{error}</span>}
      <button type="button" className="pg-time-range-close" onClick={onClose} aria-label={t('project_graph.ui.close_time_range')}>×</button>
    </section>
  );
}
