// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { TrackerCommentsSection } from '../TrackerCommentsSection';

afterEach(cleanup);

describe('desktop tracker comment timestamps', () => {
  it('updates the relative timestamp when the language changes', async () => {
    const i18n = await createI18nInstance('ja');
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { invoke: vi.fn().mockResolvedValue({ success: false }) },
    });
    const comments = [{ id: 'comment-1', body: 'Test', createdAt: Date.now() - 3 * 60 * 60 * 1000,
      authorIdentity: { email: null, displayName: 'Test', gitName: null, gitEmail: null } }];
    render(
      <I18nextProvider i18n={i18n}>
        <TrackerCommentsSection itemId="item-1" comments={comments} />
      </I18nextProvider>,
    );
    expect(await screen.findByText('3時間前')).toBeDefined();
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByText('3 hrs ago')).toBeDefined();
  });
});
