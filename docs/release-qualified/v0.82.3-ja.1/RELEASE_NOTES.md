# v0.82.3-ja.1 — Nimbalyst 日本語版（非公式）

本家Nimbalyst v0.82.3の固定コミット `84dcc00f3cd0abbb36eafc6bfad9389f960076db` を基準とするWindows x64版です。公式最新版のすべての変更を含むものではありません。Nimbalyst, Inc.による承認・サポートは受けていません。

## 変更

- 本家の17コミット・144ファイルを統合し、チーム組織復旧、Trackerの復旧リビジョン、Codex並行セッションの変更帰属、CPUプロファイル保持制限、Wiki・Transcriptの修正を取り込みました。
- 復旧画面、Trackerの標準フィールド・列・操作・同期状態、セッション時刻、入力・添付案内、アクセシビリティ表示を既存の日本語資源へ接続しました。27名前空間、英日各14,795キーです。
- Windowsでカスタムschemeをまとめて登録し、ローカル文書画像のコピー取得失敗を修正しました。
- SQLite0055は待機中Tracker編集の基準リビジョンを保持する列を追加します。既存行保持、失敗時rollbackと再試行、PGLite変換を合成試験で確認しています。
- iOSセッション一覧の検索計画を修正し、シミュレーター性能回帰試験を追加しました。iOSバイナリの提供や実機動作保証ではありません。

## 確認範囲

製品修正コミット `1c1d54a851c340a8f0f9afc304379882a7319fa1` でWindows NSIS・ポータブルZIPを再生成し、ASAR/ABI/Worker、ZIP全1,913ファイルを照合しました。通常製品で英語のSettings・menus・Project Manager・Workspaceを確認し、英語設定後の再起動保持も確認しました。表示言語をSystemにした状態で、日本語Renderer・ネイティブメニューと、Ctrl+Qによる正常終了・再起動後の日本語保持を確認しました。明示的な`ja`設定値の保持は未確認です。補助エラー警告は日英DOM試験で確認しましたが、通常製品の実画面では未確認です。認証・NSIS導入・更新・削除の製品操作はこの版では行っていません。関連する認証・インストーラー入力は変更していませんが、過去製品での成功記録は本版の実操作結果ではありません。

修正の回帰検査はProvider/Protocol 51件、Main/parser/UI/i18n 54件がPASS。38ワークスペース型検査と7つの既存容量上限もPASSしました。製品修正後のLinux run `40269849525` はTest Files 2,340 PASS・7 SKIP・0 FAIL（計2,347）、Tests 19,296 PASS・30 SKIP・0 FAIL（計19,326）で成功しました。iOS run `40269849613` は528件実行・522 PASS・6 SKIP・0 FAILで成功しました。旧コミット `f0c7b7929f18f57c6efac96f61154cfe442b4c74` の結果は履歴であり、本版の修正後結果とは区別します。

## 制限と既知の問題

チーム組織復旧には更新された同期サーバーと対応クライアントが必要です。既存のモック・DOM・単体・統合試験とソース監査までを確認し、実組織・ダミー組織の作成やサービス登録、本番復旧は行っていません。実製品フォーム表示、サーバー状態遷移、独立実クライアントでの復旧・読戻し、チームデータの完全性と復旧後同期は未検証です。

過去の製品で、Codexの主要求が成功した後、自動セッション情報リマインダーにprovider報告のcapacityエラーが発生しました。後続検査では、補助要求の終端失敗を主要求成功と分離し、状態表示する処理とRPC失敗時の購読解放に不足があることを模擬試験で確認し、修正しました。修正後は主応答・完了を保つ回帰試験が成功しています。過去に観測したcapacity事象の原因が同じ経路だったか、また新製品で実際にcapacity制限が発生しないかは未確定です。プロバイダー側の容量制限自体を解消したものではありません。

Google認証、特殊な復旧、サーバー側セッション失効、別ユーザーACL、外部スクリーンリーダー、全DPI・全動的翻訳・WSL全経路は未検証です。静的解析候補672／412／378は欠落や不具合件数ではありません。Windowsのsymlink fixture EPERM3件は未通過で、fixtureが作れない拒否試験の動作は未検証です。Linuxの成功でWindows試験をPASSへ変更していません。

## 配布・ライセンス

WindowsアプリとNSISは未署名です。警告・保護を無効化せず、同じReleaseのSHA256SUMS.txtで全ファイルを照合してください。公式更新は自動・手動とも無効で、本リポジトリのReleasesから手動更新します。公式版との同時利用はサポートしません。

MIT Licenseと `Copyright (c) 2024-2026 Nimbalyst Inc.` を保持しています。第三者ライセンス・NOTICEは配布物の `resources/legal` に含みます。

---

# v0.82.3-ja.1 — Nimbalyst — Unofficial Japanese Edition

A Windows x64 edition pinned to upstream Nimbalyst v0.82.3 commit `84dcc00f3cd0abbb36eafc6bfad9389f960076db`. It does not include every subsequent official change and is not endorsed or supported by Nimbalyst, Inc.

## Changes

- Integrated 17 upstream commits affecting 144 files, including team recovery, Tracker recovery revisions, concurrent Codex file attribution, CPU-profile retention, Wiki and transcript fixes.
- Localized recovery, Tracker fields/columns/actions/sync state, session times, input/attachment guidance and accessibility text using the existing resources: 27 namespaces and 14,795 keys per language.
- Fixed local document image-copy fetch failures on Windows by registering custom schemes together.
- SQLite migration 0055 adds the base revision of pending Tracker edits. Synthetic tests cover existing-row retention, rollback/retry and PGLite conversion.
- Corrected the iOS session-list query plan and added simulator performance regression coverage. No iOS binary or physical-device guarantee is provided.

## Verification scope

The Windows NSIS and portable ZIP packages were rebuilt from product-fix commit `1c1d54a851c340a8f0f9afc304379882a7319fa1`. Their payloads, ASAR, native ABI, Workers and all 1,913 ZIP files were checked. The ordinary product displayed English in Settings, menus, Project Manager and Workspace, and retained English after restart. With the display-language setting set to System, Japanese appeared in the Renderer and native menus and remained after a normal Ctrl+Q shutdown and restart. Persistence of an explicit `ja` value has not been checked. The auxiliary-error warning passed English and Japanese DOM tests; its display in the ordinary product has not been observed. Authentication, installation, upgrade and removal were not exercised on this build. Relevant authentication and installer inputs were unchanged, but prior product results do not substitute for these runtime checks.

The product fix is at commit `1c1d54a851c340a8f0f9afc304379882a7319fa1`; this document is at source HEAD `07eac5ae2f00c3a22ff15bbcaf05c74c80f29f37`. Provider/Protocol: 51 tests passed. Main/parser/UI/i18n: 54 tests passed. All 38 workspace typechecks and seven unchanged bundle limits passed. Linux run `40269849525` passed: 2,340 test files passed, seven skipped, zero failed (2,347 total); 19,296 tests passed, 30 skipped, zero failed (19,326 total). iOS run `40269849613` passed 528 tests (522 passed, six skipped, zero failed). Earlier Linux/iOS counts from `f0c7b7929f18f57c6efac96f61154cfe442b4c74` are historical, not results for this fix.

## Limitations and known issues

Team recovery requires the updated sync server and compatible editing clients. Assessment covers existing mocks, DOM/unit/integration tests and source review only. No real or dummy organization was created or registered, and no production recovery was performed. Ordinary-product form display, server transitions, independent real-client recovery/readback, production team-data integrity and resumed synchronization remain unverified.

An earlier product run completed its main Codex request while its automatic session-metadata reminder reported a provider capacity error. Synthetic regression tests later identified and fixed auxiliary-error propagation and cleanup behavior. The main response/completion path and the normal provider-error path have regression coverage. Whether the earlier capacity incident used the same failure path remains unknown; provider capacity limits themselves are not changed by this fix.

Google sign-in, special recovery, server-side revocation, cross-user ACLs, external screen readers, all DPI settings, complete dynamic-translation coverage and all WSL paths remain unverified. Static candidate counts 672/412/378 are not missing-key or defect counts. Three Windows symlink-fixture EPERM failures remain unpassed; rejection behavior that could not run is unverified. Linux success does not convert those Windows tests into passes.

## Distribution and licensing

The Windows application and NSIS installer are unsigned. Do not disable warnings or protections; verify all files against SHA256SUMS.txt from the same release. Official automatic and manual update checks are disabled; update manually through this repository's Releases. Simultaneous use with the official application is unsupported.

The MIT License and `Copyright (c) 2024-2026 Nimbalyst Inc.` are retained. Bundled third-party licenses and notices are under `resources/legal`.
