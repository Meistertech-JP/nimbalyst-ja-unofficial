import { getMainI18n } from '../i18n/mainI18n';

/** Preserve diagnostic details; translate only our own non-Error fallback. */
export function describeWorkspaceFileOpenError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(getMainI18n()?.t('operations.cannot_open_file', {
    ns: 'files',
    defaultValue: 'Cannot Open File',
  }) ?? 'Cannot Open File');
}
