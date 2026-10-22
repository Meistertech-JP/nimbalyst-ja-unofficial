// @vitest-environment jsdom
import React from 'react';
import { Provider, createStore } from 'jotai';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

vi.mock('../../../store/atoms/appSettings', async () => {
  const { atom } = await import('jotai');
  return { voiceModeEnabledAtom: atom(true) };
});

vi.mock('../../../store/atoms/sessions', async () => {
  const { atom } = await import('jotai');
  return { activeSessionIdAtom: atom('session-1') };
});

vi.mock('../../../store/atoms/voiceModeState', async () => {
  const { atom } = await import('jotai');
  return {
    voiceTokenUsageAtom: atom(null),
    voiceListenStateAtom: atom('off'),
    voiceErrorAtom: atom(null),
    voiceReconnectingAtom: atom(false),
    registerVoiceAudioCallback: vi.fn(),
    registerVoiceInterruptCallback: vi.fn(),
    registerVoiceSubmitPromptCallback: vi.fn(),
    registerVoiceAgentTaskCompleteCallback: vi.fn(),
    registerVoiceStoppedCallback: vi.fn(),
    registerVoiceResponseDoneCallback: vi.fn(),
    registerVoiceAudioActiveQuery: vi.fn(),
  };
});

vi.mock('../../../store/listeners/voiceModeListeners', () => ({
  setVoiceActiveSession: vi.fn(),
  clearVoiceActiveSession: vi.fn(),
  persistAndClearVoiceSession: vi.fn(),
  onLinkedSessionChanged: vi.fn(),
  wakeVoiceListening: vi.fn(),
  notifyVoiceAudioPlaybackDrained: vi.fn(),
  sendVoiceMessage: vi.fn(),
}));

vi.mock('../../../utils/voiceReadyChime', () => ({
  prepareVoiceReadyChime: () => ({ dispose: vi.fn(), play: vi.fn().mockResolvedValue(false) }),
}));
vi.mock('../../../utils/audioCapture', () => ({ AudioCapture: vi.fn() }));
vi.mock('../../../utils/audioPlayback', () => ({ AudioPlayback: vi.fn() }));
vi.mock('../../../help', () => ({ HelpTooltip: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: () => <span aria-hidden="true" />,
}));

import { VoiceModeButton } from '../VoiceModeButton';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('VoiceModeButton localization', () => {
  it('localizes the connection failure fallback when the service returns no message', async () => {
    const i18n = await createI18nInstance('ja');
    const store = createStore();
    (window as any).electronAPI = {
      invoke: vi.fn().mockResolvedValue({ success: false }),
    };

    render(
      <Provider store={store}>
        <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
          <VoiceModeButton />
        </UiLanguageProvider>
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '音声モードを開始' }));

    await waitFor(() => {
      expect(screen.getByText('音声サービスへの接続に失敗しました。')).toBeTruthy();
    });
  });

  it('localizes the startup failure fallback for non-Error failures', async () => {
    const i18n = await createI18nInstance('ja');
    const store = createStore();
    (window as any).electronAPI = {
      invoke: vi.fn().mockRejectedValue('unknown failure'),
    };

    render(
      <Provider store={store}>
        <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
          <VoiceModeButton />
        </UiLanguageProvider>
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '音声モードを開始' }));

    await waitFor(() => {
      expect(screen.getByText('音声モードの開始に失敗しました。')).toBeTruthy();
    });
  });
});
