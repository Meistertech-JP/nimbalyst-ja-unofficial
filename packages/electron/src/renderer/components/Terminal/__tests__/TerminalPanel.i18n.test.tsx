// @vitest-environment jsdom
import React from 'react';
import { Provider, createStore } from 'jotai';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { TerminalPanel } from '../TerminalPanel';
import { TerminalContextMenu } from '../TerminalContextMenu';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});
afterEach(() => cleanup());

describe('TerminalPanel localization', () => {
  it('localizes the terminal context menu and preserves its clear action', () => {
    const onClose = vi.fn();
    const onClear = vi.fn();

    render(
      <I18nextProvider i18n={japaneseI18n}>
        <TerminalContextMenu x={10} y={10} onClose={onClose} onClear={onClear} />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByText('クリア'));
    expect(onClear).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('localizes the initial state without starting a terminal process', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <Provider store={createStore()}>
          <TerminalPanel
            terminalId="terminal-test"
            workspacePath="C:/workspace"
            isActive={false}
            panelVisible={false}
          />
        </Provider>
      </I18nextProvider>,
    );

    expect(screen.getByText('ターミナルを初期化中…')).toBeDefined();
  });
});
