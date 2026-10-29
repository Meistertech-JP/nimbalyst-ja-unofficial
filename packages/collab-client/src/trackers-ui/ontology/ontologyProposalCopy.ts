/** Display-only descriptors; persisted request strings and write operations stay unchanged. */
export interface ProposalCopy {
  key: string;
  /** Original fragment when nested inside another descriptor, for missing resources. */
  fallback?: string;
  /** Ordered source-derived fragments, including literal separators and user strings. */
  parts?: Array<string | ProposalCopy>;
  values?: Record<string, string | number | ProposalCopy>;
}

export const proposalCopy = (key: string, values?: ProposalCopy['values']): ProposalCopy => ({ key, values });

export function displayProposalCopy(raw: string, copy: ProposalCopy | undefined, language: string | undefined,
  translate: (key: string, values: Record<string, string | number>) => string): string {
  if (!copy || language?.startsWith('en')) return raw;
  if (copy.parts) return copy.parts.map(part => typeof part === 'string' ? part : displayProposalCopy('', part, language, translate)).join('');
  return translate(`ontology_plan.${copy.key}`, {
    ...Object.fromEntries(Object.entries(copy.values ?? {}).map(([key, value]) => [key,
      typeof value === 'object' ? displayProposalCopy('', value, language, translate) : value,
    ])), defaultValue: copy.fallback ?? raw,
  });
}
