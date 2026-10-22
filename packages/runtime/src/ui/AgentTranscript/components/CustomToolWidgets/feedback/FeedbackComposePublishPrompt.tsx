/**
 * The unshared-subject publish prompt.
 *
 * A recipient cannot review something that only exists on the author's machine,
 * so sending implies publishing the subject to the team. That must be an
 * explicit act: this prompt names exactly which artifacts become visible and
 * publishes only when the author presses its own confirm button. There is no
 * silent auto-publish, and no dead end -- the confirm is right here rather than
 * somewhere else in the app.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  describeDestination,
  FEEDBACK_DEFAULT_DESTINATION_NAME,
  type FeedbackComposeDestination,
  type FeedbackComposeSubject,
} from './feedbackComposeDraft';

const WarningGlyph: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
    <path d="M7 1.8 13 12.2H1L7 1.8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M7 5.6v2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="7" cy="10.2" r="0.7" fill="currentColor" />
  </svg>
);

export interface FeedbackComposePublishPromptProps {
  subjects: FeedbackComposeSubject[];
  /** Already-agreed subject ids; when it covers everything the prompt is settled. */
  confirmedSourceIds: string[];
  recipientNames: string[];
  /** Publish these subjects and send in one explicit action. */
  onConfirmAndSend: () => void;
  /** Set true when the author presses the footer primary while unconfirmed. */
  forceExpanded?: boolean;
  disabled?: boolean;
  /**
   * How many of these subjects a destination applies to. Zero (all trackers)
   * hides the destination line, because trackers do not land in a folder.
   */
  destinationSubjectCount?: number;
  /** Absent is the unchosen default, not the root. */
  destination?: FeedbackComposeDestination;
  /** Absent hides the change affordance; the line still names where they go. */
  onChangeDestination?: () => void;
}

export const FeedbackComposePublishPrompt: React.FC<FeedbackComposePublishPromptProps> = ({
  subjects,
  confirmedSourceIds,
  recipientNames,
  onConfirmAndSend,
  forceExpanded,
  disabled,
  destinationSubjectCount = 0,
  destination,
  onChangeDestination,
}) => {
  const { t } = useTranslation('aichat');
  const [expanded, setExpanded] = useState(false);
  const isExpanded = expanded || forceExpanded === true;

  const confirmed = new Set(confirmedSourceIds);
  const outstanding = subjects.filter((subject) => !confirmed.has(subject.ref.sourceId));
  const settled = outstanding.length === 0;

  const who = recipientNames.length === 0
    ? t('feedback_publish.default_recipients')
    : recipientNames.join(', ');
  const describedDestination = describeDestination(destination);
  const destinationLabel = describedDestination === FEEDBACK_DEFAULT_DESTINATION_NAME
    ? t('feedback_publish.default_destination')
    : describedDestination === 'Team files'
      ? t('feedback_publish.team_files')
      : describedDestination;

  return (
    <div
      data-testid="feedback-compose-publish-prompt"
      data-settled={settled}
      className={`feedback-compose-publish-prompt flex gap-2.5 items-start rounded-md border px-3 py-2.5 ${
        settled
          ? 'border-[color-mix(in_srgb,var(--nim-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--nim-success)_10%,transparent)] text-nim-success'
          : 'border-[color-mix(in_srgb,var(--nim-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--nim-warning)_10%,transparent)] text-nim-warning'
      }`}
    >
      <WarningGlyph />
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <p className="text-xs leading-relaxed text-nim-muted select-text">
          {settled ? (
            <>
              <span className="font-semibold text-nim">
                {t(subjects.length === 1 ? 'feedback_publish.settled_one' : 'feedback_publish.settled_other', {
                  count: subjects.length,
                })}
              </span>{' '}
              {t('feedback_publish.nothing_published_yet')}
            </>
          ) : (
            <>
              <span className="font-semibold text-nim">
                {t(outstanding.length === 1 ? 'feedback_publish.unshared_one' : 'feedback_publish.unshared_other', {
                  count: outstanding.length,
                })}
              </span>{' '}
              {t(outstanding.length === 1 ? 'feedback_publish.explanation_one' : 'feedback_publish.explanation_other', {
                who,
              })}
            </>
          )}
        </p>

        {/* Where they land, before the author commits rather than in a modal
            after. Read-only on purpose: the folder tree lives in the host. */}
        {destinationSubjectCount > 0 && (
          <div
            data-testid="feedback-compose-destination"
            className="feedback-compose-destination flex items-center gap-1.5 flex-wrap text-[0.6875rem] text-nim-muted"
          >
            <span>{t('feedback_publish.into')}</span>
            <span className="font-medium text-nim select-text">
              {destinationLabel}
            </span>
            {onChangeDestination && (
              <button
                type="button"
                data-testid="feedback-compose-change-destination"
                onClick={onChangeDestination}
                disabled={disabled}
                className="text-nim-primary bg-transparent border-none p-0 cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('feedback_compose.change')}
              </button>
            )}
          </div>
        )}

        {!isExpanded && !settled && (
          <button
            type="button"
            data-testid="feedback-compose-publish-disclose"
            onClick={() => setExpanded(true)}
            className="self-start text-xs text-nim-primary bg-transparent border-none p-0 cursor-pointer hover:underline"
          >
            {t('feedback_publish.disclose')}
          </button>
        )}

        {isExpanded && !settled && (
          <>
            <ul className="feedback-compose-publish-list flex flex-col gap-1 m-0 pl-0 list-none">
              {outstanding.map((subject) => (
                <li
                  key={subject.ref.sourceId}
                  data-testid="feedback-compose-publish-item"
                  className="text-xs text-nim truncate select-text"
                >
                  {subject.label}
                  {subject.context && (
                    <span className="text-nim-faint"> · {subject.context}</span>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              data-testid="feedback-compose-publish-confirm"
              onClick={onConfirmAndSend}
              disabled={disabled}
              className="self-start px-3 py-1.5 rounded-md text-[13px] font-medium cursor-pointer border-none transition-colors duration-150 hover:opacity-90 bg-nim-primary text-nim-on-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t(outstanding.length === 1 ? 'feedback_publish.confirm_one' : 'feedback_publish.confirm_other', {
                count: outstanding.length,
              })}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
