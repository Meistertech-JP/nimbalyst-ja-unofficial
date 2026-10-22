// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { KeyboardShortcutsDialog } from '../KeyboardShortcutsDialog/KeyboardShortcutsDialog';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => cleanup());

function renderDialog(i18n: typeof englishI18n): void {
  render(
    <Provider>
      <I18nextProvider i18n={i18n}>
        <KeyboardShortcutsDialog isOpen onClose={() => {}} />
      </I18nextProvider>
    </Provider>
  );
}

describe('KeyboardShortcutsDialog localization', () => {
  it('localizes fixed labels and accessibility text while keeping key identifiers intact', () => {
    renderDialog(englishI18n);
    expect(screen.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
    expect(screen.getByText('Toggle Plan Mode (Claude Code)')).toBeDefined();

    cleanup();
    renderDialog(japaneseI18n);
    expect(screen.getByRole('dialog', { name: 'キーボードショートカット' })).toBeDefined();
    expect(screen.getByRole('button', { name: '閉じる' })).toBeDefined();
    expect(screen.getByRole('button', { name: '一般' })).toBeDefined();
    expect(screen.getByText('プロジェクトキャンバス')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Wiki' })).toBeDefined();
    expect(screen.getByText('プランモードを切り替え（Claude Code）')).toBeDefined();
    expect(screen.getByText('Shift+Tab')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'エディター書式' }));
    expect(screen.getByText('テキスト書式')).toBeDefined();
    expect(screen.getByText('太字')).toBeDefined();
    const footer = document.querySelector('.keyboard-shortcuts-dialog > div:last-child');
    expect(footer?.textContent?.replace(/\s/g, '')).toBe('Escで閉じる');
  });
});
