# R15統合記録（検証継続中）

本書は時系列記録であり、冒頭の未コミット・未承認・未完了の記述は初期チェックポイントを指す。履歴付き統合e9b53cfが確定し、英語完了時刻の修正49e52c53fでLinux 19,264 PASS／0 FAIL／30 SKIPと通常Windows ZIPの日英再起動保持を確認した。一方、同コミットの最新iOS CIは性能試験で失敗し、検索範囲を限定する修正1e4033ed9を通常フックでコミットした。修正後iOS実行・最終ソース成果物は未確定であり、過去b2cd7ea16のiOS成功を代用していない。個別の最新結果は各報告書末尾を参照する。過去の失敗記録は保持している。

固定upstream: `84dcc00f3cd0abbb36eafc6bfad9389f960076db`。日本語版基準: `b0432ce85977040461bf026aff063059bf6ffd1e`。作業ブランチ: `codex/r15-upstream-0823`。公開main・タグ・Release・Wikiは変更していない。

## 統合状態

17コミット・144ファイルの差分と、日本語版既存変更との重複24ファイルを調査した。`git merge --no-ff --no-commit`で統合し、次の10ファイルの競合を個別解決した。未解決indexは0。マージコミットはまだ作成しておらず、Git祖先関係の最終検証はコミット後に行う。

| ファイル | 解決方針 |
|---|---|
| TrackerMutationRejectionNotice.tsx | recoveryConflictの保持通知と既存翻訳callbackを両立 |
| electron/package.json | 0.82.3-ja.1と非公式版識別・無署名構成を保持 |
| performanceMonitor.ts | 本家の保持制限と日本語版のfileLogging fail-closedを併存 |
| SecurityEncryptionSection.tsx | 本家の組織切替・状態不明処理と既存i18nを保持 |
| ProjectRail.test.tsx | 本家の新規ウィンドウ試験と日本語版のProvider試験を保持 |
| EditorScreenshotWidget.tsx | 画像高の保持と翻訳済みtitleを併存 |
| GitCommitConfirmationWidget.tsx | 結果到着前の成功表示を廃止し待機状態を翻訳 |
| VisualDisplayWidget.tsx | 画像高の保持と既存の画像エラー・alt翻訳を併存 |
| TranscriptWidgets.test.tsx | 本家のコミット結果・画像再マウント試験と日本語試験を保持 |
| pnpm-lock.yaml | React診断patchとreact-i18nextのpeer参照を統合 |

最初のlockfile検証はreact-i18nextのpatch参照不足で失敗。失敗ログを保持し、peer snapshotと参照を整合させた後、frozen-lockfileの供給網ポリシー1,826項目と通常installが成功した。検査・上限・patch hashは変更していない。

## 検出した問題と修正

- 復旧パネルが初回passive effectより先に開かれると、初期化が操作と応答を破棄する。初回状態を再初期化せず、組織切替時だけ状態を消去する。組織切替・unmount時のgeneration無効化とMainのreleaseは保持。`recovery-first-open-red.json` → `recovery-first-open-green.json`、後者は2ファイル10テストPASS。
- Windowsで同時に同じ自動CPUプロファイルを整理すると、片方のunlinkがENOENTではなくEPERMになることがある。元ファイルが存在しないと再確認できた場合だけ許容し、存在するファイルの権限拒否は引き続き通知する。`cpu-retention-concurrent-red.json` → `cpu-retention-concurrent-green.json`。元のsymlink試験は削除・skipしていない。
- performanceMonitor保持試験の固定POSIXパスをpath.joinへ変更した。意味・比較の強さを維持し、Windowsの区切り文字にも対応。関連2テストPASS。

## 検証途中の結果と範囲

- 全38ワークスペースtypecheck: `typecheck-runtime-built.log`でPASS。未生成の依存が親環境の古いdistへ解決される失敗ログも保全し、R15自身で依存・Runtimeをビルドして解消した。以後の変更を含む最終再検査は必要。
- 7エントリのバンドル容量: `bundle-budget.log`でPASS。docs-ui 89,138 / 92,000 gzip bytes。editorは369,927 / 370,000で余裕73 bytes。上限変更なし。
- 関連UI4ファイル113テストPASS。復旧Main・辞書等8ファイル41テストPASS。後続追加修正後の最終母集団は別途再集計する。
- 本家変更46ファイル: 初回651 PASS / 25 FAIL / 676 total。復旧UIの1失敗は上記修正で解消。
- 固定upstreamを別の未変更worktreeで同一Node・Vitestにより比較。3ファイル24 PASS / 25 FAIL / 49 total。ShellFileAttribution 20失敗、codexShellTrackingHost 3失敗、CPU symlink fixture EPERM 1失敗は日本語版でも再現。加えてbaselineでCPU同時unlink EPERMが1件発生し、上記の再現テストと修正へ進んだ。baselineのtracked差分は0。依存はR15と同じ実体へのjunctionを使い、重複インストールはしていない。
- この比較をpush例外承認や全検査成功とは扱わない。R15の`--no-verify`は未承認かつ未使用。残る試験の原因分類・対応は継続中。
- 翻訳辞書は現時点27名前空間・英日各14,782キー。静的監査でparity・空翻訳・補間差・解決済み静的参照の欠落は0。未解決scope、動的参照、Main用翻訳helperの補足監査は残る。全UI完了の主張はしない。

## 未完了

変更46ファイルの失敗対応、全push必須検査、Linux/macOS CI、追加SQLite移行試験、Windows製品ビルドと実機更新・認証回帰、ソース・配布物監査、日英公開原稿、最終コミット・保全・清掃。正式公開はR15の対象外。

## 後続チェックポイント

通常のpre-commitフックを使用した統合コミットは `e9b53cf59f291f32c5c1327962d7ccf16fc367e1`、treeは `e9963df6128c1f21d276d7797e22df22e4ca99e0`。第1親は既存正式版 `b0432ce85977040461bf026aff063059bf6ffd1e`、第2親は固定upstream `84dcc00f3cd0abbb36eafc6bfad9389f960076db`。両者のmerge-base --is-ancestorがexit 0。これは製品コード統合の固定点であり、後続のCI設定・文書・検証コミットを妨げない。

Feature inventory updated: 本家の自己復旧・暗号化source bundle・チケットidentity保持の項目を保持し、更新された同期サーバーが必要である記述を確認した。日本語訳追加と同一統合サイクルの修正について、架空の新機能項目は追加していない。

- ShellFileAttributionのfixtureと期待パスをホストの絶対パスへ正規化し、codexShellTrackingHostのURL.pathnameをfileURLToPathへ修正。帰属判定・フックHTTP境界の意味は変えず、2ファイル43テストPASS。`shell-windows-path-green.json`。
- 追加SQLite移行試験を含むMigrationRunnerは全8テストPASS。PGLiteの配布SQL→SQLite変換→再起動も追加1テストPASS。フィルター対象外27件を合格件数には加えない。詳細はR15_DATABASE_MIGRATION_REPORT.md。
- 正規のtypecheck:prepushで依存・Runtime・collab-bundleをビルドし、38ワークスペース全件PASS。7容量上限も維持。`typecheck-prepush-finalpass1.log`。以後のテストfixture修正分は最終再検査が必要。
- 本家変更46ファイルの再検査は44ファイルPASS・2ファイルFAIL、実行テスト660 PASS / 1 FAIL / 0 SKIP / 661 total。失敗ファイルの一つはCollabAssetStoreのロード中に共有Temp設定のcredential lockが衝突して20件が未収集だった。専用設定フォルダーへ分離した後、そのファイル全20テストPASS。これは先の661件へ黙って加算せず、別の実行結果として保持する。CPUの残存1件はsymlink fixture作成EPERMであり、symlink保持動作は未検証。
- scripts必須32ファイルの実行は173テスト中171 PASS / 2 FAIL（dot出力の実数）。CLI fixture symlink EPERMと、リポジトリ配下Tempを「Git外」とする試験の前提違反だった。後者は専用Git外Tempで同じ1試験を実行してPASS。UI静的制約・ネイティブダイアログ・archive writeの後続3検査は個別にPASSしログ保存。
- sandboxは型検査とartifact6テストPASS、image-pinsは17件中14 PASS / 3 FAIL。2件はsymlink fixture EPERM、1件は親Gitを見つけるTemp配置の問題。後者はGit外Tempで同じ1試験がPASS。symlink拒否処理自体は未検証のまま。例外承認は求めず、ゲートも迂回していない。
- 最初の静的補足監査ではhelper内部転送を未分類として停止した。転送の引数を明示分類した後のチェックポイント3で、105直接参照・27有限理由キーの欠落0、未分類helper引数0。過去の失敗チェックポイントは削除していない。

Windowsの通常製品ビルド、実機更新、Linux/macOS CI、最終コミット・原稿・配布候補は引き続き未完了。

## 作業データの扱い

R15のTemp・キャッシュ・依存ストア・ログはF側に配置した。最終候補・必要証拠とGit履歴を保持し、終了時に中間ビルド・重複展開・再生成可能キャッシュを整理する。Cの実ユーザー設定と既存認証情報は削除対象外。R14のソース・公開配布物・保全証拠は変更しない。
