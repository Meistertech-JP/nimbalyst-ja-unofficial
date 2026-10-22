// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let PDFPage: typeof import('../PDFPage').PDFPage;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
  vi.stubGlobal('window', Object.assign(window, { __nimbalyst_extensions: { 'pdfjs-dist': {} } }));
  ({ PDFPage } = await import('../PDFPage'));
});

describe('PDF page localization', () => {
  it('localizes the loading indicator while a page is rendering', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <PDFPage
          document={{ getPage: () => new Promise(() => {}) } as never}
          pageNumber={1}
          scale={1}
        />
      </UiLanguageProvider>,
    );

    expect(screen.getByText('PDFを読み込み中...')).toBeTruthy();
  });
});
