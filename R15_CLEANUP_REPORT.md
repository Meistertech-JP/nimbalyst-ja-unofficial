# R15 清掃報告

状態: COMPLETE。清掃前の専用保全113ファイルを別工程で全件再ハッシュし、SEALEDを確認してから削除した。証拠は外部保全先の `receipts/precleanup-independent-readback.json`。

削除対象は以下の11ディレクトリのみ。基準ディレクトリは `F:/Private_Dev/nimbalyst/tmp/r15-upstream-0823/`。個別の絶対パス、復元元ZIPのSHA-256、全ファイル照合は `tmp/r15-evidence/final-cleanup-PREFLIGHT.json` と `final-cleanup-RESULT.json` に保存した。

- `tmp/r15-zip-restored5`
- `tmp/r15-zip-restored6`
- `tmp/r15-zip-restored7`
- `tmp/r15-evidence/source-candidate-docs-aac77079c/restored/nimbalyst-0.82.3-ja.1-source`
- `tmp/r15-evidence/source-candidate-native-upgrade-a3102b5fe/restored/nimbalyst-0.82.3-ja.1-source`
- `tmp/r15-evidence/source-conditional-362f45226/restored/nimbalyst-0.82.3-ja.1-source`
- `tmp/r15-evidence/source-conditional-7b8566633/restored/nimbalyst-0.82.3-ja.1-source`
- `tmp/r15-evidence/source-grid-controls-057883f8b/restored/nimbalyst-0.82.3-ja.1-source`
- `tmp/r15-evidence/source-hosted-results-8989b98bf/restored/nimbalyst-0.82.3-ja.1-source`
- `tmp/r15-evidence/source-ios-index-exact-blobs/restored/nimbalyst-0.82.3-ja.1-source`
- `tmp/r15-evidence/source-reports-grid-controls-eabb8c5d6/restored/nimbalyst-0.82.3-ja.1-source`

削除直前に全83,435ファイルを既存manifestと照合し、復元元ZIPを再ハッシュした。全対象と祖先のreparse point/symlink不在、Git worktreeではないこと、プロセス実行パス・コマンドライン参照0を確認した。プロセス照合は全オープンハンドル検査ではない。削除後の全対象消失、保持ZIPの再ハッシュ一致、R15と外側作業環境のGit状態不変を確認した。ごみ箱への移動ではないが、照合済みZIPから復元可能。Gitソース・履歴、現行restored8、失敗したソース復元、必要なrawログ、全ZIP、R14保全物は削除していない。R14は197件再ハッシュで不一致0。

| 項目 | 実測値 |
|---|---:|
| 削除ディレクトリ | 11 |
| 削除ファイル | 83,435 |
| 論理サイズ | 5,853,465,847 bytes（約5.45 GiB） |
| F空き容量・前 | 213,807,849,472 bytes |
| F空き容量・後 | 219,837,186,048 bytes |
| F実空き容量増加 | 6,029,336,576 bytes（約5.62 GiB） |
| C空き容量・前 | 74,234,580,992 bytes |
| C空き容量・後 | 74,238,095,360 bytes |
| C観測差 | +3,514,368 bytes |
| C削除ファイル | 0 |

空き容量は2026-10-26T03:05:50Z〜03:06:16Zの観測であり、並行I/Oを含み得る。Cの差を今回の回収量とは扱わない。Tempトップレベルの3候補はR15由来を証明できず保持した。他アプリ・実ユーザープロファイルへ触れていない。node_modules・共有cache/storeは今回削除していない。

初回JSONの集計欄2項目はPowerShellのOrderedDictionary集計によりnullとなったため、原記録を変更せず、完全な個別行から再集計して `final-cleanup-VERIFIED.json` に保存した。同時に全対象の消失と保持ZIPを独立再確認した。削除の再実行はしていない。
