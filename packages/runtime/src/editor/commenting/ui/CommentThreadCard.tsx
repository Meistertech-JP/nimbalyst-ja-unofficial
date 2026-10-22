/**
 * One comment thread: its anchor line, its comments, and the affordances that
 * act on it.
 *
 * The card knows nothing about how the thread is attached to the document. It
 * is handed an anchor state and a label; whether that came from a Lexical
 * MarkNode, a mockup element id, or a graph node is the owning editor's
 * business. A thread whose anchor is gone renders exactly as loudly as one
 * that is attached — the history is the point, and it is never hidden or
 * deleted because the target disappeared.
 */

import type { JSX, KeyboardEvent, Ref } from 'react';
import { useCallback, useRef } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';

import type { Comment, Thread } from '../types';
import { CommentActorLabel, commentActorName } from './CommentActorLabel';
import { CommentComposer } from './CommentComposer';
import type {
  CommentAnchorState,
  CommentMember,
  CommentThreadActions,
} from './types';

function formatTimestamp(ts: number, locale: string): string {
  try {
    return new Date(ts).toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function replyTargetName(thread: Thread, comment: Comment): string | null {
  const target = thread.comments.find(
    (candidate) => candidate.id === comment.replyToCommentId,
  );
  return target ? commentActorName(target) : null;
}

export interface CommentThreadCardProps extends CommentThreadActions {
  thread: Thread;
  /** Defaults to `attached`. */
  anchorState?: CommentAnchorState;
  /** Falls back to `thread.quote`. */
  anchorLabel?: string;
  isActive: boolean;
  /** False for a read-only viewer: reading stays, authoring disappears. */
  canComment: boolean;
  getMembers(): CommentMember[];
  /** Set by the panel's roving tabindex; defaults to focusable. */
  tabIndex?: number;
  cardRef?: Ref<HTMLDivElement>;
  /** Composer autofocus, for a thread the user just created. */
  autoFocusComposer?: boolean;
}

export function CommentThreadCard({
  thread,
  anchorState = 'attached',
  anchorLabel,
  isActive,
  canComment,
  getMembers,
  tabIndex = 0,
  cardRef,
  autoFocusComposer = false,
  onSelectThread,
  onSetThreadResolved,
  onDeleteThread,
  onDeleteComment,
  onReply,
  onOpenAgentSession,
}: CommentThreadCardProps): JSX.Element {
  const { t, i18n } = useTranslation('editor');
  const localRef = useRef<HTMLDivElement | null>(null);
  const label = anchorLabel ?? thread.quote;
  const isDetached = anchorState !== 'attached';
  const isEmpty = thread.comments.length === 0;
  const accessibleLabel = [
    t('thread_card.thread_on', { anchor: label || t('comments.no_quote') }),
    t('thread_card.comment_count', { count: thread.comments.length }),
    ...(thread.resolved ? [t('thread_card.resolved')] : []),
    ...(isDetached ? [t('thread_card.detached')] : []),
  ].join(', ');

  const select = useCallback(
    () => onSelectThread(thread.id),
    [onSelectThread, thread.id],
  );

  // Cancelling a reply hands focus back to the card so keyboard users are not
  // dropped onto <body>. Cancelling an empty thread deletes it, and the panel
  // takes focus from there.
  const handleComposerCancel = useCallback(() => {
    if (isEmpty) {
      onDeleteThread(thread);
      return;
    }
    localRef.current?.focus();
  }, [isEmpty, onDeleteThread, thread]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    },
    [select],
  );

  return (
    <div
      ref={(element) => {
        localRef.current = element;
        if (typeof cardRef === 'function') cardRef(element);
        else if (cardRef) {
          (cardRef as { current: HTMLDivElement | null }).current = element;
        }
      }}
      className={
        'nim-comment-thread' +
        (isActive ? ' active' : '') +
        (thread.resolved ? ' resolved' : '') +
        (isDetached ? ' detached' : '')
      }
      data-testid="comment-thread"
      data-thread-id={thread.id}
      data-resolved={thread.resolved ? 'true' : 'false'}
      data-anchor-state={anchorState}
      role="listitem"
      tabIndex={tabIndex}
      aria-current={isActive ? 'true' : undefined}
      aria-label={accessibleLabel}
      onClick={select}
      onKeyDown={handleKeyDown}
    >
      <div className="nim-comment-quote" title={label}>
        {thread.resolved && (
          <span className="nim-comment-resolved-badge" title={t('thread_card.resolved')}>
            <span className="material-symbols-outlined">check_circle</span>
          </span>
        )}
        {label || t('comments.no_quote')}
      </div>

      {isDetached && (
        <div className="nim-comment-detached-notice" data-testid="comment-thread-detached">
          <span className="material-symbols-outlined">link_off</span>
          <span>{t(anchorState === 'orphaned' ? 'thread_card.orphaned' : 'thread_card.unsupported')}</span>
        </div>
      )}

      {thread.resolved ? (
        // Resolved threads collapse to a dimmed summary with an Unresolve
        // affordance; comments and the reply composer are hidden until the
        // thread is reopened.
        <div
          className="nim-comment-thread-footer"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="nim-comment-resolved-summary">
            {t('thread_card.comment_count', { count: thread.comments.length })}
            {' · '}{t('thread_card.resolved')}
          </span>
          {canComment && (
            <>
              <button
                type="button"
                className="nim-comment-btn nim-comment-btn-unresolve"
                onClick={(event) => {
                  event.stopPropagation();
                  onSetThreadResolved(thread, false);
                }}
              >
                {t('comments.unresolve')}
              </button>
              <button
                type="button"
                className="nim-comment-btn nim-comment-btn-delete-thread"
                title={t('comments.delete_thread')}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteThread(thread);
                }}
              >
                {t('thread_card.delete')}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {thread.comments.map((comment) => (
            <div key={comment.id} className="nim-comment" data-comment-id={comment.id}>
              <div className="nim-comment-meta">
                <CommentActorLabel
                  comment={comment}
                  onOpenAgentSession={onOpenAgentSession}
                />
                <span className="nim-comment-time">
                  {formatTimestamp(comment.timeStamp, i18n.language)}
                </span>
                {canComment && (
                  <button
                    type="button"
                    className="nim-comment-delete"
                    title={t('thread_card.delete_comment')}
                    aria-label={t('thread_card.delete_comment_by', { name: commentActorName(comment) })}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteComment(comment, thread);
                    }}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                )}
              </div>
              {comment.replyToCommentId && (
                <div className="nim-comment-reply-target">
                {t('comments.replying_to', { name: replyTargetName(thread, comment) ?? t('comments.earlier_comment') })}
                </div>
              )}
              <div className="nim-comment-content">{comment.content}</div>
            </div>
          ))}
          {canComment && (
            <div
              className="nim-comment-thread-footer"
              onClick={(event) => event.stopPropagation()}
            >
              <CommentComposer
                getMembers={getMembers}
                submitLabel={isEmpty ? t('thread_card.comment') : t('comments.reply')}
                placeholder={
                  isEmpty ? t('comments.add_placeholder') : t('comments.reply_placeholder')
                }
                label={
                  isEmpty
                    ? t('thread_card.comment_on', { anchor: label || t('comments.no_quote') })
                    : t('thread_card.reply_to_thread', { anchor: label || t('comments.no_quote') })
                }
                autoFocus={isEmpty && autoFocusComposer}
                onSubmit={(text, mentioned) => onReply(thread, text, mentioned)}
                onCancel={handleComposerCancel}
              />
              <button
                type="button"
                className="nim-comment-btn nim-comment-btn-resolve"
                onClick={(event) => {
                  event.stopPropagation();
                  onSetThreadResolved(thread, true);
                }}
              >
                {t('comments.resolve')}
              </button>
              <button
                type="button"
                className="nim-comment-btn nim-comment-btn-delete-thread"
                title={t('comments.delete_thread')}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteThread(thread);
                }}
              >
                {t('thread_card.delete')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
