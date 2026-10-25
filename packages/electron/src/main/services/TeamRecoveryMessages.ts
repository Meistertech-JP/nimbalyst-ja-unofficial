import { getMainI18n } from '../i18n/mainI18n';

/** Local recovery copy only. Server responses, identifiers and source content stay unchanged. */
export function recoveryText(key: string, fallback: string, values?: Record<string, string | number>): string {
  return String(getMainI18n()?.t(key, { ns: 'orgSharing', defaultValue: fallback, ...values }) ?? fallback);
}

export function recoveryError(key: string, fallback: string, values?: Record<string, string | number>): Error {
  return new Error(recoveryText(key, fallback, values));
}
