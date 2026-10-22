import React, { useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import {
  FloatingPortal,
  flip,
  offset,
  shift,
  useFloating,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { windowControlsClearance } from '@nimbalyst/runtime/ui/floating/windowControlsClearance';

interface AlphaBadgeProps {
  /**
   * `xs` and `sm` render the lowercase stage word as a pill (sidebar rows / panel headers).
   * `dot` renders just the Greek letter — for tight spots like square icon buttons.
   */
  size?: 'xs' | 'sm' | 'dot';
  /** Maturity the badge announces. Teams surfaces pass `beta`; everything else is alpha. */
  stage?: 'alpha' | 'beta';
  className?: string;
  tooltip?: string;
}

export function SettingsAlphaBadge({ size = 'xs', className = '' }: { size?: 'xs' | 'sm' | 'dot'; className?: string }) {
  const { t } = useTranslation('settings');
  return <AlphaBadge size={size} tooltip={t('agent_features.alpha_tooltip')} className={className} />;
}

const PILL_BASE = 'inline-flex items-center font-medium lowercase bg-[var(--nim-bg-tertiary)] border border-[var(--nim-border)]';

const SIZE_CLASSES: Record<NonNullable<AlphaBadgeProps['size']>, string> = {
  xs: `${PILL_BASE} px-2 py-px rounded-full text-[10px] text-[var(--nim-text-faint)]`,
  sm: `${PILL_BASE} px-2.5 py-0.5 rounded-full text-[11px] text-[var(--nim-text-muted)] align-middle`,
  dot: 'inline-flex items-center justify-center text-[10px] leading-none font-semibold text-[var(--nim-text-faint)]',
};

export const AlphaBadge: React.FC<AlphaBadgeProps> = ({
  size = 'xs',
  stage = 'alpha',
  className = '',
  tooltip,
}) => {
  const { t } = useTranslation('common');
  const heading = t(stage === 'alpha' ? 'alpha.heading' : 'beta.heading');
  const accessibleLabel = t(stage === 'alpha' ? 'alpha.label' : 'beta.label');
  const badgeText = t(stage === 'alpha' ? 'alpha.badge' : 'beta.badge');
  const resolvedTooltip = tooltip ?? t(stage === 'alpha' ? 'alpha.tooltip' : 'beta.tooltip');
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open: tooltipOpen,
    onOpenChange: setTooltipOpen,
    placement: 'top',
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 }), windowControlsClearance()],
  });
  const hover = useHover(context, { delay: { open: 250, close: 0 }, move: false });
  const role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, role]);

  return (
    <>
      <span
        ref={refs.setReference}
        data-testid="alpha-badge"
        data-stage={stage}
        aria-label={accessibleLabel}
        className={`${SIZE_CLASSES[size]} ${className}`.trim()}
        {...getReferenceProps()}
      >
        {size === 'dot' ? (stage === 'alpha' ? 'α' : 'β') : badgeText}
      </span>
      {tooltipOpen && resolvedTooltip && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className="help-tooltip pointer-events-none z-[10002] max-w-[320px] px-3 py-2.5 bg-[var(--nim-bg)] border border-[var(--nim-border)] rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.15),0_2px_4px_rgba(0,0,0,0.1)] text-xs leading-normal text-[var(--nim-text-muted)] whitespace-pre-wrap"
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <div className="mb-1 text-[13px] font-semibold text-[var(--nim-text)]">{heading}</div>
            {resolvedTooltip}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
