import type { TFunction } from 'i18next';

/** Translate product-owned messages; retain unrecognized provider diagnostics. */
export function usageErrorDisplay(error: string, t: TFunction): string {
  const options = { ns: 'common', keyPrefix: '' };
  if (error.startsWith('No Claude Code credentials found for config dir ')
      && error.endsWith('. Please log in to Claude Code.')) {
    return t('usage_indicator.claude_credentials_missing', options);
  }
  if (error === 'No Codex usage data found. Use Codex CLI with a ChatGPT subscription to see usage.') {
    return t('usage_indicator.codex_data_missing', options);
  }
  if (error === 'Unknown error fetching usage'
      || error === 'Unknown error reading Codex session files'
      || error === 'Unknown error reading Gemini usage') {
    return t('usage_indicator.unknown_error', options);
  }
  return error;
}
