/** Combine the localized summary with useful provider diagnostics without exposing credential-shaped text. */
export function providerTestFailureMessage(label: string, error: unknown): string {
  const raw = typeof error === 'string'
    ? error
    : error instanceof Error
      ? error.message
      : '';
  if (!raw.trim()) return label;

  const detail = raw
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]+)\b/g, '[REDACTED_CREDENTIAL]')
    .replace(/([?&](?:access_token|refresh_token|api[_-]?key|token|secret|password)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/((?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[:=]\s*)([^\s,;]+)/gi, '$1[REDACTED]')
    .replace(/("(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)"\s*:\s*")[^"]*(")/gi, '$1[REDACTED]$2')
    .trim();

  return detail ? `${label} ${detail}` : label;
}
