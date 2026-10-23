import type { TFunction } from 'i18next';

interface DraftContext {
  workspacePath: string;
  worktreePath: string | null | undefined;
}

interface BranchDraftContext extends DraftContext {
  baseBranch: string;
  worktreeBranch: string;
  files: string[];
}

const fileList = (files: string[]) => files.map((file) => `  - ${file}`).join('\n');
// These are plain-text drafts. Preserve paths, branch names and server details
// byte-for-byte; HTML escaping would change the commands the user reviews.
const interpolation = { escapeValue: false };

export function buildBadGitStateDraft(
  t: TFunction<'git'>,
  input: DraftContext & { message: string; conflictedFiles?: string[] },
): string {
  const conflicts = input.conflictedFiles?.length
    ? t('resolution_drafts.conflicted_files', { files: fileList(input.conflictedFiles), interpolation })
    : '';
  return t('resolution_drafts.bad_state', {
    ...input, worktreePath: String(input.worktreePath), conflicts, interpolation,
  });
}

export function buildRebaseConflictDraft(
  t: TFunction<'git'>,
  input: BranchDraftContext & { commits?: { ours?: string[]; theirs?: string[] } },
): string {
  const commits = input.commits
    ? t('resolution_drafts.conflicting_commits', {
      ours: input.commits.ours?.length
        ? t('resolution_drafts.our_commits', { commits: fileList(input.commits.ours.slice(0, 5)), interpolation })
        : '',
      theirs: input.commits.theirs?.length
        ? t('resolution_drafts.incoming_commits', {
          baseBranch: input.baseBranch, commits: fileList(input.commits.theirs.slice(0, 5)), interpolation,
        })
        : '',
      interpolation,
    })
    : '';
  return t('resolution_drafts.rebase', {
    ...input, worktreePath: String(input.worktreePath), files: fileList(input.files), commits, interpolation,
  });
}

export function buildUntrackedFilesDraft(t: TFunction<'git'>, input: BranchDraftContext): string {
  return t('resolution_drafts.untracked', {
    ...input, worktreePath: String(input.worktreePath), files: fileList(input.files), interpolation,
  });
}

export function buildMergeConflictDraft(t: TFunction<'git'>, input: BranchDraftContext): string {
  return t('resolution_drafts.merge', {
    ...input, worktreePath: String(input.worktreePath), files: fileList(input.files),
    conflictFileNames: input.files.join(', '), interpolation,
  });
}
