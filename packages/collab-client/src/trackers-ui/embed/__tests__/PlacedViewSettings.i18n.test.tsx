// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { PlacedViewSettings } from '../PlacedViewSettings';
import { PlacedViewSettingsSection } from '../PlacedViewSettingsSection';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

function renderSettings() {
  const onChange = () => {};
  return render(
    <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
      <PlacedViewSettings attrs={{ filter: 'title:=A,title:=B' }} fields={[]} availableColumns={[]} temporary onChange={onChange} />
    </UiLanguageProvider>,
  );
}

describe('PlacedViewSettings localization', () => {
  it('renders Japanese labels, summaries, accessible names, and temporary-view notice', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: '表示設定' }));

    expect(screen.getByRole('heading', { name: '表示設定' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '表示設定' })).toBeTruthy();
    expect(screen.getByText('レイアウト')).toBeTruthy();
    expect(screen.getByText('プロパティの表示')).toBeTruthy();
    expect(screen.getByText('フィルター')).toBeTruthy();
    expect(screen.getByText('並べ替え')).toBeTruthy();
    expect(screen.getByText('グループ化')).toBeTruthy();
    expect(screen.getByText('2件のルール')).toBeTruthy();
    expect(screen.getByText('未保存：この表示はページに保存されません。変更はページに反映されません。')).toBeTruthy();

    fireEvent.click(document.querySelector('[data-section="filter"]')!);
    expect(screen.getByRole('button', { name: '表示設定に戻る' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '表示設定を閉じる' })).toBeTruthy();
    expect(screen.getByLabelText('項目')).toBeTruthy();
    expect(screen.getByText('すべての条件に一致する項目を表示')).toBeTruthy();
    expect(screen.getByRole('button', { name: /フィルターを追加/ })).toBeTruthy();
  });

  it('localizes grouping, sorting, and layout section labels', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <PlacedViewSettingsSection
          section="sort"
          attrs={{ sort: '' }}
          fields={[]}
          availableColumns={[]}
          temporary={false}
          onChange={() => {}}
        />
      </UiLanguageProvider>,
    );
    expect(screen.getByText('並べ替えに使うプロパティを選択してください。')).toBeTruthy();
    expect(screen.getByText('並べ替えを追加')).toBeTruthy();
    cleanup();

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <PlacedViewSettingsSection
          section="group"
          attrs={{ group: 'none' }}
          fields={[]}
          availableColumns={[]}
          temporary={false}
          onChange={() => {}}
        />
      </UiLanguageProvider>,
    );
    expect(screen.getByLabelText('グループ化するプロパティを検索').getAttribute('placeholder')).toBe('プロパティを検索…');
    expect(screen.getByRole('button', { name: 'なし check' })).toBeTruthy();
  });

  it('localizes built-in grouping fallbacks without changing custom field labels', async () => {
    const i18n = await createI18nInstance('ja');
    const onChange = vi.fn();
    const view = render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
        <PlacedViewSettingsSection section="group" attrs={{ group: 'none' }}
          fields={[{ id: 'custom', label: 'My custom field', type: 'select' }]}
          availableColumns={[]} temporary={false} onChange={onChange} />
      </UiLanguageProvider>,
    );
    for (const label of ['ステータス', '優先度', '担当者', 'タイプ', 'タグ', 'マイルストーン', '目標']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('button', { name: 'タグ' }));
    expect(onChange).toHaveBeenCalledWith({ group: 'tag' });
    expect(screen.getByRole('button', { name: 'My custom field' })).toBeTruthy();
    view.unmount();

    const customLabelView = render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
        <PlacedViewSettingsSection section="group" attrs={{ group: 'none' }}
          fields={[{ id: 'status', label: 'Custom status', type: 'select' }]}
          availableColumns={[]} temporary={false} onChange={onChange} />
      </UiLanguageProvider>,
    );
    expect(screen.getByRole('button', { name: 'Custom status' })).toBeTruthy();
    customLabelView.unmount();

    const english = await createI18nInstance('en');
    render(
      <UiLanguageProvider i18n={english} preference="en" systemLocale="en-US">
        <PlacedViewSettingsSection section="group" attrs={{ group: 'none' }} fields={[]}
          availableColumns={[]} temporary={false} onChange={onChange} />
      </UiLanguageProvider>,
    );
    for (const label of ['Status', 'Priority', 'Assignee', 'Type', 'Tag', 'Milestone', 'Goal']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
  });
});
