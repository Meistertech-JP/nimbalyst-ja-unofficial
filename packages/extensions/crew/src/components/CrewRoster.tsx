/** The left rail: the crew feed entry, one row per member, Hire, and pause-the-crew. */
import { MaterialSymbol } from '@nimbalyst/extension-sdk';
import type { CrewMemberSnapshot } from '../shared/types';
import { CrewAlphaBadge, CrewAvatar, CrewError } from './CrewBits';
import { useCrew, useCrewAction } from './CrewContext';
import { formatCrewStatus, formatTokens } from './crewFormat';
import { useTranslation } from '@nimbalyst/i18n/react';

function formatCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function CrewRoster() {
  const { rosterState, roster, selectedSlug, select, setHireOpen, client, refresh } = useCrew();
  const { t } = useTranslation('extensions');
  const { busy, error, run } = useCrewAction();
  const members = roster?.members ?? [];
  // A persisted selection for a member who has since left falls back to the feed.
  const selectedIsMember = selectedSlug !== null && members.some((m) => m.definition.slug === selectedSlug);
  const onShift = members.filter((m) => m.runtime.onShift).length;
  const unreadTotal = members.reduce((sum, m) => sum + m.runtime.unreadCount, 0);
  const usage = roster?.crewUsage;

  return (
    <aside className="crew-roster" aria-label={t('crew.roster.roster_aria')} data-testid="crew-roster">
      <header className="crew-roster-header">
        <div className="crew-roster-title">{t('crew.roster.title')} <CrewAlphaBadge /></div>
        {members.length > 0 && (
          <div className="crew-roster-subtitle">
            {members.length === 1 ? t('crew.roster.one_member') : t('crew.roster.members', { count: members.length })}
            {onShift > 0 ? t('crew.roster.on_shift_suffix', { count: onShift }) : ''}
          </div>
        )}
      </header>

      <button
        type="button"
        className="crew-roster-feed-link"
        data-selected={!selectedIsMember}
        aria-current={selectedIsMember ? undefined : 'page'}
        onClick={() => select(null)}
      >
        <MaterialSymbol icon="view_agenda" size={16} />
        <span className="crew-grow">{t('crew.roster.feed')}</span>
        {unreadTotal > 0 && <span className="crew-roster-feed-count">{t('crew.roster.waiting_suffix', { count: formatCount(unreadTotal) })}</span>}
      </button>

      <div className="crew-roster-body">
        {members.length > 0 && (
          <>
            <div className="crew-section-label">{t('crew.roster.members_label')}</div>
            <ul className="crew-roster-list" role="list">
              {members.map((member) => (
                <li key={member.definition.slug}>
                  <CrewRosterRow
                    member={member}
                    selected={member.definition.slug === selectedSlug}
                    onSelect={() => select(member.definition.slug)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
        {rosterState.status === 'loading' && <div className="crew-muted-note" role="status">{t('crew.roster.loading')}</div>}
        {rosterState.status === 'error' && (
          <div className="crew-roster-error" role="alert">
            <span>{t('crew.roster.load_failed')}</span>
            <span className="crew-selectable crew-faint">{rosterState.error}</span>
            <button type="button" className="crew-btn crew-btn-secondary crew-btn-small" onClick={() => void refresh()}>{t('crew.roster.retry')}</button>
          </div>
        )}
      </div>

      <footer className="crew-roster-footer">
        {usage && usage.tokensPerWeekLimit > 0 && (
          <div className="crew-roster-usage" data-over={usage.overBudget}>
            {t('crew.roster.usage', { used: formatTokens(usage.tokensThisWeek), limit: formatTokens(usage.tokensPerWeekLimit) })}
          </div>
        )}
        {members.length > 0 && roster && (
          <button
            type="button"
            className="crew-btn crew-btn-secondary crew-btn-block"
            disabled={busy !== null}
            onClick={() => void run('pause', () => client.call('setCrewPaused', { paused: !roster.allPaused }))}
          >
            <MaterialSymbol icon={roster.allPaused ? 'play_arrow' : 'pause'} size={15} />
            {roster.allPaused ? t('crew.roster.resume') : t('crew.roster.pause')}
          </button>
        )}
        <button type="button" className="crew-btn crew-btn-secondary crew-btn-block" onClick={() => setHireOpen(true)} data-testid="crew-roster-hire">
          <MaterialSymbol icon="person_add" size={15} />
          {t('crew.roster.hire')}
        </button>
        <CrewError message={error} />
      </footer>
    </aside>
  );
}

function CrewRosterRow({ member, selected, onSelect }: { member: CrewMemberSnapshot; selected: boolean; onSelect: () => void }) {
  const { t } = useTranslation('extensions');
  const { definition, runtime } = member;
  const unread = runtime.unreadCount;
  const waiting = unread > 0 ? t('crew.roster.row_aria_waiting', { count: unread }) : '';
  const statusDetail = formatCrewStatus(runtime.status, runtime.statusDetail, t);
  return (
    <button
      type="button"
      className="crew-roster-row"
      data-selected={selected}
      aria-current={selected ? 'page' : undefined}
      aria-label={`${t('crew.roster.row_aria', { name: definition.name, role: definition.role, detail: statusDetail })}${waiting}`}
      onClick={onSelect}
      data-member-slug={definition.slug}
      data-status={runtime.status}
    >
      <CrewAvatar definition={definition} status={runtime.status} />
      <span className="crew-roster-row-text">
        <span className="crew-roster-row-name">
          <span className="crew-truncate">{definition.name}</span>
          <span className="crew-roster-row-role crew-truncate">{definition.role}</span>
        </span>
        <span className="crew-roster-row-status crew-truncate" data-status={runtime.status}>{statusDetail}</span>
      </span>
      {unread > 0 && <span className="crew-count-badge">{formatCount(unread)}</span>}
    </button>
  );
}
