// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { EmojiAutocomplete, EmojiPicker } from '../EmojiPicker';
import { EMOJI_CATALOG } from '../emojiCatalog';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(cleanup);

function renderPicker(i18n: typeof englishI18n, onSelect = vi.fn()) {
  render(
    <I18nextProvider i18n={i18n}>
      <EmojiPicker
        testId="emoji-picker"
        onSelect={onSelect}
        trigger={({ ref, onClick, open }) => (
          <button ref={ref as React.Ref<HTMLButtonElement>} type="button" onClick={onClick} aria-expanded={open}>
            Reactions
          </button>
        )}
      />
    </I18nextProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Reactions' }));
  return onSelect;
}

describe('EmojiPicker localization', () => {
  it('localizes picker labels and empty search results in English and Japanese', () => {
    const { rerender } = render(
      <I18nextProvider i18n={englishI18n}>
        <EmojiPicker
          onSelect={() => {}}
          trigger={({ ref, onClick }) => (
            <button ref={ref as React.Ref<HTMLButtonElement>} type="button" onClick={onClick}>
              Reactions
            </button>
          )}
        />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reactions' }));
    expect(screen.getByRole('textbox', { name: 'Search emoji' })).toBeDefined();
    expect(screen.getByText('Frequently used')).toBeDefined();
    fireEvent.change(screen.getByTestId('emoji-picker-search'), { target: { value: 'not-an-emoji' } });
    expect(screen.getByText('No emoji match that.')).toBeDefined();

    rerender(
      <I18nextProvider i18n={japaneseI18n}>
        <EmojiPicker
          onSelect={() => {}}
          trigger={({ ref, onClick }) => (
            <button ref={ref as React.Ref<HTMLButtonElement>} type="button" onClick={onClick}>
              Reactions
            </button>
          )}
        />
      </I18nextProvider>,
    );
    expect(screen.getByRole('textbox', { name: '絵文字を検索' })).toBeDefined();
    expect(screen.getByText('一致する絵文字はありません。')).toBeDefined();
  });

  it('keeps emoji shortcodes and selection behavior unchanged', () => {
    const onSelect = renderPicker(englishI18n);
    expect(screen.getByTestId('emoji-option-rocket').getAttribute('aria-label')).toBe('rocket');
    fireEvent.click(screen.getByTestId('emoji-quick-rocket'));
    expect(onSelect).toHaveBeenCalledWith('rocket');
    expect(screen.queryByTestId('emoji-picker')).toBeNull();
  });

  it('localizes the autocomplete accessible label without changing suggestion names', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <EmojiAutocomplete
          anchorRect={null}
          entries={[EMOJI_CATALOG.find((entry) => entry.shortcode === 'rocket')!]}
          activeIndex={0}
          onSelect={() => {}}
          onActiveIndexChange={() => {}}
        />
      </I18nextProvider>,
    );

    expect(screen.getByRole('listbox', { name: '絵文字の候補' })).toBeDefined();
    expect(screen.getByRole('option', { name: /:rocket:/ })).toBeDefined();
  });
});
