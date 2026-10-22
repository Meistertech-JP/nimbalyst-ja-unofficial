export type DatabaseBrowserErrorKey =
  | 'database.no_primary_key'
  | 'database.query_select_only';

export function localizeDatabaseBrowserError(
  error: string | undefined,
  t: (key: DatabaseBrowserErrorKey) => string,
  fallback: string,
): string {
  if (error === 'database.no_primary_key' || error === 'database.query_select_only') {
    return t(error);
  }
  return error || fallback;
}
