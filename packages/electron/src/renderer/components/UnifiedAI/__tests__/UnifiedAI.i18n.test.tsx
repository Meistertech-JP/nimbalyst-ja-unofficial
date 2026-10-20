// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EffortLevelSelector } from '../EffortLevelSelector';
import { ThinkingModeSelector } from '../ThinkingModeSelector';
import { ModeTag } from '../ModeTag';
import { PendingVoiceCommand } from '../PendingVoiceCommand';
import { pendingVoiceCommandAtom } from '../../../store/atoms/voiceModeState';

vi.mock('@nimbalyst/runtime', async (importOriginal) => ({
  ...await importOriginal<typeof import('@nimbalyst/runtime')>(),
  MaterialSymbol: () => null,
}));
vi.mock('../../../help', () => ({ HelpTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

beforeEach(async () => { await i18next.changeLanguage('ja'); });
afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  await i18next.changeLanguage('en');
});

describe('UnifiedAI Japanese controls', () => {
  it('translates effort levels while retaining provider-facing values', () => {
    const onLevelChange = vi.fn();
    render(<EffortLevelSelector level="high" onLevelChange={onLevelChange} />);
    fireEvent.click(screen.getByRole('button', { name: '推論の深さ: 高' }));
    fireEvent.click(screen.getByRole('button', { name: '超高' }));
    expect(onLevelChange).toHaveBeenCalledWith('xhigh');
  });

  it('translates thinking modes while retaining enabled and disabled values', () => {
    const onModeChange = vi.fn();
    render(<ThinkingModeSelector mode="enabled" onModeChange={onModeChange} />);
    fireEvent.click(screen.getByTestId('thinking-mode-selector'));
    fireEvent.click(screen.getByRole('button', { name: '拡張思考: オフ' }));
    expect(onModeChange).toHaveBeenCalledWith('disabled');
  });

  it('translates the mode label and accessible description without changing the toggle', () => {
    const onModeChange = vi.fn();
    render(<ModeTag mode="planning" onModeChange={onModeChange} />);
    expect(screen.getByText('プラン')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'プランモード: プラン文書を作成（クリックで全機能のエージェントモードに切り替え）' }));
    expect(onModeChange).toHaveBeenCalledWith('agent');
  });

  it('localizes voice timing and edit controls while submitting the exact authored prompt', () => {
    vi.useFakeTimers();
    const testStore = createStore();
    testStore.set(pendingVoiceCommandAtom, {
      id: 'ja-voice-controls', sessionId: 'session-ja', workspacePath: '/workspace',
      prompt: 'Keep this prompt unchanged', createdAt: Date.now(), delayMs: 5000,
    });
    const onSubmit = vi.fn();
    const { container } = render(
      <Provider store={testStore}><PendingVoiceCommand sessionId="session-ja" onSubmit={onSubmit} /></Provider>,
    );
    expect(container.textContent).toContain('5.0秒後に送信');
    expect(screen.getByText('音声コマンド')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    expect(screen.getByPlaceholderText('音声コマンド…')).toBeTruthy();
    expect(screen.getByText('編集中は一時停止')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '今すぐ送信' }));
    expect(onSubmit).toHaveBeenCalledWith('Keep this prompt unchanged', 'session-ja', '/workspace', undefined);
    expect(testStore.get(pendingVoiceCommandAtom)).toBeNull();
  });
});
