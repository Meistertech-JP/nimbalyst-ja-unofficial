type Translator = (key: string, options?: Record<string, string>) => string;

/** Localize the fixed English clauses returned by the worktree resolver while
 * preserving branch and remote names as user-provided Git identifiers. */
export function localizeWorktreeFallbackReason(
  reason: string,
  t: Translator,
  keyPrefix: 'worktree_picker.fallback_reason' | 'project_worktrees.fallback_reason',
): string {
  const remoteReason = (value: string): string => {
    if (value === 'no remote to take a default branch from') return t(`${keyPrefix}.no_remote`);
    const match = value.match(/^(.+) has no fetched default branch$/);
    if (match) return t(`${keyPrefix}.remote_no_default`, { remote: match[1] });
    return value;
  };

  const local = reason.match(/^(.+); using local (.+)$/);
  if (local) return t(`${keyPrefix}.using_local`, { reason: remoteReason(local[1]), branch: local[2] });

  const current = reason.match(/^(.+) and no local main or master; using the current branch$/);
  if (current) return t(`${keyPrefix}.using_current`, { reason: remoteReason(current[1]) });

  const noCommits = reason.match(/^(.+) and the current branch has no commits$/);
  if (noCommits) return t(`${keyPrefix}.current_no_commits`, { reason: remoteReason(noCommits[1]) });

  return reason;
}
