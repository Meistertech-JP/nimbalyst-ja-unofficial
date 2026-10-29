/** Display-only descriptors; persisted request strings and write operations stay unchanged. */
export interface ProposalCopy {
    key: string;
    /** Original fragment when nested inside another descriptor, for missing resources. */
    fallback?: string;
    /** Ordered source-derived fragments, including literal separators and user strings. */
    parts?: Array<string | ProposalCopy>;
    values?: Record<string, string | number | ProposalCopy>;
}
export declare const proposalCopy: (key: string, values?: ProposalCopy["values"]) => ProposalCopy;
export declare function displayProposalCopy(raw: string, copy: ProposalCopy | undefined, language: string | undefined, translate: (key: string, values: Record<string, string | number>) => string): string;
