// @vitest-environment jsdom
import React from 'react';
import { Provider } from 'jotai';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { OrgPreferencesDialog } from '../OrgPreferencesDialog';

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

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
        <OrgPreferencesDialog onClose={vi.fn()} />
      </I18nextProvider>
    </Provider>
  );
}

describe('OrgPreferencesDialog localization', () => {
  it('localizes the density choices and their accessible group label', () => {
    renderDialog(englishI18n);
    expect(screen.getByRole('dialog', { name: 'Preferences' })).toBeDefined();
    expect(screen.getByRole('radiogroup', { name: 'Message display' })).toBeDefined();
    expect(screen.getByText('Avatar, name on its own line, room to breathe.')).toBeDefined();

    cleanup();
    renderDialog(japaneseI18n);
    expect(screen.getByRole('dialog', { name: '環境設定' })).toBeDefined();
    expect(screen.getByRole('radiogroup', { name: 'メッセージ表示' })).toBeDefined();
    expect(screen.getByRole('radio', { name: /ゆったり/ })).toBeDefined();
    expect(screen.getByText('アバターと名前を別の行に表示し、余裕を持たせます。')).toBeDefined();
    expect(screen.getByRole('radio', { name: /コンパクト/ })).toBeDefined();
    expect(screen.getByRole('button', { name: '完了' })).toBeDefined();
  });
});
