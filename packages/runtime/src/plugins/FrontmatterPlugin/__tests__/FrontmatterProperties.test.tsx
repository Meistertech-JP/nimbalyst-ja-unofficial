// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

vi.mock('../../../ui/icons/MaterialSymbol', () => ({ MaterialSymbol: () => null }));

import { FrontmatterProperties } from '../FrontmatterProperties';

afterEach(cleanup);

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
});

const DOC = '---\nid: 01ABC\norder: 1000\nstatus: current\nsummary: What it is\n---\n\n# Home\n';

function setup(content = DOC) {
  let current = content;
  const onContentChange = vi.fn((next: string) => { current = next; });
  render(
    <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
      <FrontmatterProperties getContent={() => current} contentVersion={0} onContentChange={onContentChange} />
    </UiLanguageProvider>,
  );
  return { onContentChange, content: () => current };
}

describe('FrontmatterProperties', () => {
  it('keeps agent fields behind a disclosure and writes an edit once, on blur', () => {
    const { onContentChange, content } = setup();
    expect(screen.queryByDisplayValue('01ABC')).toBeNull();
    fireEvent.click(screen.getByText('2 more: id, order'));
    screen.getByDisplayValue('01ABC');

    const summary = screen.getByDisplayValue('What it is');
    fireEvent.change(summary, { target: { value: 'What UserCurrent is' } });
    expect(onContentChange).not.toHaveBeenCalled();
    fireEvent.blur(summary);
    expect(onContentChange).toHaveBeenCalledTimes(1);
    expect(content()).toContain('summary: What UserCurrent is');
    expect(content()).toContain('# Home');
  });

  it('adds a property and shows it without the host re-reading', () => {
    const { content } = setup();
    fireEvent.click(screen.getByText('Add property'));
    const input = screen.getByPlaceholderText('Property name');
    fireEvent.change(input, { target: { value: 'owner' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(content()).toMatch(/owner: ''/);
    screen.getByText('owner');
  });

  it('shows a parse error instead of fields', () => {
    setup('---\nstatus: [unclosed\n---\n');
    screen.getByText('Invalid Frontmatter');
  });

  it('localizes frontmatter controls and placeholders in Japanese', async () => {
    const japaneseI18n = await createI18nInstance('ja');
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <FrontmatterProperties getContent={() => '---\n---\n'} contentVersion={0} onContentChange={vi.fn()} />
      </UiLanguageProvider>,
    );

    screen.getByText('プロパティはありません');
    fireEvent.click(screen.getByText('プロパティを追加'));
    screen.getByPlaceholderText('プロパティ名');

    cleanup();
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <FrontmatterProperties getContent={() => '---\nid: ABC\norder: 1\ntags: [one, two]\nwebsite: https://example.com\n---\n'} contentVersion={0} />
      </UiLanguageProvider>,
    );
    screen.getByPlaceholderText('カンマ区切りの値');
    fireEvent.click(screen.getByText('さらに2件: id, order'));
    screen.getByText('折りたたむ');
    screen.getByRole('link', { name: 'リンクを開く' });
  });
});
