/**
 * FeedbackRequestComposeWidget
 *
 * The compose surface: the agent drafts a request to other people, and the
 * author reviews it in the transcript before anything leaves the machine.
 *
 * Two behaviours carry this slice, and both live in `feedbackComposeDraft.ts`
 * so they are testable without rendering:
 *
 * - **Tier is derived from the draft's content, never stored.** One recipient,
 *   no deadline, nothing unshared renders as a quick ask: who, the asks, and a
 *   single collapsed line of defaults. Adding a second recipient, a deadline,
 *   or an unshared subject grows the same card into the full request. There is
 *   no second command and no mode toggle, and demoting never discards what the
 *   author already entered -- the fields stop being shown, the values stay.
 * - **Nothing publishes without an explicit confirmation** that names the exact
 *   subjects becoming visible.
 *
 * Draft state lives in a jotai atomFamily keyed by the tool call id, so it
 * survives session switches and virtual-scroll churn. The widget owns it; no
 * parent holds a copy.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import { useAtom, useAtomValue } from 'jotai';
import type { FeedbackAsk, ResourceRef } from '@nimbalyst/collab-protocol';
import type { CustomToolWidgetProps } from '../index';
import { interactiveWidgetHostAtom } from '../../../../../store/atoms/interactiveWidgetHost';
import { feedbackRecipientDirectoryAtom } from '../../../../../store/atoms/feedbackRecipientDirectory';
import {
  clearFeedbackRequestComposeDraft,
  feedbackRequestComposeDraftAtom,
  feedbackRequestComposeSentAtom,
} from '../../../../../store/atoms/feedbackRequestComposeDraft';
import {
  InteractiveWidgetBody,
  InteractiveWidgetCard,
  InteractiveWidgetHeader,
  WidgetActionButton,
  WidgetBlock,
  WidgetFooter,
  WidgetStatusPill,
} from '../shared/InteractiveWidgetChrome';
import {
  addRecipient,
  confirmPublish,
  destinationSubjects,
  feedbackComposeSendPayload,
  feedbackComposeSubmitPlan,
  feedbackComposeTier,
  isAskAssignedTo,
  recipientsAssignedToAsk,
  removeRecipient,
  removeSubject,
  setDeadline,
  setDestination,
  setQuorumMode,
  setSettingsExpanded,
  setVisibility,
  toggleAssignment,
  unsharedSubjects,
} from './feedbackComposeDraft';
import {
  parseFeedbackComposeArgs,
  parseRequestFeedbackToolResult,
} from './parseFeedbackComposeArgs';
import { FeedbackCopyLinkButton } from './FeedbackCopyLinkButton';
import { FeedbackComposeSubjects } from './FeedbackComposeSubjects';
import {
  FeedbackComposeAddRecipient,
  FeedbackComposeRecipients,
  RecipientAvatar,
} from './FeedbackComposeRecipients';
import { FeedbackComposeDelivery, formatDeadline } from './FeedbackComposeDelivery';
import { FeedbackComposeAskPreview } from './FeedbackComposeAskPreview';
import { FeedbackComposePublishPrompt } from './FeedbackComposePublishPrompt';

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

function joinNames(
  names: string[],
  pairSeparator: string,
  finalSeparator: string,
  listSeparator: string,
  emptyValue: string
): string {
  if (names.length === 0) return emptyValue;
  if (names.length === 1) return names[0];
  if (names.length === 2) return names.join(pairSeparator);
  return `${names.slice(0, -1).join(listSeparator)}${finalSeparator}${names[names.length - 1]}`;
}

export const FeedbackRequestComposeWidget: React.FC<CustomToolWidgetProps> = ({
  message,
  sessionId,
}) => {
  const { t } = useTranslation('aichat');
  const { t: tFeedback } = useTranslation('feedback');
  const toolCall = message.toolCall;
  const draftId = toolCall?.providerToolCallId || '';

  const host = useAtomValue(interactiveWidgetHostAtom(sessionId));
  const directory = useAtomValue(feedbackRecipientDirectoryAtom);
  const [draft, setDraft] = useAtom(feedbackRequestComposeDraftAtom(draftId));
  const [sent, setSent] = useAtom(feedbackRequestComposeSentAtom(draftId));

  const parsedArgs = useMemo(
    () => (toolCall && draftId ? parseFeedbackComposeArgs(toolCall.arguments, draftId) : null),
    [toolCall, draftId]
  );
  const parsedResult = useMemo(
    () => (toolCall && draftId ? parseRequestFeedbackToolResult(toolCall.result, draftId) : null),
    [toolCall, draftId]
  );
  const parsed =
    parsedResult?.status === 'draftReady'
      ? parsedResult.draft
      : parsedArgs?.recipients.length
      ? parsedArgs
      : null;

  // Seed once from the agent's draft, then leave it alone so author edits are
  // never overwritten by a re-render.
  useEffect(() => {
    if (!draft && parsed) setDraft(parsed);
  }, [draft, parsed, setDraft]);

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [publishPromptForced, setPublishPromptForced] = useState(false);
  const hasSent = sent !== null;
  const shareUrl = sent?.shareUrl ?? null;
  const [now] = useState(() => Date.now());

  const update = useCallback(
    (next: (current: NonNullable<typeof draft>) => NonNullable<typeof draft>) => {
      setDraft((current) => (current ? next(current) : current));
      setSendError(null);
    },
    [setDraft]
  );

  const send = useCallback(
    async (refsToPublish: ResourceRef[]) => {
      // `hasSent` rather than `isSending`: the latter only guards a second click
      // inside one mount, and the duplicate requests came from a remount.
      if (!draft || hasSent || !host?.feedbackRequestSend) return;
      setIsSending(true);
      setSendError(null);
      try {
        const result = await host.feedbackRequestSend(
          feedbackComposeSendPayload(draft, refsToPublish)
        );
        if (result.success) {
          // The draft deliberately stays. Removing it empties the atom, which
          // the seed effect above reads as "never composed" and refills from
          // the agent's original arguments.
          setSent({
            sentAt: Date.now(),
            ...(result.requestId ? { requestId: result.requestId } : {}),
            ...(result.shareUrl ? { shareUrl: result.shareUrl } : {}),
            ...(result.warning ? { warning: result.warning } : {}),
          });
        } else {
          setSendError(result.error ?? t('feedback_compose.send_failed'));
        }
      } catch (error) {
        console.error('[FeedbackRequestComposeWidget] Failed to send:', error);
        setSendError(error instanceof Error ? error.message : t('feedback_compose.send_failed'));
      } finally {
        setIsSending(false);
      }
    },
    [draft, hasSent, host, setSent, t]
  );

  const handleChangeDestination = useCallback(async () => {
    if (!host?.pickFeedbackDestination) return;
    try {
      const picked = await host.pickFeedbackDestination({
        folderId: draft?.destination?.folderId ?? null,
        subjectCount: draft ? destinationSubjects(draft).length : 0,
      });
      // Dismissing the picker is not a choice; leave the draft as it was.
      if (picked) update((current) => setDestination(current, picked));
    } catch (error) {
      console.error('[FeedbackRequestComposeWidget] Failed to pick a destination:', error);
    }
  }, [host, draft, update]);

  const handleCancel = useCallback(async () => {
    try {
      await host?.feedbackRequestCancel?.(draftId);
    } catch (error) {
      console.error('[FeedbackRequestComposeWidget] Failed to cancel:', error);
    }
    clearFeedbackRequestComposeDraft(draftId);
  }, [host, draftId]);

  if (!toolCall || !draftId) return null;

  if (parsedResult && parsedResult.status !== 'draftReady') {
    return (
      <InteractiveWidgetCard
        rootClassName="feedback-request-compose-widget @container/feedback-compose"
        testId="feedback-request-compose-widget"
        state={parsedResult.status}
        tone="active"
      >
        <InteractiveWidgetHeader
          icon={<FeedbackIcon />}
          title={
            parsedResult.status === 'ambiguousRecipient'
              ? t('feedback_compose.choose_recipient')
              : t('feedback_compose.not_drafted')
          }
          trailing={
            <WidgetStatusPill tone="muted">{t('feedback_compose.not_sent')}</WidgetStatusPill>
          }
        />
        <InteractiveWidgetBody>
          <div className="text-xs text-nim-muted leading-relaxed select-text">
            {parsedResult.message === 'The feedback request draft could not be prepared.'
              ? t('feedback_compose.draft_prepare_failed')
              : parsedResult.message}
          </div>
        </InteractiveWidgetBody>
      </InteractiveWidgetCard>
    );
  }

  if (!draft) return null;

  const tier = feedbackComposeTier(draft);
  const plan = feedbackComposeSubmitPlan(draft);
  const pendingPublish = unsharedSubjects(draft);
  const recipientNames = draft.recipients.map((recipient) => recipient.name);
  const candidates = directory.filter(
    (candidate) => !draft.recipients.some((recipient) => recipient.userId === candidate.userId)
  );
  const canSend = Boolean(host?.feedbackRequestSend) && !isSending;

  // ---------- sent ----------
  if (hasSent) {
    return (
      <InteractiveWidgetCard
        rootClassName="feedback-request-compose-widget @container/feedback-compose"
        testId="feedback-request-compose-widget"
        state="sent"
        tone="resolved"
      >
        <InteractiveWidgetHeader
          icon={<FeedbackIcon />}
          title={t('feedback_compose.asked', {
            names: joinNames(
              recipientNames,
              t('feedback_compose.names_pair_separator'),
              t('feedback_compose.names_final_separator'),
              t('feedback_compose.names_list_separator'),
              t('feedback_compose.nobody_yet')
            ),
          })}
          trailing={
            <WidgetStatusPill tone="muted">{t('feedback_compose.waiting_reply')}</WidgetStatusPill>
          }
        />
        <InteractiveWidgetBody>
          <div className="text-xs text-nim-muted leading-relaxed select-text">
            {draft.asks.map((ask) => ask.description || ask.label).join(' · ')}
          </div>
          {sent.warning && (
            <div role="status" className="text-xs text-nim-muted">
              {sent.warning}
            </div>
          )}
          {shareUrl && (
            <div
              className="feedback-compose-share flex flex-wrap items-center gap-2"
              data-testid="feedback-compose-share"
            >
              <FeedbackCopyLinkButton url={shareUrl} testId="feedback-compose-copy-link" />
              <span className="min-w-0 flex-1 truncate text-[0.6875rem] text-nim-faint select-text">
                {shareUrl}
              </span>
            </div>
          )}
          {shareUrl && (
            <div className="text-[0.6875rem] text-nim-faint">
              {t('feedback_compose.share_link_hint')}
            </div>
          )}
          <div className="text-[0.6875rem] text-nim-faint">
            {t('feedback_compose.session_resumes')}
          </div>
        </InteractiveWidgetBody>
      </InteractiveWidgetCard>
    );
  }

  // ---------- primary action ----------
  const primaryLabel =
    pendingPublish.length > 0
      ? t('feedback_compose.publish_and_send')
      : tier === 'quick' && draft.recipients.length === 1
      ? t('feedback_compose.ask_person', { name: draft.recipients[0].name })
      : t('feedback_compose.send_request');

  const handlePrimary = () => {
    if (plan.kind === 'blocked') return;
    if (plan.kind === 'needsPublishConfirmation') {
      // No dead end and no silent publish: surface the exact list instead.
      setPublishPromptForced(true);
      return;
    }
    void send(plan.publishSubjectRefs);
  };

  const handleConfirmPublishAndSend = () => {
    const confirmed = confirmPublish(draft);
    setDraft(confirmed);
    const confirmedPlan = feedbackComposeSubmitPlan(confirmed);
    if (confirmedPlan.kind !== 'ready') return;
    void send(confirmedPlan.publishSubjectRefs);
  };

  const footerNote =
    plan.kind === 'blocked'
      ? t(`feedback_compose.blocked.${plan.reason}`)
      : sendError
      ? sendError
      : !host?.feedbackRequestSend
      ? t('feedback_compose.delivery_unavailable')
      : pendingPublish.length > 0
      ? t('feedback_compose.sending_publishes')
      : draft.subjects.length > 0
      ? t('feedback_compose.sending_saves_questions')
      : t('feedback_compose.sending_creates_document');

  const showDelivery = tier === 'full' || draft.settingsExpanded;
  const composeDefaults = [
    tFeedback('compose.summary.direct_message'),
    tFeedback(
      draft.visibility === 'open'
        ? 'compose.summary.visibility_open'
        : 'compose.summary.visibility_after_each_reply'
    ),
    draft.deadline === undefined
      ? tFeedback('compose.summary.no_deadline')
      : tFeedback('compose.summary.due', { date: formatDeadline(draft.deadline) }),
    draft.recipients.length <= 1
      ? draft.recipients[0]?.name
        ? tFeedback('compose.summary.wake_one_named', { name: draft.recipients[0].name })
        : tFeedback('compose.summary.wake_one')
      : draft.quorumMode === 'first'
        ? tFeedback('compose.summary.wake_first_or_close')
        : tFeedback('compose.summary.wake_all_or_close'),
  ].join(' · ');

  return (
    <InteractiveWidgetCard
      rootClassName="feedback-request-compose-widget @container/feedback-compose"
      testId="feedback-request-compose-widget"
      state={tier === 'full' ? 'draft-full' : 'draft-quick'}
      tone="active"
    >
      <InteractiveWidgetHeader
        icon={<FeedbackIcon />}
        title={
          tier === 'full'
            ? t('feedback_compose.title_request')
            : t('feedback_compose.title_ask_someone')
        }
        trailing={
          <WidgetStatusPill tone="primary">
            {tier === 'full' && draft.recipients.length > 1
              ? t('feedback_compose.recipients_count', {
                  count: draft.recipients.length,
                })
              : t('feedback_compose.draft_not_sent')}
          </WidgetStatusPill>
        }
      />

      <InteractiveWidgetBody>
        <div className="feedback-compose-document-host text-xs text-nim-muted mb-3">
          {draft.hostDocumentId
            ? t('feedback_compose.document', {
                name:
                  draft.subjects.find((subject) => subject.ref.sourceId === draft.hostDocumentId)
                    ?.label ?? draft.hostDocumentId,
              })
            : t('feedback_compose.new_shared_document')}
        </div>
        {/* Subject — Tier 2 only; a one-person quick ask does not need a
            subject row, and showing one implies ceremony the ask lacks. */}
        {tier === 'full' && draft.subjects.length > 0 && (
          <WidgetBlock
            tag={t('feedback_compose.subject')}
            hint={t('feedback_compose.subject_hint')}
            rootClassName="feedback-compose-subject-block"
            testId="feedback-compose-subject-block"
          >
            <FeedbackComposeSubjects
              subjects={draft.subjects}
              onRemove={(sourceId) => update((current) => removeSubject(current, sourceId))}
            />
          </WidgetBlock>
        )}

        {/* Recipients — one inline row at Tier 1, the assignable list at Tier 2. */}
        {tier === 'full' ? (
          <WidgetBlock
            tag={t('feedback_compose.recipients')}
            hint={t('feedback_compose.recipients_hint')}
            rootClassName="feedback-compose-recipient-block"
            testId="feedback-compose-recipient-block"
          >
            <FeedbackComposeRecipients
              recipients={draft.recipients}
              asks={draft.asks}
              candidates={candidates}
              isAskAssigned={(askId, userId) => isAskAssignedTo(draft, askId, userId)}
              onToggleAssignment={(askId, userId) =>
                update((current) => toggleAssignment(current, askId, userId))
              }
              onAdd={(recipient) => update((current) => addRecipient(current, recipient))}
              onRemove={(userId) => update((current) => removeRecipient(current, userId))}
              disabled={isSending}
            />
          </WidgetBlock>
        ) : (
          <div
            data-testid="feedback-compose-quick-recipients"
            className="feedback-compose-quick-recipients flex items-center gap-2 flex-wrap"
          >
            <span className="text-xs text-nim-faint">{t('feedback_compose.ask_label')}</span>
            {draft.recipients.map((recipient) => (
              <span
                key={recipient.userId}
                data-testid="feedback-compose-recipient"
                className="feedback-compose-person-chip inline-flex items-center gap-1.5 rounded-full border border-nim bg-nim-secondary py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-nim"
              >
                <RecipientAvatar name={recipient.name} className="w-5 h-5" />
                {recipient.name}
                <button
                  type="button"
                  data-testid="feedback-compose-remove-recipient"
                  aria-label={t('feedback_compose.remove_person', {
                    name: recipient.name,
                  })}
                  onClick={() => update((current) => removeRecipient(current, recipient.userId))}
                  className="text-nim-faint hover:text-nim cursor-pointer bg-transparent border-none p-0 leading-none"
                >
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 2l6 6M8 2l-6 6"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </span>
            ))}
            <FeedbackComposeAddRecipient
              candidates={candidates}
              onAdd={(recipient) => update((current) => addRecipient(current, recipient))}
              disabled={isSending}
            />
          </div>
        )}

        {/* Asks */}
        {draft.asks.map((ask, index) => {
          const assigned = recipientsAssignedToAsk(draft, ask.id).map((r) => r.name);
          return (
            <WidgetBlock
              key={ask.id}
              testId="feedback-compose-ask"
              rootClassName="feedback-compose-ask"
              tag={t('feedback_compose.question_label', {
                index: index + 1,
                label: ask.label,
              })}
              hint={
                tier === 'full'
                  ? `${t(`feedback_compose.ask_type.${ask.type}`)} · ${joinNames(
                      assigned,
                      t('feedback_compose.names_pair_separator'),
                      t('feedback_compose.names_final_separator'),
                      t('feedback_compose.names_list_separator'),
                      t('feedback_compose.nobody_yet')
                    )}`
                  : t(`feedback_compose.ask_type.${ask.type}`)
              }
              question={ask.description || ask.label}
              selectableQuestion
            >
              <FeedbackComposeAskPreview
                ask={ask}
                renderArtifact={host?.renderFeedbackArtifactPreview}
                renderArtifactPopover={host?.renderFeedbackArtifactPopover}
              />
            </WidgetBlock>
          );
        })}

        {/* Delivery — a collapsed line at Tier 1, fields at Tier 2. */}
        {showDelivery ? (
          <WidgetBlock
            tag={t('feedback_compose.delivery')}
            tagTone="neutral"
            rootClassName="feedback-compose-delivery-block"
            testId="feedback-compose-delivery-block"
          >
            <FeedbackComposeDelivery
              visibility={draft.visibility}
              deadline={draft.deadline}
              quorumMode={draft.quorumMode}
              recipientCount={draft.recipients.length}
              now={now}
              onVisibilityChange={(visibility) =>
                update((current) => setVisibility(current, visibility))
              }
              onDeadlineChange={(deadline) => update((current) => setDeadline(current, deadline))}
              onQuorumModeChange={(mode) => update((current) => setQuorumMode(current, mode))}
              disabled={isSending}
            />
          </WidgetBlock>
        ) : (
          <div
            data-testid="feedback-compose-defaults"
            className="feedback-compose-defaults flex items-center gap-2 flex-wrap rounded-md border border-dashed border-nim px-3 py-2 text-[0.6875rem] text-nim-muted"
          >
            <span className="font-medium text-nim-faint">{t('feedback_compose.defaults')}</span>
            <span className="select-text">{composeDefaults}</span>
            <button
              type="button"
              data-testid="feedback-compose-more-options"
              onClick={() => update((current) => setSettingsExpanded(current, true))}
              className="ml-auto text-xs text-nim-primary bg-transparent border-none p-0 cursor-pointer hover:underline"
            >
              {t('feedback_compose.more_options')}
            </button>
          </div>
        )}

        {pendingPublish.length > 0 && (
          <FeedbackComposePublishPrompt
            subjects={pendingPublish}
            confirmedSourceIds={draft.publishConfirmedSourceIds}
            recipientNames={recipientNames}
            forceExpanded={publishPromptForced}
            onConfirmAndSend={handleConfirmPublishAndSend}
            disabled={!canSend}
            destinationSubjectCount={destinationSubjects(draft).length}
            destination={draft.destination}
            onChangeDestination={
              host?.pickFeedbackDestination ? handleChangeDestination : undefined
            }
          />
        )}

        <WidgetFooter note={footerNote}>
          <WidgetActionButton
            variant="secondary"
            testId="feedback-compose-cancel"
            onClick={handleCancel}
            disabled={isSending}
          >
            {t('feedback_compose.cancel')}
          </WidgetActionButton>
          <WidgetActionButton
            variant="primary"
            testId="feedback-compose-send"
            onClick={handlePrimary}
            disabled={plan.kind === 'blocked' || !canSend}
          >
            {isSending ? t('feedback_compose.sending') : primaryLabel}
          </WidgetActionButton>
        </WidgetFooter>
      </InteractiveWidgetBody>
    </InteractiveWidgetCard>
  );
};
