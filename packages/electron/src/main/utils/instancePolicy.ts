/** Only the explicit automation harness may bypass Electron's per-profile lock. */
export function allowsMultipleInstances(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.PLAYWRIGHT;
}
