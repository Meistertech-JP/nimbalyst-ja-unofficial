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

## 修正後の全体再検証

所有者が同じ3件限定で再pushを許可したため、リモートmainと既存タグの不変、開発ブランチのfast-forward条件を読み戻したうえで、`e5e207dce4d4bb3540b28720488d5b7b33047b66` だけをR15ブランチへ送信した。再実行 [40186642608](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40186642608) はsuccessで完了した。

locked install、38ワークスペース型・7容量検査、scripts・sandbox（例外なし）、全non-provider unit suiteが成功。artifactのlast-run.jsonはcomplete=true、result=PASS、19,255 PASS／0 FAIL／30 SKIP、対象ファイル2,344と記録している。ファイルのPASS/SKIP内訳はこの成功artifactに存在しないため推測で補完しない。失敗ファイル一覧は空。先行失敗のログは保持した。

実ログは `tmp/r15-evidence/linux-ci-e5e207dc.log`、JSONとunit生ログは `tmp/r15-evidence/linux-ci-e5e207dc/`。このCI完了後に見つかったSessionListItem時刻表示の修正は含まれていないため、修正後の全体検証は別途必要。

## 時刻表示修正後の製品コード

`3388c93c552a84fdaef90f987a26d9712bb163af` の [40188921749](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40188921749) はsuccess。38型・7容量・scripts・sandboxを例外なしで通過し、全non-provider suiteは19,257 PASS／0 FAIL／30 SKIP、2,344ファイル。artifactはcomplete=true、失敗一覧は空。時刻修正の新規2テストを含む実母集団である。

実ログ `tmp/r15-evidence/linux-ci-3388c93c.log` とartifact `tmp/r15-evidence/linux-ci-3388c93c/` を保持。Windowsでの通常pushは同じCLI fixture EPERMだけで停止し、個別sandboxは6 artifact PASSと15 PASS／2 fixture EPERM。後続UI・native-dialog・archive静的検査は全てPASS。所有者の再承認後、同じ3件に限定した例外で当該R15コミットだけをfast-forward pushした。公開main・タグ・Releaseは不変である。

## 添付ガイド・推奨表示・展開ヘルプ修正後

`7af4c3b6e72d4c7c92feb88ce1bbacd89fc628c2` の [40195005111](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40195005111) はsuccess。artifactのlast-run.jsonでcomplete=true、result=PASS、headの一致、19,262 PASS／0 FAIL／30 SKIP、2,344ファイル、failingFiles空を確認した。ファイルのPASS/SKIP内訳はartifactから推測しない。38型と7容量、scripts・sandboxもLinuxでは例外なしで通過した。

実ログは `tmp/r15-evidence/linux-ci-7af4c3b6e.log`、JSONとunitログは `tmp/r15-evidence/linux-ci-7af4c3b6e/`。Windowsの既知3 fixture EPERMは新コミットについて個別再承認を受けて開発ブランチだけpushした。通常pushの失敗記録 `normal-push-complete-help.log` と手動後続検査は保持している。新たな失敗へ例外を拡大していない。

Linuxのtracker-ui初期容量は197,104 gzip bytes、同じコミットのWindows測定は197,240 bytesだった。両環境で既存200,000上限を通過しているが、全エントリが環境間でバイト一致するという主張はしない。

## 完了時刻・タイトルバー修正後

`b2cd7ea16927f52fe3b24dee4e215ecccbaf11bf` の [40198602456](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40198602456) はsuccess。artifact `linux-ci-b2cd7ea16/.vitest/last-run.json` はcomplete=true、result=PASS、fingerprint head一致、19,264 PASS／0 FAIL／30 SKIP、2,344ファイル、失敗一覧空。実ログも `linux-ci-b2cd7ea16.log` に保存した。英語のat重複修正49e52c53fは後続のため、このCIには含まれない。

49e52c53ffe1225ce7d411f53f7e20c7758c49a7の [40201861327](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40201861327) もsuccess。artifact linux-ci-49e52c53f/.vitest/last-run.jsonはcomplete=true、head一致、19,264 PASS／0 FAIL／30 SKIP、2,344ファイル、失敗一覧空。ログlinux-ci-49e52c53f.logを保存。iOS側の性能試験failureは別の検査であり、Linux成功で代用しない。

## eabb8c5d6のhosted検証完了（後段の待機記録より優先）

所有者の同じ3件限定承認後、通常ゲートと後続検査で既知fixture EPERM以外の失敗がないことを再確認し、R15開発ブランチだけをfast-forward pushした。[run40243528521](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40243528521)はsuccessで、headは `eabb8c5d6e0d951c77c79f2d5ab4439e056512ef`。最新製品057883f8bとiOS検索計画修正を含む。38型、7容量、scripts、sandboxがLinuxで例外なしに成功した。

取得したartifactのlast-run.jsonはcomplete=true、reason=passed、result=PASS、fingerprint.head一致、failingFiles=[]。独立してunit原ログの末尾を確認し、Test Filesは2,339 passed／0 failed／7 skipped／2,346 total、Testsは19,284 passed／0 failed／30 skipped／19,314 total。elapsedSecondsは972.054。以前の件数へ追加バッチを足して集計していない。

実ログはtmp/r15-evidence/linux-ci-eabb8c5d6.log、artifactのlast-run.json／last-run.log／r13-full-unit.logはlinux-ci-eabb8c5d6/へ保存した。Windowsでfixture作成が止まった拒否処理をWindows実動作成功へ読み替えず、Linux上で試験が通過した結果として記録する。先行失敗とWindowsの原ログを保持し、テスト削除・skip条件変更・容量上限変更は行っていない。main・タグ・Release・公開Wikiは未変更。

実Linuxログの初期gzip bytesはcommenting-ui40,177／44,000、canvas151,352／160,000、editor369,922／370,000、docs-ui89,138／92,000、feedback-ui35,089／35,500、trackers-ui198,364／200,000、inbox5,542／6,000。trackers-uiのWindows測定198,511とはバイト差があるが、双方が既存上限を通過する。editorの余裕78 bytesは制限事項として保持する。

## 最新ローカル修正のhosted検証待ち（後続承認前の履歴）

最新製品コミット057883f8bd230280dfeaa298a5c5e45f8252b508の通常pushは38型・7容量を通過した後、同じCLI fixture symlink EPERMで停止した。手動sandboxも既知fixture EPERM2件だけで、後続静的3検査はPASS。既存の承認はこの新規コミットへ適用せず、bypassは実行していない。GitHub読み戻しでR15ブランチは49e52c53fのままであり、最新コミットに対するLinux全体結果は存在しない。ローカルの関連10ファイル135 PASSを全体CI成功へ読み替えない。
