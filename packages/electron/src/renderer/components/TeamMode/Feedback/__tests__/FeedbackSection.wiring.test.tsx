// @vitest-environment jsdom
import { documentFeedbackIndexesAtom } from '../../../../store/atoms/documentFeedback';
/**
 * The one thing about this surface that is invisible on screen: which atom key
 * it reads.
 *
 * Entries are written by the central index listener under
 * `feedbackRequestIndexViewerKey({workspacePath, orgId, viewerUserId})`, and
 * the surface addresses them through `feedbackRequestIndexTargetKey` plus the
 * active viewer. Those two derivations live in different modules, and if they
 * drift the list is silently empty forever — which is indistinguishable from
 * "you have no feedback requests". Hence a wiring test rather than a render
 * test: it writes the atoms exactly as the listener does and asserts a row
 * comes out the other end.
 */

import React from 'react';
import { afterEach, beforeAll } from 'vitest';
import { Provider, createStore } from 'jotai';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { describe, expect, it, vi } from 'vitest';
import type { FeedbackRequestIndexEntry } from '@nimbalyst/collab-protocol';
import { asTeamMemberId } from '@nimbalyst/runtime/auth/jwtScopes';

import {
  feedbackRequestIndexActiveViewerAtomFamily,
  feedbackRequestIndexTargetKey,
  feedbackRequestIndexViewerEntriesAtomFamily,
  feedbackRequestIndexViewerKey,
} from '../../../../store/atoms/feedbackRequests';
import { FeedbackSection } from '../FeedbackSection';

const TARGET = { workspacePath: '/workspace', orgId: 'org-1' };

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => cleanup());

function renderJapanese(node: React.ReactNode) {
  return render(
    <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
      {node}
    </UiLanguageProvider>,
  );
}

const ENTRY = {
  requestId: 'req-1',
  urn: 'nimbalyst://feedback-request/req-1',
  orgId: 'org-1',
  title: 'Which onboarding flow should we ship?',
  author: { kind: 'user', userId: 'peer', onBehalfOfUserId: 'peer' },
  recipients: [{ userId: 'me', name: 'Me' }],
  lifecycle: { status: 'open', changedAt: 1 },
  progress: {
    answeredAskCount: 0,
    totalAssignedAskCount: 1,
    answeredRecipientCount: 0,
    totalRecipientCount: 1,
    quorumReached: false,
  },
  subjects: [],
  createdAt: 1,
  updatedAt: 1,
} as FeedbackRequestIndexEntry;

describe('FeedbackSection', () => {
  it('lists the entries the index listener wrote for the active viewer', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { invoke: vi.fn().mockResolvedValue({ entries: [] }) },
    });
    const store = createStore();
    store.set(
      feedbackRequestIndexActiveViewerAtomFamily(feedbackRequestIndexTargetKey(TARGET)),
      asTeamMemberId('me'),
    );
    store.set(
      feedbackRequestIndexViewerEntriesAtomFamily(
        feedbackRequestIndexViewerKey({ ...TARGET, teamMemberId: asTeamMemberId('me') }),
      ),
      [ENTRY],
    );

    renderJapanese(
      <Provider store={store}>
        <FeedbackSection
          orgId={TARGET.orgId}
          workspacePath={TARGET.workspacePath}
          now={2}
        />
      </Provider>,
    );

    await waitFor(() => expect(screen.getByTestId('feedback-row').dataset.requestId).toBe('request:req-1'));
    fireEvent.change(screen.getByRole('searchbox', { name: 'フィードバック依頼を検索' }), {
      target: { value: 'not in this list' },
    });
    expect(screen.getByText('この条件に一致する依頼はありません。')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: '絞り込みを解除' }));
    expect((screen.getByRole('searchbox', { name: 'フィードバック依頼を検索' }) as HTMLInputElement).value).toBe('');
    expect(screen.getByTestId('feedback-row').dataset.requestId).toBe('request:req-1');
  });

  it('localizes search, filters, and the empty-list guidance', () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { invoke: vi.fn().mockResolvedValue({ entries: [] }) },
    });
    const store = createStore();
    const targetKey = feedbackRequestIndexTargetKey(TARGET);
    store.set(feedbackRequestIndexActiveViewerAtomFamily(targetKey), asTeamMemberId('me'));
    store.set(documentFeedbackIndexesAtom, {
      [targetKey]: {
        ...TARGET,
        teamMemberId: 'me',
        state: { epoch: 'one', sequence: 1, generation: 1, status: 'ready', entries: [] },
      },
    });

    renderJapanese(
      <Provider store={store}>
        <FeedbackSection orgId={TARGET.orgId} workspacePath={TARGET.workspacePath} now={2} />
      </Provider>,
    );

    expect(screen.getByRole('heading', { name: 'フィードバック' })).toBeDefined();
    expect(screen.getByRole('searchbox', { name: 'フィードバック依頼を検索' }).getAttribute('placeholder')).toBe('依頼を検索…');
    expect(screen.getByRole('tablist', { name: 'フィードバックの絞り込み' })).toBeDefined();
    expect(screen.getByRole('tab', { name: '自分の回答が必要' })).toBeDefined();
    expect(screen.getByRole('tab', { name: '自分が送信' })).toBeDefined();
    expect(screen.getByRole('tab', { name: '受付中' })).toBeDefined();
    expect(screen.getByRole('tab', { name: '回答済み' })).toBeDefined();
    expect(screen.getByRole('tab', { name: '終了' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'すべて' })).toBeDefined();
    expect(screen.getByText('フィードバック依頼はまだありません。チームから依頼された内容や、チームに依頼した内容がここに表示され、回答後も残ります。')).toBeDefined();
  });
});


it('finds sent document questions without a legacy request and opens the exact block', async () => {
  const invoke = vi.fn().mockResolvedValue(true);
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke } });
  const store = createStore();
  store.set(documentFeedbackIndexesAtom, {
    [feedbackRequestIndexTargetKey(TARGET)]: {
      ...TARGET, teamMemberId: 'me', state: { epoch: 'one', sequence: 1, generation: 1, status: 'ready', entries: [{
        orgId: 'org-1', projectId: 'project', documentId: 'doc', blockId: 'question / 1', title: 'Document question',
        sentBy: 'me', sentAt: 1, updatedAt: 1, sealed: false, availability: 'available', recipientCount: 1,
        answeredCount: 0, quorum: 1, isRecipient: false, needsMyResponse: false,
      }] },
    },
  });
  renderJapanese(<Provider store={store}><FeedbackSection orgId="org-1" workspacePath="/workspace" now={2} /></Provider>);
  fireEvent.click(screen.getByTestId('feedback-filter-sentByMe'));
  fireEvent.click(screen.getByText('Document question'));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('deep-link:open-inbox-source', 'nimbalyst://doc/doc?orgId=org-1&projectId=project&blockId=question+%2F+1'));
});
