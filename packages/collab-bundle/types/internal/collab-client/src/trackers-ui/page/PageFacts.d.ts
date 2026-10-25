/**
 * The read-only facts at the end of a page's type row (when it changed, its
 * key). Plain and typed pages show them in the same place, after the fields.
 */
import React from 'react';
interface PageTimeFormatOptions {
    t?: (key: string, options?: {
        count?: number;
    }) => string;
    locale?: string;
}
export interface PageFact {
    id: string;
    label?: string;
    value: string;
    title?: string;
}
export declare function relativePageTime(timestamp: number, now?: number, options?: PageTimeFormatOptions): string;
/** "Updated", then "Created" when known; timestamps in epoch milliseconds. */
export declare function pageTimeFacts(times: {
    updatedAt?: number | null;
    createdAt?: number | null;
}, now?: number, options?: PageTimeFormatOptions): PageFact[];
export declare const PageFacts: React.FC<{
    facts: readonly PageFact[];
}>;
export {};
