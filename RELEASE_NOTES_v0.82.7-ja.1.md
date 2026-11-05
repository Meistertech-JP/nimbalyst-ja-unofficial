# Nimbalyst 日本語版（非公式） v0.82.7-ja.1

## 日本語

本家Nimbalyst v0.82.7（`826adb4f93dbe86db35b76ce2502a3a33abe0489`）に基づく、Windows x64向けの非公式日本語版です。未署名の通常正式リリースとして配布します。公開品質判定は **GO WITH KNOWN LIMITATIONS** です。

### 本家から取り込んだ変更

- Lexical 0.53とMarkdownの色付きテキスト対応。
- PGLiteからSQLiteへの自動移行。
- Claude Code・Codex SDK、セッションの承認・質問処理、長大なセッション履歴の読み込みの更新。
- 週次使用量履歴とClaude in Chrome対応。
- WindowsのGit・CLI、Trackerのローカル番号、ファイル・画像・検索等の修正。
- 本家Issue #1889由来の修正の統合。

これらは本家からの取り込み内容です。Claude in Chromeの実接続や有料AIプロバイダーとの実通信を今回独立して確認したという意味ではありません。

### 日本語版

新しいUIと移行画面の日本語表示を追加し、日本語・英語・Systemの切替、Electronネイティブメニュー、独立した設定・データ、nonce付きlocalhost認証と暗号化保存方針を維持しました。送信に失敗したセッション入力は下書きへ残し、エラーを現在の表示言語で示します。

共有資源は27名前空間、英語・日本語各15,321キーです。キー差・空の日本語翻訳・補間差は0ですが、全画面・全動的経路の翻訳完了保証ではありません。

### ダウンロードと手動更新

次の4ファイルを[このRelease](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1)から提供します。

- `nimbalyst-0.82.7-ja.1-windows-x64-setup.exe` — 通常の導入・上書き更新用NSISインストーラー。
- `nimbalyst-0.82.7-ja.1-windows-x64-portable.zip` — 新しいフォルダーへ全内容を展開して実行。ユーザーデータがEXEの隣に保存される形式ではありません。
- `nimbalyst-0.82.7-ja.1-source.zip` — 公開タグに対応するソース。
- `SHA256SUMS.txt` — 上記3ファイルのSHA-256。

Windowsアプリとインストーラーは未署名です。取得元・版・チェックサムを確認し、OSやセキュリティソフトの保護機能を無効化しないでください。ハッシュ一致は電子署名や無害性の保証ではありません。

公式自動更新・手動更新確認は無効です。本リポジトリのReleasesから手動更新してください。更新前に作業を保存し、プロジェクト文書をバックアップしてください。旧v0.82.4-ja.1と既存タグ・配布物は保持しています。詳しい導入・更新・削除手順は[Windowsガイド](docs/WINDOWS_JA_UNOFFICIAL.md)と[Wiki](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki)を参照してください。

### 検証範囲と既知制限

39ワークスペースの型検査、翻訳資源、容量7項目、配布物とソースの対応を確認しました。固定製品コードのLinux比較は本版19,754 PASS／0 FAIL／30 SKIP、本家18,533 PASS／0 FAIL／30 SKIPです。[実行記録](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/42008631197)。Linux向け製品の動作保証ではありません。

Windows通常製品では、新規導入・旧版からの更新・Portable起動・日英即時切替と再起動保持・通常終了・アンインストール・合成PGLite→SQLite移行・rg.exe・主要Worker／ABI等を確認しています。実ユーザーデータ全量の移行保証ではありません。本番認証は最終バイナリで新たに再実行していません。

**Windows端末の自然終了には未修正の共有問題があります。** 本家・本版とも外側のshell／CLIを20回自然終了させる比較で、Mainメモリ約156 MiB増加とMessagePort／ConPTY資源の残留を観測しました。通常の永続shell内のコマンド1回ごとの問題ではありません。調査範囲では次PTY作成失敗・データ損失・終了不能はなく、通常終了後に追跡対象は回収されました。多数の自然終了後にメモリが増えた場合は、保存して通常終了・再起動してください。自然終了後のパネルcloseだけで必ず回収されるとは限りません。20回から無制限の増加を断定しません。

大きな編集可能文書では高CPU、高負荷時にはローカルWikiのセッション開始文脈の遅延・省略が起きる場合があります。限定負荷のWiki試験は両版各3回成功しましたが、以前の単発時間超過の直接原因は未確定です。アクセシビリティの無効化は推奨しません。

**Windows全体試験は正常完走していません。** 両版で同一プロセスloopback通信の停止や、ホストによるHTML／CSP書換え等の失敗を観測しました。別プロセスで動く実サーバーの主要APIは両版とも成功しましたが、全Windows試験PASSとは扱いません。

共同編集実サーバー・組織、旧新同期サーバー相互運用、一部の有料AI通信とChrome接続、実スリープ・復帰、全動的翻訳・DPI・スクリーンリーダー条件等は未検証です。詳しくは[日英の既知制限](docs/KNOWN_LIMITATIONS_v0.82.7-ja.1.md)と[検証Wiki](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification)を参照してください。

本プロジェクトはNimbalyst, Inc.の公式製品ではなく、同社による承認・サポートを受けていません。公式版との同時利用はサポートせず、独自ID・保存先を使用し、`nimbalyst://` の既定ハンドラーを取得しません。認証メールはアプリを起動している同じWindows PCで開いてください。

[MIT License](LICENSE)と元の著作権表示を保持し、第三者ライセンス・NOTICEを同梱しています。

## English

An unofficial Windows x64 Japanese edition based on upstream Nimbalyst v0.82.7 (`826adb4f93dbe86db35b76ce2502a3a33abe0489`). This is a regular release with unsigned Windows distributions. The publication quality decision is **GO WITH KNOWN LIMITATIONS**.

### Incorporated upstream changes

- Lexical 0.53 and colored text in Markdown.
- Automatic migration from PGLite to SQLite.
- Claude Code/Codex SDK updates, session approval/question improvements and long-history loading improvements.
- Weekly usage history and Claude in Chrome support.
- Windows Git/CLI, Tracker local-number, file, image and search fixes.
- Integration of fixes originating from upstream issue #1889.

These describe incorporated upstream work, not independent live verification of Chrome connections or paid AI-provider requests.

### Japanese edition

Adds Japanese display for new controls and the migration screen, retaining Japanese/English/System switching, Electron native menus, separate settings/data, and nonce-protected localhost authentication with encrypted-storage policy. Failed session submissions stay in the draft, with errors shown in the current display language.

Resources contain 27 namespaces and 15,321 keys per language, with zero key differences, empty Japanese translations or interpolation differences. This is not a translation guarantee for every screen and dynamic path.

### Downloads and manual updates

The [release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1) provides:

- `nimbalyst-0.82.7-ja.1-windows-x64-setup.exe` — NSIS installer for installation and upgrade.
- `nimbalyst-0.82.7-ja.1-windows-x64-portable.zip` — extract everything into a new directory and run; user data is not necessarily stored beside the EXE.
- `nimbalyst-0.82.7-ja.1-source.zip` — source corresponding to the published tag.
- `SHA256SUMS.txt` — SHA-256 for the three files above.

The Windows app and installer are unsigned. Check the source, version and hashes; do not disable operating-system or security-software protections. Hashes are not signatures or safety guarantees.

Official automatic updates and manual update checks are disabled. Update manually through this repository's Releases. Save work and back up project documents before upgrading. Existing tags and distributions, including v0.82.4-ja.1, are retained. See the [Windows guide](docs/WINDOWS_JA_UNOFFICIAL.md#english) and [Wiki](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Home-English).

### Verification and known limitations

Checks cover 39 workspace typechecks, translation resources, seven bundle budgets and distribution-to-source correspondence. The fixed Linux comparison recorded 19,754 PASS / 0 FAIL / 30 SKIP for this edition and 18,533 PASS / 0 FAIL / 30 SKIP upstream ([run](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/42008631197)). This does not guarantee a Linux product.

Regular Windows-product observations cover fresh installation, upgrade, Portable startup, live language switching and restart persistence, normal shutdown, uninstall, synthetic PGLite-to-SQLite migration, rg.exe and major Workers/native ABI. Synthetic migration is not a guarantee for every real profile. Production sign-in was not newly repeated on the final binary.

**Natural terminal exit has an unfixed shared cleanup issue.** Twenty natural exits of outer shell/CLI processes increased Main memory by about 156 MiB and retained MessagePort/ConPTY resources in both upstream and this edition. This is not per command inside a persistent shell. Within the tested scope, the next PTY could be created, no data loss or quit failure was observed, and tracked resources were reclaimed after normal shutdown. If memory grows after many natural exits, save work, quit normally and restart. Closing a panel after natural exit may not reclaim resources. Twenty observations do not establish unlimited linear growth.

Large editable documents can cause elevated CPU use. Under heavy load, local-wiki startup context may be delayed or omitted. Bounded-load Wiki tests passed three times per revision, but an earlier isolated full-load timing failure remains unexplained. Disabling accessibility is not a recommended workaround.

**The Windows full suite did not finish normally.** Both revisions showed same-process loopback stalls and failures including host-side HTML/CSP rewriting. Major API checks with the real server in a separate process passed both revisions; this is not an all-pass Windows suite.

Live collaboration servers/organizations, old/new sync-server interoperability, some paid AI requests and Chrome connections, actual sleep/resume, every dynamic translation path and all DPI/screen-reader conditions remain unverified. See the [bilingual limitations](docs/KNOWN_LIMITATIONS_v0.82.7-ja.1.md#english) and [verification Wiki](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification-English).

This project is not affiliated with, endorsed by or supported by Nimbalyst, Inc. Running alongside the official application is unsupported. It uses a separate ID/profile and does not claim the default `nimbalyst://` handler. Open authentication email on the same Windows PC running the app.

The upstream [MIT license](LICENSE), copyright notices and third-party licenses/notices are retained.
