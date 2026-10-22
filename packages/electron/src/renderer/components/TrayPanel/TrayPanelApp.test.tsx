// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { TRAY_PANEL_CHANNELS, emptyTrayPanelFeed } from '../../../shared/traySessions';
import { trayPanelFeedAtom } from '../../store/listeners/trayPanelListeners';
import { TrayPanelApp } from './TrayPanelApp';

vi.mock('../../store/listeners/trayPanelListeners', async () => {
  const actual = await vi.importActual<typeof import('../../store/listeners/trayPanelListeners')>(
    '../../store/listeners/trayPanelListeners',
  );
  return { ...actual, initTrayPanelListener: vi.fn(() => () => {}) };
});

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => cleanup());

describe('TrayPanelApp localization', () => {
  it('renders Japanese empty state and dispatches the new-session action', () => {
    const store = createStore();
    store.set(trayPanelFeedAtom, emptyTrayPanelFeed());
    const send = vi.fn();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { send },
    });

    render(
      <I18nextProvider i18n={japaneseI18n}>
        <Provider store={store}>
          <TrayPanelApp />
        </Provider>
      </I18nextProvider>,
    );

    expect(screen.getByText('セッション')).toBeTruthy();
    expect(screen.getByTestId('tray-panel-summary').textContent).toBe('実行中のセッションはありません');
    expect(screen.getByTestId('tray-panel-empty').textContent)
      .toContain('新しいセッションを開始してください');

    fireEvent.click(screen.getByTestId('tray-panel-new-session'));
    expect(send).toHaveBeenCalledWith(TRAY_PANEL_CHANNELS.newSession);
  });
});
