# R15 最終報告書 — 開発成果確定・リリース条件付き

正式公開は行っていない。判定はCONDITIONALで、READYではない。最終の文書コミット・Git tree・ソースZIP SHA-256と保全物は、自己参照を避けて外部PRESERVATION_MANIFEST.jsonとSHA256SUMS.txtで対応付ける。以降の過去記録は履歴として残し、最新の確認範囲へ無条件に流用しない。

## 最新の判定と残作業（2026-10-26）

目標変更により、R15は開発成果と保全・清掃を確定して終了し、正式公開判断はR16 Release Qualificationへ分離する。新機能開発・本家追加追従・READYへの引き上げは今回行わない。Development Statusは保全完了後にCOMPLETE、Release ReadinessはCONDITIONAL、PublicationはNOT AUTHORIZEDとする。復旧フォーム実機表示などの未確認はR16へ明示的に移管し、未検証の免除や重大な既知不具合の隠蔽には使わない。最終の保全・清掃・Git状態はR15_FINALIZATION_REPORT.md、具体的な公開前条件はR15_R16_HANDOFF.mdを正とする。以降の旧目標によるREADY待ち記録は履歴である。

### 現在の要件対応表

| 項目 | 確認結果 |
|---|---|
| 1–2. 最終コミット・tree | 外部PRESERVATION_MANIFEST.jsonで本書を含む正確な文書コミットとtreeを固定。製品ソースは7d5407c51a6be1a4b8fb27ea5e3f694ade109ef7、tree 36b4d681e3a5b959addfaae18bd88e929c589fad |
| 3. 固定upstream | 84dcc00f3cd0abbb36eafc6bfad9389f960076dbを維持。後続版への追従なし |
| 4–6. 統合・差分・競合 | 17コミット・144ファイルを監査、重複24・競合10ファイルを個別解決。e9b53cf59の両親は公開版b0432ce859と固定upstream、双方の祖先関係を確認 |
| 7. 翻訳追加 | 組織復旧・停止理由、Tracker競合・固定列・操作と同期状態、Codex帰属、画像・添付案内・時刻表示を既存基盤へ接続 |
| 8. 翻訳キー | 英日各27名前空間・14,794キー。キー差分・空訳・補間差・解決済み欠落0。動的672・scope未確定412と全UI保証は区別 |
| 9. 型 | 最新製品を含む38ワークスペースPASS。app-schemes-typecheck38.log／通常pushログとf0c7b7929 hosted結果 |
| 10. 容量 | 既存7エントリPASS、上限不変。docs-ui 89,138/92,000、editor 369,922/370,000、trackers-ui 198,511/200,000 gzip bytes。editor余裕78 bytes |
| 11. Linux | f0c7b7929: Test Files 2,340 PASS／0 FAIL／7 SKIP（2,347）、Tests 19,285 PASS／0 FAIL／30 SKIP（19,315） |
| 12. iOS | f0c7b7929: 522 PASS／0 FAIL／6 SKIP（528）。SQL検索計画回帰と既存性能条件PASS、前段2件の二重加算なし。物理端末未検証 |
| 13. Windows | 最新ZIP8で起動・終了、日英再起動、画像copy/paste/Undo/Redo、認証一連とCodex主要求を確認。Codex自動後続要求の容量不足は別記。復旧フォーム実機表示は未確認 |
| 14. DB | 合成DBの旧スキーマ・行保持・rollback/retry・PGLite変換に加え、最新NSIS更新でmigration55を確認。実製品DBの外部接続なし |
| 15. チーム復旧 | 本家実装とDOM／ローカル試験を保持。更新サーバー必須、本番復旧・完全E2E・通常製品フォーム表示は未検証 |
| 16. 本番認証 | 最新ZIP8で本人メール認証・暗号化保存・再起動復元・本人ログアウト・ファイル消失・未認証再起動を確認。サーバー失効とは別 |
| 17. 更新互換性 | 最新NSISで公開0.82.1-ja.1→0.82.3-ja.1。英語・文書全文/hash・Tracker 1件保持。削除後274ファイルと既定関連付け8項目が不変。旧認証状態付き更新は未検証 |
| 18. 配布物 | NSIS 5369e55bbd1eb61cfc9756bfc2d6d9422da44544fa433a28495fbccef056d068、ZIP 4a784689a04f43c0a933a3cb077240ca3a9d9523d0d81bae985034c11d13ae12。最終文書ソースZIPは外部SHA256SUMS.txtで固定 |
| 19. 公開原稿 | 日英READMEとWiki14ファイル・相対リンク42件PASS、日英Release Notes。公開main・Wikiは未変更 |
| 20. Windows既知失敗 | CLI fixture1・sandbox fixture2のsymlink EPERMのみを承認範囲で区別。テストを維持し、Linuxではscripts／sandbox例外なしPASS。Windows拒否動作の実証とは扱わない |
| 21. 限界 | 全動的翻訳・全DPI・外部スクリーンリーダー・WSL全経路・本番組織復旧・Google/特殊認証・サーバー失効・別ユーザーNTFS実効アクセスは未検証 |
| 22. 判定 | CONDITIONAL。復旧フォームの通常製品実表示を証明する隔離テスト組織がなく、READYへ読み替えない。正式公開・新規pushなし |

独立コード確認では、Codex初回応答後の命名リマインダーは既存のsendSessionNamingReminder経路で、providerファイルは固定upstreamから差分0。汎用の日本語エラーと展開した生の技術詳細は現在の表示設計と一致した。容量不足の根拠はUI上の応答文に限定し、サーバー内部状態の確認とは扱わない。`tmp/r15-evidence/codex-capacity-independent-source-review.json`。

所有者が最小Codex要求1回の送信を承認し、最新通常ZIP8で実送信した。実応答「R15 最終Codex検証OK」と9.8秒の完了を確認。続くアプリ生成のセッション情報リマインダーは「Selected model is at capacity. Please try a different model.」で失敗した。要求の成功と後続のプロバイダー容量不足は分け、全フローPASSや日本語版のソース回帰とは断定しない。追加送信・再試行は0。`tmp/r15-evidence/final-codex-ordinary-zip8.json`。

所有者から旧暗号化方式の隔離テスト組織がないとの回答を得た。復旧フォームの通常製品での日本語表示は未確認のままで、DOM試験の成功を実機PASSへ読み替えない。本番組織の復旧や状態注入は行わない。`tmp/r15-evidence/recovery-native-resource-unavailable.json`。この要件は外部資源または明示的な範囲判断が必要なためCONDITIONALを維持する。以下の承認待ち記録は回答前の履歴である。

最終独立監査では、通常ZIP8の新規Codex要求と復旧フォームの日本語実表示が未確認である点を抽出した。前者は最小プロンプトを用意したが、送信は自動審査で拒否され、本人へこの1回の送信承認を依頼中。別経路で送信していない。後者は選択した組織が旧暗号化方式と判定されたときだけ表示され、現在の専用プロファイルは未認証。隔離された該当テスト組織がなく、DOM単体試験を通常製品の表示確認とは扱わない。復旧処理や状態注入はしていない。`tmp/r15-evidence/final-native-coverage-gap.json`。この2点と最終文書・保全を残すため、現時点のCONDITIONALを維持する。

現在はCONDITIONAL。画像コピー回帰は7d5407c51の通常製品でRED→GREENを確認し、その製品ソースを含むf0c7b7929のLinux・iOS全体CIも成功した。以下の旧NOT READY記録は当時の失敗証拠として保持する。

- Linux: Test Files 2,340 PASS／0 FAIL／7 SKIP／計2,347、Tests 19,285 PASS／0 FAIL／30 SKIP／計19,315。
- iOS: 522 PASS／0 FAIL／6 SKIP／計528。前段2試験は二重加算しない。
- 最新ZIP8: 本人の本番メール認証、正常再起動後の復元、本人のサインアウト、認証ファイル削除、再起動後の未認証保持を確認。両表示言語の正常再起動後保持も確認。
- 最新NSIS: 新規導入、1,913ペイロード照合、通常起動・終了、付属アンインストーラーによる削除に成功。専用データ198ファイルは不変、既存関連付け8項目も不変。
- 許可された3件限定例外を使ったpushはf0c7b7929のR15開発ブランチのみ。GitHub APIで公開main b0432ce85977040461bf026aff063059bf6ffd1e、旧タグobject 2548c7f85fae0c88243a71ea63021090225be16aの保持を確認。git ls-remoteの一時的なschannel資格情報エラーはAPI読み戻しで補い、テスト成功やソース障害へ読み替えない。

最新製品への旧公開版からの更新も再実行して成功した。旧版UIでEnglish、日英文書、Tracker項目1件を保存し、正常終了後の設定と閉じたSQLiteを保全。新NSISへの更新後はmigration55、Fileメニュー、同じworkspace、Tasks 1と項目タイトル、文書全文を確認し、通常終了後の言語と文書ハッシュが一致した。更新後の削除でも専用データ274ファイルと既存関連付け8項目は不変。証拠はupgrade8-before/after、upgrade8-running.json、nsis-upgrade8/。未認証プロファイルの保持であり、旧認証状態付きの更新を確認したものではない。

残作業は通常コミットからのソースZIP全blob・CRC・復元照合と最終保全。自己参照を避けるため最終コミットSHA・tree・ソースZIP SHA-256は、生成後の外部manifestでこの報告書と対応付ける。公開main・タグ・Release・公開Wikiを変更していない。新しい文書コミットへのpush例外は未承認であり、今回の許可を拡大しない。

## 最新hosted検証結果（後段の未実行記録より優先）

その後の最新製品実機検証で、ローカル文書の「画像をコピー」がnim-assetのfetch非対応エラーで2回失敗した。現在の判定はNOT READYで、以下のCONDITIONALは発見前の履歴である。Electron 43.7.0の隔離probeではscheme別3回登録で最終schemeのみfetch成功、1回の一括登録で3schemeとも成功した。起動前の登録を1回へ集約し、回帰RED→GREEN、関連48件と型38件が成功。新通常製品の生成・実画面確認と新ソースのCIは未完了である。webSecurity、CSP bypass、各handlerの許可範囲は変更していない。trackerツールは利用できず、再現・原因・失敗ログをimage-copy-native-057883f8b-RED.jsonとscheme-registration-separate/combined.jsonへ記録した。Feature inventoryへの影響はない。

修正7d5407c51の通常NSIS/ZIP生成、SQLite Worker3本とONNXの実ロード、ASAR1,021件・出力341件・法務4件、ZIP全1,913ファイル・CRC・安全な復元が成功。その実展開ZIP8で「画像をコピー」→AI入力欄の画像添付・元の下書き保持・Undo、および文書への画像追加→Undo→Redo→Undo・通常保存を確認した。元の文書本文と画像1件、未送信下書きが保持され、今回のrendererログにcopy/fetchエラーはない。自動CDP9222/9223も観測なし。image-copy-native-fixed-7d5407c51.jsonに記録した。新NSIS SHA256は5369e55bbd1eb61cfc9756bfc2d6d9422da44544fa433a28495fbccef056d068、ZIPは4a784689a04f43c0a933a3cb077240ca3a9d9523d0d81bae985034c11d13ae12。新ソースのCIと認証・NSIS残項目はまだ未完了なので、これだけでREADYにはしない。

関連protocol試験ではWindowsでドライブを含まないfixtureとresolve済み戻り値の比較が失敗した。製品validatorの許可・拒否処理は変えず、fixtureを絶対パス化し、既存の正規化済みパス契約を比較した。最終protocol48件・preview/worktree41件・認証と関連付け85件が成功した。8da3b66e6は後者のテストのみの修正で、製品コードは7d5407c51と同じ。最初の失敗ログはapp-schemes-GREEN.log（名称に反し6 FAIL）とapp-schemes-security-regression.logへ保持し、環境例外の追加とは扱わない。

所有者の既知3件限定承認に基づき、通常ゲートと後続検査で新規失敗がないことを再確認した後、R15開発ブランチを `eabb8c5d6e0d951c77c79f2d5ab4439e056512ef` へfast-forward pushした。Git treeは `4e7353a7054adb448974fcfd0e766e72de2a14ba`。公開mainはb0432ce85977040461bf026aff063059bf6ffd1e、旧タグは2548c7f85fae0c88243a71ea63021090225be16aのままである。main・タグ・Release・公開Wikiを変更していない。

同じHEADのLinux run40243528521はsuccess。実artifactのcomplete=true、result=PASS、fingerprint.head一致、失敗一覧空を確認した。Test Filesは2,339 PASS／0 FAIL／7 SKIP／2,346 total。Testsは19,284 PASS／0 FAIL／30 SKIP／19,314 total。38型・7容量・scripts・sandboxもLinuxでは例外なしで成功した。

iOS run40243528554もsuccess。全体528実行は522 PASS／6 SKIP／0 FAILで、前段2試験を二重加算していない。実refresh SQLを捕捉する追加回帰も成功し、既存6倍性能条件を緩和せず通過した。先行run40201861401の失敗と原ログは保持した。物理iOS端末の動作保証ではない。

eabb時点のソースZIPは9,715 Git blob・CRC・実復元一致、SHA-256 `03fd0051618304045f1d1943a43cccbc11fe2a182adeaa0392f69ee97ebb4069`。この後の結果報告書の編集は同ZIPに含まれない。製品バイナリは下記057883f8bのままである。最終製品に対する認証・NSIS全工程・新規画像貼り付けの再実行をCI成功から推測しない。現判定はCONDITIONALで、READYとはしていない。

## 前段チェックポイント（後続の検証結果は上記）

最新製品ソースは057883f8bd230280dfeaa298a5c5e45f8252b508、treeは8b82354cca919ca0c8850121507dc213e9ff7413。Trackerの固定フィールド・公開状態・日時に加え、実画面で追加発見した列名・操作ラベル・同期状態を修正した。関連10ファイル135テスト、38型、7容量が成功し、最新通常NSIS/ZIPとASAR・全1,913ファイル照合を確認。実展開版で日英切替・両言語の再起動保持・Tracker修正表示・正常終了を確認した。最新ソースのLinux/iOS hosted CIは未実施で、通常pushは既知CLI fixture EPERMで停止。未承認bypassは使っていない。後述の過去チェックポイントと最新候補を混同しない。

以下の前段記録は、1e4033ed9005faf11a68ad3277148fdf2c7d1e1cまでの時点を指す。49e52c53fのLinuxはrun40201861327で19,264 PASS／0 FAIL／30 SKIP、2,344ファイル。一方、iOS run40201861401は前段2試験中1件の性能試験失敗により停止し、全527件へ進んでいない。過去のiOS成功を最新候補の成功として扱わない。

調査では変更前後のmembershipを調べるSQL2本がprojectIdのみの検索になり、履歴全体を走査する原因を確認した。既存session indexを明示する最小修正と実refresh SQLを検査するSwift回帰テストを通常フックでコミットした。合成SQLiteで実ソースから抽出したSQLのRED／GREENと独立レビューは成功したが、修正後のSwift試験・macOS hosted CIは未実行である。既存性能閾値・テスト・容量上限は変更していない。

新コミットの通常pushは、38型検査などの前段成功後、既知CLI fixture symlink EPERMで停止した。後続のsandboxは既知fixture2件のみ失敗、UI invariants・native dialogs・archive writes検査は成功。過去のコミットへの例外承認をこの新コミットへ拡大しておらず、未承認のpush回避は実施していない。

前段49e52c53fの通常製品では、日本語・英語それぞれの再起動後保持、英語完了時刻のat重複解消、日本語の展開コンテキスト説明、文書画像の保存とUndo／Redoを実画面で確認した。この履歴を最新057883f8bでの全機能の再実行成功へ流用しない。

## 前段の要件別記録（履歴）

| 項目 | 現在の根拠と残作業 |
|---|---|
| 1. 最終Gitコミット | 製品は057883f8bd230280dfeaa298a5c5e45f8252b508。報告書・生成法務一覧の後続コミットは製品コードを変更せず、外部保全manifestで最終HEADと対応付ける。Hosted CI未完了 |
| 2. Git tree | 製品tree 8b82354cca919ca0c8850121507dc213e9ff7413。製品ZIPは9,714 Git blob・CRC・実復元一致。後続文書コミットのZIPは別の外部manifestで検証する |
| 3. 固定upstream | 84dcc00f3cd0abbb36eafc6bfad9389f960076db。本家mainの新規更新へ追従していない |
| 4. 履歴統合 | e9b53cf59f291f32c5c1327962d7ccf16fc367e1の第1親は日本語版b0432ce85977040461bf026aff063059bf6ffd1e、第2親は固定upstream。双方を祖先に保持 |
| 5. 差分監査 | upstream間17コミット・144ファイルをR15_UPSTREAM_DIFF_AUDIT.mdに分類。日本語版との重複24ファイルを確認 |
| 6. 競合 | 10ファイルを個別解決。i18n、組織復旧、画像表示、コミット待機、CPU保持、非公式版設定とlockfileを両立。R15_MERGE_REPORT.md参照 |
| 7. 日本語化 | チーム復旧、Mainのローカルエラー、Tracker競合、Codex帰属理由、画像ラベルに加え、実GUIで発見したセッション時刻・添付ガイド・推奨見出し・展開ヘルプ・完了時刻を修正 |
| 8. 翻訳資源 | 27名前空間、英日各14,794キー。差分・空訳・補間差分・解決済み参照欠落0。有限Tracker参照42件も両言語で欠落0。動的候補672・scope未確定412・未分類JSX候補378を、全UI検証済みと扱わない |
| 9. 型検査 | 057883f8bの通常pushで38ワークスペースPASS。ログnormal-push-grid-controls.log |
| 10. 容量 | 既存7上限を変更せずPASS。docs-ui89,138/92,000、editor369,922/370,000、trackers-ui198,511/200,000 gzip bytes。editorの余裕78 bytes |
| 11. Linux | 49e52c53fで19,264 PASS／0 FAIL／30 SKIP、対象2,344ファイル。run40201861327、artifactのhead・complete・失敗一覧を確認。1e4033ed9は未検証 |
| 12. iOS | 最新run40201861401は前段2実行／1 FAILで全体未実行。性能問題を1e4033ed9で修正、Swift実行は未確認。過去b2cd7ea16の527実行／6 SKIP／0 FAILと区別する |
| 13. Windows実機 | 057883f8b通常ZIPで列名・操作・同期状態の日英切替、両言語再起動保持、詳細を開く操作、正常終了を確認。49e52c53fの画像/展開ヘルプ/Wiki試験は別履歴。関連付け8キーは初期baselineと全一致 |
| 14. DB移行 | 実0001〜0054を使用した合成DBの0055適用、全行保持、ロールバック・再試行、PGLite変換と再openを検証。実機更新ではmigration55と設定・文書を確認し、別プロセスで実製品DBを開いてはいない |
| 15. チーム復旧 | 本家実装とローカル合成試験・翻訳を保持。更新同期サーバーが必要。本番組織での復旧は実行せず、独立クライアント間の完全E2Eは未検証 |
| 16. 本番認証 | a9fcc204の通常製品でメール認証・暗号化保存・再起動復元・通常ログアウト・未認証再起動を確認。3388c93c5とのMain/Preload63ファイル一致を確認。後続修正は表示処理だが、最新バイナリの全認証成功とは断定しない |
| 17. 更新互換性 | 3388c93c5のNSISで公開v0.82.1-ja.1から更新し、英語設定と全10文書ハッシュ、既存Trackerを保持。アンインストール後も専用データ183ファイル一致。最新候補との差分と追加確認範囲を最終確定する |
| 18. 配布候補 | 057883f8bのNSIS/ZIP生成・CRC・全1,913ファイル・ASAR1,021件・出力341件・法務4件が一致。NSIS SHA256 25c698a4b595679478b7b4611b10f1c69ff4a1ebb82de4b925228b49ad48ac89、ZIP32107b617abec817688b3113e14cc3fcd04dc851561d88574c7f74546540ccd4。製品ソースZIP da9c453b9ef05cde2f163a27ef2064e10c374b1ff76fcc4abeacd89622b79e03。R15_SHA256SUMS.txtと後続文書用外部manifestを区別する |
| 19. 公開文書 | docs/release-candidates/v0.82.3-ja.1の日英README・Wiki14ファイルとbilingual Release Notesを準備。最新検証結果への最終整合が残る。公開main・Wikiは未変更 |
| 20. 既知制限 | WindowsのCLI symlink fixture1件とsandbox fixture2件は固定upstreamでも同じEPERM。Windowsでの拒否処理そのものはfixture作成失敗のため未検証。テスト削除・skip・上限変更は行っていない |
| 21. 未検証 | 全動的翻訳・全DPI・外部スクリーンリーダー、WSLの全実経路、組織復旧サーバー、Google認証・特殊復旧・サーバー側失効、NTFSの別ユーザー実効アクセス。最新バイナリの残検証は別途上記に記載 |
| 22. 公開可否 | 未判定。候補・検証・ソースZIP・保全の確定後にREADY／CONDITIONAL／NOT READYを選定する。R15で公開main・タグ・Releaseを変更しない |

### 追加修正057883f8bの検査記録

固定テーブル列名・操作title/aria・同期状態とカード日付を修正した最新ローカル製品コミットは `057883f8bd230280dfeaa298a5c5e45f8252b508`、treeは `8b82354cca919ca0c8850121507dc213e9ff7413`。通常コミットのフックを維持し、25ファイル635追加87削除。統合関連試験は10ファイル135 PASS（tracker-grid-controls-integrated.log）。最終の独立静的レビューに追加指摘はなく、型ページ・埋め込み・共有Grid・Desktop Grid・表示設定でラベル由来とカスタム名を保持することを確認した。

同コミットの通常pushは全38型と全7容量を通過したが、既知CLI fixture作成EPERMで停止した。手動sandboxはartifact6 PASS、image-pins15 PASS／fixture EPERM2 FAIL。UI invariants・native dialogs・archive writesはPASS。未承認の例外pushは実行しておらず、このコミットのLinux/iOS hosted CIは未実施である。editor369,922／370,000、trackers-ui198,511／200,000、docs-ui89,138／92,000 gzip bytes。editorの余裕は78 bytesであり、前段測定の68／74 bytesと区別する。上限・gzip計算・テストの変更による回避はない。

最新ソース監査r15-translation-audit-grid-controls-057883f8bは27名前空間・英日各14,794キー、キー差分・空訳・補間差分・解決済み参照欠落0。production参照12,325（shared11,807、Memory106、scope未確定412）、動的候補672、未分類JSX候補378。有限Tracker監査42参照・33独立キーも両言語で欠落0。これを全UIの英語残存0や全動的経路の検証済みとは読み替えない。新Windows候補の生成と実画面での追加修正確認は進行中である。

その後、057883f8bの通常NSIS/ZIP生成、ASAR全1,021件・出力341件・法務4件、ZIPのCRC・安全な実展開・全1,913ファイル一致が成功した。最新ZIP実画面でも固定列名・表示設定・詳細を開く操作・同期状態が日本語となり、日英のライブ切替と両言語それぞれの通常再起動後保持を確認した。通常終了後に専用プロセス不在を確認済み。製品の正確なハッシュと境界はwindows-product-057883f8b.json／tracker-native-057883f8b.jsonへ記録している。新NSISの導入・更新・アンインストールや新たな本番認証まで成功としたものではない。最新Linux/iOS CIと最終ソース・文書・保全は未完了で、READYではない。

## 検査失敗の扱い

初回LinuxのCPU保持試験の分離不備、初期lockfile整合、Git配下Tempの前提違反、実GUIで見つかった未翻訳、英語prefix重複は、原ログを削除せず原因と修正を各報告書に記録した。既知環境依存3件のpush例外はコミットごとに明示承認された範囲だけで使用し、通常コミットのフックを迂回していない。49e52c53fは個別承認後に開発ブランチへpush済みだが、続く1e4033ed9へ承認を引き継いでいない。iOS性能試験の失敗はWindows環境依存例外の対象ではなく、修正後の実行確認が必要である。

## 保全と清掃

1e4033ed9の中間ソースZIP検証では、最初のgit archiveがcore.autocrlf=trueを継承し、復元後のmarketplace.jsonが539 bytes／CR18個となってGit blobと不一致になった。失敗ZIP・CRC記録・FAIL結果をsource-ios-index-checkpointに保存した。archiveコマンドだけcore.autocrlf=falseとした別チェックポイントでは、同ファイルが521 bytes／CR0個となりGit blob c25721cca2e97d7791ea124a95d4a8afb29af272と一致することを独立に確認した。続いて全9,692ファイルのGit blob・復元ファイル母集団・CRC検査が成功した。tree e17da5293f95dd4a8c02a099aa095f104a7cd9f9、ZIP 55,852,223 bytes、SHA-256 771c76ab55bb6cc09be433f17884c04e77c681704eb686c178db9d737821b659。結果はsource-ios-index-exact-blobs/RESULT.jsonとFILES.jsonへ保存した。グローバルGit設定を変更して検査を迂回したものではない。このZIPは未コミット報告書を含まない中間ソースであり、最終ソースZIPではない。POSIX実行権限の実効動作はWindows復元で保証していない。

R14の公開配布物・ソース・Git・検証証拠は保持する。R15の先行バイナリと実展開は中間チェックポイントとして区別し、最終配布物・必要証拠を保全した後に不要な重複を整理する。実ユーザープロファイルは対象外。回収量はC/Fの実空き容量差から測定し、ファイル論理サイズと混同しない。最終保全manifest・チェックサム・清掃結果は未確定である。

R14の保全manifest4個の全197ファイルを再ハッシュし、197一致／差分0（r14-preservation-final-readback.json）。R15の不要となった旧ZIP展開先r15-zip-restored1〜4について、全7,652ファイルを元の復元manifestと照合し、復元元ZIP4個のSHA-256一致、プロセス不使用、配下のreparse point不在、絶対パスがR15のtmp配下であることを確認して削除した。保存済みZIP・NSIS・全ログ・manifest・現行r15-zip-restored5は保持した。論理合計6,583,284,475 bytesに対し、F実空き容量は218,108,387,328→224,703,832,064 bytes、観測増加6,595,444,736 bytes。並行システムI/Oを含む値で、論理量と同一視しない。削除前後のGit差分は不変。old-restores-retirement.jsonへ記録した。Cや実ユーザー設定の削除は行っていない。

公開原稿14ファイルは相互参照42件がすべて存在し、限定的な個人パス・内部進捗語の検出0（public-docs-local-audit.json）。外部URLの新規取得やGitHubでの描画を、このローカル検査の結果とは扱わない。候補READMEのビルド手順には、通常の未署名Windowsビルドで必要な環境変数を明記した。
