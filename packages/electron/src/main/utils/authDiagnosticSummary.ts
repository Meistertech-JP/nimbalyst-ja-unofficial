export type DeepLinkDiagnosticSummary = { validUrl: false } | {
  validUrl: true;
  route: 'auth-callback' | 'other';
  queryParameterCount: number;
  hasFragment: boolean;
  hasUserInfo: boolean;
};

/** Log only fixed classifications and counts; any URL component may carry credentials. */
export function summarizeDeepLink(url: string): DeepLinkDiagnosticSummary {
  try {
    const parsed = new URL(url);
    return {
      validUrl: true,
      route: parsed.protocol === 'nimbalyst:' && parsed.host === 'auth' && parsed.pathname === '/callback'
        ? 'auth-callback' : 'other',
      queryParameterCount: parsed.searchParams.size,
      hasFragment: parsed.hash.length > 0,
      hasUserInfo: parsed.username.length > 0 || parsed.password.length > 0,
    };
  } catch {
    // URL parser errors can include the rejected input. Never log the error object.
    return { validUrl: false };
  }
}

/** Arguments may contain credentials as separate values, not just URL query params. */
export function summarizeStartupArguments(argv: readonly string[]): { argumentCount: number } {
  return { argumentCount: argv.length };
}

/** Projection for auth failures, identities, server responses and startup values. */
export function summarizeAuthDiagnostic(...details: readonly unknown[]): { detailCount: number } {
  // Do not inspect errors, response bodies, identity fields or their getters.
  return { detailCount: details.length };
}

const CALLBACK_REJECTION_REASONS = new Set([
  'not-loopback', 'missing-state', 'unknown-state', 'server-error',
  'missing-session-token', 'missing-org-id',
]);

export function summarizeAuthRejection(result: { reason: string; details?: unknown }): { reason: string } {
  return { reason: CALLBACK_REJECTION_REASONS.has(result.reason) ? result.reason : 'other' };
}
