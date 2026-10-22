/**
 * FeedbackRequestRespond
 *
 * The recipient's view of a feedback request, embedded wherever the request is
 * delivered. Same card as the transcript compose widget, so a request looks
 * the same whether it is being drafted, answered, or tallied.
 *
 * Three things carry this surface:
 *
 * - **You see only what is assigned to you.** The ask list comes from the
 *   protocol's assignment model (`feedbackRespondAsks`), and the submit gate
 *   runs the server's own `validateFeedbackResponse`. Neither check lives in
 *   the JSX, and neither is a filter invented here.
 * - **The comment link is quiet and unconditioned.** It sits in the footer note
 *   slot rather than beside `Submit answers`, and -- this is the part that
 *   matters -- it is still there after submitting. A recipient who cannot
 *   answer, because the question is wrong or they need something cleared up,
 *   must never hit a dead end; that failure is worse than a slightly lower
 *   structured-response rate.
 * - **What the server withheld stays withheld.** Under `hiddenUntilAnswered`
 *   the server decides which responses this viewer may see. This component
 *   renders the response set it was handed and adds no filter of its own -- a
 *   client-side re-filter would mask a server bug rather than prevent one.
 *
 * Draft answers live in this component. No parent holds a copy.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { FeedbackAnswer, FeedbackAsk } from '@nimbalyst/collab-protocol';
import { useTranslation } from '@nimbalyst/i18n/react';
import {
  InteractiveWidgetBody,
  InteractiveWidgetCard,
  InteractiveWidgetHeader,
  WidgetActionButton,
  WidgetBlock,
  WidgetFooter,
  WidgetNoteRow,
  WidgetQuietLink,
  WidgetStatusPill,
} from '@nimbalyst/runtime/ui/AgentTranscript/components/CustomToolWidgets/shared/InteractiveWidgetChrome';

import type { FeedbackRequestServiceState } from '@nimbalyst/collab-client/feedback';
import { FeedbackRespondAskField } from './FeedbackRespondAskField';
import type { FeedbackOptionPreviewRenderer } from './FeedbackRespondOptionCards';
import type { FeedbackArtifactDetailRenderer } from './FeedbackArtifactDetailPopover';
import {
  FeedbackArtifactSubjects,
  type FeedbackArtifactActionResolver,
  type FeedbackSubjectOpener,
  type FeedbackSubjectPreviewRenderer,
} from './FeedbackArtifactSubjects';
import {
  feedbackRespondAsks,
  feedbackRespondSignature,
  feedbackRespondSubmitPlan,
  initialFeedbackRespondDraft,
  setFeedbackRespondAnswer,
  type FeedbackRespondDraft,
  type FeedbackRespondBlockedReason,
} from '@nimbalyst/collab-client/feedback';

const BLOCKED_MESSAGE_KEYS: Record<FeedbackRespondBlockedReason, string> = {
  notARecipient: 'request.blocked.not_a_recipient',
  requestNotOpen: 'request.blocked.request_not_open',
  incomplete: 'request.blocked.incomplete',
  rejected: 'request.blocked.rejected',
};

const ASK_TYPE_HINTS: Record<FeedbackAsk['type'],
  | 'ask_hint.pick_one'
  | 'ask_hint.pick_any'
  | 'ask_hint.drag_to_rank'
  | 'ask_hint.free_text'
  | 'ask_hint.yes_or_no'
  | 'ask_hint.rating'> = {
  singleSelect: 'ask_hint.pick_one',
  multiSelect: 'ask_hint.pick_any',
  reorder: 'ask_hint.drag_to_rank',
  editText: 'ask_hint.free_text',
  confirm: 'ask_hint.yes_or_no',
  rating: 'ask_hint.rating',
};

export interface FeedbackRespondSubmitResult {
  success: boolean;
  error?: string;
}

/**
 * Optional, exactly as on the compose surface: with no host the surface still
 * renders the request honestly and says plainly that it cannot send.
 */
export interface FeedbackRespondHost {
  submitAnswers(
    answers: Array<{ askId: string; answer: FeedbackAnswer }>,
  ): Promise<FeedbackRespondSubmitResult>;
}

export interface FeedbackRequestRespondProps {
  state: FeedbackRequestServiceState;
  host?: FeedbackRespondHost;
  /** Host-owned discussion surface; the respond tree knows no comment system. */
  discussion?: React.ReactNode;
  /** Per-option artifact previews, when the embedding surface has them. */
  renderOptionPreview?: FeedbackOptionPreviewRenderer;
  /**
   * Paints what the request is *about*, as distinct from the artifacts bound to
   * one ask's options. Absent leaves the subject list as text rows.
   */
  renderSubjectPreview?: FeedbackSubjectPreviewRenderer;
  /**
   * Paints one artifact full-size for the detail popover. Supplied means expand
   * opens the popover in place; absent means expand opens a tab, as it did
   * before the popover existed.
   */
  renderArtifactDetail?: FeedbackArtifactDetailRenderer;
  /**
   * Opens a subject or a bound artifact. Host-supplied because the mechanics
   * differ per host -- a tab in the desktop app, a route in the browser -- and
   * neither belongs in this tree. Absent means the subjects still render, as
   * text.
   */
  onOpenSubject?: FeedbackSubjectOpener;
  /** Resolves each artifact before an open affordance is rendered. */
  resolveArtifactAction?: FeedbackArtifactActionResolver;
  /** Overridden in tests; deadline copy is the only thing that reads it. */
  now?: number;
}

const FeedbackIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="w-full h-full">
    <path
      d="M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v6A1.5 1.5 0 0 1 12.5 12H6l-3 2.2V12h-.5A1.5 1.5 0 0 1 1 10.5v-6"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <circle cx="6" cy="7.5" r="0.9" fill="currentColor" />
    <circle cx="9" cy="7.5" r="0.9" fill="currentColor" />
  </svg>
);

const LockIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="w-full h-full">
    <rect x="2.5" y="6" width="9" height="6.2" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.6 6V4.4a2.4 2.4 0 0 1 4.8 0V6" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

function formatDeadline(
  deadline: number,
  now: number,
  locale: string,
  pastDue: string,
  due: (date: string) => string,
): string {
  const remainingMs = deadline - now;
  if (remainingMs <= 0) return pastDue;
  const formatted = new Date(deadline).toLocaleString(locale, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
  return due(formatted);
}

export const FeedbackRequestRespond: React.FC<FeedbackRequestRespondProps> = ({
  state,
  host,
  discussion,
  renderOptionPreview,
  renderSubjectPreview,
  renderArtifactDetail,
  onOpenSubject,
  resolveArtifactAction,
  now,
}) => {
  const { t, i18n } = useTranslation('feedback');
  const request = state.request;
  const teamMemberId = state.teamMemberId;

  const [draft, setDraft] = useState<FeedbackRespondDraft | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedSignature, setSubmittedSignature] = useState<string | null>(null);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [clock] = useState(() => now ?? Date.now());

  // Seed once per request, then leave it alone: a snapshot arriving while
  // someone is mid-answer must not overwrite what they have picked.
  useEffect(() => {
    if (!request || !teamMemberId) return;
    setDraft((current) =>
      current && current.requestId === request.id
        ? current
        : initialFeedbackRespondDraft(request, teamMemberId));
  }, [request, teamMemberId]);

  const asks = useMemo(
    () => (request ? feedbackRespondAsks(request, teamMemberId) : []),
    [request, teamMemberId],
  );

  const handleAnswer = useCallback((askId: string, answer: FeedbackAnswer) => {
    setSubmitError(null);
    setDraft((current) =>
      current ? setFeedbackRespondAnswer(current, askId, answer) : current);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!request || !draft || !host) return;
    const plan = feedbackRespondSubmitPlan(request, teamMemberId, draft, clock);
    if (plan.kind !== 'ready') return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await host.submitAnswers(
        plan.responses.map((response) => ({
          askId: response.askId,
          answer: response.answer,
        })),
      );
      if (result.success) {
        setSubmittedSignature(feedbackRespondSignature(asks, draft));
      } else {
        setSubmitError(result.error ?? t('request.submit_error'));
      }
    } catch (error) {
      console.error('[FeedbackRequestRespond] Failed to submit:', error);
      setSubmitError(
        error instanceof Error ? error.message : t('request.submit_error'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [request, draft, host, teamMemberId, clock, asks, t]);

  if (!request) {
    return (
      <InteractiveWidgetCard
        rootClassName="feedback-request-respond"
        testId="feedback-request-respond"
        state={state.status === 'error' ? 'error' : 'loading'}
        tone="resolved"
      >
        <InteractiveWidgetHeader icon={<FeedbackIcon />} title={t('request.title')} />
        <InteractiveWidgetBody>
          <div className="text-xs text-nim-muted select-text">
            {state.error?.message ?? t('request.loading')}
          </div>
        </InteractiveWidgetBody>
      </InteractiveWidgetCard>
    );
  }

  const plan = draft
    ? feedbackRespondSubmitPlan(request, teamMemberId, draft, clock)
    : ({ kind: 'blocked', reason: 'incomplete' } as const);
  const hasSubmitted = submittedSignature !== null;
  const isUnchangedSinceSubmit = Boolean(
    draft && hasSubmitted && feedbackRespondSignature(asks, draft) === submittedSignature,
  );
  const isRecipient = asks.length > 0;
  const canSend = Boolean(host) && !isSubmitting;

  const footerNote = submitError
    ? submitError
    : plan.kind === 'blocked'
      ? t(BLOCKED_MESSAGE_KEYS[plan.reason])
      : !host
        ? t('request.unavailable')
        : hasSubmitted
          ? t('request.answers_sent')
          : t('request.recipient_note');

  return (
    <InteractiveWidgetCard
      rootClassName="feedback-request-respond @container/feedback-respond"
      testId="feedback-request-respond"
      state={hasSubmitted ? 'submitted' : isRecipient ? 'open' : 'observing'}
      tone={hasSubmitted || !isRecipient ? 'resolved' : 'active'}
    >
      <InteractiveWidgetHeader
        icon={<FeedbackIcon />}
        title={t('request.title')}
        trailing={
          <span className="flex items-center gap-1.5">
            {hasSubmitted ? (
              <WidgetStatusPill tone="success" testId="feedback-respond-status">
                {t('status.answers_submitted')}
              </WidgetStatusPill>
            ) : isRecipient ? (
              <WidgetStatusPill tone="primary" testId="feedback-respond-status">
                {asks.length === 1
                  ? t('status.one_ask_for_you')
                  : t('status.asks_for_you', { count: asks.length })}
              </WidgetStatusPill>
            ) : (
              <WidgetStatusPill tone="muted" testId="feedback-respond-status">
                {t('status.nothing_for_you')}
              </WidgetStatusPill>
            )}
            {request.deadline !== undefined && (
              <WidgetStatusPill tone="warning">
                {formatDeadline(
                  request.deadline,
                  clock,
                  i18n.language,
                  t('deadline.past_due'),
                  (date) => t('deadline.due', { date }),
                )}
              </WidgetStatusPill>
            )}
          </span>
        }
      />

      <InteractiveWidgetBody>
        {/* Above the asks, because what the request is about is context for
            every question below it -- and because an observer with nothing
            assigned still needs it to follow the discussion. */}
        <FeedbackArtifactSubjects
          subjects={request.subjects}
          onOpen={onOpenSubject}
          renderPreview={renderSubjectPreview}
          resolveAction={resolveArtifactAction}
        />

        {asks.map((ask, index) => (
          <WidgetBlock
            key={ask.id}
            testId="feedback-respond-ask"
            rootClassName="feedback-respond-ask"
            tag={t('request.question_tag', { number: index + 1, label: ask.label })}
            hint={t(ASK_TYPE_HINTS[ask.type])}
            question={ask.description || ask.label}
            selectableQuestion
          >
            <FeedbackRespondAskField
              ask={ask}
              answer={draft?.answers[ask.id]}
              disabled={isSubmitting || request.lifecycle.status !== 'open'}
              renderOptionPreview={renderOptionPreview}
              renderArtifactDetail={renderArtifactDetail}
              // Now the popover's escalation rather than what expand does: the
              // tab is where you go to comment on or edit an artifact, one step
              // past looking at it. Still the same opener a subject row uses --
              // there is no second mechanism, and no host supplies two.
              onExpandArtifact={onOpenSubject}
              resolveArtifactAction={resolveArtifactAction}
              onChange={(answer) => handleAnswer(ask.id, answer)}
            />
          </WidgetBlock>
        ))}

        {!isRecipient && (
          <WidgetNoteRow
            rootClassName="feedback-respond-observer-note"
            testId="feedback-respond-observer-note"
          >
            {t('request.observer_note')}
          </WidgetNoteRow>
        )}

        {request.visibility === 'hiddenUntilAnswered' && isRecipient && (
          <WidgetNoteRow
            icon={<LockIcon />}
            rootClassName="feedback-respond-hidden-note"
            testId="feedback-respond-hidden-note"
          >
            {t('request.hidden_answers_note')}
          </WidgetNoteRow>
        )}

        <WidgetFooter
          note={
            <span className="flex flex-wrap items-center gap-2">
              <span>{footerNote}</span>
              {/* Decision 12: quiet, in the note slot, and never conditioned on
                  having answered -- least of all hidden once you have. */}
              <WidgetQuietLink
                testId="feedback-respond-add-comment"
                rootClassName="feedback-respond-add-comment"
                onClick={() => setDiscussionOpen(true)}
              >
                {t('request.add_comment')}
              </WidgetQuietLink>
            </span>
          }
        >
          {isRecipient && (
            <WidgetActionButton
              variant="primary"
              testId="feedback-respond-submit"
              onClick={() => void handleSubmit()}
              disabled={plan.kind === 'blocked' || !canSend || isUnchangedSinceSubmit}
            >
              {isSubmitting
                ? t('request.sending')
                : hasSubmitted
                  ? t('request.update_answers')
                  : t('request.submit_answers')}
            </WidgetActionButton>
          )}
        </WidgetFooter>
      </InteractiveWidgetBody>

      {(discussionOpen || (request.discussion?.length ?? 0) > 0) && (
        <div
          data-testid="feedback-respond-discussion"
          className="feedback-respond-discussion border-t border-nim bg-nim-secondary px-3.5 py-3"
        >
          <div className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-nim-faint">
            {t('request.discussion')}{request.discussion?.length ? ` · ${request.discussion.length}` : ''}
          </div>
          {discussion != null ? discussion : (
            <div
              data-testid="feedback-respond-discussion-unavailable"
              className="text-xs text-nim-muted select-text"
            >
              {t('request.commenting_unavailable')}
            </div>
          )}
        </div>
      )}
    </InteractiveWidgetCard>
  );
};
