import React from 'react';
import i18next from 'i18next';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { TypeaheadMenuContent, type TypeaheadMenuOption } from '../../../../../runtime/src/editor/plugins/TypeaheadPlugin/TypeaheadMenu';

const locale = i18next.createInstance();
const resolution = { getRect: () => new DOMRect(20, 30, 80, 20) };
function localized(language: string, options: TypeaheadMenuOption[]) {
  const t = locale.getFixedT(language);
  const displayOptions = options.map((option) => ({
    ...option,
    sectionLabel:
      option.section === 'Basic blocks'
        ? t('editor:typeahead.basic_blocks', { defaultValue: 'Basic blocks' })
        : option.section === 'Tables'
          ? t('common:database.tables', { defaultValue: 'Tables' })
          : option.section === 'Lists'
            ? t('editor:typeahead.lists', { defaultValue: 'Lists' })
            : option.section === 'Layout'
              ? t('editor:typeahead.layout', { defaultValue: 'Layout' })
              : option.section === 'Plugins'
                ? t('editor:typeahead.plugins', { defaultValue: 'Plugins' })
                : option.sectionLabel,
  }));
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
    <TypeaheadMenuContent resolution={resolution} options={displayOptions} selectedIndex={0} onSelectOption={vi.fn()} onSetSelectedIndex={vi.fn()} />
  </RuntimeTranslationProvider>;
}
beforeEach(async () => { await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('slash-menu translation presentation', () => {
  it('updates section labels, flags and keeps option identity/content across locale changes', () => {
    const options: TypeaheadMenuOption[] = [
      { id: 'heading', label: 'Heading 1', section: 'Basic blocks', sectionLabel: 'Basic blocks', flag: 'new', onSelect: vi.fn() },
      { id: 'raw', label: 'Raw extension title', description: 'Raw extension description', section: 'Plugins', sectionLabel: 'Plugins', onSelect: vi.fn() },
    ];
    const view = render(localized('en', options));
    const menu = document.querySelector('.typeahead-menu'); expect(menu).toBeTruthy();
    const option = screen.getByRole('option', { name: /Heading 1/ });
    expect(screen.getByText('Basic blocks')).toBeTruthy(); expect(screen.getByText('New')).toBeTruthy();
    view.rerender(localized('ja', options));
    expect(document.querySelector('.typeahead-menu')).toBe(menu); expect(screen.getByRole('option', { name: /Heading 1/ })).toBe(option);
    expect(screen.getByText('基本ブロック')).toBeTruthy(); expect(screen.getByText('プラグイン')).toBeTruthy();
    // Extension-provided labels and descriptions are user-owned contribution data.
    expect(screen.getByText('Raw extension title')).toBeTruthy(); expect(screen.getByText('Raw extension description')).toBeTruthy();
    expect(screen.getByText('新機能')).toBeTruthy();
  });

  it('renders translated no-match feedback while keeping an empty option list', () => {
    const view = render(localized('en', []));
    const menu = document.querySelector('.typeahead-menu'); expect(menu).toBeTruthy(); expect(screen.getByText('No matches found')).toBeTruthy();
    view.rerender(localized('ja', []));
    expect(document.querySelector('.typeahead-menu')).toBe(menu); expect(screen.getByText('一致する候補がありません')).toBeTruthy();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('keeps technical section keys and option callbacks unchanged', () => {
    const onSelect = vi.fn();
    const options: TypeaheadMenuOption[] = [{ id: 'table-2x3', label: '2x3 Table', section: 'Tables', sectionLabel: 'Tables', onSelect }];
    const view = render(localized('en', options));
    view.rerender(localized('ja', options));
    expect(screen.getByRole('option').textContent).toContain('2x3 Table'); expect(screen.getByText('テーブル')).toBeTruthy();
    expect(options[0].id).toBe('table-2x3'); expect(options[0].section).toBe('Tables'); expect(options[0].onSelect).toBe(onSelect);
  });
});
