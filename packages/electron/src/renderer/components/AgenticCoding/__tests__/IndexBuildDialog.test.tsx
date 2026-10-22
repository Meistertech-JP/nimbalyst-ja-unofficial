// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { IndexBuildDialog } from '../IndexBuildDialog';

afterEach(cleanup);

it('renders the index prompt and actions in Japanese', async () => {
  const i18n = await createI18nInstance('ja');
  const messageCount = 1234;

  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <IndexBuildDialog
        isOpen
        messageCount={messageCount}
        isBuilding={false}
        onBuild={vi.fn()}
        onSkip={vi.fn()}
      />
    </UiLanguageProvider>
  );

  screen.getByRole('heading', { name: '検索インデックスを作成しますか？' });
  expect(screen.getByText((_text, element) => element?.tagName === 'STRONG').textContent).toBe(messageCount.toLocaleString());
  screen.getByRole('button', { name: '今回はスキップ' });
  screen.getByRole('button', { name: 'インデックスを作成' });
});

it('renders the in-progress message in Japanese', async () => {
  const i18n = await createI18nInstance('ja');

  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <IndexBuildDialog isOpen messageCount={0} isBuilding onBuild={vi.fn()} onSkip={vi.fn()} />
    </UiLanguageProvider>
  );

  screen.getByText('インデックスを作成中…数分かかる場合があります。');
});
