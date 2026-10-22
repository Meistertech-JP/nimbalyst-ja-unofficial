# Nimbalyst 日本語版（非公式） v0.81.7-ja.2 — ソースプレビュー候補

Nimbalyst デスクトップ版 v0.81.7を基にした非公式日本語版の次版候補です。本版はNimbalyst, Inc.の公式製品ではなく、同社による開発・サポート・承認を受けたものではありません。

この候補はまだ公開されていません。公開済みのv0.81.7-ja.1とは別のソース状態です。配布対象はソースコードのみで、Windowsインストーラー、ポータブルZIP、実行ファイル、blockmap、更新マニフェストは提供しません。ローカル生成のWindowsパッケージは未署名で、インストール・起動・認証・アンインストールは実機未検証です。

## ベースと変更範囲

- 固定取り込み先は `e14ddf383a8dbb40e511fc2c2ea50273d08e3579` です。前版の固定ベース `79b8c560c491061c39ea70d01097139055b62ae8` から24コミット・121ファイル分の変更を取り込んでいます。現在の公式main全体への追従ではありません。
- 新規・変更UIでは、セッションのコンテキスト使用量、GitHubの作成者・ラベル検索、文書の階層目次、ローカルWikiと静的サイト出力を日本語表示に対応させています。
- ローカルWikiの静的出力に `--ui-language system|en|ja` を追加しています。CLIは省略時にシステム言語を使用し、プログラムからのエクスポートは互換性のため英語を既定値とします。翻訳名前空間は必要時に遅延読み込みします。これらの変更は本ソースの内容であり、公開済みnpmパッケージへの収録を意味しません。
- 上流変更のUIに対応する111キーと、バックアップ衝突時のエラー1キーを英語・日本語それぞれに追加し、26名前空間・各14,401キーの翻訳リソースを含みます。キーの一致だけでは、すべての動的参照や画面表示の正しさは確認できません。
- 上流由来の変更には、Quick OpenからのWikiページ表示、セッショングループの未読集計表示、Cursor添付ファイル、セッション・タスクの保持とインポート再試行、データベース履歴の保持、Runtimeのトランスクリプト・承認処理、ドキュメント同期に関する変更が含まれます。各機能を実機で網羅的に検証したものではありません。
- Wikiの再エクスポート時に既存バックアップを削除せず、無関係なバックアップとの衝突では中止するよう変更しています。以前の出力が保存されている場合は未使用の番号付き保存先を使い、置換に失敗した場合は以前の出力の復元を試みます。復元できない場合もバックアップと生成済み出力を保持します。あらゆる同時書込みに対する安全性を保証するものではありません。
- ワークツリー案内の説明文が英語・日本語とも翻訳キー名で表示される問題を修正しています。

## 非公式版の動作設定

- 表示言語はアプリ設定から日本語・英語を選択でき、選択値を保存する構成です。配布用パッケージでの切替・再起動確認は未実施です。
- 公式版の自動更新と手動更新確認を無効にしています。
- Windowsアプリ識別子は `jp.meistertech.nimbalyst.ja.unofficial` です。アプリ表示名と既定のユーザーデータ保存先を公式版から分離し、既存の公式版ユーザーデータを移動・削除しません。パッケージ起動による分離確認は未実施です。
- WindowsのMarkdownファイルクラスを `jp.meistertech.nimbalyst.ja.unofficial.Markdown` に分離しています。これは関連付け設定の変更であり、Windows実機での既定アプリ設定やアンインストール時の挙動を確認したものではありません。
- 認証はインスタンス専用のnonce付き `http://127.0.0.1:<port>/auth/callback` を使用する構成です。Windows起動時に `nimbalyst://` の既定ハンドラーを変更しません。
- 起動引数・認証コールバック・Stytch認証処理の診断ログは、任意の本文を含めず件数や固定分類を記録します。実認証の成功や全アプリのログを網羅的に確認したものではありません。

## 検証状況と制限事項

- 本候補の全38 workspace型検査、関連30ファイル216テスト、Wiki/CLIの7ファイル35テスト、認証診断の限定40テストが成功しています。認証診断の限定実行で対象外とした既存38テストを、成功件数へ含めていません。
- Runtime、Electron、Collab bundle、Worker、Sandbox、Extensions、CLI、Wikiのビルドが成功しています。Wikiのgzip容量はeager 818,965 bytes（上限900,000）、全体9,111,692 bytes（上限11,500,000）です。ビルド済みCLIでも日本語→英語→日本語の静的出力、リンク、本文、既存バックアップ保持を確認しています。ブラウザ実行の検証ではありません。
- 固定upstreamと日本語版を比較した全体単体テストは、いずれも未完了です。失敗と長時間待機が残っており、全体テスト成功とは判定していません。
- 同じWindows環境の固定upstreamでも再現する4件のfixture失敗があります。CLIのsymlink作成EPERM、commit-hookの `/bin/sh` 起動ENOENT、sandboxのsymlinkファイルfixture作成EPERM、sandboxのsymlink祖先ディレクトリfixture作成EPERMです。sandboxの拒否処理自体を実行時に検証できたとは扱っていません。
- NTFS ACLによるアクセス制御、Stytchの一部の認証復旧経路、動的翻訳参照119件の完全な実行時確認は未完了です。日本語実画面の網羅的なE2E・視覚検証も未実施です。未検証であることは、不具合や脆弱性が確認されたことを意味しません。
- 新しい静的監査で名前空間を確定できない旧来の翻訳参照370件は、今回の変更範囲とは別の未証明範囲として残しています。370件の表示不具合が確認されたという意味ではありません。
- 以前の比較では大容量CLIアップロードが停止し、今回の両側の全体テストはREST作成・更新試験で未完走です。同じ原因とは断定しておらず、他環境での再現性も確定していません。
- 新規・変更UIの翻訳対象と、既存UI全体の監査範囲は異なります。既存UIには未翻訳英語が残っており、全製品の英語表示が0件とは判定していません。外部サービスのエラー、利用者データ、技術識別子も日本語化の保証対象ではありません。
- 旧クライアントからの「Teammate」は既定名と実名を区別できないため保持します。本版が生成する既定名は由来情報を持ち、対応する表示で言語を切り替えます。表示済みの通知は言語切替後も元の言語が残る場合があります。
- Browser/Embedホスト、配布用アプリの実画面、モバイルのネイティブ動作はこの候補では未検証です。過去のモバイルCI失敗の解消を、このソースの変更だけで確認済みとはしていません。
- 公式Nimbalystとの同時利用はサポート対象外です。認証以外の `nimbalyst://` リンクは現在の登録先アプリで開かれる場合があります。インストール・アンインストール、URL・ファイル関連付け、配布用パッケージからの認証は未検証です。
- 最終ソースのWindowsパッケージ生成は、Electron展開ディレクトリの名前変更がEPERMとなり停止しました。原因は未確定で、最終版のインストーラー・ZIPは生成できていません。以前のローカル生成物にはASARの宣言と外部配置ファイルの整合差異も残っています。いずれも実起動失敗や脆弱性の確認を意味しません。
- 現在の公式最新版とは、機能や修正内容が異なります。本版は公式版の更新を自動適用しません。

## ソースとライセンス

ビルド手順と動作環境は[README](README.md)に記載しています。ソースコードは[MIT License](LICENSE)で提供し、`Copyright (c) 2024-2026 Nimbalyst Inc.` を含む元のライセンスを保持しています。第三者ライセンスと通知は[ライセンス一覧](packages/electron/resources/generated/THIRD_PARTY_LICENSES.json)、[監査資料](packages/electron/resources/generated/THIRD_PARTY_LICENSE_AUDIT.md)、[NOTICE](packages/electron/resources/generated/THIRD_PARTY_NOTICES.txt)に記載しています。[本家リポジトリ](https://github.com/nimbalyst/nimbalyst)とは独立した非公式版です。

---

# Nimbalyst — Unofficial Japanese Edition v0.81.7-ja.2 — Source preview candidate

A candidate for the next unofficial Japanese edition based on Nimbalyst desktop version 0.81.7. This is not an official product of Nimbalyst, Inc. and is not developed, supported, or endorsed by the company.

This candidate has not been published. It is a different source state from the published v0.81.7-ja.1. Distribution is limited to source code; no Windows installer, portable ZIP, executable, blockmap, or update manifest is provided. Locally generated Windows packages are unsigned, and installation, startup, authentication, and uninstallation have not been validated on a Windows machine.

## Base and changes

- The pinned upstream target is `e14ddf383a8dbb40e511fc2c2ea50273d08e3579`, incorporating 24 commits affecting 121 files since the previous pinned base, `79b8c560c491061c39ea70d01097139055b62ae8`. This does not track the entire current official main branch.
- New and changed UI includes Japanese display for session context usage, GitHub author and label search, hierarchical document outlines, local Wiki views, and static-site export.
- Static Wiki export adds `--ui-language system|en|ja`. The CLI defaults to the system language; programmatic exports default to English for compatibility. Translation namespaces load on demand. These changes describe this source, not availability in published npm packages.
- Resources add 111 keys for upstream UI changes and one backup-collision error message per language, totaling 26 namespaces and 14,401 keys each for English and Japanese. Matching key sets alone do not verify every dynamic reference or screen.
- Incorporated upstream changes include opening Wiki pages from Quick Open, unread session-group rollups, Cursor attachments, session and task retention, import retries, database-history retention, Runtime transcript and approval handling, and document synchronization. These features have not been exhaustively tested in a running application.
- Wiki re-export retains existing backups and stops on an unrelated backup collision. If an earlier export is already retained, it selects an unused numbered backup path. A failed replacement attempts to restore the earlier output; if restoration is blocked, the backup and generated output are kept. This does not guarantee safety under every concurrent write.
- Fixed the worktree introduction description appearing as a translation key in both English and Japanese.

## Unofficial-edition configuration

- Japanese and English can be selected in the app settings, with the selection configured to persist. Switching and restart persistence have not been checked in a distributable package.
- Official automatic updates and the manual update-check action are disabled.
- The Windows application identifier is `jp.meistertech.nimbalyst.ja.unofficial`. The display name and default user-data location are separate from the official application. Existing official user data is not moved or deleted. Separation has not been checked by launching a packaged build.
- Windows Markdown file classes use `jp.meistertech.nimbalyst.ja.unofficial.Markdown`. This is an association-configuration change, not a verification of default-app settings or uninstall behavior on a Windows machine.
- Authentication is configured to use an instance-specific, nonce-protected `http://127.0.0.1:<port>/auth/callback`. Starting this edition on Windows does not change the default `nimbalyst://` handler.
- Startup, authentication-callback, and Stytch diagnostics record counts or fixed classifications rather than arbitrary contents. This does not establish successful real authentication or exhaustive verification of every application log.

## Verification and limitations

- This candidate passes typecheck in all 38 workspaces, 216 tests across 30 related files, 35 Wiki/CLI tests across seven files, and 40 targeted authentication-diagnostic tests. The 38 existing tests outside the diagnostic selection are not counted as passes.
- Runtime, Electron, Collab bundle, Worker, Sandbox, Extensions, CLI, and Wiki builds pass. Wiki gzip sizes are 818,965 bytes eager (900,000-byte limit) and 9,111,692 bytes total (11,500,000-byte limit). A built-CLI smoke test also verifies Japanese → English → Japanese static exports, links, document contents, and retained backups. This is not browser-execution testing.
- Full-suite comparisons of the pinned upstream baseline and this edition are both incomplete, with failures and a long-running test remaining. Neither is considered a full-suite pass.
- Four fixture failures also reproduce against the pinned upstream baseline on the same Windows host: CLI symlink creation EPERM, starting `/bin/sh` for a commit-hook fixture ENOENT, sandbox symlink-file fixture creation EPERM, and sandbox symlink-ancestor fixture creation EPERM. The sandbox's rejection behavior itself has not been runtime-verified.
- NTFS ACL access controls, some Stytch authentication recovery paths, and complete runtime verification of 119 dynamic translation references remain unverified. Exhaustive Japanese-language E2E and visual QA has not been performed. These gaps are not confirmed defects or vulnerabilities.
- The broader static audit leaves 370 legacy translation references with unresolved namespaces, separate from the reviewed changed paths. This does not establish 370 display defects.
- An earlier comparison stalled during a large CLI upload; both current full-suite attempts are incomplete at a REST create/update test. They have not been established to share one cause, and reproducibility in other environments remains unconfirmed.
- Localization of new and changed UI is distinct from an audit of every existing screen. Untranslated English remains in legacy UI; a product-wide count of zero English strings has not been established. External-service errors, user content, and technical identifiers are not guaranteed to be localized.
- “Teammate” values from older clients are preserved because generated and actual names cannot be distinguished. This edition marks generated fallback names for language switching in supported views. Existing notifications may retain their original language after a language change.
- Browser/Embed hosts, the packaged application's visual UI, and native mobile behavior are not verified for this candidate. Source changes alone do not establish that earlier mobile CI failures are resolved.
- Running this build alongside the official Nimbalyst application is not supported. Non-authentication `nimbalyst://` links may open in the currently registered application. Installation, uninstallation, URL and file associations, and authentication from a packaged build remain unverified.
- Windows packaging of the final source stopped with EPERM while renaming the Electron extraction directory. The cause is unconfirmed, and no final installer or ZIP was generated. Earlier local artifacts also retain discrepancies between ASAR declarations and externally placed files. Neither observation establishes a startup failure or vulnerability.
- Features and fixes differ from the current official release. This edition does not automatically apply official updates.

## Source and license

Build instructions and requirements are in the [English README](README.en.md). Source is provided under the [MIT License](LICENSE), retaining the original license and `Copyright (c) 2024-2026 Nimbalyst Inc.` notice. Third-party information is available in the [license list](packages/electron/resources/generated/THIRD_PARTY_LICENSES.json), [audit](packages/electron/resources/generated/THIRD_PARTY_LICENSE_AUDIT.md), and [notices](packages/electron/resources/generated/THIRD_PARTY_NOTICES.txt). This is an unofficial edition independent of the [original repository](https://github.com/nimbalyst/nimbalyst).
