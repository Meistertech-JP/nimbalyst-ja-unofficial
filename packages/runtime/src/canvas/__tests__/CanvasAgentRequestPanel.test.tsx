import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { PropsWithChildren, ReactNode } from 'react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { afterEach, expect, it, vi } from 'vitest';

import type { CanvasAgentThreadRequest } from '../canvasComments';
import { CanvasAgentRequestPanel } from '../CanvasAgentRequestPanel';

afterEach(cleanup);

const request: CanvasAgentThreadRequest = {
  threadId: 'thread-1',
  commentId: 'comment-1',
  claimedAuthorUserId: 'claimed-user',
  claimedAuthorName: 'Unverified author',
  body: '  Please review this exact English request.  ',
  target: { kind: 'node', nodeId: 'card-1' },
  anchorLabel: 'Card: Pricing model',
};

async function renderWithLanguage(
  element: ReactNode,
  language: 'en' | 'ja'
) {
  const i18n = await createI18nInstance(language);
  const Wrapper = ({ children }: PropsWithChildren) => (
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
      {children}
    </UiLanguageProvider>
  );
  return render(element, { wrapper: Wrapper });
}

it('keeps the shared-board consent warning explicit in Japanese without translating the quote', async () => {
  await renderWithLanguage(
    <CanvasAgentRequestPanel
      request={request}
      onConfirm={vi.fn()}
      onDismiss={vi.fn()}
    />,
    'ja'
  );

  expect(screen.getByText('このコメントからセッションを開始しますか？')).not.toBeNull();
  expect(
    screen.getByText(
      'このコメントは共有ボードから届いたもので、投稿者が本人かどうかは確認されていません。セッションはこのデバイスのこのワークスペースで、あなたの権限を使って実行されます。依頼内容に心当たりがある場合にのみ開始してください。'
    )
  ).not.toBeNull();
  expect(screen.getByText('Card: Pricing model')).not.toBeNull();
  expect(
    screen.getByText('Please review this exact English request.')
  ).not.toBeNull();
  expect(screen.getByRole('button', { name: '今は開始しない' })).not.toBeNull();
  expect(screen.getByRole('button', { name: 'セッションを開始' })).not.toBeNull();
});

it('shows the English copy and passes the requested comment id to either action', async () => {
  const onConfirm = vi.fn();
  const onDismiss = vi.fn();
  await renderWithLanguage(
    <CanvasAgentRequestPanel
      request={request}
      onConfirm={onConfirm}
      onDismiss={onDismiss}
    />,
    'en'
  );

  expect(screen.getByText('Start a session for this comment?')).not.toBeNull();
  expect(
    screen.getByText(
      'This comment came from the shared board, and no one has verified who wrote it. A session runs on this device, in this workspace, with your permissions. Start it only if you recognize the request.'
    )
  ).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start session' }));
  expect(onDismiss).toHaveBeenCalledExactlyOnceWith('comment-1');
  expect(onConfirm).toHaveBeenCalledExactlyOnceWith('comment-1');
});
