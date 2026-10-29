import type { DomainGap, GapCopy } from './ontologyDomain';

/** Display provenance only; never rewrite the saved proposal request or user content. */
export type GapDisplay = Pick<DomainGap, 'title' | 'detail' | 'count' | 'displayTitle' | 'displayCopy'>;
type Translate = (key: string, options?: Record<string, string | number | undefined>) => string;

export function displayGap(gap: GapDisplay, language: string | undefined, translate: Translate): { title: string; detail: string } {
  // Keep upstream English inflections and punctuation byte-for-byte.
  if (language?.startsWith('en')) return { title: gap.title, detail: gap.detail };
  const copyText = (copy: GapCopy): string => translate(`ontology_gap_copy.${copy.key}`, {
    ...Object.fromEntries(Object.entries(copy.values ?? {}).map(([key, value]) => [key,
      Array.isArray(value) ? value.map(copyText).join(translate('ontology_gap_copy.separator'))
        : typeof value === 'object' ? copyText(value) : value,
    ])), defaultValue: copy.english,
  });
  return {
    title: gap.displayCopy?.title ? copyText(gap.displayCopy.title) : gap.displayTitle
      ? translate(`ontology_gap_titles.${gap.displayTitle.key}_${gap.count === 1 ? 'one' : 'other'}`, { count: gap.count, days: gap.displayTitle.days, defaultValue: gap.title })
      : gap.title,
    detail: gap.displayCopy?.detail ? copyText(gap.displayCopy.detail) : gap.detail,
  };
}
