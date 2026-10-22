/**
 * The single source of the "Nimbalyst Teams is in beta" disclosure.
 *
 * Every surface that lets someone create, join, or administer an organization
 * shows this (or the matching `AlphaBadge` tooltip) so nobody adopts team
 * collaboration without knowing it is beta-quality and will be paid after
 * launch. Keep the tooltip and notice wording in the `orgSharing.beta` resources.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import { AlphaBadge } from './AlphaBadge';

export function TeamBetaBadge({ size = 'xs', className = '' }: { size?: 'xs' | 'sm' | 'dot'; className?: string }) {
  const { t } = useTranslation('orgSharing');
  return <AlphaBadge size={size} stage="beta" tooltip={t('beta.tooltip')} className={className} />;
}

export function TeamBetaNotice({ className = '' }: { className?: string }) {
  const { t } = useTranslation('orgSharing');
  return (
    <div
      className={`team-beta-notice flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--nim-text-faint)] ${className}`.trim()}
      data-testid="team-beta-notice"
    >
      <MaterialSymbol icon="info" size={13} className="mt-[2px] shrink-0" />
      <span>
        <span className="text-[var(--nim-text-muted)]">{t('beta.notice_title')}</span>{t('beta.notice_body')}
      </span>
    </div>
  );
}
