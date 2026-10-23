// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { EditorHostProps } from '@nimbalyst/extension-sdk';
import { initializeWikiI18n } from '../../i18n';
import { components } from '../html/wikiHtmlBundle';

vi.mock('@nimbalyst/runtime', () => ({ MonacoEditor: () => null }));
vi.mock('@nimbalyst/runtime-source/ui/htmlEmbed/HtmlEmbedFrame', () => ({ HtmlEmbedFrame: () => null }));

afterEach(cleanup);

it('localizes the HTML editor tab list and preview/source tabs across language changes', async () => {
  const i18n = await initializeWikiI18n('ja', 'en-US');
  const host = {
    fileName: 'sample.html',
    loadContent: vi.fn(() => new Promise<string>(() => {})),
    onFileChanged: vi.fn(() => () => {}),
  } as unknown as EditorHostProps['host'];
  const node = (preference: 'en' | 'ja') => <UiLanguageProvider i18n={i18n} preference={preference} systemLocale="en-US"><components.HtmlPageEditor host={host} /></UiLanguageProvider>;
  const view = render(node('ja'));

  expect(screen.getByRole('tablist', { name: 'HTMLページ表示' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'プレビュー' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'ソース' })).toBeTruthy();

  view.rerender(node('en'));
  await waitFor(() => expect(screen.getByRole('tablist', { name: 'HTML page view' })).toBeTruthy());
  expect(screen.getByRole('tab', { name: 'Preview' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Source' })).toBeTruthy();
});
