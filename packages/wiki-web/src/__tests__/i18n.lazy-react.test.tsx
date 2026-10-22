// @vitest-environment jsdom
import React, { Suspense } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { UiLanguageProvider, useTranslation } from '@nimbalyst/i18n/react';
import { createWikiResourceReader, initializeWikiI18n } from '../i18n';

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('lang');
});

function LanguageLabel() {
  const { t } = useTranslation('settings');
  return <p>{t('ui_language.label')}</p>;
}

it('suspends for an absent namespace and updates translated content/document lang after lazy language loading', async () => {
  let englishReady!: (resource: { ui_language: { label: string } }) => void;
  let japaneseReady!: (resource: { ui_language: { label: string } }) => void;
  const english = new Promise<{ ui_language: { label: string } }>((resolve) => { englishReady = resolve; });
  const japanese = new Promise<{ ui_language: { label: string } }>((resolve) => { japaneseReady = resolve; });
  const loadEnglish = vi.fn(() => english);
  const loadJapanese = vi.fn(() => japanese);
  const i18n = await initializeWikiI18n('en', 'ja-JP', createWikiResourceReader({
    'en/common': async () => ({ wiki_web: { opening: 'Opening the wiki…' } }),
    'ja/common': async () => ({ wiki_web: { opening: 'Wikiを開いています…' } }),
    'en/settings': loadEnglish,
    'ja/settings': loadJapanese,
  }));
  const node = (preference: 'en' | 'ja') => (
    <UiLanguageProvider i18n={i18n} preference={preference} systemLocale="ja-JP">
      <Suspense fallback={<p role="status">{i18n.t('wiki_web.opening')}</p>}><LanguageLabel /></Suspense>
    </UiLanguageProvider>
  );
  const view = render(node('en'));
  expect(screen.getByRole('status').textContent).toBe('Opening the wiki…');
  expect(screen.queryByText('ui_language.label')).toBeNull();
  await waitFor(() => expect(loadEnglish).toHaveBeenCalledTimes(1));
  expect(loadJapanese).not.toHaveBeenCalled();
  await act(async () => englishReady({ ui_language: { label: 'Interface language' } }));
  expect((await screen.findByText('Interface language')).textContent).toBe('Interface language');
  expect(document.documentElement.lang).toBe('en');

  view.rerender(node('ja'));
  await waitFor(() => expect(loadJapanese).toHaveBeenCalledTimes(1));
  expect(document.documentElement.lang).toBe('en');
  await act(async () => japaneseReady({ ui_language: { label: '表示言語' } }));
  expect((await screen.findByText('表示言語')).textContent).toBe('表示言語');
  await waitFor(() => expect(document.documentElement.lang).toBe('ja'));
  expect(screen.queryByText('ui_language.label')).toBeNull();

  await act(async () => view.rerender(node('en')));
  expect((await screen.findByText('Interface language')).textContent).toBe('Interface language');
  expect(document.documentElement.lang).toBe('en');
  expect(loadEnglish).toHaveBeenCalledTimes(1);
  expect(loadJapanese).toHaveBeenCalledTimes(1);
});
