import React from 'react';
import type { TrackerMutationRejection } from '../trackers/index';
declare const REJECTION_TRANSLATION_KEYS: {
    readonly forbidden: "mutation_rejection.forbidden";
    readonly staleKeyEpoch: "mutation_rejection.stale_key_epoch";
    readonly rotationLocked: "mutation_rejection.rotation_locked";
    readonly custodyUnavailable: "mutation_rejection.custody_unavailable";
    readonly malformed: "mutation_rejection.malformed";
    readonly legacy_encryption_retired: "mutation_rejection.legacy_encryption_retired";
    readonly issueKeyPrefixConflict: "mutation_rejection.issue_key_prefix_conflict";
    readonly adminRequired: "mutation_rejection.admin_required";
    readonly schemaExists: "mutation_rejection.schema_exists";
    readonly serverError: "mutation_rejection.server_error";
};
export type TrackerMutationRejectionTranslationKey = typeof REJECTION_TRANSLATION_KEYS[TrackerMutationRejection['code']] | 'mutation_rejection.rollback_prefix' | 'mutation_rejection.fallback';
export declare function formatTrackerMutationRejection(rejection: TrackerMutationRejection, translate?: (key: TrackerMutationRejectionTranslationKey) => string): string;
export interface TrackerMutationRejectionNoticeProps {
    rejection: TrackerMutationRejection | null;
}
/** The visible counterpart to the engine's optimistic rollback. */
export declare function TrackerMutationRejectionNotice({ rejection }: TrackerMutationRejectionNoticeProps): React.JSX.Element | null;
export {};
