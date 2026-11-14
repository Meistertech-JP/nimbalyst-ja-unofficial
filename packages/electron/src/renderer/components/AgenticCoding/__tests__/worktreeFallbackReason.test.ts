import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { localizeWorktreeFallbackReason } from '../worktreeFallbackReason';

describe('localizeWorktreeFallbackReason', () => {
  it('localizes fixed fallback clauses and preserves remote and branch identifiers', async () => {
    const i18n = await createI18nInstance('ja');
    const agentsT = i18n.getFixedT('ja', 'agents');
    const t = (key: string, options?: Record<string, string>) => agentsT(key, options);

    const reason = localizeWorktreeFallbackReason(
      'upstream has no fetched default branch; using local main',
      t,
      'worktree_picker.fallback_reason',
    );

    expect(reason).toBe('upstreamから既定ブランチを取得できていません。ローカルのmainを使用します。');
  });

  it('keeps unknown backend reasons unchanged', () => {
    const reason = 'A future resolver reason';
    expect(localizeWorktreeFallbackReason(reason, (key) => key, 'project_worktrees.fallback_reason')).toBe(reason);
  });
});
