import React from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';

import type { ResourceKind, ResourcePillView } from './commentTypes';

const PILL_KIND_KEY: Partial<Record<ResourceKind, string>> = {
  file: 'comments.kind_file',
  commit: 'comments.kind_commit',
  pullRequest: 'comments.kind_pull_request',
};

/**
 * One inline resource reference.
 *
 * Renders a `ResourcePillView` and nothing else. The component cannot leak a
 * withheld title because it is never handed one -- `toPillView` in the view
 * model is where availability is decided and source state is dropped.
 *
 * A non-actionable pill is a `span`, not a disabled button: an unavailable
 * reference has no target, so offering a dead control would be a worse lie than
 * saying plainly that it is unavailable.
 */
export function ResourcePill({
  pill,
  onOpen,
}: {
  pill: ResourcePillView;
  onOpen?: (pill: ResourcePillView) => void;
}) {
  const { t } = useTranslation('editor');
  const kindKey = PILL_KIND_KEY[pill.kind];
  const label = pill.availability === 'loading'
    ? t('comments.pill_loading')
    : pill.availability === 'unavailable'
      ? t('comments.pill_unavailable')
      : pill.label;
  const secondary = pill.availability === 'notInWorkspace'
    ? t('comments.pill_not_in_workspace')
    : pill.secondary;
  const hint = pill.availability === 'unavailable'
    ? t('comments.pill_unavailable_hint')
    : pill.availability === 'notInWorkspace' && kindKey
      ? t('comments.pill_not_in_workspace_hint', { kind: t(kindKey) })
      : pill.hint;
  const shared =
    'resource-pill inline-flex max-w-full items-baseline gap-1 rounded-[5px] border px-1.5 py-px align-baseline text-[12px] leading-[1.35]';

  const tone = pill.actionable
    ? 'border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] hover:border-[var(--nim-primary)] hover:bg-[var(--nim-bg-hover)]'
    : pill.availability === 'notInWorkspace'
      ? 'border-dashed border-[var(--nim-border)] bg-transparent text-[var(--nim-text-muted)]'
      : 'border-dashed border-[var(--nim-border)] bg-transparent text-[var(--nim-text-faint)]';

  const content = (
    <>
      <MaterialSymbol icon={pill.icon} size={13} />
      <span className="resource-pill-label truncate">{label}</span>
      {secondary && (
        <span className="resource-pill-secondary truncate text-[var(--nim-text-faint)]">{secondary}</span>
      )}
      {pill.state && (
        <span className="resource-pill-state rounded-[3px] bg-[var(--nim-bg-tertiary)] px-1 text-[10px] uppercase tracking-wide text-[var(--nim-text-muted)]">
          {pill.state}
        </span>
      )}
    </>
  );

  const markers = {
    'data-testid': `resource-pill-${pill.kind}`,
    'data-availability': pill.availability,
    title: hint,
  } as const;

  if (!pill.actionable) {
    return (
      <span className={`${shared} ${tone}`} {...markers}>
        {content}
      </span>
    );
  }

  return (
    <button type="button" className={`${shared} ${tone}`} {...markers} onClick={() => onOpen?.(pill)}>
      {content}
    </button>
  );
}
