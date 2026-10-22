// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Provider, createStore } from 'jotai';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { PendingVoiceCommand } from '../PendingVoiceCommand';
import { pendingVoiceCommandAtom } from '../../../store/atoms/voiceModeState';

afterEach(() => cleanup());

describe('PendingVoiceCommand localization', () => {
  it('renders Japanese UI labels while preserving the user command text', async () => {
    const store = createStore();
    store.set(pendingVoiceCommandAtom, {
      id: 'pending-1',
      prompt: 'Open the project README',
      sessionId: 'session-1',
      createdAt: Date.now() + 10_000,
      delayMs: 10_000,
      workspacePath: 'C:/workspace',
    });
    const i18n = await createI18nInstance('ja');

    render(
      <Provider store={store}>
        <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
          <PendingVoiceCommand sessionId="session-1" onSubmit={() => undefined} />
        </UiLanguageProvider>
      </Provider>,
    );

    expect(screen.getByText('音声コマンド')).toBeTruthy();
    expect(screen.getByPlaceholderText('音声コマンド…')).toBeTruthy();
    expect(screen.getByDisplayValue('Open the project README')).toBeTruthy();
    fireEvent.focus(screen.getByPlaceholderText('音声コマンド…'));
    expect(screen.getByText('編集中は一時停止')).toBeTruthy();
    expect(screen.getByRole('button', { name: /編集/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /今すぐ送信/ })).toBeTruthy();
    expect(screen.getByTitle('キャンセル (Esc)')).toBeTruthy();
  });
});
