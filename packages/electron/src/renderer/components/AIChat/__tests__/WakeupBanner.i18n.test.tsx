// @vitest-environment jsdom
import React from 'react';
import { Provider, createStore } from 'jotai';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { WakeupBanner } from '../WakeupBanner';
import { sessionWakeupAtom, type SessionWakeupView } from '../../../store/atoms/sessions';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});
afterEach(() => cleanup());

describe('WakeupBanner localization', () => {
  it('localizes status and actions without translating a user-supplied reason', () => {
    const store = createStore();
    const wakeup: SessionWakeupView = {
      id: 'wakeup-1',
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      prompt: 'Check the build',
      reason: 'CI deploy-check',
      fireAt: Date.now() + 5 * 60_000,
      status: 'waiting_for_workspace',
      createdAt: Date.now(),
      firedAt: null,
      error: null,
    };
    store.set(sessionWakeupAtom('session-1'), wakeup);

    render(
      <I18nextProvider i18n={japaneseI18n}>
        <Provider store={store}>
          <WakeupBanner sessionId="session-1" />
        </Provider>
      </I18nextProvider>,
    );

    expect(screen.getByText(/ワークスペースウィンドウが開くのを待っています/)).toBeDefined();
    expect(screen.getByText(/CI deploy-check/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'キャンセル' }).getAttribute('title'))
      .toBe('予定された起動をキャンセル');
  });
});
