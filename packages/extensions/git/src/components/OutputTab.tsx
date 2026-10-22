import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { OperationLogEntry } from '../hooks/useOperationLog';
import { ErrorDetailPopup } from './ErrorDetailPopup';

interface OutputTabProps {
  entries: OperationLogEntry[];
  onClear: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const ERROR_PREVIEW_LINES = 3;
const COPY_FEEDBACK_MS = 1500;

function ErrorBlock({ command, error }: { command: string; error: string }) {
  const { t } = useTranslation('git');
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => error.split('\n').filter(Boolean), [error]);
  const hasMore = lines.length > ERROR_PREVIEW_LINES;
  const visibleLines = hasMore ? lines.slice(0, ERROR_PREVIEW_LINES) : lines;
  const hiddenCount = lines.length - visibleLines.length;

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(error);
      setCopied(true);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="git-output-lines git-output-lines--error">
        {visibleLines.map((line, i) => (
          <div key={i} className="git-output-line">&gt; {line}</div>
        ))}
        {hasMore && (
          <div className="git-output-line git-output-line--more">
            {t('supplemental.output.more_lines', { count: hiddenCount })}
          </div>
        )}
      </div>
      <div className="git-output-error-actions">
        {hasMore && (
          <button
            type="button"
            className="git-output-action-btn"
            onClick={() => setShowFull(true)}
          >
            {t('supplemental.output.view_full_error')}
          </button>
        )}
        <button
          type="button"
          className="git-output-action-btn"
          onClick={handleCopy}
        >
          {copied ? t('supplemental.output.copied') : t('supplemental.output.copy')}
        </button>
      </div>
      {showFull && (
        <ErrorDetailPopup
          command={command}
          error={error}
          onClose={() => setShowFull(false)}
        />
      )}
    </>
  );
}

function EntryRow({ entry }: { entry: OperationLogEntry }) {
  const { t } = useTranslation('git');
  const borderClass =
    entry.status === 'error' ? 'git-output-entry--error' :
    entry.status === 'running' ? 'git-output-entry--running' :
    entry.status === 'interrupted' ? 'git-output-entry--interrupted' :
    'git-output-entry--success';

  return (
    <div className={`git-output-entry ${borderClass}`} data-source={entry.source ?? 'nimbalyst'}>
      <div className="git-output-entry-header">
        <span className="git-output-timestamp">{formatTime(entry.timestamp)}</span>
        {/* An agent's `git fetch` is indistinguishable from the user's without
            this, and the two carry very different expectations. */}
        {entry.source === 'agent' && (
          <span className="git-output-source" title={t('supplemental.output.agent_started_title')}>{t('supplemental.output.agent')}</span>
        )}
        <code className="git-output-command">{entry.command}</code>
      </div>

      {entry.output && (
        <div className="git-output-lines">
          {entry.output.split('\n').filter(Boolean).map((line, i) => (
            <div key={i} className="git-output-line">&gt; {line}</div>
          ))}
        </div>
      )}

      {entry.error && !entry.output.includes(entry.error.trim()) && (
        <ErrorBlock command={entry.command} error={entry.error} />
      )}

      {entry.status === 'success' && (
        <div className="git-output-status git-output-status--success">
          &#10003; {entry.durationMs != null
            ? t('supplemental.output.completed_in', { duration: formatDuration(entry.durationMs) })
            : t('supplemental.output.completed')}
        </div>
      )}

      {entry.status === 'error' && (
        <div className="git-output-status git-output-status--error">
          &#10007; {entry.exitCode != null && entry.durationMs != null
            ? t('supplemental.output.failed_exit_after', {
              code: entry.exitCode,
              duration: formatDuration(entry.durationMs),
            })
            : entry.exitCode != null
              ? t('log_panel.operation_status.failed_exit', { exitCode: entry.exitCode })
              : entry.durationMs != null
                ? t('supplemental.output.failed_after', { duration: formatDuration(entry.durationMs) })
                : t('supplemental.output.failed')}
        </div>
      )}

      {entry.status === 'interrupted' && (
        <div className="git-output-status git-output-status--interrupted">
          {entry.durationMs != null
            ? t('supplemental.output.interrupted_after', { duration: formatDuration(entry.durationMs) })
            : t('supplemental.output.interrupted')}
        </div>
      )}

      {entry.status === 'running' && (
        <div className="git-output-status git-output-status--running">
          <span className="git-output-spinner" /> {t('supplemental.output.running')}
        </div>
      )}

      {entry.suggestion && (
        <div className="git-output-suggestion">
          {t('supplemental.output.suggestion')}: {entry.suggestion}
        </div>
      )}
    </div>
  );
}

export function OutputTab({ entries, onClear }: OutputTabProps) {
  const { t } = useTranslation('git');
  const scrollRef = useRef<HTMLDivElement>(null);
  const followOutputRef = useRef(true);

  // Remember the user's position before output grows; checking the new height
  // here would mistake appended output for the user scrolling away.
  useLayoutEffect(() => {
    if (entries.length === 0) followOutputRef.current = true;
    if (scrollRef.current && followOutputRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="git-output-empty">
        <span>{t('supplemental.output.empty_title')}</span>
        <span className="git-output-empty-hint">{t('supplemental.output.empty_description')}</span>
      </div>
    );
  }

  return (
    <div className="git-output-tab">
      <div
        className="git-output-scroll"
        ref={scrollRef}
        onScroll={event => {
          const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
          followOutputRef.current = scrollHeight - scrollTop - clientHeight <= 1;
        }}
      >
        {entries.map(entry => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
      </div>
      <div className="git-output-footer">
        <button className="git-output-clear-btn" onClick={onClear}>
          {t('supplemental.output.clear_log')}
        </button>
      </div>
    </div>
  );
}
