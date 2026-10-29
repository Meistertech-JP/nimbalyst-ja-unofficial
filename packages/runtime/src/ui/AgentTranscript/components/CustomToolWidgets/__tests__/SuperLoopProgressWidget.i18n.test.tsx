import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import i18next, { type i18n } from 'i18next';
import { resources } from '../../../../../../../i18n/src/resources';
import { store } from '../../../../../store/store';
import { setInteractiveWidgetHost } from '../../../../../store/atoms/interactiveWidgetHost';
import type { InteractiveWidgetHost } from '../InteractiveWidgetHost';
import { SuperLoopProgressWidget } from '../SuperLoopProgressWidget';

const SESSION_ID = 'super-loop-i18n-session';
let testI18n: i18n;

function makeMessage(status: string, phase = 'planning') {
  return {
    toolCall: {
      arguments: {
        phase,
        status,
        completionSignal: false,
        learnings: [],
        blockers: ['Waiting on a decision'],
        currentIteration: 1,
      },
    },
  } as any;
}

function renderWidget(status: string, phase = 'planning') {
  return render(
    <I18nextProvider i18n={testI18n}>
      <JotaiProvider store={store}>
        <SuperLoopProgressWidget
          message={makeMessage(status, phase)}
          sessionId={SESSION_ID}
          isExpanded={false}
          onToggle={vi.fn()}
        />
      </JotaiProvider>
    </I18nextProvider>
  );
}

describe('SuperLoopProgressWidget localization', () => {
  beforeAll(async () => {
    testI18n = i18next.createInstance();
    await testI18n.init({
      lng: 'ja',
      fallbackLng: 'en',
      ns: ['agents'],
      defaultNS: 'agents',
      resources,
      interpolation: { escapeValue: false },
    });
  });

  afterEach(() => {
    cleanup();
    setInteractiveWidgetHost(SESSION_ID, null);
    vi.restoreAllMocks();
  });

  it('renders Japanese progress and empty-learning labels', () => {
    renderWidget('completed');

    expect(screen.getByText('進捗更新')).toBeTruthy();
    expect(screen.getByText('学習内容はまだありません')).toBeTruthy();
    expect(screen.getByText('計画')).toBeTruthy();
    expect(screen.getByText('完了')).toBeTruthy();
    expect(screen.getByText('1回目')).toBeTruthy();
  });

  it.each([
    ['future-status', 'future-phase'],
    ['constructor', '__proto__'],
  ])('preserves unknown status %s and phase %s as external identifiers', (status, phase) => {
    renderWidget(status, phase);

    expect(screen.getByText(status)).toBeTruthy();
    expect(screen.getByText(phase)).toBeTruthy();
    expect(screen.queryByText('super_loop_progress.undefined')).toBeNull();
  });

  it('preserves an unknown phase on the blocked feedback card', () => {
    renderWidget('blocked', 'future-phase');
    expect(screen.getByText('future-phase')).toBeTruthy();
    expect(screen.getByText('フィードバックを送信')).toBeTruthy();
  });

  it('renders snapshot learnings and diagnostics labels in Japanese', async () => {
    const message = {
      toolCall: {
        arguments: {
          timing: 'iteration-start',
          iterationNumber: 1,
          progress: {
            currentIteration: 1,
            phase: 'planning',
            status: 'running',
            completionSignal: true,
            learnings: [{ iteration: 1, summary: 'Improve search', filesChanged: [] }],
            blockers: [],
            userFeedback: 'Consider edge cases',
          },
        },
      },
    } as any;
    const { SuperProgressSnapshotWidget } = await import('../SuperProgressSnapshotWidget');
    render(
      <I18nextProvider i18n={testI18n}>
        <SuperProgressSnapshotWidget message={message} isExpanded={false} onToggle={vi.fn()} sessionId={SESSION_ID} />
      </I18nextProvider>,
    );

    expect(screen.getByText('学習内容（1件）')).toBeTruthy();
    expect(screen.getByText('JSONを表示')).toBeTruthy();
    expect(screen.getByText('反復開始 #1')).toBeTruthy();
    expect(screen.getByText('計画')).toBeTruthy();
    expect(screen.getByText('実行中')).toBeTruthy();
    expect(screen.getByText('完了')).toBeTruthy();
    expect(screen.getByText('フィードバック:')).toBeTruthy();
    expect(screen.getByText('1回目')).toBeTruthy();
  });

  it('renders Japanese feedback guidance and waiting state', () => {
    renderWidget('blocked');

    expect(screen.getByPlaceholderText('ブロッカーの解消に役立つ案内を入力してください...')).toBeTruthy();
    expect(screen.getByText('フィードバックを送信')).toBeTruthy();
    expect(screen.getByText('セッションを待機中...')).toBeTruthy();
    expect(screen.getByText('要対応')).toBeTruthy();
  });

  it('renders the localized submitted state after feedback succeeds', async () => {
    const host = {
      superLoopBlockedFeedback: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as InteractiveWidgetHost;
    setInteractiveWidgetHost(SESSION_ID, host);
    renderWidget('blocked');

    fireEvent.change(screen.getByPlaceholderText('ブロッカーの解消に役立つ案内を入力してください...'), {
      target: { value: 'Continue with option A' },
    });
    fireEvent.click(screen.getByText('フィードバックを送信'));

    expect(await screen.findByText('フィードバックを送信しました')).toBeTruthy();
    expect(host.superLoopBlockedFeedback).toHaveBeenCalledWith('Continue with option A');
  });
});
