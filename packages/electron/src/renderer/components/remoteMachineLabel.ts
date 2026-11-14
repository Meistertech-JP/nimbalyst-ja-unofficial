/** Label for the local entry in the machine picker, localized by the caller. */
export function localMachineLabel(
  name: string | null | undefined,
  labels: { fallback: string; named: (name: string) => string },
): string {
  const trimmed = name?.trim();
  return trimmed ? labels.named(trimmed) : labels.fallback;
}
