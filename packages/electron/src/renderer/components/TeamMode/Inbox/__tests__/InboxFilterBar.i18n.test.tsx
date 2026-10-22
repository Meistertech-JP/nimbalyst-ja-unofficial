// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { InboxFilterBar } from '../InboxFilterBar';
import { InboxSearchEscalation, InboxSearchField } from '../InboxSearchField';
import { InboxStatusBanner } from '../InboxStatusBanner';
import { EMPTY_INBOX_SCOPE } from '../inboxTypes';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => cleanup());

describe('InboxFilterBar localization', () => {
  it('localizes filter accessibility label and source type controls', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <InboxFilterBar
          unreadOnly={false}
          unreadCount={3}
          typeCounts={{ roomMessage: 3, documentDiscussion: 1 }}
          scope={EMPTY_INBOX_SCOPE}
          scopeOptions={{
            orgs: [],
            projects: [],
            sourceKinds: ['roomMessage', 'documentDiscussion'],
          }}
          disabled={false}
          onUnreadOnlyChange={() => undefined}
          onScopeChange={() => undefined}
        />
      </I18nextProvider>,
    );

    expect(screen.getByLabelText('受信トレイのフィルター')).toBeDefined();
    expect(screen.getByText('未読のみ')).toBeDefined();
    expect(screen.getByText('種類')).toBeDefined();
    expect(screen.getByRole('checkbox', { name: 'ルーム' })).toBeDefined();
    expect(screen.getByRole('checkbox', { name: 'ドキュメントのディスカッション' })).toBeDefined();
  });

  it('localizes search labels, bounded-preview guidance, and offline status', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <>
          <InboxSearchField
            value="query"
            filterLabel="メンション"
            disabled={false}
            onChange={() => undefined}
          />
          <InboxSearchEscalation query="query" matchCount={0} onEscalate={() => undefined} />
          <InboxStatusBanner status="offlineWithCache" now={0} />
        </>
      </I18nextProvider>,
    );

    expect(screen.getByRole('textbox', { name: 'メンションを検索' })).toBeDefined();
    expect(screen.getByPlaceholderText('メンションを人、会話、テキストで検索')).toBeDefined();
    expect(screen.getByRole('button', { name: '検索をクリア' })).toBeDefined();
    expect(screen.getByText(/各通知に保存された範囲限定のプレビューのみ/)).toBeDefined();
    expect(screen.getByRole('button', { name: /すべてのメッセージを検索/ })).toBeDefined();
    expect(screen.getByText(/オフラインです — キャッシュ済みの通知を表示しています/)).toBeDefined();
    expect(screen.getByText(/再接続するまで変更はキューに保存されます/)).toBeDefined();
  });
});
