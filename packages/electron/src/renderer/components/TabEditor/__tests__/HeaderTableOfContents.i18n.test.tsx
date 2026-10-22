// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeaderTableOfContents } from '../HeaderTableOfContents';

const headingState = vi.hoisted(() => ({
  nodes: [] as Array<{ getTextContent: () => string; getTag: () => string; getKey: () => string }>,
}));

vi.mock('lexical', () => ({
  $getRoot: () => ({ getChildren: () => headingState.nodes }),
}));
vi.mock('@lexical/rich-text', () => ({ $isHeadingNode: () => true }));

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(cleanup);
beforeEach(() => { headingState.nodes = []; });

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

  it('preserves upstream heading hierarchy and scrolling in the Japanese menu', () => {
    const levels = [2, 4, 4, 2, 3];
    headingState.nodes = levels.map((level, index) => ({
      getTextContent: () => `見出し ${index + 1}`,
      getTag: () => `h${level}`,
      getKey: () => `heading-${index}`,
    }));
    const scrollIntoView = vi.fn();
    const getElementByKey = vi.fn(() => ({ scrollIntoView } as unknown as HTMLElement));
    const editor = {
      getEditorState: () => ({ read: (callback: () => void) => callback() }),
      registerUpdateListener: () => () => {},
      getElementByKey,
    };

    render(
      <I18nextProvider i18n={japaneseI18n}>
        <HeaderTableOfContents editor={editor} />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByLabelText('目次'));
    const items = screen.getAllByRole('menuitem');
    expect(items.map((item) => item.getAttribute('data-depth'))).toEqual(['0', '1', '1', '0', '1']);
    expect(items.map((item) => item.style.paddingLeft)).toEqual(['12px', '28px', '28px', '12px', '28px']);
    fireEvent.click(items[1]);
    expect(getElementByKey).toHaveBeenCalledWith('heading-1');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
