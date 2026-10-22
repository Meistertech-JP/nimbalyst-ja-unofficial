// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from 'sql.js';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { SQLiteBrowserCore } from '../SQLiteBrowserCore';

afterEach(cleanup);

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('SQLite Browser localization', () => {
  it('localizes the empty state and open action', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <SQLiteBrowserCore
          database={null}
          db={null}
          loading={false}
          error={null}
          onOpenClick={() => {}}
        />
      </UiLanguageProvider>,
    );

    expect(screen.getByRole('heading', { name: 'SQLiteブラウザー' })).toBeTruthy();
    expect(screen.getByText('データベースが選択されていません')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'データベースを開く' })).toHaveLength(2);
    expect(screen.getByText('「データベースを開く」をクリックしてSQLiteデータベースファイルを表示します')).toBeTruthy();
  });

  it('localizes query controls while keeping table identifiers intact', () => {
    const database: Database = {
      exec: () => [],
    } as unknown as Database;

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <SQLiteBrowserCore
          database={{ name: 'app.db', path: 'C:/work/app.db', tables: ['users'] }}
          db={database}
          loading={false}
          error={null}
        />
      </UiLanguageProvider>,
    );

    expect(screen.getByText('テーブル1件')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'クエリ' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'users' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'クエリ' }));

    expect(screen.getByPlaceholderText('SQLクエリを入力…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'クエリを実行' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '履歴（0）' }).getAttribute('title')).toBe('クエリ履歴はありません');
  });
});
