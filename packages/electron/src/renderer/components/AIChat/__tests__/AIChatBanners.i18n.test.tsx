// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingReviewBanner } from '../PendingReviewBanner';
import { WakeupBanner } from '../WakeupBanner';
import { sessionPendingReviewFilesAtom } from '../../../store/atoms/sessionFiles';
import { sessionWakeupAtom } from '../../../store/atoms/sessions';

vi.mock('@nimbalyst/runtime', async (importOriginal) => ({
  ...await importOriginal<typeof import('@nimbalyst/runtime')>(),
  MaterialSymbol: () => null,
}));

beforeEach(async () => { await i18next.changeLanguage('ja'); });
afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  await i18next.changeLanguage('en');
});

describe('AIChat Japanese banners', () => {
  it('localizes the review count and keeps the session-scoped accept action', async () => {
    const testStore = createStore();
    testStore.set(sessionPendingReviewFilesAtom('session-ja'), new Set(['/workspace/a.ts', '/workspace/b.ts']));
    const clearPendingForSession = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('electronAPI', { history: { clearPendingForSession } });
    const { container } = render(
      <Provider store={testStore}><PendingReviewBanner sessionId="session-ja" workspacePath="/workspace" /></Provider>,
    );
    expect(container.textContent).toContain('レビュー待ちのファイル2件');
    expect(container.querySelector('.pending-review-banner__count')?.textContent).toBe('2');
    await act(async () => { fireEvent.click(screen.getByTitle('レビュー待ちのAI変更をすべて保持')); });
    expect(clearPendingForSession).toHaveBeenCalledWith('/workspace', 'session-ja');
  });

  it('localizes scheduled time and buttons without changing the wakeup or its reason', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-18T01:00:00Z'));
    const testStore = createStore();
    testStore.set(sessionWakeupAtom('session-ja'), {
      id: 'wake-ja', sessionId: 'session-ja', workspaceId: '/workspace',
      prompt: 'Keep monitoring', reason: 'Authored reason', fireAt: Date.now() + 120_000,
      status: 'pending', createdAt: Date.now(), firedAt: null, error: null,
    });
    const invoke = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('electronAPI', { invoke });
    const { container } = render(<Provider store={testStore}><WakeupBanner sessionId="session-ja" /></Provider>);
    expect(container.textContent).toContain('2分後に再開予定');
    expect(container.textContent).toContain('Authored reason');
    await act(async () => { fireEvent.click(screen.getByTitle('この再開予約を今すぐ実行')); });
    expect(invoke).toHaveBeenCalledWith('wakeup:run-now', 'wake-ja');
    await act(async () => { fireEvent.click(screen.getByTitle('再開予約をキャンセル')); });
    expect(invoke).toHaveBeenCalledWith('wakeup:cancel', 'wake-ja');
  });
});
