# R15 Linux CI（初回失敗・修正検証中）

対象コミット: `a9fcc204e44c39a0602342f8a8da763af32969bf`。

[Linux全体検証](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40182435743)、job ID `121136115957`。既存の読み取り専用workflowの対象へR15ブランチを追加し、通常の全体検証を開始した。workflow名に過去のR13という名前が残るが、checkout対象は上記R15コミットである。

初回はfailureで完了した。locked install、全体typecheck・容量検査、scripts/sandboxゲートは通過。全non-provider unit suiteの実出力は次のとおり。過去の19,130件は今回の結果として使用していない。

| 母集団 | PASS | FAIL | SKIP | TOTAL |
|---|---:|---:|---:|---:|
| Test Files | 2,335 | 2 | 7 | 2,344 |
| Tests | 19,250 | 2 | 30 | 19,282 |

失敗はperformanceMonitor.logging.test.tsの2 assertionと、performanceMonitor.retention.test.tsの収集時エラー1件。後者はloggerの実初期化が合成パス `/test-user-data` を作ろうとしてEACCESとなったもの。前者は本家で追加された保持処理の起動時path参照を、既存の新規キャプチャ試験が混同していた。

製品の保持処理を削らず、保持側のpath参照を明示検証してからキャプチャ側の参照を別に計測する。保持試験ではloggerだけをnarrow mockし、実設定へ触れないようにした。fileLogging無効でも旧プロファイルの保持制限は動作することを追加で検証する。ローカルの両ファイル全10テストはPASS、0 FAIL、0 SKIP。製品コードの変更はない。Linux全体での修正後再検証は未完了。

証拠: `tmp/r15-evidence/linux-ci-a9fcc204/`、`performance-policy-retention-green.json`。初回の生ログ・失敗一覧は保持し、削除・skipや期待値の無根拠な緩和はしていない。

WindowsのCLI fixture EPERMとsandbox symlink fixture EPERM2件について、所有者が今回のR15開発ブランチへのpushだけの例外を明示承認した。通常pushの停止ログ、必須検査の個別結果、固定upstreamでの再現を保持したうえで、一度だけgit push --no-verifyを使用した。Linuxの試験削除・skip・例外化はしていない。main・タグ・Releaseには送信していない。
