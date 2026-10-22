/**
 * How a folder promote is ordered, and how its outcome is described.
 *
 * Both are pure, and both are the parts most likely to be wrong in a way the
 * author cannot see: an ordering bug publishes a second copy of a document that
 * is already in the batch, and a summary bug lets a promote that dropped six
 * files read as "shared". Neither needs a collab scope to decide, so they live
 * here where a test can reach them without standing up a room.
 */

import type { FolderShareCandidate } from "./folderShareCandidates";
import type { TFunction } from "i18next";

export type FolderShareTranslator = TFunction<"collabSidebar">;

export function formatFolderShareFileWarnings(input: {
  linkedDocumentFailures: number;
  attachmentFailures: number;
  attachmentsUnavailable: boolean;
}, t: FolderShareTranslator): string[] {
  const warnings: string[] = [];
  if (input.linkedDocumentFailures > 0) {
    warnings.push(t("share_folder.notifications.linked_document_failure", { count: input.linkedDocumentFailures }));
  }
  if (input.attachmentFailures > 0) {
    warnings.push(t("share_folder.notifications.attachment_failure", { count: input.attachmentFailures }));
  } else if (input.attachmentsUnavailable) {
    warnings.push(t("share_folder.notifications.attachments_migration_unavailable"));
  }
  return warnings;
}

/**
 * Share the files that embed nothing in this batch first, so an embedder always
 * finds its target already published. Depth-first with a visiting set: a cycle
 * stops recursing and both files keep their input order, which costs one local
 * link rather than duplicating a document.
 */
export function orderCandidatesByEmbedDependency(
  candidates: readonly FolderShareCandidate[],
  dependenciesByRelativePath: ReadonlyMap<string, ReadonlySet<string>>
): FolderShareCandidate[] {
  const byRelativePath = new Map(
    candidates.map((candidate) => [candidate.relativePath, candidate])
  );
  const ordered: FolderShareCandidate[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();

  const visit = (relativePath: string): void => {
    if (done.has(relativePath) || visiting.has(relativePath)) return;
    const candidate = byRelativePath.get(relativePath);
    if (!candidate) return;
    visiting.add(relativePath);
    for (const dependency of dependenciesByRelativePath.get(relativePath) ?? []) {
      visit(dependency);
    }
    visiting.delete(relativePath);
    done.add(relativePath);
    ordered.push(candidate);
  };

  for (const candidate of candidates) visit(candidate.relativePath);
  return ordered;
}

type NotifyFn = (
  title: string,
  message: string,
  options?: { details?: string; duration?: number }
) => void;

/**
 * One notification for the whole promote. Exported so the wording of a partial
 * outcome -- the case an author is most likely to misread as "all of it worked"
 * -- can be asserted without a live collab scope.
 */
export function reportFolderShareOutcome(input: {
  t: FolderShareTranslator;
  folderName: string;
  sharedFolderPath: string;
  sharedCount: number;
  skippedCount: number;
  failures: ReadonlyArray<{ relativePath: string; error: string }>;
  warnings: readonly string[];
  skipped: ReadonlyArray<{ relativePath: string; reason: string }>;
  showError: NotifyFn;
  showWarning: NotifyFn;
  showInfo: NotifyFn;
}): void {
  const { t } = input;
  const details = [
    ...input.failures.map((failure) => `${failure.relativePath}: ${failure.error}`),
    ...input.skipped.map((file) => `${file.relativePath}: ${file.reason}`),
    ...input.warnings,
  ].join("\n");
  const destination = input.sharedFolderPath || t("share_folder.team_root");

  if (input.sharedCount === 0) {
    input.showError(
      t("share_folder.notifications.nothing_shared_title"),
      input.failures.length > 0
        ? t("share_folder.notifications.nothing_shared_failure_body", { folderName: input.folderName })
        : t("share_folder.notifications.nothing_shared_unsupported_body", { folderName: input.folderName }),
      { details: details || undefined, duration: 10000 }
    );
    return;
  }

  const documentCount = t("share_folder.document_count", { count: input.sharedCount });
  const leftovers: string[] = [];
  if (input.failures.length > 0) {
    leftovers.push(
      t("share_folder.notifications.failed_count", { count: input.failures.length })
    );
  }
  if (input.skippedCount > 0) {
    leftovers.push(
      t("share_folder.notifications.unsupported_count", { count: input.skippedCount })
    );
  }

  if (leftovers.length === 0 && input.warnings.length === 0) {
    input.showInfo(
      t("share_folder.notifications.folder_shared_title"),
      t("share_folder.notifications.folder_shared_body", { documentCount, folderName: input.folderName, destination }),
      { duration: 5000 }
    );
    return;
  }

  input.showWarning(
    t("share_folder.notifications.folder_shared_exceptions_title"),
    t("share_folder.notifications.folder_shared_exceptions_body", {
      documentCount,
      folderName: input.folderName,
      destination,
      leftovers: [...leftovers, ...input.warnings].join("; "),
    }),
    { details: details || undefined, duration: 10000 }
  );
}
