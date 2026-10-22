// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { EditorHostProps } from '@nimbalyst/runtime';

import { HtmlPageEditor } from '../HtmlPage/HtmlPageEditor';

vi.mock('@nimbalyst/runtime/editors/MonacoEditor', () => ({
  MonacoEditor: () => <div data-testid="monaco-editor" />,
}));
vi.mock('@nimbalyst/runtime/ui/htmlEmbed/HtmlEmbedFrame', () => ({
  HtmlEmbedFrame: () => <div data-testid="html-preview" />,
}));
vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: () => <span aria-hidden="true" />,
}));
vi.mock('../EmbedFrame/useDesktopHtmlEmbedTheme', () => ({
  useDesktopHtmlEmbedTheme: () => 'light',
}));

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(cleanup);

describe('HtmlPageEditor localization', () => {
  it('localizes the preview/source tablist and keeps tab selection behavior', () => {
    const host = {
      embedded: false,
      filePath: 'C:/workspace/page.html',
      fileName: 'page.html',
      collaboration: null,
      loadContent: async () => '<p>content</p>',
      onFileChanged: () => () => undefined,
    } as unknown as EditorHostProps['host'];

    render(
      <I18nextProvider i18n={japaneseI18n}>
        <Provider>
          <HtmlPageEditor host={host} />
        </Provider>
      </I18nextProvider>,
    );

    expect(screen.getByRole('tablist', { name: 'HTMLページ表示' })).toBeDefined();
    const preview = screen.getByRole('tab', { name: 'プレビュー' });
    const source = screen.getByRole('tab', { name: 'ソース' });
    expect(preview.getAttribute('aria-selected')).toBe('true');
    fireEvent.click(source);
    expect(source.getAttribute('aria-selected')).toBe('true');
  });
});
