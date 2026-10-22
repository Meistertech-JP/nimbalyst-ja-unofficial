import { describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { isSessionWorkspaceAllowed, resolveSessionDiffPath } from '../sessionFileScope';

describe('session-files:get-tool-call-diffs workspace scope', () => {
  const projectsRoot = path.join(os.tmpdir(), 'nimbalyst-session-file-scope', 'projects');
  const workspacePath = path.join(projectsRoot, 'main');
  const worktreePath = path.join(projectsRoot, 'worktrees', 'feature');
  const session = {
    workspacePath,
    worktreePath,
  };

  it('accepts the owning workspace and session worktree', () => {
    expect(isSessionWorkspaceAllowed(session, workspacePath)).toBe(true);
    expect(isSessionWorkspaceAllowed(session, worktreePath)).toBe(true);
  });

  it('rejects missing sessions and cross-workspace requests', () => {
    expect(isSessionWorkspaceAllowed(null, workspacePath)).toBe(false);
    expect(isSessionWorkspaceAllowed(session, path.join(projectsRoot, 'other'))).toBe(false);
  });
});

describe('session:file-diff path resolution', () => {
  const workspacePath = path.join(os.tmpdir(), 'nimbalyst-session-file-scope', 'projects', 'main');

  // The commit proposal widget is the one caller that sends workspace-relative
  // paths (git:get-commit-context returns them relative). document_history is
  // keyed absolute, so an unresolved relative path matches zero snapshot rows
  // and the widget silently loses its hunk pre-selection.
  it('resolves a workspace-relative path against the workspace', () => {
    expect(resolveSessionDiffPath(workspacePath, 'packages/electron/package.json'))
      .toBe(path.join(workspacePath, 'packages', 'electron', 'package.json'));
  });

  // Absolute paths are the pre-existing contract for the two sidebar callers,
  // including sessions that edited a file outside the workspace, so they pass
  // through untouched rather than being newly subjected to containment.
  it('passes an already-absolute path through unchanged', () => {
    const insidePath = path.join(workspacePath, 'src', 'index.ts');
    const outsidePath = path.join(path.parse(workspacePath).root, 'elsewhere', 'notes.md');
    expect(resolveSessionDiffPath(workspacePath, insidePath)).toBe(insidePath);
    expect(resolveSessionDiffPath(workspacePath, outsidePath)).toBe(outsidePath);
  });

  it('refuses a relative path that escapes the workspace', () => {
    expect(resolveSessionDiffPath(workspacePath, path.join('..', 'other', 'secrets.env'))).toBeNull();
  });

  it('returns null when a relative path has no workspace to resolve against', () => {
    expect(resolveSessionDiffPath('', 'packages/electron/package.json')).toBeNull();
  });
});
