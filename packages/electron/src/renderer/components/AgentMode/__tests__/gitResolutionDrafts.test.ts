// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import {
  buildBadGitStateDraft,
  buildRebaseConflictDraft,
  buildUntrackedFilesDraft,
  buildMergeConflictDraft,
} from '../gitResolutionDrafts';

const context = {
  workspacePath: 'F:\\Work & <demo>\\本体',
  worktreePath: 'F:\\Work & <demo>\\作業',
  baseBranch: 'release/local',
  worktreeBranch: 'worktree/review',
  files: ['src/A & B.ts', '日本語/<literal>.md'],
};
const message = 'server: <error> & detail';
const commits = {
  ours: Array.from({ length: 6 }, (_, index) => `ours-${index + 1}`),
  theirs: Array.from({ length: 6 }, (_, index) => `incoming-${index + 1}`),
};

// SHA-256 of the original, pre-localization inline templates evaluated with
// these inputs. Protect every English byte, including blank lines and commands.
const original = {
  badFull: '61857ea2889ba8f2b2f85a3bf05938337d440ab73d32fbc7be5afcbce5d946f4',
  badEmpty: '8e2c87781fc639b9748995b72d5fad43acac4afc28748650cfa8611794cbca6e',
  rebaseFull: 'a09d4105c0094cd0602efc305ee09dc19438b841a463ea929bd7b5a9b1a9b35d',
  rebaseEmpty: '90da61df2909183cdee210940d762d4dfd7dc1bdad00f4888bff959b17909077',
  rebaseAbsent: '032578650cbf364afb663c149f63d5aad030c8d9816b58b7dddb96db91c6caea',
  untracked: '5b1fa1447d0020e0181afaf9e1b539e4d3ab8423383bd946f57339040581d821',
  merge: '543592c13598334db0ea72ef3075f15095a6c433ec7987e221f35976764f7e1a',
};
const hash = (text: string) => createHash('sha256').update(text).digest('hex');

describe('localized Git resolution drafts', () => {
  it('preserves all original English drafts including optional sections byte-for-byte', async () => {
    const i18n = await createI18nInstance('en');
    const t = i18n.getFixedT('en', 'git');
    expect(hash(buildBadGitStateDraft(t, { ...context, message, conflictedFiles: context.files }))).toBe(original.badFull);
    expect(hash(buildBadGitStateDraft(t, { ...context, message, conflictedFiles: [] }))).toBe(original.badEmpty);
    expect(hash(buildBadGitStateDraft(t, { ...context, message }))).toBe(original.badEmpty);
    expect(hash(buildRebaseConflictDraft(t, { ...context, commits }))).toBe(original.rebaseFull);
    expect(hash(buildRebaseConflictDraft(t, { ...context, commits: { ours: [], theirs: [] } }))).toBe(original.rebaseEmpty);
    expect(hash(buildRebaseConflictDraft(t, context))).toBe(original.rebaseAbsent);
    expect(hash(buildUntrackedFilesDraft(t, context))).toBe(original.untracked);
    expect(hash(buildMergeConflictDraft(t, context))).toBe(original.merge);
  });

  it.each([
    ['bad state', buildBadGitStateDraft, { ...context, message, conflictedFiles: context.files }, '解決が必要なGitの問題'],
    ['rebase', buildRebaseConflictDraft, { ...context, commits }, '最新の変更にリベース'],
    ['untracked', buildUntrackedFilesDraft, context, '未追跡ファイルがリベースを妨げています'],
    ['merge', buildMergeConflictDraft, context, 'コミット済みと未コミットの両方の変更を保持'],
  ] as const)('uses the current locale for a new %s draft without changing commands or paths', async (_name, build, input, japaneseText) => {
    const i18n = await createI18nInstance('en');
    // Shared superset input accommodates all four builder contracts.
    const values = { ...input, message };
    const english = build(i18n.getFixedT(null, 'git'), values);
    await i18n.changeLanguage('ja');
    const japanese = build(i18n.getFixedT(null, 'git'), values);
    expect(japanese).toContain(japaneseText);
    for (const literal of [context.workspacePath, context.worktreePath, ...context.files]) {
      expect(japanese).toContain(literal);
    }
    // Includes fenced blocks and inline commands/conflict markers in order.
    const code = (text: string) => text.match(/```[\s\S]*?```|`[^`\n]+`/g) ?? [];
    expect(code(japanese)).toEqual(code(english));
    expect(japanese).not.toContain('&lt;');
    expect(japanese).not.toContain('&amp;');
    await i18n.changeLanguage('en');
    expect(build(i18n.getFixedT(null, 'git'), values)).toBe(english);
  });

  it('preserves local rebase intent, stash identity checks and the five-commit cap in Japanese', async () => {
    const i18n = await createI18nInstance('ja');
    const draft = buildRebaseConflictDraft(i18n.getFixedT('ja', 'git'), { ...context, commits });
    expect(draft).toContain('ローカルのrelease/localブランチ');
    expect(draft).toContain('origin/release/localではありません');
    expect(draft).toContain('このワークツリーの名前を含むスタッシュメッセージ');
    expect(draft).toContain('git stash pop stash@{N}');
    expect(draft).toContain('作業側のコミット:\n  - ours-1');
    expect(draft).toContain('release/localから取り込むコミット:\n  - incoming-1');
    expect(draft).toContain('ours-5');
    expect(draft).toContain('incoming-5');
    expect(draft).not.toContain('ours-6');
    expect(draft).not.toContain('incoming-6');
  });

  it('preserves unstaged merge intent and the untracked-file review-before-action request in Japanese', async () => {
    const i18n = await createI18nInstance('ja');
    const t = i18n.getFixedT('ja', 'git');
    expect(buildMergeConflictDraft(t, context)).toContain('ステージしたりコミットしたりしないでください');
    expect(buildMergeConflictDraft(t, context)).toContain('未ステージのまま');
    expect(buildUntrackedFilesDraft(t, context)).toContain('操作する前に、これらのファイルを分析して最善の対応を提案してください');
    const detail = 'literal {{workspacePath}} $t(commit) <tag> & server error';
    expect(buildBadGitStateDraft(t, { ...context, message: detail })).toContain(detail);
  });
});
