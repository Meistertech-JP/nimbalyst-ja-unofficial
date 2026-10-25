# R15 最終報告書（検証中・未確定）

正式公開は行っていない。本書は最終成果物の確定前の監査用原稿であり、READYの判定ではない。新しい製品コードへの確認を終えるまで、過去の候補の成功を最新候補へ自動的に適用しない。

## 最新チェックポイント（以下の履歴表より優先）

最新ソースは1e4033ed9005faf11a68ad3277148fdf2c7d1e1c。49e52c53fのLinuxはrun40201861327で19,264 PASS／0 FAIL／30 SKIP、2,344ファイル。一方、iOS run40201861401は前段2試験中1件の性能試験失敗により停止し、全527件へ進んでいない。過去のiOS成功を最新候補の成功として扱わない。

調査では変更前後のmembershipを調べるSQL2本がprojectIdのみの検索になり、履歴全体を走査する原因を確認した。既存session indexを明示する最小修正と実refresh SQLを検査するSwift回帰テストを通常フックでコミットした。合成SQLiteで実ソースから抽出したSQLのRED／GREENと独立レビューは成功したが、修正後のSwift試験・macOS hosted CIは未実行である。既存性能閾値・テスト・容量上限は変更していない。

新コミットの通常pushは、38型検査などの前段成功後、既知CLI fixture symlink EPERMで停止した。後続のsandboxは既知fixture2件のみ失敗、UI invariants・native dialogs・archive writes検査は成功。過去のコミットへの例外承認をこの新コミットへ拡大しておらず、未承認のpush回避は実施していない。

Windows配布候補は49e52c53fの通常製品ビルド。日本語・英語それぞれの再起動後保持、英語完了時刻のat重複解消、日本語の展開コンテキスト説明を実画面で確認した。文書へのネイティブ画像貼り付けでは、既存文章の保持、保存されたPNGとMarkdown参照、Undo／Redoまで確認した。Swift2ファイルとCHANGELOGの追加差分について、新Windowsバイナリ生成やiOS成功を推測してはいない。

## 要件別の現状

| 項目 | 現在の根拠と残作業 |
|---|---|
| 1. 最終Gitコミット | 未確定。最新ソースは1e4033ed9005faf11a68ad3277148fdf2c7d1e1c、Windows製品コードは49e52c53ffe1225ce7d411f53f7e20c7758c49a7。報告書・公開原稿・生成ライセンス情報の最終レビューと通常コミットが残る |
| 2. Git tree | 最終コミット後に読み戻す。ソースZIPへコミット・treeを記録し全Git blobを照合する |
| 3. 固定upstream | 84dcc00f3cd0abbb36eafc6bfad9389f960076db。本家mainの新規更新へ追従していない |
| 4. 履歴統合 | e9b53cf59f291f32c5c1327962d7ccf16fc367e1の第1親は日本語版b0432ce85977040461bf026aff063059bf6ffd1e、第2親は固定upstream。双方を祖先に保持 |
| 5. 差分監査 | upstream間17コミット・144ファイルをR15_UPSTREAM_DIFF_AUDIT.mdに分類。日本語版との重複24ファイルを確認 |
| 6. 競合 | 10ファイルを個別解決。i18n、組織復旧、画像表示、コミット待機、CPU保持、非公式版設定とlockfileを両立。R15_MERGE_REPORT.md参照 |
| 7. 日本語化 | チーム復旧、Mainのローカルエラー、Tracker競合、Codex帰属理由、画像ラベルに加え、実GUIで発見したセッション時刻・添付ガイド・推奨見出し・展開ヘルプ・完了時刻を修正 |
| 8. 翻訳資源 | 27名前空間、英日各14,782キー。差分・空訳・補間差分・解決済み参照欠落0。動的候補659・scope未確定385・未分類JSX候補378を、全UI検証済みと扱わない |
| 9. 型検査 | 49e52c53fの通常pushで38ワークスペースPASS。ログnormal-push-english-turn-prefix.log |
| 10. 容量 | 既存7上限を変更せずPASS。docs-ui 89,138/92,000、editor 369,927/370,000 gzip bytes。editorの余裕73 bytesを記録 |
| 11. Linux | 49e52c53fで19,264 PASS／0 FAIL／30 SKIP、対象2,344ファイル。run40201861327、artifactのhead・complete・失敗一覧を確認。1e4033ed9は未検証 |
| 12. iOS | 最新run40201861401は前段2実行／1 FAILで全体未実行。性能問題を1e4033ed9で修正、Swift実行は未確認。過去b2cd7ea16の527実行／6 SKIP／0 FAILと区別する |
| 13. Windows実機 | 49e52c53fの通常ZIPで英語at重複解消、日英それぞれの再起動保持、日本語展開ヘルプ、文書画像貼り付けとUndo／Redoを確認。幅1040メニュー・AI入力への画像貼り付けはb2cd7ea16、実Codex応答は7af4c3b6eの通常製品で確認。最終関連付け読み戻しなどが残る |
| 14. DB移行 | 実0001〜0054を使用した合成DBの0055適用、全行保持、ロールバック・再試行、PGLite変換と再openを検証。実機更新ではmigration55と設定・文書を確認し、別プロセスで実製品DBを開いてはいない |
| 15. チーム復旧 | 本家実装とローカル合成試験・翻訳を保持。更新同期サーバーが必要。本番組織での復旧は実行せず、独立クライアント間の完全E2Eは未検証 |
| 16. 本番認証 | a9fcc204の通常製品でメール認証・暗号化保存・再起動復元・通常ログアウト・未認証再起動を確認。3388c93c5とのMain/Preload63ファイル一致を確認。後続修正は表示処理だが、最新バイナリの全認証成功とは断定しない |
| 17. 更新互換性 | 3388c93c5のNSISで公開v0.82.1-ja.1から更新し、英語設定と全10文書ハッシュ、既存Trackerを保持。アンインストール後も専用データ183ファイル一致。最新候補との差分と追加確認範囲を最終確定する |
| 18. 配布候補 | 49e52c53fのNSIS/ZIP生成・CRC・全1,913ファイル・ASAR1,021件・出力341件・法務4件が一致。NSIS SHA-256 c94ab7c0bae6fc62e6eb7873e6f9593547882d250a4bab4f5b26d8c9036fa4b6、ZIP 5c59a223f4496482ca710292e0bf9ada6e5f72b234570182bdde8905ee761546。最終ソースZIP・SHA256SUMSは未確定 |
| 19. 公開文書 | docs/release-candidates/v0.82.3-ja.1の日英README・Wiki14ファイルとbilingual Release Notesを準備。最新検証結果への最終整合が残る。公開main・Wikiは未変更 |
| 20. 既知制限 | WindowsのCLI symlink fixture1件とsandbox fixture2件は固定upstreamでも同じEPERM。Windowsでの拒否処理そのものはfixture作成失敗のため未検証。テスト削除・skip・上限変更は行っていない |
| 21. 未検証 | 全動的翻訳・全DPI・外部スクリーンリーダー、WSLの全実経路、組織復旧サーバー、Google認証・特殊復旧・サーバー側失効、NTFSの別ユーザー実効アクセス。最新バイナリの残検証は別途上記に記載 |
| 22. 公開可否 | 未判定。候補・検証・ソースZIP・保全の確定後にREADY／CONDITIONAL／NOT READYを選定する。R15で公開main・タグ・Releaseを変更しない |

## 検査失敗の扱い

初回LinuxのCPU保持試験の分離不備、初期lockfile整合、Git配下Tempの前提違反、実GUIで見つかった未翻訳、英語prefix重複は、原ログを削除せず原因と修正を各報告書に記録した。既知環境依存3件のpush例外はコミットごとに明示承認された範囲だけで使用し、通常コミットのフックを迂回していない。49e52c53fは個別承認後に開発ブランチへpush済みだが、続く1e4033ed9へ承認を引き継いでいない。iOS性能試験の失敗はWindows環境依存例外の対象ではなく、修正後の実行確認が必要である。

## 保全と清掃

1e4033ed9の中間ソースZIP検証では、最初のgit archiveがcore.autocrlf=trueを継承し、復元後のmarketplace.jsonが539 bytes／CR18個となってGit blobと不一致になった。失敗ZIP・CRC記録・FAIL結果をsource-ios-index-checkpointに保存した。archiveコマンドだけcore.autocrlf=falseとした別チェックポイントでは、同ファイルが521 bytes／CR0個となりGit blob c25721cca2e97d7791ea124a95d4a8afb29af272と一致することを独立に確認した。続いて全9,692ファイルのGit blob・復元ファイル母集団・CRC検査が成功した。tree e17da5293f95dd4a8c02a099aa095f104a7cd9f9、ZIP 55,852,223 bytes、SHA-256 771c76ab55bb6cc09be433f17884c04e77c681704eb686c178db9d737821b659。結果はsource-ios-index-exact-blobs/RESULT.jsonとFILES.jsonへ保存した。グローバルGit設定を変更して検査を迂回したものではない。このZIPは未コミット報告書を含まない中間ソースであり、最終ソースZIPではない。POSIX実行権限の実効動作はWindows復元で保証していない。

R14の公開配布物・ソース・Git・検証証拠は保持する。R15の先行バイナリと実展開は中間チェックポイントとして区別し、最終配布物・必要証拠を保全した後に不要な重複を整理する。実ユーザープロファイルは対象外。回収量はC/Fの実空き容量差から測定し、ファイル論理サイズと混同しない。最終保全manifest・チェックサム・清掃結果は未確定である。

R14の保全manifest4個の全197ファイルを再ハッシュし、197一致／差分0（r14-preservation-final-readback.json）。R15の不要となった旧ZIP展開先r15-zip-restored1〜4について、全7,652ファイルを元の復元manifestと照合し、復元元ZIP4個のSHA-256一致、プロセス不使用、配下のreparse point不在、絶対パスがR15のtmp配下であることを確認して削除した。保存済みZIP・NSIS・全ログ・manifest・現行r15-zip-restored5は保持した。論理合計6,583,284,475 bytesに対し、F実空き容量は218,108,387,328→224,703,832,064 bytes、観測増加6,595,444,736 bytes。並行システムI/Oを含む値で、論理量と同一視しない。削除前後のGit差分は不変。old-restores-retirement.jsonへ記録した。Cや実ユーザー設定の削除は行っていない。

公開原稿14ファイルは相互参照42件がすべて存在し、限定的な個人パス・内部進捗語の検出0（public-docs-local-audit.json）。外部URLの新規取得やGitHubでの描画を、このローカル検査の結果とは扱わない。候補READMEのビルド手順には、通常の未署名Windowsビルドで必要な環境変数を明記した。
