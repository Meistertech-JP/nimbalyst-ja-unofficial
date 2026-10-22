import { describe, expect, it } from 'vitest';
import { localizeDatabaseBrowserError } from '../databaseBrowserErrors';

describe('localizeDatabaseBrowserError', () => {
  const translate = (key: string) => ({
    'database.no_primary_key': '主キーがありません',
    'database.query_select_only': 'SELECTクエリのみ実行できます',
  }[key] ?? key);

  it('translates stable Database Browser error codes', () => {
    expect(localizeDatabaseBrowserError('database.no_primary_key', translate, 'fallback'))
      .toBe('主キーがありません');
    expect(localizeDatabaseBrowserError('database.query_select_only', translate, 'fallback'))
      .toBe('SELECTクエリのみ実行できます');
  });

  it('preserves technical errors and uses the localized fallback when absent', () => {
    expect(localizeDatabaseBrowserError('SQLITE_ERROR: malformed query', translate, 'fallback'))
      .toBe('SQLITE_ERROR: malformed query');
    expect(localizeDatabaseBrowserError(undefined, translate, 'fallback')).toBe('fallback');
  });
});
