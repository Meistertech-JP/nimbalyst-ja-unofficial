// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { FeedbackRow } from '../FeedbackRow';
import type { FeedbackListRowView } from '../feedbackListModel';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => cleanup());

describe('FeedbackRow localization', () => {
  it('localizes status, response progress, and the viewer-response label', () => {
    const row: FeedbackListRowView = {
      id: 'request-1',
      title: 'Review this design',
      authorLabel: 'Morgan',
      status: 'answered',
      statusLabel: 'Answered',
      progressLabel: '2/3 responded',
      awaitingFirstResponse: false,
      timeLabel: '2h ago',
      needsViewerResponse: true,
      dimmed: false,
      subjects: [],
    };

    render(
      <I18nextProvider i18n={japaneseI18n}>
        <FeedbackRow row={row} selected={false} onSelect={() => undefined} />
      </I18nextProvider>,
    );

    expect(screen.getByTestId('feedback-row-status').textContent).toBe('回答済み');
    expect(screen.getByText('2/3 件が回答済み')).toBeDefined();
    expect(screen.getByTestId('feedback-row-needs-response').textContent).toBe('あなたの回答');
  });
});
