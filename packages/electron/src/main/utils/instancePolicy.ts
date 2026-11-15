import path from 'node:path';

/** Only the explicit automation harness may bypass Electron's per-profile lock. */
export function allowsMultipleInstances(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.PLAYWRIGHT;
}

export function startupInstanceContext(argv: string[], profile?: string) {
  return { version: 1, profile: profile ?? null, argv: [...argv] };
}

/** Electron can reorder native switches separately from their positional values. */
export function forwardedStartupArgv(nativeArgv: string[], data: unknown, profile?: string): string[] {
  if (data && typeof data === 'object') {
    const context = data as Record<string, unknown>;
    const sameProfile = profile
      ? typeof context.profile === 'string' && path.relative(profile, context.profile) === ''
      : context.profile === null;
    if (context.version === 1 && sameProfile && Array.isArray(context.argv) &&
        context.argv.length > 0 && context.argv.every(arg => typeof arg === 'string')) {
      return [...context.argv];
    }
  }
  // An isolated instance must not guess a path from malformed/legacy native argv.
  return profile ? [] : nativeArgv;
}
