// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Provider } from 'jotai';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { CommandPillPopover } from '../CommandPillPopover';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test('shows command loading and source-file labels in Japanese', async () => {
  const i18n = await createI18nInstance('ja');
  (window as unknown as { electronAPI: { invoke: ReturnType<typeof vi.fn> } }).electronAPI = {
    invoke: vi.fn(() => new Promise(() => {})),
  };

  render(
    <Provider>
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
        <CommandPillPopover
          command={{ name: 'review', source: 'project', filePath: '/workspace/review.md' }}
          rect={new DOMRect(0, 0, 100, 24)}
          workspacePath="/workspace"
          sessionId="session-1"
          onClose={vi.fn()}
        />
      </UiLanguageProvider>
    </Provider>,
  );

  expect(await screen.findByText('読み込み中…')).toBeDefined();
  expect(screen.getByRole('button', { name: /ファイルを開く/ })).toBeDefined();
});
