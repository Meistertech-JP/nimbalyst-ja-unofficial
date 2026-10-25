import React from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { TrackerMutationRejection } from '@nimbalyst/collab-client/trackers';

const REJECTION_TRANSLATION_KEYS = {
  recoveryConflict: 'mutation_rejection.recovery_conflict',
  forbidden: 'mutation_rejection.forbidden',
  staleKeyEpoch: 'mutation_rejection.stale_key_epoch',
  rotationLocked: 'mutation_rejection.rotation_locked',
  custodyUnavailable: 'mutation_rejection.custody_unavailable',
  malformed: 'mutation_rejection.malformed',
  legacy_encryption_retired: 'mutation_rejection.legacy_encryption_retired',
  issueKeyPrefixConflict: 'mutation_rejection.issue_key_prefix_conflict',
  adminRequired: 'mutation_rejection.admin_required',
  schemaExists: 'mutation_rejection.schema_exists',
  serverError: 'mutation_rejection.server_error',
} as const satisfies Record<TrackerMutationRejection['code'], string>;

export type TrackerMutationRejectionTranslationKey =
  | typeof REJECTION_TRANSLATION_KEYS[TrackerMutationRejection['code']]
  | 'mutation_rejection.rollback_prefix'
  | 'mutation_rejection.retained_prefix'
  | 'mutation_rejection.fallback';

const REJECTION_EXPLANATIONS: Record<TrackerMutationRejection['code'], string> = {
  recoveryConflict: 'An older queued edit needs review against the recovered item.',
  forbidden: 'Your permission no longer allows this change.',
  staleKeyEpoch: 'The tracker encryption state changed before the server could accept this change.',
  rotationLocked: 'The tracker is temporarily locked while its encryption state changes.',
  custodyUnavailable: 'The team encryption service is unavailable for this tracker.',
  malformed: 'The server could not accept the submitted tracker data.',
  legacy_encryption_retired: 'This team must be migrated before tracker changes can be accepted.',
  issueKeyPrefixConflict: 'The tracker key prefix conflicts with another project in this team.',
  adminRequired: 'This change requires a team administrator.',
  schemaExists: 'Someone else already created a type with this name.',
  serverError: 'The server hit an error and saved nothing. Try the change again.',
};

export function formatTrackerMutationRejection(
  rejection: TrackerMutationRejection,
  translate?: (key: TrackerMutationRejectionTranslationKey) => string,
): string {
  const explanation = translate
    ? translate(REJECTION_TRANSLATION_KEYS[rejection.code])
    : REJECTION_EXPLANATIONS[rejection.code] ?? 'The server refused this change.';
  const detail = rejection.message?.trim();
  const outcome = translate
    ? translate(rejection.code === 'recoveryConflict' ? 'mutation_rejection.retained_prefix' : 'mutation_rejection.rollback_prefix')
    : rejection.code === 'recoveryConflict' ? 'Queued edit retained for review.' : 'Change rolled back.';
  return `${outcome} ${explanation}${detail ? ` ${detail}` : ''}`;
}

export interface TrackerMutationRejectionNoticeProps {
  rejection: TrackerMutationRejection | null;
}

/** The visible counterpart to the engine's optimistic rollback. */
export function TrackerMutationRejectionNotice({ rejection }: TrackerMutationRejectionNoticeProps) {
  const { t } = useTranslation('tracker');
  if (!rejection) return null;
  return (
    <div
      className="tracker-mutation-rejection flex items-start gap-2 border-b border-nim-error bg-[color-mix(in_srgb,var(--nim-error)_10%,transparent)] px-3 py-2 text-xs text-nim-error"
      data-rejection-code={rejection.code}
      data-item-id={rejection.itemId}
      role="alert"
    >
      <strong className="shrink-0">{t('mutation_rejection.title')}</strong>
      <span>{formatTrackerMutationRejection(rejection, t)}</span>
    </div>
  );
}
