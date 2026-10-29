import type { DomainGap } from './ontologyDomain';
/** Display provenance only; never rewrite the saved proposal request or user content. */
export type GapDisplay = Pick<DomainGap, 'title' | 'detail' | 'count' | 'displayTitle' | 'displayCopy'>;
type Translate = (key: string, options?: Record<string, string | number | undefined>) => string;
export declare function displayGap(gap: GapDisplay, language: string | undefined, translate: Translate): {
    title: string;
    detail: string;
};
export {};
