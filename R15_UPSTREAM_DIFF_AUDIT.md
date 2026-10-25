# R15 upstream差分監査

固定upstream: `84dcc00f3cd0abbb36eafc6bfad9389f960076db`。比較元: `583ae0244dae266667be579733d6c571fd74e037`。日本語版基準: `b0432ce85977040461bf026aff063059bf6ffd1e`。

Git実測: 17コミット、144ファイル。日本語版既存変更との重複: 24ファイル。予備merge-tree: 10競合ファイル（作業ツリー未統合時に検出）。

この文書は取り込み前の影響監査。動的検証のPASSを意味しない。全ファイルの完全diff・SHA-256・状態はtmp/r15-evidence/UPSTREAM_INVENTORY.jsonとupstream.diffに保存。

## 分類（複数分類可）

- Electron Main: 61ファイル
- Electron Renderer: 24ファイル
- Preload: 1ファイル
- AI / Codex: 26ファイル
- Sessions: 24ファイル
- Wiki: 2ファイル
- Tracker: 16ファイル
- Database / migration: 4ファイル
- Authentication / encryption / teams: 23ファイル
- Windows / WSL: 9ファイル
- iOS: 0ファイル
- Android: 0ファイル
- Build / dependencies: 12ファイル
- Tests: 53ファイル
- Documentation: 10ファイル

iOS / Androidの直接変更は0。共有protocol・Tracker・Runtime変更の影響はLinux/macOS CIとWindows製品版で別途検証する。設定のuiLanguage保存方式・localhost認証プロトコルの直接変更はない。SQLiteは0055、PGLiteはbase_sync_idの冪等追加。チーム復旧には対応同期サーバーが必要で、本番組織で試験しない。

## ファイル別の影響と検証対象

| 状態 | ファイル | 分類 | 日本語版差分との重複 | 影響・検証 |
|---|---|---|---|---|
| M | `CHANGELOG.md` | Documentation | あり | 本家の更新説明を保持。公開main/Wikiを変更せず次期版向け日英原稿へ反映。 |
| M | `docs/CODEX_SHELL_TRACKING.md` | Documentation | なし | 本家の更新説明を保持。公開main/Wikiを変更せず次期版向け日英原稿へ反映。 |
| M | `docs/FEATURE_INVENTORY.md` | Documentation | あり | 本家の更新説明を保持。公開main/Wikiを変更せず次期版向け日英原稿へ反映。 |
| M | `docs/IDENTITY_AUTH_AND_ROOMS.md` | Documentation, Authentication / encryption / teams | なし | 本家の更新説明を保持。公開main/Wikiを変更せず次期版向け日英原稿へ反映。 |
| A | `docs/LEGACY_ORG_RECOVERY.md` | Documentation | なし | 本家の更新説明を保持。公開main/Wikiを変更せず次期版向け日英原稿へ反映。 |
| M | `docs/SESSION_HIERARCHY.md` | Documentation | なし | 本家の更新説明を保持。公開main/Wikiを変更せず次期版向け日英原稿へ反映。 |
| M | `docs/TRACKER_SCHEMA_SHARING.md` | Documentation | なし | 本家の更新説明を保持。公開main/Wikiを変更せず次期版向け日英原稿へ反映。 |
| M | `packages/collab-bundle/types/internal/runtime/src/utils/clipboard.d.ts` | Windows / WSL, Build / dependencies | なし | WSL画像取得と非同期貼付け。Undo・セッション変更後の遅延応答を破棄し現在の入力を保持。Clipboard image表示を翻訳。 |
| M | `packages/collab-bundle/types/internal/tracker-engine/src/trackerProtocol.d.ts` | Tracker, Build / dependencies | なし | base_sync_id / expectedSyncId と recoveryConflict を保持。旧キューによる復旧済みデータの巻戻しを防ぐ。SQLite/PGLite双方の保持・再起動・マイグレーションを検証。 |
| M | `packages/collab-client/src/trackers-ui/TrackerMutationRejectionNotice.tsx` | Tracker | あり | recoveryConflictを永続的に通知。既存i18nへ新コードを接続し「巻戻し」と誤表示しない。 |
| A | `packages/collab-protocol/src/__tests__/teamRecovery.test.ts` | Tests, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| M | `packages/collab-protocol/src/index.ts` | Shared runtime | なし | 新しい本家実装を保持。既存日本語版の変更と統合後の型・実行テストで検証。 |
| A | `packages/collab-protocol/src/teamRecovery.ts` | Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| M | `packages/collab-protocol/src/teamTracker.ts` | Tracker | なし | base_sync_id / expectedSyncId と recoveryConflict を保持。旧キューによる復旧済みデータの巻戻しを防ぐ。SQLite/PGLite双方の保持・再起動・マイグレーションを検証。 |
| M | `packages/electron/e2e/ai/ai-input-attachments.spec.ts` | Tests, AI / Codex | なし | 本家の回帰テストを保持し統合後に実行。テスト用固定英語とユーザー表示を区別。 |
| M | `packages/electron/e2e/ai/codex-shell-attribution.spec.ts` | Tests, AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| A | `packages/electron/e2e/multi-project/project-rail-new-window.spec.ts` | Tests | なし | 本家の回帰テストを保持し統合後に実行。テスト用固定英語とユーザー表示を区別。 |
| A | `packages/electron/e2e/react/performance-track-iframe.spec.ts` | Tests | なし | 本家の回帰テストを保持し統合後に実行。テスト用固定英語とユーザー表示を区別。 |
| M | `packages/electron/package.json` | Build / dependencies | あり | 本家0.82.3と非公式候補0.82.3-ja.1を区別し、appId・署名・手動更新方針を維持。 |
| M | `packages/electron/resources/codex-shell-hook.cjs` | AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| A | `packages/electron/scripts/__tests__/renderer-supervisor.test.mjs` | Tests, Build / dependencies | なし | Vite子プロセスだけを監督しクラッシュ・応答停止から復旧。製品版でdev serverやCDPを起動しない。 |
| M | `packages/electron/scripts/dev-loop.sh` | Build / dependencies | なし | Vite子プロセスだけを監督しクラッシュ・応答停止から復旧。製品版でdev serverやCDPを起動しない。 |
| M | `packages/electron/scripts/renderer-dev-server.mjs` | Build / dependencies | なし | Vite子プロセスだけを監督しクラッシュ・応答停止から復旧。製品版でdev serverやCDPを起動しない。 |
| A | `packages/electron/scripts/renderer-supervisor.mjs` | Build / dependencies | なし | Vite子プロセスだけを監督しクラッシュ・応答停止から復旧。製品版でdev serverやCDPを起動しない。 |
| M | `packages/electron/src/main/database/sqlite/MigrationRunner.ts` | Electron Main, Database / migration | なし | base_sync_id / expectedSyncId と recoveryConflict を保持。旧キューによる復旧済みデータの巻戻しを防ぐ。SQLite/PGLite双方の保持・再起動・マイグレーションを検証。 |
| M | `packages/electron/src/main/database/sqlite/__tests__/MigrationRunner.test.ts` | Tests, Electron Main, Database / migration | なし | base_sync_id / expectedSyncId と recoveryConflict を保持。旧キューによる復旧済みデータの巻戻しを防ぐ。SQLite/PGLite双方の保持・再起動・マイグレーションを検証。 |
| A | `packages/electron/src/main/database/sqlite/schemas/0055_tracker_recovery_revision.sql` | Electron Main, Tracker, Database / migration, Authentication / encryption / teams | なし | base_sync_id / expectedSyncId と recoveryConflict を保持。旧キューによる復旧済みデータの巻戻しを防ぐ。SQLite/PGLite双方の保持・再起動・マイグレーションを検証。 |
| M | `packages/electron/src/main/database/worker.js` | Electron Main, Database / migration | あり | base_sync_id / expectedSyncId と recoveryConflict を保持。旧キューによる復旧済みデータの巻戻しを防ぐ。SQLite/PGLite双方の保持・再起動・マイグレーションを検証。 |
| M | `packages/electron/src/main/index.ts` | Electron Main | あり | 新しい本家実装を保持。既存日本語版の変更と統合後の型・実行テストで検証。 |
| M | `packages/electron/src/main/ipc/WindowHandlers.ts` | Electron Main | なし | 新規ウィンドウの明示プロジェクトを前回復元より優先。既存設定を上書きしない。 |
| M | `packages/electron/src/main/ipc/WorkspaceHandlers.ts` | Electron Main | なし | 新しい本家実装を保持。既存日本語版の変更と統合後の型・実行テストで検証。 |
| M | `packages/electron/src/main/mcp/metaAgentServer.ts` | Electron Main | なし | 階層移動で管理者を新規任命せずメッセージも送信しない。既存managerの祖先関係のみ保持。 |
| M | `packages/electron/src/main/services/CollabAssetStore.ts` | Electron Main | なし | 新しい本家実装を保持。既存日本語版の変更と統合後の型・実行テストで検証。 |
| M | `packages/electron/src/main/services/CollabDocumentReplicaStore.ts` | Electron Main | なし | 新しい本家実装を保持。既存日本語版の変更と統合後の型・実行テストで検証。 |
| M | `packages/electron/src/main/services/CommandFileParser.ts` | Electron Main | なし | Wiki skillのYAML description引用符と不正metadataの簡潔な警告を保持。ユーザー作成本文は自動翻訳しない。 |
| D | `packages/electron/src/main/services/LegacyKeyFilePurge.ts` | Electron Main | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| A | `packages/electron/src/main/services/LegacyRecoveryKeyFiles.ts` | Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| M | `packages/electron/src/main/services/MetaAgentService.ts` | Electron Main | なし | 階層移動で管理者を新規任命せずメッセージも送信しない。既存managerの祖先関係のみ保持。 |
| M | `packages/electron/src/main/services/TeamCustodyService.ts` | Electron Main, Authentication / encryption / teams | なし | 新しい本家実装を保持。既存日本語版の変更と統合後の型・実行テストで検証。 |
| A | `packages/electron/src/main/services/TeamRecoveryBundle.ts` | Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| A | `packages/electron/src/main/services/TeamRecoveryClient.ts` | Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| A | `packages/electron/src/main/services/TeamRecoveryInventory.ts` | Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| A | `packages/electron/src/main/services/TeamRecoveryPreparation.ts` | Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| A | `packages/electron/src/main/services/TeamRecoveryService.ts` | Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| A | `packages/electron/src/main/services/TeamRecoverySources.ts` | Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| M | `packages/electron/src/main/services/ToolCallMatcher.ts` | Electron Main, AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| M | `packages/electron/src/main/services/__tests__/CollabAssetStore.test.ts` | Tests, Electron Main | なし | 本家の回帰テストを保持し統合後に実行。テスト用固定英語とユーザー表示を区別。 |
| M | `packages/electron/src/main/services/__tests__/CollabDocumentReplicaStore.test.ts` | Tests, Electron Main | なし | 本家の回帰テストを保持し統合後に実行。テスト用固定英語とユーザー表示を区別。 |
| A | `packages/electron/src/main/services/__tests__/CommandFileParser.test.ts` | Tests, Electron Main | なし | Wiki skillのYAML description引用符と不正metadataの簡潔な警告を保持。ユーザー作成本文は自動翻訳しない。 |
| D | `packages/electron/src/main/services/__tests__/LegacyKeyFilePurge.test.ts` | Tests, Electron Main | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| A | `packages/electron/src/main/services/__tests__/LegacyRecoveryKeyFiles.test.ts` | Tests, Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| M | `packages/electron/src/main/services/__tests__/MetaAgentService.parentPromotion.test.ts` | Tests, Electron Main | なし | 階層移動で管理者を新規任命せずメッセージも送信しない。既存managerの祖先関係のみ保持。 |
| M | `packages/electron/src/main/services/__tests__/PGLiteSessionStore.sqliteMetadata.test.ts` | Tests, Electron Main, Sessions | なし | 本家の回帰テストを保持し統合後に実行。テスト用固定英語とユーザー表示を区別。 |
| M | `packages/electron/src/main/services/__tests__/TeamCustodyService.test.ts` | Tests, Electron Main, Authentication / encryption / teams | なし | 本家の回帰テストを保持し統合後に実行。テスト用固定英語とユーザー表示を区別。 |
| A | `packages/electron/src/main/services/__tests__/TeamRecoveryBundle.test.ts` | Tests, Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| A | `packages/electron/src/main/services/__tests__/TeamRecoveryClient.test.ts` | Tests, Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| A | `packages/electron/src/main/services/__tests__/TeamRecoveryInventory.test.ts` | Tests, Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| A | `packages/electron/src/main/services/__tests__/TeamRecoveryPreparation.test.ts` | Tests, Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| A | `packages/electron/src/main/services/__tests__/TeamRecoveryService.test.ts` | Tests, Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| A | `packages/electron/src/main/services/__tests__/TeamRecoverySources.test.ts` | Tests, Electron Main, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| M | `packages/electron/src/main/services/__tests__/TeamService.registerTeamHandlers.test.ts` | Tests, Electron Main | なし | 本家の回帰テストを保持し統合後に実行。テスト用固定英語とユーザー表示を区別。 |
| M | `packages/electron/src/main/services/__tests__/ToolCallMatcher.test.ts` | Tests, Electron Main, AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| M | `packages/electron/src/main/services/__tests__/sessionHierarchy.backends.test.ts` | Tests, Electron Main, Sessions | なし | 階層移動で管理者を新規任命せずメッセージも送信しない。既存managerの祖先関係のみ保持。 |
| M | `packages/electron/src/main/services/__tests__/sessionHierarchy.syncAuthority.test.ts` | Tests, Electron Main, Sessions | なし | 階層移動で管理者を新規任命せずメッセージも送信しない。既存managerの祖先関係のみ保持。 |
| M | `packages/electron/src/main/services/ai/ShellFileAttribution.ts` | Electron Main, AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| M | `packages/electron/src/main/services/ai/__tests__/ShellCheckoutBaseline.test.ts` | Tests, Electron Main, AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| M | `packages/electron/src/main/services/ai/__tests__/ShellFileAttribution.test.ts` | Tests, Electron Main, AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| M | `packages/electron/src/main/services/ai/__tests__/codexShellTrackingHost.test.ts` | Tests, Electron Main, AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| M | `packages/electron/src/main/services/ai/__tests__/sessionHierarchySync.bootstrap.test.ts` | Tests, Electron Main, AI / Codex, Sessions | なし | 階層移動で管理者を新規任命せずメッセージも送信しない。既存managerの祖先関係のみ保持。 |
| M | `packages/electron/src/main/services/ai/codexShellTrackingHost.ts` | Electron Main, AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| M | `packages/electron/src/main/services/sessionHierarchy.ts` | Electron Main, Sessions | なし | 階層移動で管理者を新規任命せずメッセージも送信しない。既存managerの祖先関係のみ保持。 |
| M | `packages/electron/src/main/services/sessionHierarchySyncStore.ts` | Electron Main, Sessions | なし | 階層移動で管理者を新規任命せずメッセージも送信しない。既存managerの祖先関係のみ保持。 |
| M | `packages/electron/src/main/services/tracker/TrackerPGLiteStore.ts` | Electron Main, Tracker | なし | base_sync_id / expectedSyncId と recoveryConflict を保持。旧キューによる復旧済みデータの巻戻しを防ぐ。SQLite/PGLite双方の保持・再起動・マイグレーションを検証。 |
| M | `packages/electron/src/main/services/tracker/__tests__/TrackerPGLiteStore.outboxCompaction.test.ts` | Tests, Electron Main, Tracker | なし | base_sync_id / expectedSyncId と recoveryConflict を保持。旧キューによる復旧済みデータの巻戻しを防ぐ。SQLite/PGLite双方の保持・再起動・マイグレーションを検証。 |
| M | `packages/electron/src/main/types.ts` | Electron Main | なし | 新規ウィンドウの明示プロジェクトを前回復元より優先。既存設定を上書きしない。 |
| A | `packages/electron/src/main/utils/__tests__/cpuProfileRetention.test.ts` | Tests, Electron Main | なし | 自動CPU profileを7日・100件・100MiBで整理。60秒以内の書込みとユーザー命名ファイルを保護。既存fileLoggingのfail-closedを維持。 |
| A | `packages/electron/src/main/utils/__tests__/performanceMonitor.retention.test.ts` | Tests, Electron Main | なし | 自動CPU profileを7日・100件・100MiBで整理。60秒以内の書込みとユーザー命名ファイルを保護。既存fileLoggingのfail-closedを維持。 |
| A | `packages/electron/src/main/utils/__tests__/windowsClipboard.test.ts` | Tests, Electron Main, Windows / WSL | なし | WSL画像取得と非同期貼付け。Undo・セッション変更後の遅延応答を破棄し現在の入力を保持。Clipboard image表示を翻訳。 |
| A | `packages/electron/src/main/utils/cpuProfileRetention.ts` | Electron Main | なし | 自動CPU profileを7日・100件・100MiBで整理。60秒以内の書込みとユーザー命名ファイルを保護。既存fileLoggingのfail-closedを維持。 |
| M | `packages/electron/src/main/utils/performanceMonitor.ts` | Electron Main | あり | 自動CPU profileを7日・100件・100MiBで整理。60秒以内の書込みとユーザー命名ファイルを保護。既存fileLoggingのfail-closedを維持。 |
| M | `packages/electron/src/main/utils/systemShell.ts` | Electron Main, Windows / WSL | あり | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| A | `packages/electron/src/main/utils/windowsClipboard.ts` | Electron Main, Windows / WSL | なし | WSL画像取得と非同期貼付け。Undo・セッション変更後の遅延応答を破棄し現在の入力を保持。Clipboard image表示を翻訳。 |
| M | `packages/electron/src/main/window/WindowManager.ts` | Electron Main | あり | 新規ウィンドウの明示プロジェクトを前回復元より優先。既存設定を上書きしない。 |
| M | `packages/electron/src/main/window/WorkspaceManagerWindow.ts` | Electron Main | あり | 新規ウィンドウの明示プロジェクトを前回復元より優先。既存設定を上書きしない。 |
| A | `packages/electron/src/main/window/__tests__/WorkspaceManagerWindow.open.test.ts` | Tests, Electron Main | なし | 新規ウィンドウの明示プロジェクトを前回復元より優先。既存設定を上書きしない。 |
| M | `packages/electron/src/preload/index.ts` | Preload | なし | 新IPCの型と引数を保持。復旧パスフレーズは指定操作だけに送信し機密内容をRendererへ返さない。 |
| M | `packages/electron/src/renderer/components/AgenticCoding/__tests__/SessionTree.interactions.test.tsx` | Tests, Electron Renderer, Sessions | あり | 本家の回帰テストを保持し統合後に実行。テスト用固定英語とユーザー表示を区別。 |
| M | `packages/electron/src/renderer/components/ProjectRail.tsx` | Electron Renderer | あり | 新規ウィンドウの明示プロジェクトを前回復元より優先。既存設定を上書きしない。 |
| M | `packages/electron/src/renderer/components/Settings/panels/SecurityEncryptionSection.tsx` | Electron Renderer | あり | 不明状態を未移行と断定しない。組織変更時の古い応答を無効化。復旧UIと既存翻訳を両立。 |
| A | `packages/electron/src/renderer/components/Settings/panels/TeamRecoverySection.tsx` | Electron Renderer, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| A | `packages/electron/src/renderer/components/Settings/panels/__tests__/SecurityEncryptionSection.test.tsx` | Tests, Electron Renderer | なし | 不明状態を未移行と断定しない。組織変更時の古い応答を無効化。復旧UIと既存翻訳を両立。 |
| A | `packages/electron/src/renderer/components/Settings/panels/__tests__/TeamRecoverySection.test.tsx` | Tests, Electron Renderer, Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| M | `packages/electron/src/renderer/components/TrackerMode/TrackerSyncRejectionBanner.tsx` | Electron Renderer, Tracker | あり | recoveryConflictを永続的に通知。既存i18nへ新コードを接続し「巻戻し」と誤表示しない。 |
| M | `packages/electron/src/renderer/components/TrackerMode/__tests__/TrackerSyncRejectionBanner.test.tsx` | Tests, Electron Renderer, Tracker | あり | recoveryConflictを永続的に通知。既存i18nへ新コードを接続し「巻戻し」と誤表示しない。 |
| M | `packages/electron/src/renderer/components/UnifiedAI/AIInput.tsx` | Electron Renderer, AI / Codex | あり | WSL画像取得と非同期貼付け。Undo・セッション変更後の遅延応答を破棄し現在の入力を保持。Clipboard image表示を翻訳。 |
| A | `packages/electron/src/renderer/components/UnifiedAI/__tests__/AIInput.paste.test.tsx` | Tests, Electron Renderer, AI / Codex, Windows / WSL | なし | WSL画像取得と非同期貼付け。Undo・セッション変更後の遅延応答を破棄し現在の入力を保持。Clipboard image表示を翻訳。 |
| A | `packages/electron/src/renderer/components/UnifiedAI/usePastedImage.ts` | Electron Renderer, AI / Codex, Windows / WSL | なし | WSL画像取得と非同期貼付け。Undo・セッション変更後の遅延応答を破棄し現在の入力を保持。Clipboard image表示を翻訳。 |
| M | `packages/electron/src/renderer/components/__tests__/ProjectRail.test.tsx` | Tests, Electron Renderer | あり | 新規ウィンドウの明示プロジェクトを前回復元より優先。既存設定を上書きしない。 |
| M | `packages/electron/src/renderer/electron.d.ts` | Electron Renderer, Build / dependencies | なし | 新IPCの型と引数を保持。復旧パスフレーズは指定操作だけに送信し機密内容をRendererへ返さない。 |
| A | `packages/electron/src/renderer/services/__tests__/reactPerformanceTrack.test.ts` | Tests, Electron Renderer | なし | 本家の回帰テストを保持し統合後に実行。テスト用固定英語とユーザー表示を区別。 |
| M | `packages/electron/src/renderer/store/__tests__/sessions.reloadIdentity.test.ts` | Tests, Electron Renderer, Sessions | なし | 本家の回帰テストを保持し統合後に実行。テスト用固定英語とユーザー表示を区別。 |
| M | `packages/electron/src/renderer/store/__tests__/trackerSyncRejectionListener.test.ts` | Tests, Electron Renderer, Tracker | なし | recoveryConflictを永続的に通知。既存i18nへ新コードを接続し「巻戻し」と誤表示しない。 |
| M | `packages/electron/src/renderer/store/__tests__/transcriptStreamAccumulator.test.ts` | Tests, Electron Renderer, Sessions | なし | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| M | `packages/electron/src/renderer/store/atoms/__tests__/openProjects.startup.test.ts` | Tests, Electron Renderer | なし | 新規ウィンドウの明示プロジェクトを前回復元より優先。既存設定を上書きしない。 |
| M | `packages/electron/src/renderer/store/atoms/openProjects.ts` | Electron Renderer | なし | 新規ウィンドウの明示プロジェクトを前回復元より優先。既存設定を上書きしない。 |
| M | `packages/electron/src/renderer/store/atoms/sessions.ts` | Electron Renderer, Sessions | あり | 新しい本家実装を保持。既存日本語版の変更と統合後の型・実行テストで検証。 |
| M | `packages/electron/src/renderer/store/atoms/trackerSync.ts` | Electron Renderer, Tracker | なし | recoveryConflictを永続的に通知。既存i18nへ新コードを接続し「巻戻し」と誤表示しない。 |
| M | `packages/electron/src/renderer/store/listeners/trackerSyncListeners.ts` | Electron Renderer, Tracker | なし | recoveryConflictを永続的に通知。既存i18nへ新コードを接続し「巻戻し」と誤表示しない。 |
| M | `packages/electron/src/renderer/store/transcriptReconciliation.ts` | Electron Renderer, Sessions | なし | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| M | `packages/electron/src/renderer/store/transcriptStreamAccumulator.ts` | Electron Renderer, Sessions | なし | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| A | `packages/electron/src/shared/teamRecovery.ts` | Authentication / encryption / teams | なし | 組織・メンバー識別を固定した復旧と暗号化保全。新UI・Mainエラー・blocker・ネイティブダイアログを翻訳。旧鍵の起動時削除を廃止。本番復旧は実行せず隔離データで検証。 |
| M | `packages/extensions/planning/claude-plugin/commands/launch-new-session.md` | Documentation, Sessions | なし | 本家のセッション作成モード指示を保持。既存の表示説明とエージェントへの指示を区別。 |
| M | `packages/runtime/src/ai/__tests__/shellTrackingCoverage.test.ts` | Tests, AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| A | `packages/runtime/src/ai/server/__tests__/agentToolActivity.test.ts` | Tests, AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| A | `packages/runtime/src/ai/server/agentToolActivity.ts` | AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| M | `packages/runtime/src/ai/server/permissions/AgentToolHooks.ts` | AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| M | `packages/runtime/src/ai/server/permissions/__tests__/AgentToolHooks.test.ts` | Tests, AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| M | `packages/runtime/src/ai/server/providers/ClaudeCodeProvider.ts` | AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| M | `packages/runtime/src/ai/server/transcript/InMemoryTranscriptEventStore.ts` | AI / Codex, Sessions | なし | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| M | `packages/runtime/src/ai/server/transcript/__tests__/TranscriptRuntime.test.ts` | Tests, AI / Codex, Sessions | なし | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| M | `packages/runtime/src/ai/server/transcript/parsers/CodexRawParser.ts` | AI / Codex, Sessions | なし | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| M | `packages/runtime/src/ai/server/transcript/processDescriptor.ts` | AI / Codex, Sessions | なし | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| A | `packages/runtime/src/ai/server/transcript/reconcileCodexCommitProposal.ts` | AI / Codex, Sessions | なし | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| M | `packages/runtime/src/ai/shellTrackingCoverage.ts` | AI / Codex | なし | 並行セッションの書込み能力を記録して誤帰属を抑制。新しい未追跡理由も翻訳し固定識別子は保持。 |
| M | `packages/runtime/src/editor/extensions/builtin/DragDropPasteExtension.ts` | Windows / WSL | なし | WSL画像取得と非同期貼付け。Undo・セッション変更後の遅延応答を破棄し現在の入力を保持。Clipboard image表示を翻訳。 |
| M | `packages/runtime/src/editor/extensions/builtin/__tests__/MarkdownPasteExtension.test.ts` | Tests, Windows / WSL | なし | WSL画像取得と非同期貼付け。Undo・セッション変更後の遅延応答を破棄し現在の入力を保持。Clipboard image表示を翻訳。 |
| M | `packages/runtime/src/ui/AgentTranscript/components/CustomToolWidgets/EditorScreenshotWidget.tsx` | Sessions | あり | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| M | `packages/runtime/src/ui/AgentTranscript/components/CustomToolWidgets/GitCommitConfirmationWidget.tsx` | Sessions | あり | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| M | `packages/runtime/src/ui/AgentTranscript/components/CustomToolWidgets/VisualDisplayWidget.tsx` | Sessions | あり | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| M | `packages/runtime/src/ui/AgentTranscript/components/CustomToolWidgets/displayImageSource.ts` | Sessions | なし | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| A | `packages/runtime/src/ui/AgentTranscript/components/CustomToolWidgets/rememberedImageHeight.ts` | Sessions | なし | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| M | `packages/runtime/src/ui/AgentTranscript/components/__tests__/TranscriptWidgets.test.tsx` | Tests, Sessions | あり | Transcript行同一性・画像高を保持。コミット結果到着前に成功表示しない。既存翻訳と画像表示を両立。 |
| M | `packages/runtime/src/utils/clipboard.ts` | Windows / WSL | なし | WSL画像取得と非同期貼付け。Undo・セッション変更後の遅延応答を破棄し現在の入力を保持。Clipboard image表示を翻訳。 |
| M | `packages/tracker-engine/src/TrackerSyncEngine.ts` | Tracker | なし | base_sync_id / expectedSyncId と recoveryConflict を保持。旧キューによる復旧済みデータの巻戻しを防ぐ。SQLite/PGLite双方の保持・再起動・マイグレーションを検証。 |
| M | `packages/tracker-engine/src/__tests__/TrackerSyncEngine.integration.test.ts` | Tests, Tracker | なし | base_sync_id / expectedSyncId と recoveryConflict を保持。旧キューによる復旧済みデータの巻戻しを防ぐ。SQLite/PGLite双方の保持・再起動・マイグレーションを検証。 |
| M | `packages/tracker-engine/src/__tests__/fakeTrackerServer.ts` | Tests, Tracker | なし | 本家の回帰テストを保持し統合後に実行。テスト用固定英語とユーザー表示を区別。 |
| M | `packages/tracker-engine/src/trackerPersistence.ts` | Tracker | なし | base_sync_id / expectedSyncId と recoveryConflict を保持。旧キューによる復旧済みデータの巻戻しを防ぐ。SQLite/PGLite双方の保持・再起動・マイグレーションを検証。 |
| M | `packages/tracker-engine/src/trackerProtocol.ts` | Tracker | なし | base_sync_id / expectedSyncId と recoveryConflict を保持。旧キューによる復旧済みデータの巻戻しを防ぐ。SQLite/PGLite双方の保持・再起動・マイグレーションを検証。 |
| A | `patches/react-dom@19.2.7.patch` | Build / dependencies | なし | React Performance Trackの診断のみを保護するpatchと参照hashを保持。日本語版依存も残しfrozen-lockfileで解決確認。 |
| M | `plugins/nimbalyst-wiki/skills/start/SKILL.md` | Documentation, Wiki | なし | Wiki skillのYAML description引用符と不正metadataの簡潔な警告を保持。ユーザー作成本文は自動翻訳しない。 |
| M | `plugins/nimbalyst-wiki/skills/team/SKILL.md` | Documentation, Wiki | なし | Wiki skillのYAML description引用符と不正metadataの簡潔な警告を保持。ユーザー作成本文は自動翻訳しない。 |
| M | `pnpm-lock.yaml` | Build / dependencies | あり | React Performance Trackの診断のみを保護するpatchと参照hashを保持。日本語版依存も残しfrozen-lockfileで解決確認。 |
| M | `pnpm-workspace.yaml` | Build / dependencies | あり | React Performance Trackの診断のみを保護するpatchと参照hashを保持。日本語版依存も残しfrozen-lockfileで解決確認。 |
| M | `scripts/validation-inventory.mjs` | Build / dependencies | なし | 新renderer supervisorテストを必須検査へ追加した本家の構成を保持。 |

## 清掃・保全方針

作業先はR15専用worktree。R14現行環境・公開配布物・197件の保全証拠とGit履歴は変更しない。R15の生成物・Temp・専用プロファイルはFドライブへ集約する。最終候補・根拠ログ・ハッシュは残し、中間ビルドと重複展開を最終照合後に削除する。実ユーザー設定・認証情報は対象外。
