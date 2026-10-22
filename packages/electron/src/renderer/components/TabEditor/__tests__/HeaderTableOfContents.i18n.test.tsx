// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { HeaderTableOfContents } from '../HeaderTableOfContents';

vi.mock('lexical', () => ({
  $getRoot: () => ({ getChildren: () => [] }),
}));
vi.mock('@lexical/rich-text', () => ({ $isHeadingNode: () => false }));

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(cleanup);

describe('HeaderTableOfContents localization', () => {
  it('localizes the accessible button label and empty state', () => {
    const editor = {
      getEditorState: () => ({ read: (callback: () => void) => callback() }),
      registerUpdateListener: () => () => {},
      getElementByKey: () => null,
    };

    render(
      <I18nextProvider i18n={japaneseI18n}>
        <HeaderTableOfContents editor={editor} />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByTestId('editor-header-toc'));
    expect(screen.getByLabelText('目次')).toBeDefined();
    expect(screen.getByText('ドキュメントに見出しはありません')).toBeDefined();
  });
});
