import { useMemo } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import { useSessionsForFile, type SessionEditEntry } from '../hooks/useSessionsForFile';

interface ActiveFile {
  path: string;
  group: string;
}

interface SessionsForFilePaneProps {
  workspacePath: string;
  activeFile: ActiveFile | null;
  onCollapse: () => void;
}

function formatRelative(ts: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (!ts) return '';
  const diffMs = Date.now() - ts;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return t('sessions:relative_time.compact_just_now');
  if (diffMins < 60) return t('sessions:relative_time.compact_minutes', { count: diffMins });
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t('sessions:relative_time.compact_hours', { count: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return t('sessions:relative_time.compact_days', { count: diffDays });
  if (diffDays < 30) return t('sessions:relative_time.compact_weeks', { count: Math.floor(diffDays / 7) });
  return t('sessions:relative_time.compact_months', { count: Math.floor(diffDays / 30) });
}

function providerChipClass(provider: string): string {
  if (provider.includes('codex')) return 'git-changes-sessions-provider-chip git-changes-sessions-provider-chip--codex';
  if (provider.includes('openai')) return 'git-changes-sessions-provider-chip git-changes-sessions-provider-chip--openai';
  return 'git-changes-sessions-provider-chip';
}

function openSession(sessionId: string, workspacePath: string) {
  // App.tsx listens for this event and routes the session into Agent mode.
  window.dispatchEvent(
    new CustomEvent('open-ai-session', {
      detail: { sessionId, workspacePath },
    }),
  );
}

function SessionRow({ entry, workspacePath }: { entry: SessionEditEntry; workspacePath: string }) {
  const { t } = useTranslation(['git', 'sessions']);
  return (
    <div
      className="git-changes-sessions-row"
      onClick={() => openSession(entry.sessionId, workspacePath)}
      title={t('changes_tab.open_session', { title: entry.title })}
    >
      <div className="git-changes-sessions-row-title">
        <span className={providerChipClass(entry.provider)} />
        <span className="git-changes-sessions-row-name">{entry.title}</span>
      </div>
      <div className="git-changes-sessions-row-meta">
          <span>{formatRelative(entry.lastEditAt, t)}</span>
        <span className="git-changes-sessions-row-stats">
          {entry.linesAdded > 0 && <span className="git-diff-stat-added">+{entry.linesAdded}</span>}
          {entry.linesRemoved > 0 && <span className="git-diff-stat-removed">−{entry.linesRemoved}</span>}
          {entry.editCount > 0 && <span>· {t('changes_tab.edit_count', { count: entry.editCount })}</span>}
        </span>
      </div>
    </div>
  );
}

export function SessionsForFilePane({ workspacePath, activeFile, onCollapse }: SessionsForFilePaneProps) {
  const { t } = useTranslation('git');
  // The attribution service stores absolute paths; ChangesTab works with workspace-relative.
  const absoluteFilePath = useMemo(() => {
    if (!activeFile) return null;
    return `${workspacePath}/${activeFile.path}`;
  }, [workspacePath, activeFile?.path]);

  const { data, loading, error } = useSessionsForFile(workspacePath, absoluteFilePath);

  const filename = activeFile?.path.split('/').pop() ?? null;

  return (
    <div className="git-changes-sessions-pane">
      <div className="git-changes-sessions-header">
        <div>
          <span className="git-changes-sessions-eyebrow">{t('changes_tab.sessions_header')}</span>
          {filename && <span className="git-changes-sessions-subtitle" title={activeFile?.path}>{filename}</span>}
        </div>
        <button
          type="button"
          className="git-changes-sessions-collapse"
          onClick={onCollapse}
          title={t('changes_tab.hide_sessions')}
        >
          ▶
        </button>
      </div>

      {!activeFile && (
        <div className="git-changes-sessions-empty">
          {t('changes_tab.select_file_for_sessions')}
        </div>
      )}

      {activeFile && loading && (
        <div className="git-changes-sessions-empty">{t('changes_tab.loading_sessions')}</div>
      )}

      {activeFile && error && !loading && (
        <div className="git-changes-sessions-empty">{t('changes_tab.load_sessions_error', { error })}</div>
      )}

      {activeFile && !loading && !error && data.length === 0 && (
        <div className="git-changes-sessions-empty">{t('changes_tab.no_sessions_for_file')}</div>
      )}

      {activeFile && !loading && !error && data.length > 0 && (
        <>
          <div className="git-changes-sessions-list">
            {data.map(entry => (
              <SessionRow key={entry.sessionId} entry={entry} workspacePath={workspacePath} />
            ))}
          </div>
          <div className="git-changes-sessions-footer">
            {t('changes_tab.sessions_footer', { count: data.length })}
          </div>
        </>
      )}
    </div>
  );
}
