import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { sessionPendingReviewFilesAtom } from '../../../store/atoms/sessionFiles';
import { PendingReviewBanner } from '../PendingReviewBanner';

describe('PendingReviewBanner localization', () => {
  it('renders Japanese pending-review copy and action label', async () => {
    const i18n = await createI18nInstance('ja');
    const store = createStore();
    store.set(sessionPendingReviewFilesAtom('session-1'), new Set(['/a.md', '/b.md']));

    render(
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>
          <PendingReviewBanner workspacePath="/workspace" sessionId="session-1" />
        </Provider>
      </I18nextProvider>,
    );

    expect(document.querySelector('.pending-review-banner__text')?.textContent).toBe('レビュー待ちのファイル2件');
    expect(screen.getByTitle('レビュー待ちのAI変更をすべて保持')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'すべて保持' })).toBeTruthy();
  });
});
