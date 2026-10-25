import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const old = '583ae0244dae266667be579733d6c571fd74e037';
const upstream = '84dcc00f3cd0abbb36eafc6bfad9389f960076db';
const release = 'b0432ce85977040461bf026aff063059bf6ffd1e';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const output = 'tmp/r15-evidence';
mkdirSync(output, { recursive: true });
const names = git('diff', '--name-status', old, upstream).trim().split('\n').map(row => {
  const [status, file] = row.split('\t');
  return { status, file };
});
const currentChanged = new Set(git('diff', '--name-only', old, release).trim().split('\n'));
function classify(file) {
  const categories = [];
  if (/(__tests__|\.test\.|\.spec\.|\/e2e\/)/.test(file)) categories.push('Tests');
  if (file.startsWith('docs/') || file === 'CHANGELOG.md' || file.endsWith('.md')) categories.push('Documentation');
  if (file.startsWith('packages/electron/src/main/')) categories.push('Electron Main');
  if (file.startsWith('packages/electron/src/renderer/')) categories.push('Electron Renderer');
  if (file.includes('/preload/')) categories.push('Preload');
  if (/codex|ShellFileAttribution|ToolCallMatcher|agentToolActivity|\/ai\/|UnifiedAI/.test(file)) categories.push('AI / Codex');
  if (/session|Session|[Tt]ranscript/.test(file)) categories.push('Sessions');
  if (/wiki/i.test(file)) categories.push('Wiki');
  if (/[Tt]racker/.test(file)) categories.push('Tracker');
  if (/database|Migration|schemas\//.test(file)) categories.push('Database / migration');
  if (/Recovery|recovery|Custody|IDENTITY_AUTH/.test(file)) categories.push('Authentication / encryption / teams');
  if (/windowsClipboard|systemShell|clipboard|Paste|paste/.test(file)) categories.push('Windows / WSL');
  if (file.startsWith('packages/ios/')) categories.push('iOS');
  if (file.startsWith('packages/android/')) categories.push('Android');
  if (/package\.json|pnpm|^patches\/|\.d\.ts$|scripts\//.test(file)) categories.push('Build / dependencies');
  return categories.length ? categories : ['Shared runtime'];
}
const rows = names.map(row => ({ ...row, categories: classify(row.file), japaneseEditionOverlap: currentChanged.has(row.file), upstreamDiffSHA256: createHash('sha256').update(git('diff', '--no-ext-diff', old, upstream, '--', row.file)).digest('hex') }));
const result = { release, releaseTree: git('rev-parse', `${release}^{tree}`).trim(), old, upstream, commits: Number(git('rev-list', '--count', `${old}..${upstream}`)), changedFiles: rows.length, files: rows };
writeFileSync(`${output}/UPSTREAM_INVENTORY.json`, JSON.stringify(result, null, 2) + '\n');
writeFileSync(`${output}/upstream.diff`, git('diff', '--no-ext-diff', old, upstream));
writeFileSync(`${output}/upstream-commits.txt`, git('log', '--format=%H %s', `${old}..${upstream}`));
function impact(file) {
  if (file.includes('TeamRecovery') || file.includes('teamRecovery') || file.includes('LegacyRecovery') || file.includes('LegacyKeyFile')) return '組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。';
  if (/MigrationRunner|0055_|database\/worker|TrackerPGLiteStore|trackerPersistence|trackerProtocol|TrackerSyncEngine|teamTracker/.test(file)) return 'base_sync_id / expectedSyncId と recoveryConflict を保持。旧キューによる復旧済みデータの巻戻しを防ぐ。SQLite/PGLite双方の保持・再起動・マイグレーションを検証。';
  if (/TrackerMutationRejection|TrackerSyncRejection|trackerSync/.test(file)) return 'recoveryConflictを永続的に通知。既存i18nへ新コードを接続し「巻戻し」と誤表示しない。';
  if (/SecurityEncryptionSection/.test(file)) return '不明状態を未移行と断定しない。組織変更時の古い応答を無効化。復旧UIと既存翻訳を両立。';
  if (/performanceMonitor|cpuProfileRetention/.test(file)) return '自動CPU profileを7日・100件・100MiBで整理。60秒以内の書込みとユーザー命名ファイルを保護。既存fileLoggingのfail-closedを維持。';
  if (/Paste|paste|clipboard|Clipboard|AIInput/.test(file)) return 'WSL画像取得と非同期貼付け。Undo・セッション変更後の遅延応答を破棄し現在の入力を保持。Clipboard image表示を翻訳。';
  if (/Shell|shell|ToolCallMatcher|agentToolActivity|AgentToolHooks|ClaudeCodeProvider/.test(file)) return '並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。';
  if (/sessionHierarchy|MetaAgent|metaAgent/.test(file)) return '階層移動で管理者を新規任命せずメッセージも送信しない。既存managerの祖先関係のみ保持。';
  if (/Transcript|transcript|CodexRawParser|processDescriptor|reconcileCodex|ImageSource|ImageHeight|VisualDisplay|Screenshot|GitCommit/.test(file)) return 'Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。';
  if (/ProjectRail|openProjects|WindowManager|WorkspaceManagerWindow|WindowHandlers|main\/types/.test(file)) return '新規ウィンドウの明示プロジェクトを前回復元より優先。既存設定を上書きしない。';
  if (/renderer-supervisor|renderer-dev-server|dev-loop/.test(file)) return 'Vite子プロセスだけを監督しクラッシュ・応答停止から復旧。製品版でdev serverやCDPを起動しない。';
  if (/react-dom.*patch|pnpm/.test(file)) return 'React Performance Trackの診断のみを保護するpatchと参照hashを保持。日本語版依存も残しfrozen-lockfileで解決確認。';
  if (/wiki|CommandFileParser/.test(file)) return 'Wiki skillのYAML description引用符と不正metadataの簡潔な警告を保持。ユーザー作成本文は自動翻訳しない。';
  if (/package.json/.test(file)) return '本家0.82.3と非公式候補0.82.3-ja.1を区別し、appId・署名・手動更新方針を維持。';
  if (/preload|electron\.d\.ts|shared\//.test(file)) return '新IPCの型と引数を保持。復旧パスフレーズは指定操作だけに送信し機密内容をRendererへ返さない。';
  if (file.includes('validation-inventory')) return '新renderer supervisorテストを必須検査へ追加した本家の構成を保持。';
  if (/launch-new-session/.test(file)) return '本家のセッション作成モード指示を保持。既存の表示説明とエージェントへの指示を区別。';
  if (file.endsWith('.md')) return '本家の更新説明を保持。公開main/Wikiを変更せず次期版向け日英原稿へ反映。';
  if (/\.d\.ts$/.test(file)) return '生成型宣言の新APIを保持し対応ソースから再生成・型検査。';
  if (/__tests__|\.spec\./.test(file)) return '本家の回帰テストを保持し統合後に実行。テスト用固定英語とユーザー表示を区別。';
  return '新しい本家実装を保持。既存日本語版の変更と統合後の型・実行テストで検証。';
}
const categories = ['Electron Main', 'Electron Renderer', 'Preload', 'AI / Codex', 'Sessions', 'Wiki', 'Tracker', 'Database / migration', 'Authentication / encryption / teams', 'Windows / WSL', 'iOS', 'Android', 'Build / dependencies', 'Tests', 'Documentation'];
const report = [
  '# R15 upstream差分監査', '',
  `固定upstream: \`${upstream}\`。比較元: \`${old}\`。日本語版基準: \`${release}\`。`, '',
  `Git実測: ${result.commits}コミット、${rows.length}ファイル。日本語版既存変更との重複: ${rows.filter(row => row.japaneseEditionOverlap).length}ファイル。予備merge-tree: 10競合ファイル（作業ツリー未統合時に検出）。`, '',
  'この文書は取り込み前の影響監査。動的検証のPASSを意味しない。全ファイルの完全diff・SHA-256・状態はtmp/r15-evidence/UPSTREAM_INVENTORY.jsonとupstream.diffに保存。', '',
  '## 分類（複数分類可）', '',
  ...categories.map(category => `- ${category}: ${rows.filter(row => row.categories.includes(category)).length}ファイル`), '',
  'iOS / Androidの直接変更は0。共有protocol・Tracker・Runtime変更の影響はLinux/macOS CIとWindows製品版で別途検証する。設定のuiLanguage保存方式・localhost認証プロトコルの直接変更はない。SQLiteは0055、PGLiteはbase_sync_idの冪等追加。チーム復旧には対応同期サーバーが必要で、本番組織で試験しない。', '',
  '## ファイル別の影響と検証対象', '',
  '| 状態 | ファイル | 分類 | 日本語版差分との重複 | 影響・検証 |',
  '|---|---|---|---|---|',
  ...rows.map(row => `| ${row.status} | \`${row.file}\` | ${row.categories.join(', ')} | ${row.japaneseEditionOverlap ? 'あり' : 'なし'} | ${impact(row.file)} |`), '',
  '## 清掃・保全方針', '',
  '作業先はR15専用worktree。R14現行環境・公開配布物・197件の保全証拠とGit履歴は変更しない。R15の生成物・Temp・専用プロファイルはFドライブへ集約する。最終候補・根拠ログ・ハッシュは残し、中間ビルドと重複展開を最終照合後に削除する。実ユーザー設定・認証情報は対象外。', '',
];
writeFileSync('R15_UPSTREAM_DIFF_AUDIT.md', report.join('\n'));
console.log(JSON.stringify({ commits: result.commits, changedFiles: rows.length, japaneseEditionOverlap: rows.filter(row => row.japaneseEditionOverlap).length, source: output }));
