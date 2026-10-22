/**
 * Delivery settings: visibility, deadline, and the wake policy.
 *
 * Setting a deadline here promotes the draft to Tier 2, which is why this block
 * is reachable from Tier 1's collapsed line as well -- the author opens the
 * settings, picks a due date, and the surface grows around them.
 *
 * "Send via" is stated rather than offered: the protocol addresses recipients
 * as org members, so every request is delivered as a direct message today. A
 * dropdown with one reachable option would imply a choice that does not exist.
 */

import React from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { FeedbackRequestVisibility } from '@nimbalyst/collab-protocol';
import { FeedbackComposeMenu, FeedbackComposeMenuItem } from './FeedbackComposeMenu';
import type { FeedbackComposeQuorumMode } from './feedbackComposeDraft';

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDeadline(deadline: number, locale?: string): string {
  return new Date(deadline).toLocaleString(locale, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** End-of-day choices relative to `now`, so "Thursday" means Thursday evening. */
export function deadlineChoices(
  now: number,
  labels = {
    none: 'No deadline',
    today: 'Today, 5:00 PM',
    tomorrow: 'Tomorrow, 5:00 PM',
    days: 'In 3 days',
    week: 'In a week',
  },
): Array<{ label: string; value: number | undefined }> {
  const endOfDay = (offsetDays: number): number => {
    const date = new Date(now + offsetDays * DAY_MS);
    date.setHours(17, 0, 0, 0);
    return date.getTime();
  };
  return [
    { label: labels.none, value: undefined },
    { label: labels.today, value: endOfDay(0) },
    { label: labels.tomorrow, value: endOfDay(1) },
    { label: labels.days, value: endOfDay(3) },
    { label: labels.week, value: endOfDay(7) },
  ];
}

const Setting: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="feedback-compose-setting flex items-center gap-2">
    <span className="text-xs text-nim-muted flex-1 min-w-0">{label}</span>
    {children}
  </div>
);

export interface FeedbackComposeDeliveryProps {
  visibility: FeedbackRequestVisibility;
  deadline?: number;
  quorumMode: FeedbackComposeQuorumMode;
  /** Single-recipient requests have no quorum choice to make. */
  recipientCount: number;
  now: number;
  onVisibilityChange: (visibility: FeedbackRequestVisibility) => void;
  onDeadlineChange: (deadline: number | undefined) => void;
  onQuorumModeChange: (mode: FeedbackComposeQuorumMode) => void;
  disabled?: boolean;
}

export const FeedbackComposeDelivery: React.FC<FeedbackComposeDeliveryProps> = ({
  visibility,
  deadline,
  quorumMode,
  recipientCount,
  now,
  onVisibilityChange,
  onDeadlineChange,
  onQuorumModeChange,
  disabled,
}) => {
  const { t, i18n } = useTranslation('feedback');
  const visibilityLabels: Record<FeedbackRequestVisibility, string> = {
    hiddenUntilAnswered: t('compose.delivery.after_each_reply'),
    open: t('compose.delivery.to_everyone_asked'),
  };
  const choices = deadlineChoices(now, {
    none: t('compose.delivery.no_deadline'),
    today: t('compose.delivery.today_5pm'),
    tomorrow: t('compose.delivery.tomorrow_5pm'),
    days: t('compose.delivery.in_3_days'),
    week: t('compose.delivery.in_a_week'),
  });

  return (
  <div className="feedback-compose-delivery grid grid-cols-2 gap-x-4 gap-y-2 @[max-460px]/feedback-compose:grid-cols-1">
    <Setting label={t('compose.delivery.send_via')}>
      <span className="text-xs text-nim px-2 py-1">{t('compose.delivery.direct_message')}</span>
    </Setting>

    <Setting label={t('compose.delivery.answers_visible')}>
      <FeedbackComposeMenu
        ariaLabel={t('compose.delivery.choose_visibility')}
        triggerTestId="feedback-compose-visibility"
        disabled={disabled}
        trigger={visibilityLabels[visibility]}
      >
        {(close) =>
          (Object.keys(visibilityLabels) as FeedbackRequestVisibility[]).map((option) => (
            <FeedbackComposeMenuItem
              key={option}
              selected={option === visibility}
              onSelect={() => {
                onVisibilityChange(option);
                close();
              }}
            >
              {visibilityLabels[option]}
            </FeedbackComposeMenuItem>
          ))
        }
      </FeedbackComposeMenu>
    </Setting>

    <Setting label={t('compose.delivery.due')}>
      <FeedbackComposeMenu
        ariaLabel={t('compose.delivery.choose_deadline')}
        triggerTestId="feedback-compose-deadline"
        disabled={disabled}
        trigger={deadline === undefined ? t('compose.delivery.no_deadline') : formatDeadline(deadline, i18n.language)}
      >
        {(close) =>
          choices.map((choice) => (
            <FeedbackComposeMenuItem
              key={choice.label}
              testId="feedback-compose-deadline-choice"
              selected={choice.value === deadline}
              onSelect={() => {
                onDeadlineChange(choice.value);
                close();
              }}
            >
              {choice.label}
            </FeedbackComposeMenuItem>
          ))
        }
      </FeedbackComposeMenu>
    </Setting>

    <Setting label={t('compose.delivery.wake_session')}>
      {recipientCount > 1 ? (
        <FeedbackComposeMenu
          ariaLabel={t('compose.delivery.choose_wake')}
          triggerTestId="feedback-compose-wake"
          disabled={disabled}
          trigger={quorumMode === 'first' ? t('compose.delivery.first_reply') : t('compose.delivery.everyone_replies')}
        >
          {(close) => (
            <>
              <FeedbackComposeMenuItem
                selected={quorumMode === 'first'}
                onSelect={() => {
                  onQuorumModeChange('first');
                  close();
                }}
              >
                {t('compose.delivery.first_reply')}
              </FeedbackComposeMenuItem>
              <FeedbackComposeMenuItem
                selected={quorumMode === 'all'}
                onSelect={() => {
                  onQuorumModeChange('all');
                  close();
                }}
              >
                {t('compose.delivery.everyone_replies')}
              </FeedbackComposeMenuItem>
            </>
          )}
        </FeedbackComposeMenu>
      ) : (
        <span className="text-xs text-nim px-2 py-1">{t('compose.delivery.on_reply')}</span>
      )}
    </Setting>
  </div>
  );
};
