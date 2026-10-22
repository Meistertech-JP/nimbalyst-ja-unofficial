/**
 * Crew panel root: the roster rail on the left, and on the right either the
 * first-run welcome, the selected member's desk, or the crew feed.
 */
import type { PanelHostProps } from '@nimbalyst/extension-sdk';
import { useEffect, useRef } from 'react';
import { MaterialSymbol } from '@nimbalyst/extension-sdk';
import { CrewProvider, useCrew } from './CrewContext';
import { CrewDesk } from './CrewDesk';
import { nextSeenState, type CrewSeenState } from './crewDeskModel';
import { CrewFeed } from './CrewFeed';
import { CrewHireDialog } from './CrewHireDialog';
import { CrewPaneResizer, CrewPanesContext, useCrewPaneState } from './CrewPanes';
import { CrewRoster } from './CrewRoster';
import { useTranslation } from '@nimbalyst/i18n/react';

export function CrewPanel({ host }: PanelHostProps) {
  return (
    <CrewProvider host={host}>
      <CrewLayout />
    </CrewProvider>
  );
}

function CrewLayout() {
  const { host, rosterState, roster, selectedSlug, hireOpen, setHireOpen, client, refresh } = useCrew();
  const members = roster?.members ?? [];
  const selected = members.find((m) => m.definition.slug === selectedSlug) ?? null;
  const isFirstRun = rosterState.status === 'ready' && members.length === 0;
  const panes = useCrewPaneState(host, selected !== null);

  // Opening a desk or the feed marks its flags seen, which is what brings the
  // unread counts and the gutter badge down. Keyed on what is actually shown,
  // so a stale selection that fell back to the feed marks the feed.
  const seen = useRef<CrewSeenState | null>(null);
  const view = selected ? selected.definition.slug : null;
  const unread = selected ? selected.runtime.unreadCount : members.reduce((sum, m) => sum + m.runtime.unreadCount, 0);
  useEffect(() => {
    if (!roster || members.length === 0) return;
    const next = nextSeenState(seen.current, view, unread);
    seen.current = next.state;
    if (!next.markSeen) return;
    client.call('markSeen', view ? { slug: view } : {})
      .then(() => refresh())
      .catch((err) => console.warn('[Crew] markSeen failed:', err));
  }, [roster, members.length, view, unread, client, refresh]);

  return (
    <CrewPanesContext.Provider value={panes}>
      <div className="crew-panel" data-testid="crew-panel" style={panes.style}>
        {!panes.layout.rosterCollapsed && (
          <>
            <CrewRoster />
            <CrewPaneResizer side="left" />
          </>
        )}
        <main className="crew-main">
          {isFirstRun ? (
            <CrewWelcome onHire={() => setHireOpen(true)} />
          ) : selected ? (
            // A different member is a different desk, never a re-used one.
            <CrewDesk key={selected.definition.slug} member={selected} />
          ) : (
            <CrewFeed />
          )}
        </main>
        {hireOpen && <CrewHireDialog onClose={() => setHireOpen(false)} />}
      </div>
    </CrewPanesContext.Provider>
  );
}

/**
 * First run: nobody hired. This is what every user sees first, so it explains
 * the idea in a few lines and offers exactly one action.
 */
function CrewWelcome({ onHire }: { onHire: () => void }) {
  const { t } = useTranslation('extensions');
  return (
    <div className="crew-welcome" data-testid="crew-welcome">
      <div className="crew-welcome-inner">
        <span className="crew-welcome-icon"><MaterialSymbol icon="groups" size={24} /></span>
        <h2 className="crew-welcome-title">{t('crew.welcome.title')}</h2>
        <p className="crew-welcome-lede">{t('crew.welcome.lede')}</p>
        <ul className="crew-welcome-points">
          <li><MaterialSymbol icon="schedule" size={16} /><span>{t('crew.welcome.point_schedule')}</span></li>
          <li><MaterialSymbol icon="menu_book" size={16} /><span>{t('crew.welcome.point_journal')}</span></li>
          <li><MaterialSymbol icon="flag" size={16} /><span>{t('crew.welcome.point_flags')}</span></li>
        </ul>
        <button type="button" className="crew-btn crew-btn-primary" onClick={onHire} data-testid="crew-welcome-hire">
          <MaterialSymbol icon="person_add" size={16} />
          {t('crew.welcome.hire')}
        </button>
      </div>
    </div>
  );
}
