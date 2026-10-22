/**
 * The crew feed: flags, standups, shift summaries and journal activity from
 * every member, read like a morning paper. Members waiting on an answer are
 * pinned above everything else.
 */
import { useEffect, useMemo, useState } from 'react';
import { MaterialSymbol } from '@nimbalyst/extension-sdk';
import type { CrewFeedEntry, CrewMemberDefinition, CrewMemberSnapshot } from '../shared/types';
import { CrewAvatar, CrewEvidenceChips, CrewLevelChip } from './CrewBits';
import { useCrew } from './CrewContext';
import { describeTrigger } from './crewDeskModel';
import {
  buildCrewFeed,
  CREW_FEED_FILTERS,
  mergeFeedEntries,
  oldestFeedTimestamp,
  type CrewFeedFilter,
} from './crewFeedModel';
import { errorMessage, formatWhen } from './crewFormat';
import { useTranslation } from '@nimbalyst/i18n/react';

const FEED_PAGE_SIZE = 100;

export function CrewFeed() {
  const { client, roster, revision } = useCrew();
  const { t } = useTranslation('extensions');
  const [entries, setEntries] = useState<CrewFeedEntry[]>([]);
  const [load, setLoad] = useState<{ status: 'loading' | 'ready' } | { status: 'error'; error: string }>({ status: 'loading' });
  const [filter, setFilter] = useState<CrewFeedFilter>('all');
  const [olderState, setOlderState] = useState<'idle' | 'loading' | 'exhausted'>('idle');

  // The newest page, again on every backend revision.
  useEffect(() => {
    let cancelled = false;
    client.call('feed', { limit: FEED_PAGE_SIZE })
      .then((page) => {
        if (cancelled) return;
        setEntries((current) => mergeFeedEntries(current, page));
        setLoad({ status: 'ready' });
      })
      .catch((err) => {
        if (cancelled) return;
        // Keep showing what loaded before; only an empty feed shows the error.
        setLoad((current) => (current.status === 'ready' ? current : { status: 'error', error: errorMessage(err) }));
      });
    return () => { cancelled = true; };
  }, [client, revision]);

  const loadOlder = async () => {
    setOlderState('loading');
    try {
      const page = await client.call('feed', { limit: FEED_PAGE_SIZE, before: oldestFeedTimestamp(entries) });
      setEntries((current) => mergeFeedEntries(current, page));
      setOlderState(page.length < FEED_PAGE_SIZE ? 'exhausted' : 'idle');
    } catch {
      setOlderState('idle');
    }
  };

  const members = roster?.members ?? [];
  const feed = useMemo(() => buildCrewFeed(entries, members, filter), [entries, members, filter]);
  const isEmpty = feed.waiting.length === 0 && feed.stream.length === 0;
  const today = new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <section className="crew-feed" data-testid="crew-feed">
      <header className="crew-feed-header">
        <h2 className="crew-feed-title">{t('crew.feed.title')}</h2>
        <span className="crew-faint">{today}</span>
        <div className="crew-segmented crew-push-right" role="tablist" aria-label={t('crew.feed.filter_aria')}>
          {CREW_FEED_FILTERS.map(({ id }) => (
            <button key={id} type="button" role="tab" aria-selected={filter === id} data-selected={filter === id} onClick={() => setFilter(id)}>
              {t(`crew.feed.filter_${id}`)}
            </button>
          ))}
        </div>
      </header>

      <div className="crew-feed-scroll">
        <div className="crew-feed-column">
          {load.status === 'loading' && <div className="crew-empty-note" role="status">{t('crew.feed.loading')}</div>}
          {load.status === 'error' && (
            <div className="crew-empty-note" role="alert">
              {t('crew.feed.load_failed')}
              <span className="crew-selectable crew-faint">{load.error}</span>
            </div>
          )}
          {load.status === 'ready' && isEmpty && (
            <div className="crew-empty-note">
              {filter === 'all'
                ? t('crew.feed.empty_all')
                : t('crew.feed.empty_filter')}
            </div>
          )}

          {feed.waiting.length > 0 && (
            <>
              <div className="crew-section-label"><MaterialSymbol icon="push_pin" size={13} /> {t('crew.feed.waiting_on_you')}</div>
              {feed.waiting.map((member) => <CrewWaitingCard key={member.definition.slug} member={member} />)}
            </>
          )}
          {feed.stream.length > 0 && (
            <>
              {feed.waiting.length > 0 && <div className="crew-section-label">{t('crew.feed.latest')}</div>}
              {feed.stream.map((entry) => <CrewFeedCard key={entry.id} entry={entry} />)}
              {olderState !== 'exhausted' && entries.length >= FEED_PAGE_SIZE && (
                <button type="button" className="crew-link-button crew-feed-older" disabled={olderState === 'loading'} onClick={() => void loadOlder()}>
                  {olderState === 'loading' ? t('crew.feed.loading_more') : t('crew.feed.show_older')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/** Who a card is from. A member removed since keeps their slug on old cards. */
function useMemberIdentity(slug: string): Pick<CrewMemberDefinition, 'name' | 'role' | 'color'> {
  const { roster } = useCrew();
  const member = roster?.members.find((m) => m.definition.slug === slug);
  return member?.definition ?? { name: slug, role: '', color: 'var(--nim-text-faint)' };
}

/**
 * A member with a question open. The question itself is an interactive prompt
 * in one of their sessions; answering happens there, on the desk.
 */
function CrewWaitingCard({ member }: { member: CrewMemberSnapshot }) {
  const { viewSession } = useCrew();
  const { t } = useTranslation('extensions');
  const { definition, runtime } = member;
  return (
    <article className="crew-card" data-tone="ask">
      <div className="crew-card-top">
        <CrewAvatar definition={definition} />
        <span className="crew-card-who">
          {definition.name}
          {definition.role && <span className="crew-faint"> {definition.role}</span>}
        </span>
        <CrewLevelChip level="ask" label={t('crew.feed.waiting_on_you')} />
      </div>
      <p className="crew-card-body crew-selectable">{runtime.statusDetail}</p>
      <div className="crew-card-actions">
        <button
          type="button"
          className="crew-btn crew-btn-primary crew-btn-small"
          onClick={() => viewSession(definition.slug, null)}
        >
          {t('crew.feed.answer_desk', { name: definition.name })}
        </button>
      </div>
    </article>
  );
}

function CrewFeedCard({ entry }: { entry: CrewFeedEntry }) {
  const { host, select, viewSession } = useCrew();
  const { t } = useTranslation('extensions');
  const who = useMemberIdentity(entry.memberSlug);
  const tone = entry.kind === 'flag' && entry.level === 'page' ? 'page' : entry.kind === 'flag' && entry.level === 'flag' ? 'flag' : 'plain';
  const chip = entry.kind === 'flag'
    ? <CrewLevelChip level={entry.level ?? 'flag'} label={entry.level === 'note' ? t('crew.feed.standup') : undefined} />
    : <CrewLevelChip level="note" label={t(`crew.feed.kind_${entry.kind}`)} />;

  return (
    <article className="crew-card" data-tone={tone} data-kind={entry.kind}>
      <div className="crew-card-top">
        <CrewAvatar definition={who} />
        <button type="button" className="crew-card-who crew-link-plain" onClick={() => select(entry.memberSlug)}>
          {who.name}
          {who.role && <span className="crew-faint"> {who.role}</span>}
        </button>
        {chip}
        <span className="crew-faint crew-push-right">{formatWhen(entry.at)}</span>
      </div>
      {entry.title && <h3 className="crew-card-title crew-selectable">{entry.title}</h3>}
      {entry.body && <p className="crew-card-body crew-selectable">{entry.body}</p>}
      {entry.trigger && entry.kind === 'shift' && <p className="crew-card-meta">{t(describeTrigger(entry.trigger))}</p>}
      <CrewEvidenceChips
        evidence={entry.evidence}
        onOpenSession={(sessionId) => viewSession(entry.memberSlug, sessionId)}
        onOpenFile={(path) => host.openFile(path)}
      />
      {entry.sessionId && (
        <div className="crew-card-actions">
          <button type="button" className="crew-btn crew-btn-ghost crew-btn-small" onClick={() => viewSession(entry.memberSlug, entry.sessionId ?? null)}>
            {entry.chapterIndex !== undefined ? t('crew.feed.read_chapter', { index: entry.chapterIndex }) : t('crew.feed.read_session')}
          </button>
        </div>
      )}
    </article>
  );
}
