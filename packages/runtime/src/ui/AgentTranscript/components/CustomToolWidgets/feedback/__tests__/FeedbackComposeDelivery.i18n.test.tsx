import React from 'react';
import {I18nextProvider} from 'react-i18next';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {createI18nInstance} from '@nimbalyst/i18n/core';
import {FeedbackComposeDelivery} from '../FeedbackComposeDelivery';

afterEach(cleanup);

it('localizes feedback delivery settings and choices', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <I18nextProvider i18n={i18n}>
      <FeedbackComposeDelivery
        visibility="hiddenUntilAnswered"
        quorumMode="first"
        recipientCount={2}
        now={Date.UTC(2026, 0, 1, 0)}
        onVisibilityChange={vi.fn()}
        onDeadlineChange={vi.fn()}
        onQuorumModeChange={vi.fn()}
      />
    </I18nextProvider>,
  );

  expect(screen.getByText('ダイレクトメッセージ')).toBeTruthy();
  expect(screen.getByText('回答の公開範囲')).toBeTruthy();
  expect(screen.getByText('期限')).toBeTruthy();
  expect(screen.getByText('このセッションを再開')).toBeTruthy();
  expect(screen.getByTestId('feedback-compose-visibility').getAttribute('aria-label'))
    .toBe('回答を公開するタイミングを選択');

  fireEvent.click(screen.getByTestId('feedback-compose-visibility'));
  expect(screen.getByRole('menuitem', {name: '各ユーザーの回答後'})).toBeTruthy();
  expect(screen.getByRole('menuitem', {name: '依頼された全員に公開'})).toBeTruthy();
});
