import path from 'node:path';

export function isSessionWorkspaceAllowed(
  session: { workspacePath?: string; worktreePath?: string; worktreeProjectPath?: string } | null | undefined,
  workspacePath: string,
): boolean {
  if (!session || !workspacePath) return false;
  const requestedWorkspace = path.resolve(workspacePath);
  return [session.workspacePath, session.worktreePath, session.worktreeProjectPath]
    .filter((candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0)
    .some((candidate) => path.resolve(candidate) === requestedWorkspace);
}

/**
 * Normalize a `session:file-diff` request path to the absolute form
 * `document_history.file_path` is keyed by.
 *
 * The sidebars send absolute paths, but the commit proposal widget sends the
 * workspace-relative paths `git:get-commit-context` produced. Matching a
 * relative path against the absolute key found nothing, so every proposal fell
 * back to "no session baseline" and lost its hunk pre-selection.
 *
 * Absolute paths pass through untouched -- a session may legitimately have
 * edited a file outside the workspace, and that has always been diffable here.
 * Returns null when a relative path cannot be safely rooted.
 */
export function resolveSessionDiffPath(
  workspacePath: string | undefined,
  filePath: string,
): string | null {
  if (!filePath) return null;
  if (path.isAbsolute(filePath)) return filePath;
  if (!workspacePath) return null;

  const root = path.resolve(workspacePath);
  const resolved = path.resolve(root, filePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}
