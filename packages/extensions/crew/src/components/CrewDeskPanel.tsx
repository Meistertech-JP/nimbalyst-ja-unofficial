/** The desk's right panel: Inbox, Schedule, Delegated, Notes. */
import { useEffect, useState } from 'react';
import { MaterialSymbol } from '@nimbalyst/extension-sdk';
import type { CrewDelegatedSession, CrewMemberDetail, CrewMemberSnapshot } from '../shared/types';
import { CrewError, CrewEvidenceChips, CrewLevelChip } from './CrewBits';
import { useCrew, useCrewQuery } from './CrewContext';
import { countLiveDelegated } from './crewDeskModel';
import { errorMessage, formatWhen } from './crewFormat';
import { CrewScheduleTab } from './CrewScheduleTab';
import { useTranslation } from '@nimbalyst/i18n/react';

type PanelTab = 'inbox' | 'schedule' | 'delegated' | 'notes';

const TABS: ReadonlyArray<PanelTab> = ['inbox', 'schedule', 'delegated', 'notes'];

const SESSION_STATUS_KEYS: Record<string, string> = {
  running: 'crew.panel.session_running',
  waiting: 'crew.panel.session_waiting',
  waiting_for_input: 'crew.panel.session_waiting_for_input',
  processing: 'crew.panel.session_processing',
};

export function CrewDeskPanel({ member, detail }: { member: CrewMemberSnapshot; detail: CrewMemberDetail | null }) {
  const { t } = useTranslation('extensions');
  const [tab, setTab] = useState<PanelTab>('inbox');
  const delegated = detail?.delegated ?? null;
  const counts: Partial<Record<PanelTab, number>> = {
    inbox: member.runtime.unreadCount,
    delegated: delegated ? countLiveDelegated(delegated) : 0,
  };

  return (
    <aside className="crew-desk-panel" aria-label={t('crew.panel.desk_aria', { name: member.definition.name })}>
      <div className="crew-tabs" role="tablist">
        {TABS.map((id) => {
          const count = counts[id] ?? 0;
          return (
            <button key={id} type="button" role="tab" aria-selected={tab === id} data-selected={tab === id} onClick={() => setTab(id)}>
              {t(`crew.panel.${id}`)}
              {count > 0 && <span className="crew-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>
      <div className="crew-desk-panel-body">
        {tab === 'inbox' && <CrewInboxTab member={member} delegated={delegated} />}
        {tab === 'schedule' && <CrewScheduleTab member={member} />}
        {tab === 'delegated' && <CrewDelegatedTab member={member} sessions={delegated} />}
        {tab === 'notes' && <CrewNotesTab member={member} />}
      </div>
    </aside>
  );
}

/**
 * What is waiting: questions open in the member's sessions (answered in the
 * transcript), wakes held for the next shift, and the member's recent flags.
 */
function CrewInboxTab({ member, delegated }: { member: CrewMemberSnapshot; delegated: CrewDelegatedSession[] | null }) {
  const { client, host, viewSession } = useCrew();
  const { t } = useTranslation('extensions');
  const { definition, runtime } = member;
  const slug = definition.slug;
  const flags = useCrewQuery(() => client.call('feed', { slug, kinds: ['flag'], limit: 20 }), [slug]);
  const pendingSessions = (delegated ?? []).filter((s) => s.hasPendingPrompt);
  const waitingInChapter = runtime.status === 'waiting-on-user';

  return (
    <div className="crew-stack">
      {waitingInChapter && (
        <div className="crew-inbox-row" data-tone="ask">
          <MaterialSymbol icon="help" size={15} />
          <span className="crew-grow">{t('crew.panel.asked', { name: definition.name })}</span>
        </div>
      )}
      {pendingSessions.map((session) => (
        <button key={session.sessionId} type="button" className="crew-inbox-row crew-inbox-row-button" data-tone="ask" onClick={() => viewSession(slug, session.sessionId)}>
          <MaterialSymbol icon="help" size={15} />
          <span className="crew-grow">{t('crew.panel.waiting_session', { name: session.name })}</span>
        </button>
      ))}
      {runtime.pendingInboxCount > 0 && (
        <div className="crew-inbox-row">
          <MaterialSymbol icon="inbox" size={15} />
          <span className="crew-grow">
            {t(runtime.pendingInboxCount === 1 ? 'crew.panel.wakes_one' : 'crew.panel.wakes_other', { count: runtime.pendingInboxCount })}
          </span>
        </div>
      )}

      <div className="crew-section-label">{t('crew.panel.recent_flags')}</div>
      {flags.data === null ? (
        flags.error ? <CrewError message={flags.error} /> : <p className="crew-faint" role="status">{t('crew.panel.loading')}</p>
      ) : flags.data.length === 0 ? (
        <p className="crew-faint">{t('crew.panel.no_flags', { name: definition.name })}</p>
      ) : (
        flags.data.map((entry) => (
          <div key={entry.id} className="crew-inbox-flag">
            <div className="crew-row">
              <CrewLevelChip level={entry.level ?? 'flag'} label={entry.level === 'note' ? t('crew.panel.standup') : undefined} />
              <span className="crew-grow crew-truncate crew-strong">{entry.title}</span>
              <span className="crew-faint">{formatWhen(entry.at)}</span>
            </div>
            {entry.body && <p className="crew-inbox-flag-body crew-selectable">{entry.body}</p>}
            <CrewEvidenceChips
              evidence={entry.evidence}
              onOpenSession={(sessionId) => viewSession(slug, sessionId)}
              onOpenFile={(path) => host.openFile(path)}
            />
          </div>
        ))
      )}
    </div>
  );
}

function CrewDelegatedTab({ member, sessions }: { member: CrewMemberSnapshot; sessions: CrewDelegatedSession[] | null }) {
  const { viewSession } = useCrew();
  const { t } = useTranslation('extensions');
  const statusLabel = (status: string) => {
    const key = SESSION_STATUS_KEYS[status];
    return key ? t(key) : status.replace(/_/g, ' ');
  };
  if (sessions === null) return <p className="crew-faint" role="status">{t('crew.panel.loading')}</p>;
  if (sessions.length === 0) {
    return <p className="crew-faint">{t('crew.panel.no_sessions', { name: member.definition.name })}</p>;
  }
  return (
    <ul className="crew-stack" role="list">
      {sessions.map((session) => (
        <li key={session.sessionId}>
          <button
            type="button"
            className="crew-delegated-row"
            onClick={() => viewSession(member.definition.slug, session.sessionId)}
            data-session-id={session.sessionId}
          >
            <span className="crew-truncate crew-strong">{session.name || t('crew.panel.untitled')}</span>
            <span className="crew-row crew-small">
              <span className="crew-session-status" data-status={session.hasPendingPrompt ? 'waiting' : session.status}>
                {session.hasPendingPrompt ? t('crew.panel.waiting_on_you') : statusLabel(session.status)}
              </span>
              {session.createdAt && <span className="crew-faint crew-push-right">{formatWhen(session.createdAt)}</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Notes are the member's long-term memory and yours to correct; the journal
 * is its own append-only log and is read-only here.
 */
function CrewNotesTab({ member }: { member: CrewMemberSnapshot }) {
  const { client, revision } = useCrew();
  const { t } = useTranslation('extensions');
  const slug = member.definition.slug;
  const [view, setView] = useState<'notes' | 'journal'>('notes');
  // `base` is the text the draft started from, which the save sends as
  // `expected`. `saved` follows the file, so a member update while you edit
  // surfaces as a refused save rather than a silent overwrite.
  const [notes, setNotes] = useState<{ saved: string | null; base: string | null; draft: string }>({ saved: null, base: null, draft: '' });
  const [journal, setJournal] = useState<string | null>(null);
  const [status, setStatus] = useState<{ saving: boolean; error: string | null }>({ saving: false, error: null });
  const { saved, base, draft } = notes;
  const dirty = base !== null && draft !== base;

  useEffect(() => {
    let cancelled = false;
    client.call('readMemory', { slug })
      .then((memory) => {
        if (cancelled) return;
        // Never clobber an edit in progress when the member updates its notes.
        setNotes((current) => (current.base === null || current.draft === current.base
          ? { saved: memory.notes, base: memory.notes, draft: memory.notes }
          : { ...current, saved: memory.notes }));
        setJournal(memory.journal);
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus((current) => ({ ...current, error: errorMessage(err) }));
      });
    return () => { cancelled = true; };
  }, [client, slug, revision]);

  const save = async () => {
    setStatus({ saving: true, error: null });
    try {
      await client.call('writeNotes', { slug, content: draft, expected: base ?? '' });
      setNotes({ saved: draft, base: draft, draft });
      setStatus({ saving: false, error: null });
    } catch (err) {
      setStatus({ saving: false, error: errorMessage(err) });
    }
  };

  return (
    <div className="crew-notes-tab">
      <div className="crew-segmented crew-segmented-small" role="tablist">
        {(['notes', 'journal'] as const).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={view === id} data-selected={view === id} onClick={() => setView(id)}>
            {id === 'notes' ? t('crew.panel.notes') : t('crew.panel.journal')}
          </button>
        ))}
      </div>
      {view === 'notes' ? (
        <>
          <p className="crew-faint crew-small">{t('crew.panel.notes_hint', { name: member.definition.name })}</p>
          <textarea
            className="crew-input crew-notes-editor"
            value={draft}
            onChange={(e) => setNotes((current) => ({ ...current, draft: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 's' && (e.metaKey || e.ctrlKey) && dirty) {
                e.preventDefault();
                void save();
              }
            }}
            disabled={saved === null}
            placeholder={saved === null ? t('crew.panel.notes_loading') : t('crew.panel.notes_empty')}
            aria-label={t('crew.panel.notes_aria')}
          />
          {saved !== null && base !== null && saved !== base && (
            <p className="crew-faint crew-small">{t('crew.panel.changed_while_editing', { name: member.definition.name })}</p>
          )}
          <div className="crew-row">
            <span className="crew-grow"><CrewError message={status.error} /></span>
            <button
              type="button"
              className="crew-btn crew-btn-ghost crew-btn-small"
              disabled={!dirty && saved === base}
              onClick={() => setNotes((current) => ({ saved: current.saved, base: current.saved, draft: current.saved ?? '' }))}
            >
              {t('crew.panel.revert')}
            </button>
            <button type="button" className="crew-btn crew-btn-primary crew-btn-small" disabled={!dirty || status.saving} onClick={() => void save()}>
              {t('crew.panel.save')}
            </button>
          </div>
        </>
      ) : journal === null ? (
        <p className="crew-faint" role="status">{t('crew.panel.loading')}</p>
      ) : journal.trim() ? (
        <pre className="crew-journal crew-selectable">{journal}</pre>
      ) : (
        <p className="crew-faint">{t('crew.panel.journal_empty')}</p>
      )}
    </div>
  );
}
