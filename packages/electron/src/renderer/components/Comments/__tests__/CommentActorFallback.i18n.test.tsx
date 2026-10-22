// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { CommentRow } from '../CommentRow';
import { buildCommentView } from '../commentViewModel';
import { createCommentFixtures } from '../commentFixtures';
import { mentionUrn } from '../resourceUrn';
import type { Comment } from '../commentTypes';

vi.mock('@nimbalyst/runtime/plugins/TrackerLinkPlugin', () => ({
  useResolvedTrackerReference: () => null,
  TrackerReferenceChip: ({ referenceKey }: { referenceKey: string }) => <span>{referenceKey}</span>,
}));

const NOW = Date.parse('2026-07-26T18:00:00.000Z');
const GHOST_USER_ID = 'user-ghost';
const GHOST_SESSION_ID = 'session-ghost';
let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(cleanup);

function viewOf(comment: Comment, fixtures: ReturnType<typeof createCommentFixtures>) {
  return buildCommentView(comment, {
    viewerUserId: fixtures.viewerUserId,
    directory: fixtures.directory,
    previews: {},
    reactionsSupported: true,
    now: NOW,
  });
}

function renderRow(comment: Comment, i18n: Awaited<ReturnType<typeof createI18nInstance>>) {
  const fixtures = createCommentFixtures({ now: NOW });
  return render(
    <I18nextProvider i18n={i18n}>
      <CommentRow view={viewOf(comment, fixtures)} onAction={() => {}} onToggleReaction={() => {}} />
    </I18nextProvider>,
  );
}

describe('comment directory-miss fallback localization', () => {
  it('shows the localized fallback for a missing member and never rewrites a real name', () => {
    const fixtures = createCommentFixtures({ now: NOW });
    const ghost: Comment = {
      ...fixtures.comments[0],
      actor: { kind: 'user', userId: GHOST_USER_ID, onBehalfOfUserId: GHOST_USER_ID },
      body: { version: 1, format: 'nimbalystMarkdown' as const, text: 'hello' },
    };

    const { unmount: unmountJa } = renderRow(ghost, japaneseI18n);
    expect(screen.getByText('不明なメンバー')).toBeTruthy();
    unmountJa();

    const { unmount: unmountEn } = renderRow(ghost, englishI18n);
    expect(screen.getByText('Unknown member')).toBeTruthy();
    unmountEn();

    renderRow(fixtures.comments[0], japaneseI18n);
    expect(screen.queryByText('不明なメンバー')).toBeNull();
  });

  it('updates fallback labels after a language change without replacing real names or mention ids', async () => {
    const fixtures = createCommentFixtures({ now: NOW });
    const ghost: Comment = {
      ...fixtures.comments[0],
      actor: { kind: 'user', userId: GHOST_USER_ID, onBehalfOfUserId: GHOST_USER_ID },
      body: {
        version: 1 as const,
        format: 'nimbalystMarkdown' as const,
        text: `Ping nimbalyst://user/${GHOST_USER_ID} here.`,
      },
      deliveryHints: { mentionedUserIds: [GHOST_USER_ID], mentionedAgentSessionIds: [], assignedUserIds: [] },
    };
    const { rerender } = renderRow(ghost, englishI18n);

    expect(screen.getByText('Unknown member')).toBeTruthy();
    expect(screen.getByTestId('comment-mention-person').getAttribute('data-user-id')).toBe(GHOST_USER_ID);
    await act(async () => {
      await englishI18n.changeLanguage('ja');
    });
    expect(screen.getByText('不明なメンバー')).toBeTruthy();
    expect(screen.getByTestId('comment-mention-person').getAttribute('data-user-id')).toBe(GHOST_USER_ID);
    await act(async () => {
      await englishI18n.changeLanguage('en');
    });
    expect(screen.getByText('Unknown member')).toBeTruthy();

    rerender(
      <I18nextProvider i18n={englishI18n}>
        <CommentRow view={viewOf(fixtures.comments[0], fixtures)} onAction={() => {}} onToggleReaction={() => {}} />
      </I18nextProvider>,
    );
    expect(screen.getByText('Dana Okafor')).toBeTruthy();
  });

  it('updates missing agent-session and owner fallbacks when the language changes', async () => {
    const fixtures = createCommentFixtures({ now: NOW });
    const ghost: Comment = {
      ...fixtures.comments[0],
      actor: { kind: 'agent', sessionId: GHOST_SESSION_ID, onBehalfOfUserId: 'user-ghost-owner' },
      body: {
        version: 1 as const,
        format: 'nimbalystMarkdown' as const,
        text: `Session: nimbalyst://session/${GHOST_SESSION_ID}`,
      },
      deliveryHints: {
        mentionedUserIds: [],
        mentionedAgentSessionIds: [GHOST_SESSION_ID],
        assignedUserIds: [],
      },
    };

    renderRow(ghost, englishI18n);
    expect(screen.getAllByText('Agent session').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('for a teammate')).toBeTruthy();
    const mention = screen.getByTestId('comment-mention-agent');
    expect(mention.textContent).toContain('@Agent session');
    expect(mention.getAttribute('data-session-id')).toBe(GHOST_SESSION_ID);

    await act(async () => {
      await englishI18n.changeLanguage('ja');
    });
    expect(screen.getAllByText('エージェントセッション').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('チームメンバーの代理')).toBeTruthy();
    expect(mention.textContent).toContain('@エージェントセッション');
    expect(mention.getAttribute('data-session-id')).toBe(GHOST_SESSION_ID);

    await act(async () => {
      await englishI18n.changeLanguage('en');
    });
    expect(screen.getAllByText('Agent session').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('for a teammate')).toBeTruthy();
    expect(mention.getAttribute('data-session-id')).toBe(GHOST_SESSION_ID);
  });

  it('keeps the mention identifier intact and marks only the missing name', () => {
    const fixtures = createCommentFixtures({ now: NOW });
    const ghost: Comment = {
      ...fixtures.comments[0],
      body: {
        version: 1 as const,
        format: 'nimbalystMarkdown' as const,
        text: `Ping nimbalyst://user/${GHOST_USER_ID} here.`,
      },
      deliveryHints: { mentionedUserIds: [GHOST_USER_ID], mentionedAgentSessionIds: [], assignedUserIds: [] },
    };
    const view = viewOf(ghost, fixtures);
    const mention = view.segments.find(
      (segment): segment is Extract<typeof segment, { type: 'mention' }> => segment.type === 'mention',
    );
    expect(mention?.userId).toBe(GHOST_USER_ID);
    expect(mention?.displayNameFallback).toBe('unknown_member');

    renderRow(ghost, japaneseI18n);
    expect(screen.getByTestId('comment-mention-person').getAttribute('data-user-id')).toBe(GHOST_USER_ID);
    expect(screen.getByTestId('comment-mention-person').textContent).toContain('不明なメンバー');
  });

  it('localizes the unavailable reply-parent strip', () => {
    const fixtures = createCommentFixtures({ now: NOW });
    const replying: Comment = { ...fixtures.comments[1], replyToCommentId: 'missing-parent' };
    renderRow(replying, japaneseI18n);
    expect(screen.getByText('以前のメッセージへの返信')).toBeTruthy();
  });

  it('localizes deleted, edited, and just-now labels without rewriting stored names', () => {
    const fixtures = createCommentFixtures({ now: NOW });
    const base = fixtures.comments[0];
    const deleted: Comment = { ...base, deletedAt: NOW };
    const edited: Comment = { ...base, createdAt: NOW, editedAt: NOW };

    const { unmount: unmountDeletedJa } = renderRow(deleted, japaneseI18n);
    expect(screen.getByTestId('comment-row-deleted').textContent).toContain('メッセージは削除されました');
    unmountDeletedJa();
    const { unmount: unmountDeletedEn } = renderRow(deleted, englishI18n);
    expect(screen.getByTestId('comment-row-deleted').textContent).toContain('Message deleted');
    unmountDeletedEn();

    const { unmount: unmountEditedJa } = renderRow(edited, japaneseI18n);
    expect(screen.getByTestId('comment-row-edited').textContent).toBe('(編集済み)');
    expect(screen.getByTestId('comment-row-edited').getAttribute('title')).toContain('に編集');
    expect(screen.getByText('たった今')).toBeTruthy();
    expect(screen.getByText('Dana Okafor')).toBeTruthy();
    expect(screen.getByTestId('comment-mention-person').getAttribute('title')).toBe('Rowan Petrie');
    unmountEditedJa();
  });
});
