import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { SharedDocumentLink } from '../SharedDocumentLink';

afterEach(cleanup);
let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

function renderLink(language: 'en' | 'ja' = 'en') {
  const i18n = language === 'ja' ? japaneseI18n : englishI18n;
  return render(
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale={language === 'ja' ? 'ja-JP' : 'en-US'}>
      <SharedDocumentLink href="/org/acme/project/a/document/b?blockId=q" onClick={vi.fn()} onContextMenu={vi.fn()}>Question</SharedDocumentLink>
    </UiLanguageProvider>,
  );
}

it('opens through the host on a plain click, leaves modified clicks to the browser, and opens its own menu on right-click', () => {
  const open = vi.fn();
  const menu = vi.fn();
  render(
    <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
      <SharedDocumentLink href="/org/acme/project/a/document/b?blockId=q" onClick={open} onContextMenu={menu}>Question</SharedDocumentLink>
    </UiLanguageProvider>,
  );
  const link = screen.getByRole('link');
  // No forced new tab: inside the in-app browser a popup leaves the app.
  expect(link.getAttribute('target')).toBeNull();
  expect(link.getAttribute('href')).toContain('?blockId=q');
  fireEvent.click(link, { ctrlKey: true });
  fireEvent.click(link, { metaKey: true });
  fireEvent.click(link, { button: 1 });
  expect(open).not.toHaveBeenCalled();
  // A plain click is the host's: default prevented, open action run once.
  expect(fireEvent.click(link)).toBe(false);
  expect(open).toHaveBeenCalledTimes(1);
  // The right-click lands on the link, not on the actions button beside it.
  fireEvent.contextMenu(link);
  expect(menu).toHaveBeenCalledTimes(1);
});

it('shows Japanese accessible labels for the document actions button', () => {
  renderLink('ja');
  const actions = screen.getByRole('button', { name: '共有ドキュメントのオプション' });
  expect(actions.getAttribute('title')).toBe('その他の操作');
});
