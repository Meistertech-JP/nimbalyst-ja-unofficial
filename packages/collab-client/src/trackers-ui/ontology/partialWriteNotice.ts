interface PartialWriteNotice {
  start: number;
  executed: number;
  total: number;
}

export interface PartialWriteReason {
  reason?: string;
  nimbalystJaPartialWrites?: PartialWriteNotice[];
}

function canonicalNotice(executed: number, total: number): string {
  return `Partly applied (${executed} of ${total} writes) before an error; undo reverses what ran.`;
}

/** Keep the upstream reason text unchanged; annotate only the generated suffix. */
export function appendPartialWriteNotice(change: PartialWriteReason, executed: number, total: number): void {
  const prefix = change.reason ? `${change.reason}\n` : '';
  change.reason = prefix + canonicalNotice(executed, total);
  if (change.nimbalystJaPartialWrites === undefined || Array.isArray(change.nimbalystJaPartialWrites)) {
    change.nimbalystJaPartialWrites = [...(change.nimbalystJaPartialWrites ?? []), { start: prefix.length, executed, total }];
  }
}

/** Do not infer provenance for legacy text or alter saved/user-authored text. */
export function displayPartialWriteReason(
  change: PartialWriteReason,
  translate: (key: string, options: { executed: number; total: number }) => string,
): string {
  const reason = change.reason ?? '';
  const notices = change.nimbalystJaPartialWrites;
  if (!Array.isArray(notices) || notices.length === 0) return reason;
  let end = 0;
  let result = '';
  for (const notice of notices) {
    if (!notice || !Number.isSafeInteger(notice.start) || !Number.isSafeInteger(notice.executed) || !Number.isSafeInteger(notice.total)
      || notice.start < end || notice.executed < 1 || notice.executed >= notice.total) return reason;
    const expected = canonicalNotice(notice.executed, notice.total);
    if (reason.slice(notice.start, notice.start + expected.length) !== expected) return reason;
    result += reason.slice(end, notice.start) + translate('ontology_proposals.partial_write_notice', { executed: notice.executed, total: notice.total });
    end = notice.start + expected.length;
  }
  return end === reason.length ? result : reason;
}
