/**
 * Behaviour of the shared, editor-neutral comment UI.
 *
 * These primitives are mounted by editors with nothing in common — a Lexical
 * document, a mockup canvas — so what is worth testing is the part a reader
 * cannot see on screen: that losing an anchor does not lose the conversation,
 * that a capability downgrade removes authoring without removing content,
 * that a stale mention cannot be sent, and that the list is genuinely
 * keyboard-operable.
 */

import { act, fireEvent, render as rtlRender, renderHook, screen, within } from '@testing-library/react';
import type { ComponentProps, ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';

import type { Comment, CommentMember, Thread } from '../../types';
import { CollaborativeCommentsPanel } from '../CollaborativeCommentsPanel';
import { CommentCountBadge } from '../CommentCountBadge';
import { CommentComposer } from '../CommentComposer';
import { filterMentionCandidates, useMentionRoster } from '../mentionRoster';
import type { CollaborativeCommentsSource, CommentThreadView } from '../types';
import { useCollaborativeComments } from '../useCollaborativeComments';

let testI18n: Awaited<ReturnType<typeof createI18nInstance>>;

function render(ui: ReactElement) {
  return rtlRender(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);
}

beforeEach(async () => {
  testI18n = await createI18nInstance('en');
});

const alice: CommentMember = {
  userId: 'u-alice',
  name: 'Alice Chen',
  email: 'alice@example.com',
};
const bob: CommentMember = { userId: 'u-bob', name: 'Bob Ray' };

function userComment(id: string, content: string): Comment {
  return {
    type: 'comment',
    id,
    author: 'Alice Chen',
    actor: { kind: 'user', userId: 'u-alice', displayName: 'Alice Chen' },
    content,
    deleted: false,
    timeStamp: 1_700_000_000_000,
  };
}

function agentComment(id: string, content: string): Comment {
  return {
    type: 'comment',
    id,
    author: 'Refactor pass',
    actor: {
      kind: 'agent',
      sessionId: 'session-9',
      sessionName: 'Refactor pass',
      onBehalfOfUserId: 'u-alice',
    },
    content,
    deleted: false,
    timeStamp: 1_700_000_100_000,
  };
}

function threadView(
  id: string,
  overrides: Partial<Thread> = {},
  anchorState: CommentThreadView['anchorState'] = 'attached',
): CommentThreadView {
  return {
    anchorState,
    thread: {
      type: 'thread',
      id,
      quote: `quote for ${id}`,
      resolved: false,
      comments: [userComment(`${id}-c1`, `body of ${id}`)],
      ...overrides,
    },
  };
}

const noopActions = {
  onSelectThread: vi.fn(),
  onSetThreadResolved: vi.fn(),
  onDeleteThread: vi.fn(),
  onDeleteComment: vi.fn(),
  onReply: vi.fn(),
};

function renderPanel(
  threads: CommentThreadView[],
  overrides: Partial<ComponentProps<typeof CollaborativeCommentsPanel>> = {},
) {
  return render(
    <CollaborativeCommentsPanel
      threads={threads}
      activeThreadId={null}
      capabilities={{ read: true, comment: true }}
      getMembers={() => [alice, bob]}
      {...noopActions}
      {...overrides}
    />,
  );
}

describe('CollaborativeCommentsPanel', () => {
  it.each([
    ['en', 'Comments', 'Detached', 'Resolved', 'Detached threads', 'Resolved threads', '3 comment threads'],
    ['ja', 'コメント', '対象なし', '解決済み', '対象なしのスレッド', '解決済みのスレッド', 'コメントスレッド3件'],
  ] as const)('localizes %s panel grouping and counts without losing filter behavior', async (language, title, detached, resolved, detachedGroup, resolvedGroup, countLabel) => {
    testI18n = await createI18nInstance(language);
    const threads = [threadView('open'), threadView('detached', {}, 'orphaned'), threadView('resolved', { resolved: true })];
    const { container } = renderPanel(threads);
    expect(container.querySelector('.nim-comments-panel-title')?.textContent).toBe(title);
    expect(screen.getByText(detached).className).toContain('nim-comments-group-heading');
    expect(screen.getByText(resolved).className).toContain('nim-comments-group-heading');
    expect(within(screen.getByRole('list', { name: detachedGroup })).getAllByTestId('comment-thread')).toHaveLength(1);
    expect(within(screen.getByRole('list', { name: resolvedGroup })).getAllByTestId('comment-thread')).toHaveLength(1);
    expect(screen.getByTestId('comment-count-badge').getAttribute('aria-label')).toBe(countLabel);
    fireEvent.click(screen.getByTestId('comments-panel-resolved-filter'));
    expect(screen.queryByRole('list', { name: resolvedGroup })).toBeNull();
    expect(screen.getAllByTestId('comment-thread')).toHaveLength(2);
  });

  it('updates default labels on an existing panel when the provider language changes', async () => {
    const { container } = renderPanel([threadView('detached', {}, 'orphaned')]);
    expect(container.querySelector('.nim-comments-panel-title')?.textContent).toBe('Comments');
    await act(async () => { await testI18n.changeLanguage('ja'); });
    expect(container.querySelector('.nim-comments-panel-title')?.textContent).toBe('コメント');
    expect(screen.getByRole('list', { name: '対象なしのスレッド' }).querySelector('.nim-comment-thread')).not.toBeNull();
  });

  it('keeps custom panel titles and empty messages unchanged', async () => {
    testI18n = await createI18nInstance('ja');
    const { container } = renderPanel([], { title: 'Review notes A', emptyMessage: 'No notes for A' });
    expect(container.querySelector('.nim-comments-panel-title')?.textContent).toBe('Review notes A');
    expect(container.querySelector('.nim-comments-empty')?.textContent).toBe('No notes for A');
  });

  it('localizes detached and resolved thread labels and actions', async () => {
    testI18n = await createI18nInstance('ja');
    const thread = threadView(
      'ja-thread',
      { resolved: true },
      'orphaned',
    );

    renderPanel([thread]);

    const card = screen.getByTestId('comment-thread');
    expect(card.getAttribute('aria-label')).toContain('コメント1件');
    expect(within(card).getByText(/コメント1件 · 解決済み/)).toBeTruthy();
    expect(within(card).getByText(/このコメントの対象はドキュメント内にありません/)).toBeTruthy();
    expect(within(card).getByTitle('スレッドを削除')).toBeTruthy();
    expect(within(card).getByRole('button', {name: '未解決に戻す'})).toBeTruthy();
    expect(screen.getByRole('button', { name: '解決済みスレッド1件を非表示' })).toBeTruthy();
    expect(screen.getByTitle('解決済みスレッドを非表示')).toBeTruthy();
  });

  // Access is revoked mid-session. The composer must go; every thread the
  // viewer could already read must stay, with its history intact.
  it('drops authoring on a capability downgrade without dropping threads', () => {
    const threads = [threadView('t1'), threadView('t2')];
    const { rerender } = renderPanel(threads);
    expect(screen.getAllByTestId('comment-composer')).toHaveLength(2);

    rerender(
      <CollaborativeCommentsPanel
        threads={threads}
        activeThreadId={null}
        capabilities={{ read: true, comment: false }}
        getMembers={() => [alice, bob]}
        {...noopActions}
      />,
    );

    expect(screen.queryByTestId('comment-composer')).toBeNull();
    expect(screen.getAllByTestId('comment-thread')).toHaveLength(threads.length);
    expect(screen.getByText('body of t1')).not.toBeNull();
    expect(screen.getByText('body of t2')).not.toBeNull();
    // Destructive affordances go with the capability, not the content.
    expect(screen.queryByTitle('Delete thread')).toBeNull();
  });

  // The anchored text was deleted and could not be found again. Deleting the
  // conversation because its target vanished would be silent data loss.
  it('keeps an orphaned thread visible with its full history', () => {
    renderPanel([
      threadView('gone', {
        comments: [
          userComment('gone-c1', 'first remark'),
          userComment('gone-c2', 'second remark'),
        ],
      }, 'orphaned'),
    ]);

    const card = screen.getByTestId('comment-thread');
    expect(card.getAttribute('data-anchor-state')).toBe('orphaned');
    expect(within(card).getByTestId('comment-thread-detached')).not.toBeNull();
    expect(within(card).getByText('first remark')).not.toBeNull();
    expect(within(card).getByText('second remark')).not.toBeNull();
    // Still repliable: a detached thread is a conversation, not an archive.
    expect(within(card).getByTestId('comment-composer')).not.toBeNull();
  });

  // An anchor kind written by a newer client must not be guessed at, and must
  // not disappear either.
  it('keeps an unsupported-anchor thread visible', () => {
    renderPanel([threadView('future', {}, 'unsupported')]);
    const card = screen.getByTestId('comment-thread');
    expect(card.getAttribute('data-anchor-state')).toBe('unsupported');
    expect(within(card).getByText('body of future')).not.toBeNull();
  });

  it('moves focus between threads with the arrow keys', () => {
    renderPanel([threadView('t1'), threadView('t2'), threadView('t3')]);
    const cards = screen.getAllByTestId('comment-thread');

    cards[0].focus();
    fireEvent.keyDown(cards[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cards[1]);

    fireEvent.keyDown(cards[1], { key: 'End' });
    expect(document.activeElement).toBe(cards[2]);

    fireEvent.keyDown(cards[2], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(cards[1]);
  });

  // Arrow keys inside the composer belong to the composer, or a reply cannot
  // be edited with the keyboard at all.
  it('leaves arrow keys alone inside a composer', () => {
    renderPanel([threadView('t1'), threadView('t2')]);
    const field = screen.getAllByTestId('comment-composer-input')[0];
    field.focus();
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(field);
  });

  // Closing the panel from the keyboard must not drop the caret on <body>.
  it('restores focus to the opener when it unmounts', () => {
    render(<button type="button" data-testid="opener">Comments</button>);
    const opener = screen.getByTestId('opener');
    opener.focus();

    const { unmount } = renderPanel([threadView('t1')]);
    screen.getAllByTestId('comment-thread')[0].focus();
    unmount();

    expect(document.activeElement).toBe(opener);
  });

  it('closes on Escape from a thread card', () => {
    const onClose = vi.fn();
    renderPanel([threadView('t1')], { onClose });
    fireEvent.keyDown(screen.getAllByTestId('comment-thread')[0], {
      key: 'Escape',
    });
    expect(onClose).toHaveBeenCalled();
  });

  // Resolved threads are history, not noise to be lost: the filter hides them
  // and brings them back, and never touches anything unresolved.
  it('filters resolved threads without touching open ones', () => {
    renderPanel([
      threadView('open'),
      threadView('done', { resolved: true }),
    ]);
    expect(screen.getAllByTestId('comment-thread')).toHaveLength(2);

    fireEvent.click(screen.getByTestId('comments-panel-resolved-filter'));
    const remaining = screen.getAllByTestId('comment-thread');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].getAttribute('data-resolved')).toBe('false');
  });

  // Agent authorship has to be legible as such, and has to lead back to the
  // session that wrote it.
  it('renders an agent author distinguishably from a user author', () => {
    const onOpenAgentSession = vi.fn();
    renderPanel(
      [
        threadView('mixed', {
          comments: [
            userComment('c-user', 'a person wrote this'),
            agentComment('c-agent', 'an agent wrote this'),
          ],
        }),
      ],
      { onOpenAgentSession },
    );

    const comments = document.querySelectorAll('.nim-comment');
    expect(comments[0].querySelector('.nim-comment-agent-author')).toBeNull();

    const agentActor = comments[1].querySelector('.nim-comment-agent-author');
    if (!agentActor) throw new Error('agent actor not rendered');
    fireEvent.click(agentActor);
    expect(onOpenAgentSession).toHaveBeenCalledWith('session-9');
  });
});

describe('CommentCountBadge localization', () => {
  it.each([
    ['en', '1 comment thread', '2 comment threads'],
    ['ja', 'コメントスレッド1件', 'コメントスレッド2件'],
  ] as const)('uses %s accessible counts while keeping zero hidden and high counts capped', async (language, one, two) => {
    testI18n = await createI18nInstance(language);
    const { rerender } = render(<CommentCountBadge count={0} />);
    expect(screen.queryByTestId('comment-count-badge')).toBeNull();
    rerender(<I18nextProvider i18n={testI18n}><CommentCountBadge count={1} /></I18nextProvider>);
    expect(screen.getByTestId('comment-count-badge').getAttribute('aria-label')).toBe(one);
    rerender(<I18nextProvider i18n={testI18n}><CommentCountBadge count={2} max={1} /></I18nextProvider>);
    expect(screen.getByTestId('comment-count-badge').getAttribute('aria-label')).toBe(two);
    expect(screen.getByTestId('comment-count-badge').textContent).toBe('1+');
    rerender(<I18nextProvider i18n={testI18n}><CommentCountBadge count={2} label="Review count A" /></I18nextProvider>);
    expect(screen.getByTestId('comment-count-badge').getAttribute('aria-label')).toBe('Review count A');
  });
});

describe('CommentComposer', () => {
  function typeMention(field: HTMLTextAreaElement, value: string): void {
    fireEvent.change(field, { target: { value } });
  }

  it('localizes the cancel action without changing its behavior', async () => {
    await testI18n.changeLanguage('ja');
    const onCancel = vi.fn();
    render(
      <CommentComposer
        getMembers={() => []}
        onSubmit={vi.fn()}
        onCancel={onCancel}
        submitLabel="コメント"
        placeholder="コメントを追加"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  // A member can leave the org while a comment is being drafted. Sending the
  // mention anyway is rejected downstream (`MENTION_FORBIDDEN`) and takes the
  // whole comment with it.
  it('drops a mention for someone the roster no longer offers', () => {
    let roster: CommentMember[] = [alice, bob];
    const onSubmit = vi.fn();
    render(
      <CommentComposer
        getMembers={() => roster}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        submitLabel="Comment"
        placeholder="Add a comment"
      />,
    );

    const field = screen.getByTestId('comment-composer-input') as HTMLTextAreaElement;
    typeMention(field, '@Ali');
    fireEvent.click(screen.getByText(alice.name));

    typeMention(field, `${field.value}please look`);
    roster = [bob];
    fireEvent.click(screen.getByText('Comment'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][1]).toEqual([]);
  });

  // Walking the picker with the keyboard has to survive the keyup that
  // follows each arrow press, or the highlight snaps back to the first name
  // and the second candidate is unreachable without a mouse.
  it('keeps the picker highlight while arrowing through candidates', () => {
    const onSubmit = vi.fn();
    render(
      <CommentComposer
        getMembers={() => [alice, bob]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        submitLabel="Comment"
        placeholder="Add a comment"
      />,
    );

    const field = screen.getByTestId('comment-composer-input') as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: '@' } });
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    fireEvent.keyUp(field, { key: 'ArrowDown' });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(field.value).toContain(bob.name);
  });

  it('sends a mention the roster still vouches for', () => {
    const onSubmit = vi.fn();
    render(
      <CommentComposer
        getMembers={() => [alice, bob]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        submitLabel="Comment"
        placeholder="Add a comment"
      />,
    );

    const field = screen.getByTestId('comment-composer-input') as HTMLTextAreaElement;
    typeMention(field, '@Ali');
    fireEvent.click(screen.getByText(alice.name));
    typeMention(field, `${field.value}please look`);
    fireEvent.click(screen.getByText('Comment'));

    expect(onSubmit.mock.calls[0][1]).toEqual([alice.userId]);
  });

  // Deleting the `@Name` out of the draft has to unsend the notification too.
  it('drops a mention the author deleted from the draft', () => {
    const onSubmit = vi.fn();
    render(
      <CommentComposer
        getMembers={() => [alice, bob]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        submitLabel="Comment"
        placeholder="Add a comment"
      />,
    );

    const field = screen.getByTestId('comment-composer-input') as HTMLTextAreaElement;
    typeMention(field, '@Ali');
    fireEvent.click(screen.getByText(alice.name));
    typeMention(field, 'never mind');
    fireEvent.click(screen.getByText('Comment'));

    expect(onSubmit).toHaveBeenCalledWith('never mind', []);
  });

  it('submits on Cmd+Enter and cancels on Escape', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(
      <CommentComposer
        getMembers={() => []}
        onSubmit={onSubmit}
        onCancel={onCancel}
        submitLabel="Comment"
        placeholder="Add a comment"
      />,
    );

    const field = screen.getByTestId('comment-composer-input') as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: 'ship it' } });
    fireEvent.keyDown(field, { key: 'Enter', metaKey: true });
    expect(onSubmit).toHaveBeenCalledWith('ship it', []);

    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('useCollaborativeComments', () => {
  // Access is revoked, and an anchored entity is deleted, behind a source
  // object that keeps its identity. Anything memoized on that identity would
  // keep showing the authoring affordances and claim the thread is attached.
  it('re-reads capabilities and anchor state without a remount', () => {
    const threads = [threadView('a').thread, threadView('b').thread];
    const capabilities = { read: true, comment: true };
    const orphaned = new Set<string>();
    const source: CollaborativeCommentsSource = {
      subscribe: () => () => {},
      getThreads: () => threads,
      getCapabilities: () => capabilities,
      getAnchorState: (thread) =>
        orphaned.has(thread.id) ? 'orphaned' : 'attached',
    };

    const { result, rerender } = renderHook(() =>
      useCollaborativeComments(source),
    );
    expect(result.current.canComment).toBe(true);
    expect(result.current.detachedCount).toBe(0);
    expect(result.current.openCount).toBe(2);

    capabilities.comment = false;
    orphaned.add('b');
    rerender();

    expect(result.current.canComment).toBe(false);
    expect(result.current.detachedCount).toBe(1);
    expect(result.current.threads).toHaveLength(2);
  });
});

describe('useMentionRoster', () => {
  const karl = { userId: 'u1', name: 'Karl Wirth' };

  // The roster arrives after team sync hydrates. A composer that mounted first
  // used to hold the empty snapshot forever, so `@` reported "No matches found"
  // until it was closed and reopened.
  it('picks up a roster that arrives after mount', () => {
    let roster: CommentMember[] = [];
    const getMembers = () => roster;
    const { result, rerender } = renderHook(
      ({ query }: { query: string | null }) => useMentionRoster(getMembers, query),
      { initialProps: { query: null as string | null } },
    );
    expect(result.current).toEqual([]);

    roster = [karl];
    rerender({ query: '' });
    expect(result.current).toEqual([karl]);
  });

  // Callers memoize the typeahead options on this array; re-identifying it on
  // every keystroke is what the original mount-time snapshot was protecting.
  it('keeps the same array when the roster is unchanged', () => {
    const getMembers = () => [{ ...karl }];
    const { result, rerender } = renderHook(
      ({ query }: { query: string | null }) => useMentionRoster(getMembers, query),
      { initialProps: { query: '' as string | null } },
    );
    const first = result.current;
    rerender({ query: 'Ka' });
    expect(result.current).toBe(first);
  });
});

describe('filterMentionCandidates', () => {
  const karl = { userId: 'u1', name: 'Karl Wirth', email: 'kwirth@stravu.com' };
  const noName = { userId: 'u2', name: 'greg@stravu.com', email: 'greg@stravu.com' };

  // Karl shows as "Karl Wirth" but earlier comments address him as
  // kwirth@stravu.com, so typing either has to reach him.
  it('matches on the email as well as the display name', () => {
    expect(filterMentionCandidates([karl, noName], 'kwirth')).toEqual([karl]);
    expect(filterMentionCandidates([karl, noName], 'Karl')).toEqual([karl]);
    expect(filterMentionCandidates([karl, noName], 'stravu')).toEqual([karl, noName]);
  });

  it('returns everyone for an empty query and no one for a miss', () => {
    expect(filterMentionCandidates([karl, noName], '')).toHaveLength(2);
    expect(filterMentionCandidates([karl, noName], 'nobody')).toEqual([]);
  });
});
