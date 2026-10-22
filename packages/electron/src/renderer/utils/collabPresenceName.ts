import {
  collaboratorDisplayIdentity,
  collaboratorDisplayName,
} from '@nimbalyst/runtime/sync/collaboratorDisplayName';
import type { CollabDocumentConfig } from './collabDocumentOpener';

export interface CollabPresenceIdentity {
  name: string;
  nimbalystNameSource?: 'system-default';
}

/** The name this user's cursor and presence carry in a shared document; never the member id. */
export function collabPresenceName(config: Pick<CollabDocumentConfig, 'userName' | 'userEmail' | 'teamMemberId'>): string {
  return collaboratorDisplayName({ name: config.userName, email: config.userEmail, memberId: config.teamMemberId });
}

/** Resolve the wire-compatible name plus provenance for a generated fallback. */
export function collabPresenceIdentity(
  config: Pick<CollabDocumentConfig, 'userName' | 'userEmail' | 'teamMemberId'>,
): CollabPresenceIdentity {
  // Keep the existing wire name stable. UI consumers localize only when the
  // accompanying provenance marker says this value is generated.
  const identity = collaboratorDisplayIdentity({
    name: config.userName,
    email: config.userEmail,
    memberId: config.teamMemberId,
  });
  return {
    name: identity.name,
    ...(identity.isSystemDefaultName ? { nimbalystNameSource: 'system-default' } : {}),
  };
}
