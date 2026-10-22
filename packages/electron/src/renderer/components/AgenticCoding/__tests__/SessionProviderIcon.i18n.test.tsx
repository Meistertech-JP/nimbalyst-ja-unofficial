// @vitest-environment jsdom
import React from 'react';
import { Provider, createStore } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { sessionLaunchCountsAtom } from '../../../store/atoms/sessionLaunchCounts';
import { SessionProviderIcon } from '../SessionProviderIcon';

afterEach(cleanup);

it('localizes the session launch count title and accessible name', async () => {
  const i18n = await createI18nInstance('ja');
  i18n.addResource('ja', 'agents', 'session_launch_count', '起動したセッション数: {{count}}件');
  const store = createStore();
  store.set(sessionLaunchCountsAtom, { session: 2 });

  render(
    <I18nextProvider i18n={i18n}>
      <Provider store={store}>
        <SessionProviderIcon sessionId="session" />
      </Provider>
    </I18nextProvider>,
  );

  const launchCount = screen.getByRole('img', { name: '起動したセッション数: 2件' });
  expect(launchCount.getAttribute('title')).toBe('起動したセッション数: 2件');
});
