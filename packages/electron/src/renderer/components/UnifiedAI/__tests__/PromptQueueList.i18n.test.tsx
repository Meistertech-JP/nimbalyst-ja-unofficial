// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { PromptQueueList } from '../PromptQueueList';

afterEach(cleanup);

test('shows queued prompt controls in Japanese', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja">
      <PromptQueueList
        queue={[{ id: 'queued-1', prompt: '次の作業', timestamp: 0 }]}
        onCancel={vi.fn()}
        onEdit={vi.fn()}
        onSendNow={vi.fn()}
      />
    </UiLanguageProvider>,
  );

  expect(screen.getByText('1件をキューに追加済み')).toBeDefined();
  expect(screen.getByTitle('中断して今すぐ送信')).toBeDefined();
  expect(screen.getByTitle('このプロンプトを編集')).toBeDefined();
  expect(screen.getByTitle('このプロンプトをキャンセル')).toBeDefined();
});
