// @vitest-environment jsdom

import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CollabHistoryDialog } from '../HistoryDialog/CollabHistoryDialog';

vi.mock('jotai', () => ({
  useAtomValue: vi.fn(() => () => undefined),
}));

vi.mock('../../store/atoms/collabHistoryControllers', () => ({
  collabHistoryControllerAtom: {},
}));

vi.mock('@nimbalyst/runtime/sync', () => ({
  CollabHistoryError: class CollabHistoryError extends Error {},
}));

describe('CollabHistoryDialog localization without a controller', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('en');
  });

  afterEach(async () => {
    cleanup();
    vi.useRealTimers();
    await i18next.changeLanguage('en');
  });

  it('updates the connection grace state when the UI language changes', async () => {
    render(<CollabHistoryDialog collabUri="collab://document" onClose={vi.fn()} />);

    expect(screen.getByText('Loading history')).toBeTruthy();
    expect(screen.getByText('Waiting for the document to connect...')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();

    await act(async () => {
      await i18next.changeLanguage('ja');
    });

    expect(screen.getByText('履歴を読み込み中')).toBeTruthy();
    expect(screen.getByText('ドキュメントの接続を待っています…')).toBeTruthy();
    expect(screen.getByRole('button', { name: '閉じる' })).toBeTruthy();
  });

  it('shows the open-document guidance after the grace period expires', () => {
    vi.useFakeTimers();

    render(<CollabHistoryDialog collabUri="collab://document" onClose={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(screen.getByText('Open the document first')).toBeTruthy();
    expect(
      screen.getByText(
        'Shared-document history is only available while the document tab is open. Open the document and try again.',
      ),
    ).toBeTruthy();
  });
});
