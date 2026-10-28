// @vitest-environment jsdom
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';

vi.mock('../../../store/atoms/collabDocuments', async () => {
  const { atom } = await import('jotai');
  return { activeCollabScopeAtom: atom({ scopeKey: '/test', orgId: 'org' }) };
});
vi.mock('../../../store/atoms/feedbackRequests', async () => {
  const { atom } = await import('jotai');
  const entries = atom([{ requestId: 'request', title: 'Feedback', updatedAt: Date.now() - 3 * 60 * 60 * 1000, lifecycle: { status: 'open' }, progress: { answeredRecipientCount: 0, totalRecipientCount: 1, quorumReached: false }, author: { kind: 'human' } }]);
  const viewer = atom('');
  return {
    feedbackRequestIndexBySubjectAtomFamily: () => entries,
    feedbackRequestIndexActiveViewerAtomFamily: () => viewer,
    feedbackRequestIndexSubjectKey: () => 'subject',
    feedbackRequestIndexTargetKey: () => 'target',
  };
});

import { FeedbackBacklinkSection } from '../FeedbackBacklinks';

describe('feedback backlink timestamps', () => {
  it('updates the timestamp when the display language changes', async () => {
    const i18n = await createI18nInstance('ja');
    render(<I18nextProvider i18n={i18n}><FeedbackBacklinkSection subject={{ kind: 'document', sourceId: 'doc' }} /></I18nextProvider>);
    expect(await screen.findByText('3時間前')).toBeDefined();
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByText('3 hrs ago')).toBeDefined();
  });
});
