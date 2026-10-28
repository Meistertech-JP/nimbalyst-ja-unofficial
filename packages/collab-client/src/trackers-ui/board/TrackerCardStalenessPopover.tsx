import { useLayoutEffect, type JSX } from 'react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  type ReferenceElement,
} from '@floating-ui/react';
import { windowControlsClearance } from '@nimbalyst/runtime/ui/floating/windowControlsClearance';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import { useTranslation } from '@nimbalyst/i18n/react';
import {
  resolvePlanStatusDriftPresentation,
  shortSha,
} from '@nimbalyst/collab-client/trackers';

export interface TrackerCardStalenessPopoverProps {
  item: TrackerRecord;
  reference: ReferenceElement;
  onClose: () => void;
}

/** Evidence popover loaded only after the staleness chip is activated. */
export function TrackerCardStalenessPopover({
  item,
  reference,
  onClose,
}: TrackerCardStalenessPopoverProps): JSX.Element | null {
  const { t } = useTranslation('tracker');
  const drift = resolvePlanStatusDriftPresentation(item);
  const floating = useFloating({
    open: true,
    onOpenChange: (open) => {
      if (!open) onClose();
    },
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      windowControlsClearance(),
    ],
  });

  useLayoutEffect(() => {
    floating.refs.setPositionReference(reference);
  }, [floating.refs, reference]);

  const dismiss = useDismiss(floating.context);
  const role = useRole(floating.context, { role: 'dialog' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!drift) return null;

  return (
    <FloatingPortal>
      <div
        ref={floating.refs.setFloating}
        style={floating.floatingStyles}
        {...getFloatingProps()}
        className="tracker-card-popover tracker-card-staleness-popover"
        data-testid="tracker-card-staleness-popover"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tracker-card-drift-headline">{t(drift.status === 'draft' ? 'board_card_staleness.draft_headline' : 'board_card_staleness.ready_headline')}</div>
        <div className="tracker-card-drift-note">
          {t('board_card_staleness.guidance')}
        </div>

        <div className="tracker-card-drift-evidence-label">
          {drift.commitShas.length === 1
            ? t('board_card_staleness.commit_single')
            : t('board_card_staleness.commit_multiple', { count: drift.commitShas.length })}
        </div>
        <div className="tracker-card-drift-evidence-list">
          {drift.commitShas.map((sha) => (
            <span key={sha} title={sha}>
              {shortSha(sha)}
            </span>
          ))}
        </div>

        <div className="tracker-card-drift-evidence-label">
          {drift.committedSessionIds.length === 1
            ? t('board_card_staleness.session_single')
            : t('board_card_staleness.session_multiple', { count: drift.committedSessionIds.length })}
        </div>
        <div className="tracker-card-drift-evidence-list">
          {drift.committedSessionIds.map((sessionId) => (
            <span key={sessionId} title={sessionId}>
              {sessionId}
            </span>
          ))}
        </div>
      </div>
    </FloatingPortal>
  );
}
