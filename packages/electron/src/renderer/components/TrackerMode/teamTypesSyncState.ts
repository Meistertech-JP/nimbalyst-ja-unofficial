/** When the "team types are not syncing" line shows. No imports beyond types, so it tests cheaply. */

import type { TrackerSyncConnectionState } from '../../store/atoms/trackerSync';

/** How long a lost connection is tolerated before it is called out; a reconnect usually lands well inside it. */
export const TEAM_TYPES_NOT_SYNCING_GRACE_MS = 5_000;

/**
 * True when this workspace's tracker sync has reported a state that pushes
 * nothing: no engine (`disconnected`) or a refused one (`error`). Connecting and
 * syncing are on their way; an unknown connection is not reported on.
 */
export function teamTypesAreNotSyncing(
  connection: TrackerSyncConnectionState | null,
  workspacePath: string | null | undefined,
  hasTeamTypes: boolean,
): boolean {
  if (!hasTeamTypes || !workspacePath || connection?.workspacePath !== workspacePath) return false;
  return connection.status === 'disconnected' || connection.status === 'error';
}

