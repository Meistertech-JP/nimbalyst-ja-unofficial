# R15 開発成果確定報告

目標: DEVELOPMENT COMPLETE / RELEASE CONDITIONAL。PublicationはNOT AUTHORIZED、次工程はR16 Release Qualification。通常製品の追加開発と本家の追加追従は凍結する。

開発成果の保全と清掃を完了した。重大な未解決製品不具合を条件付き判定で隠さない。製品不一致・データ消失・認証漏洩等が確認された場合はNOT READYへ戻す。

固定upstreamは `84dcc00f3cd0abbb36eafc6bfad9389f960076db`。17コミット・144ファイルを監査し、10競合を個別解決して両履歴を保持した。製品ソースは `7d5407c51a6be1a4b8fb27ea5e3f694ade109ef7`。Linux/iOSの最終検証対象は `f0c7b7929f18f57c6efac96f61154cfe442b4c74` である。

最終ソースcommit/tree・ソースZIP SHA-256・保全ファイル数は、最終文書コミット後の外部 `R15_PRESERVATION_MANIFEST.json` と独立再ハッシュ結果を正とする。自己参照SHAをGit追跡文書へ埋め込まない。既存のソース候補や中間ZIPを新コミット由来とは扱わない。

## 最終結果

| 項目 | 確定内容 |
|---|---|
| 1. 最終commit | 最終文書コミット後の外部manifestの `commit`。古いZIPを新コミット由来に変更しない |
| 2. Git tree | 同じmanifestの `tree` |
| 3. 固定upstream | `84dcc00f3cd0abbb36eafc6bfad9389f960076db`（v0.82.3） |
| 4. 統合 | 17コミット・144ファイルを監査、公開版とupstreamの履歴を保持 |
| 5. 競合 | 10ファイルを個別解決。追加upstream追従なし |
| 6. 翻訳 | 27名前空間、英日各14,794キー。parity・空日本語・補間差・解決済み参照欠落0 |
| 7. 型検査 | 38 workspace PASS。後続は文書のみで製品・テスト・依存の変更なし |
| 8. 容量 | 全7エントリPASS、上限変更なし。editor 369,922/370,000、docs 89,138/92,000 bytes |
| 9. Linux | run40249364701 / f0c7b7929。Files 2,340 PASS・7 SKIP・0 FAIL / 2,347。Tests 19,285 PASS・30 SKIP・0 FAIL / 19,315 |
| 10. iOS | run40249364731 / f0c7b7929。528実行=522 PASS・6 SKIP・0 FAIL。SQL plan回帰含む、過去の性能失敗は保持。物理端末未確認 |
| 11. Windows構成 | 製品7d5407c51の通常NSIS・Portable ZIP・win-unpacked。未署名。不要な再ビルドなし |
| 12. 実機範囲 | ZIP全1,913件・CRC、ASAR1,021件、出力341件、法務4件。日英切替・再起動保持・通常終了。Worker/SQLite/ONNXの解決・実dlopen、node-pty3 addons実dlopen PASS。対話端末操作の追加保証ではない |
| 13. 画像コピー | 057883f8bでscheme fetch失敗RED→7d5407c51の一括静的登録でGREEN。文書画像copy→AI貼付け・下書き保持、文書paste・Undo/Redo・保存 |
| 14. SQLite0055 | 合成DB移行/rollback/retry、PGLite変換、公開版→最新通常製品のmigration55適用確認。実ユーザーDBの外部接続なし |
| 15. 本番認証 | 最新ZIP製品で所有者メール認証・暗号化保存・再起動復元・通常サインアウト・未認証再起動。Google/特殊復旧/サーバー側失効は未確認 |
| 16. 更新導入 | 最新NSISの新規・更新・削除。公開v0.82.1-ja.1のEnglish・日英文書・Tracker保持、削除後274ファイル不変。旧認証済みプロファイル更新は未確認 |
| 17. NSIS SHA256 | `5369e55bbd1eb61cfc9756bfc2d6d9422da44544fa433a28495fbccef056d068` |
| 18. Portable ZIP SHA256 | `4a784689a04f43c0a933a3cb077240ca3a9d9523d0d81bae985034c11d13ae12` |
| 19. ソースZIP | 最終文書commitから生成し、全blob・CRC・サイズ・SHA256・実展開・余分なファイルなしを確認する外部 `source` レコードを正とする |
| 20. 保全 | `F:/Private_Dev/nimbalyst/tmp/r15-final-preservation-20261026/`。清掃前113件を独立照合してSEALED。最終文書追加後の全件数・SHA256は同所manifestと `receipts/final-independent-readback.json` を正とする |
| 21. 清掃 | 11ディレクトリ・83,435ファイル、論理5,853,465,847 bytes。F実空き+6,029,336,576 bytes。C削除0。Git不変、R14の197件不一致0 |
| 22. 公開原稿 | 日英README・Release Notes・Wikiを保全。14原稿・相対リンク42件の監査PASS。公開済み版と未公開候補を区別、公開Wiki変更なし |
| 23. 制限 | 動的672/scope未確定412候補の完全実行時監査、全画面/DPI、外部スクリーンリーダー、別ユーザーACLは未確認。Windows fixture EPERM3件は未通過で、Linuxは例外なしPASS |
| 24. R16 | 同一ハッシュの既存証拠対応、旧認証付き更新の要否、native復旧フォーム/同期サーバー依存、Codex後続capacity失敗、公開直前ハッシュ・原稿の判断。理由のない再実行や新機能開発はしない |
| 25. Development Status | COMPLETE |
| 26. Release Readiness | CONDITIONAL（READYではない） |
| 27. Publication Status | NOT AUTHORIZED。main・タグ・Release・公開Wikiを変更していない |

## Gitと自己参照の扱い

通常フック付きGit CLIで文書を確定する。commitスキルの専用提案UIが利用できないため、所有者承認済みCLI代替を使用した。機能変更なし、Feature inventoryへの影響なし。最終文書commit後の正確なcommit/tree・ソースZIP・全件再ハッシュ結果はGit外のmanifestと独立receiptに記録し、この文書自身のSHAを埋め込まない。

R15開発ブランチへの通常push結果は最終コミット確定後、同保全先の `receipts/normal-push-result.json` とrawログへ記録する。過去の `--no-verify` 承認は今回へ流用しない。通常フックで停止した場合もローカル保全は維持し、リモート同期には新たな限定承認が必要と報告する。main・タグ・Release・公開Wikiへの書込みは行わない。

Codexの主要求は9.8秒でPASSだが、自動セッション情報リマインダーはprovider報告のcapacityで失敗しており、全フローPASSとしない。所有者が該当テスト組織なしと回答したため、通常製品の旧暗号化復旧フォームは未表示。DOM試験を実機証拠へ読み替えず、R16の明示的な公開前判断へ残す。これらを重大な既知製品不具合や免除済み条件とは断定しない。
