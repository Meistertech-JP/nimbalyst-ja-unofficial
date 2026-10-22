// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MonacoDiffApprovalBar } from '../MonacoDiffApprovalBar/MonacoDiffApprovalBar';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderBar(
  i18n: typeof englishI18n,
  props: Partial<React.ComponentProps<typeof MonacoDiffApprovalBar>> = {}
) {
  const onAcceptAll = props.onAcceptAll ?? vi.fn();
  const onRejectAll = props.onRejectAll ?? vi.fn();
  const onGoToSession = props.onGoToSession ?? vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <MonacoDiffApprovalBar
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
        onGoToSession={onGoToSession}
        {...props}
      />
    </I18nextProvider>
  );
  return { onAcceptAll, onRejectAll, onGoToSession };
}

describe('MonacoDiffApprovalBar localization', () => {
  it('localizes approval actions and the fallback AI-edited label without changing callbacks', () => {
    const english = renderBar(englishI18n, { fileName: 'notes.md' });
    expect(screen.getByText('AI edited notes.md')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Reject All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept All' }));
    expect(english.onRejectAll).toHaveBeenCalledOnce();
    expect(english.onAcceptAll).toHaveBeenCalledOnce();

    cleanup();
    renderBar(japaneseI18n, { fileName: 'notes.md' });
    expect(screen.getByText('AIがnotes.mdを編集')).toBeDefined();
    expect(screen.getByRole('button', { name: 'すべて却下' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'すべて適用' })).toBeDefined();
  });

  it('localizes the session label, relative time, and navigation while preserving the session callback', () => {
    const onGoToSession = vi.fn();
    const sessionInfo = { sessionId: 'session-123', sessionTitle: 'Fix login', editedAt: Date.now() };
    renderBar(japaneseI18n, { fileName: 'notes.md', sessionInfo, onGoToSession });

    expect(screen.getByText('Fix login', { exact: true })).toBeDefined();
    expect(screen.getByText('notes.mdを編集', { exact: true })).toBeDefined();
    expect(screen.getByText('たった今')).toBeDefined();
    const sessionButton = screen.getByRole('button', { name: /セッションへ移動/ });
    expect(sessionButton.getAttribute('title')).toBe('これらの変更を行ったAIセッションを開く');
    fireEvent.click(sessionButton);
    expect(onGoToSession).toHaveBeenCalledWith('session-123');
  });
});
