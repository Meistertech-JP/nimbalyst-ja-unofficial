// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { SpreadsheetFind } from '../../hooks/useSpreadsheetFind';
import { ColorPalette } from '../toolbar/ColorPalette';
import { FindBar } from '../FindBar';

afterEach(cleanup);

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

function makeFind(overrides: Partial<SpreadsheetFind> = {}): SpreadsheetFind {
  return {
    isOpen: true,
    showReplace: true,
    query: 'name',
    replacement: 'title',
    caseSensitive: false,
    wholeCell: false,
    cursor: { count: 2, index: 0 } as SpreadsheetFind['cursor'],
    hasSelection: true,
    open: vi.fn(),
    toggleReplace: vi.fn(),
    close: vi.fn(),
    setQuery: vi.fn(),
    setReplacement: vi.fn(),
    setCaseSensitive: vi.fn(),
    setWholeCell: vi.fn(),
    step: vi.fn(),
    replaceCurrent: vi.fn(),
    replaceAll: vi.fn(),
    ...overrides,
  };
}

describe('spreadsheet find bar localization', () => {
  it('localizes search, replacement, navigation, and scope controls', () => {
    const find = makeFind();
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <FindBar find={find} />
      </UiLanguageProvider>,
    );

    expect(screen.getByRole('textbox', { name: '検索' }).getAttribute('placeholder')).toBe('シート内を検索');
    expect(screen.getByText('1 / 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: '前の一致箇所' }).getAttribute('title')).toBe('前の一致箇所（Shift+Enter）');
    expect(screen.getByRole('button', { name: '次の一致箇所' }).getAttribute('title')).toBe('次の一致箇所（Enter）');
    expect(screen.getByRole('button', { name: 'セル' }).getAttribute('title')).toBe('セル全体に一致');
    expect(screen.getByRole('textbox', { name: '置換後の文字列' }).getAttribute('placeholder')).toBe('置換後の文字列');
    expect(screen.getByRole('button', { name: 'すべて置換' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '選択範囲内' }).getAttribute('title')).toBe('選択範囲内の一致箇所をすべて置換');

    fireEvent.click(screen.getByRole('button', { name: '置換欄を表示／非表示' }));
    fireEvent.click(screen.getByRole('button', { name: '前の一致箇所' }));
    fireEvent.click(screen.getByRole('button', { name: '置換' }));
    expect(find.toggleReplace).toHaveBeenCalledOnce();
    expect(find.step).toHaveBeenCalledWith('previous');
    expect(find.replaceCurrent).toHaveBeenCalledOnce();
  });

  it('localizes empty-result feedback and keeps the find input available in read-only mode', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <FindBar find={makeFind({ showReplace: false, cursor: { count: 0, index: 0 } as SpreadsheetFind['cursor'] })} readOnly />
      </UiLanguageProvider>,
    );

    expect(screen.getByRole('textbox', { name: '検索' })).toBeTruthy();
    expect(screen.getByText('一致する結果はありません')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: '置換後の文字列' })).toBeNull();
    expect(screen.queryByRole('button', { name: '置換' })).toBeNull();
  });

  it('localizes the color palette reset action', () => {
    const onPick = vi.fn();
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <ColorPalette value={undefined} kind="fill" onPick={onPick} />
      </UiLanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'リセット' }));
    expect(onPick).toHaveBeenCalledWith('default');
  });
});
