// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Provider } from 'jotai';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { AIInput } from '../AIInput';

afterEach(cleanup);

test('shows AI input controls in Japanese', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <Provider>
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
        <AIInput value="" onChange={vi.fn()} onSend={vi.fn()} />
      </UiLanguageProvider>
    </Provider>,
  );

  expect(screen.getByTitle('ドラッグして入力欄の高さを変更')).toBeDefined();
  expect(screen.getByRole('button', { name: 'メッセージを送信' })).toBeDefined();
  expect(screen.getByTitle('メッセージを送信（Enter）')).toBeDefined();
});

test('shows the cancel request controls in Japanese while loading', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <Provider>
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
        <AIInput value="" onChange={vi.fn()} onSend={vi.fn()} isLoading onCancel={vi.fn()} />
      </UiLanguageProvider>
    </Provider>,
  );

  expect(screen.getByRole('button', { name: 'リクエストをキャンセル' })).toBeDefined();
  expect(screen.getByTitle('リクエストをキャンセル（Esc）')).toBeDefined();
});
