interface PartialWriteNotice {
    start: number;
    executed: number;
    total: number;
}
export interface PartialWriteReason {
    reason?: string;
    nimbalystJaPartialWrites?: PartialWriteNotice[];
}
/** Keep the upstream reason text unchanged; annotate only the generated suffix. */
export declare function appendPartialWriteNotice(change: PartialWriteReason, executed: number, total: number): void;
/** Do not infer provenance for legacy text or alter saved/user-authored text. */
export declare function displayPartialWriteReason(change: PartialWriteReason, translate: (key: string, options: {
    executed: number;
    total: number;
}) => string): string;
export {};
