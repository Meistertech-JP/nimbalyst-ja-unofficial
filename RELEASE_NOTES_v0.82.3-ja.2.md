# v0.82.3-ja.2 — Nimbalyst 日本語版（非公式）

本家Nimbalyst v0.82.3の固定コミット `84dcc00f3cd0abbb36eafc6bfad9389f960076db` を基準とするWindows x64版です。Nimbalyst, Inc.の公式製品ではなく、同社による承認・サポートを受けていません。本家の新しい変更や新機能は追加していません。

本日本語版は未署名の通常正式Releaseです。本家v0.82.3のPrerelease分類、および `v0.82.3-ja.2` のSemVer形式とは別に、GitHub Releaseは `prerelease=false` として提供します。

## 変更

- 公開前の作業資料を配布ソースから除外し、利用者・開発者向け文書を訂正しました。過去のタグ・Git履歴・旧ReleaseのソースZIPは保持されており、この整理で過去の資料が消去されたわけではありません。
- Extension SDKとPluginの同梱ガイド16件を更新し、新しいWindowsパッケージへ反映しました。
- アプリ情報に残っていた古い基準バージョン表記を、実際の本家基準0.82.3へ訂正しました。
- 公開対象ファイルの検査とCIを強化しました。通常の技術文書、ソース、テスト、ライセンス・第三者通知は保持しています。
- 既存の日本語化機能、製品識別子、データ保存先、手動更新方針を維持しています。翻訳キー数の一致は、すべての画面や動的参照の確認を意味しません。

## 配布物

- `nimbalyst-0.82.3-ja.2-windows-x64-setup.exe`
- `nimbalyst-0.82.3-ja.2-windows-x64-portable.zip`
- `nimbalyst-0.82.3-ja.2-source.zip`
- `SHA256SUMS.txt`

WindowsアプリとNSISインストーラーは未署名です。警告・保護機能を無効化せず、同じReleaseのSHA256SUMS.txtに記載された同じファイル名のSHA-256を照合してください。ハッシュ一致は電子署名や安全性の保証ではありません。

ソースはタグ `v0.82.3-ja.2` に対応します。既存 `v0.82.3-ja.1` の配布物を改名したものではありません。ZIP版は新しいフォルダーへ完全展開してください。ユーザーデータをEXEの隣に保存する形式ではなく、既定ではインストーラー版と同じ専用保存先を使用します。

## 検証範囲と制限

版ごとの通常製品での操作、静的検査、自動テスト、過去版の観測は[テストと品質検証](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification)に区別して記載しています。以前の製品の成功を、本版での再実行結果として扱いません。

通常のWindows製品で、新規導入、日本語・英語・System表示、明示的な日本語と英語の再起動保持、旧ja.1からの設定・テスト文書・Tracker保持、通常終了・アンインストールを確認しました。同梱ガイド16件は配置と全SHA-256を照合し、そのうちSDKガイド1件と同じバイトのコピーを通常エディターで表示しました。専用導線による全ガイドの直接表示を確認したものではありません。

ワークスペースを持たない「ファイル」→「開く」の試験では、文書本文ではなく英語の「Open a workspace to get started」が日本語UIでも表示されました。

更新試験の初回再起動では、同じWindowsホストで最大約125秒のMain遅延と一時的な無応答を観測し、その後応答が回復しました。セキュリティ製品の通信確認も表示されましたが、原因とは断定していません。同じプロファイルの最終ZIP再試験では通常操作・終了と文書保持を確認した一方、約550msの遅延1件を記録しました。長時間遅延の原因・再発条件は未確定で、恒久的に解消したとはしていません。新規プロファイルの4回の起動では同じ長時間遅延を記録しませんでした。

本版で本番認証は再実施していません。Google認証、特殊な復旧経路、サーバー側セッション失効、別ユーザーのNTFS実効アクセス、外部スクリーンリーダー、全DPI・全画面・全動的翻訳経路も未検証です。チーム復旧には更新された同期サーバーと対応クライアントが必要で、実組織の復旧・独立実クライアント間の完全な復旧手順は未検証です。

WindowsではCLIのsymlink fixtureとsandboxのsymlinkファイル・祖先ディレクトリfixtureの準備時にEPERMとなる既知の未通過試験があります。fixtureが作れなかった拒否試験の動作自体は未検証であり、Linuxの成功をWindowsのPASSへ読み替えません。未検証事項は、確認済みの不具合や脆弱性を意味しません。

公式版の自動更新と手動更新確認は無効です。本リポジトリのReleasesから手動更新します。公式版との同時利用はサポートしません。本版は `nimbalyst://` の既定ハンドラーを取得せず、認証にはnonce付きlocalhost callbackを使用します。認証メールはアプリを起動している同じWindows PCで開いてください。

## ライセンス

MIT Licenseと `Copyright (c) 2024-2026 Nimbalyst Inc.` を保持しています。第三者ライセンスとNOTICEは配布物の `resources/legal` に含みます。

---

# v0.82.3-ja.2 — Nimbalyst — Unofficial Japanese Edition

A Windows x64 revision based on upstream Nimbalyst v0.82.3 commit `84dcc00f3cd0abbb36eafc6bfad9389f960076db`. It is not affiliated with, endorsed by, or supported by Nimbalyst, Inc. No newer upstream changes or new product features are added.

This unsigned edition is a regular stable GitHub Release with `prerelease=false`, independently of upstream v0.82.3's prerelease classification and the SemVer form of `v0.82.3-ja.2`.

## Changes

- Excluded pre-publication working materials from the distributed source and corrected user and developer documentation. Older tags, Git history and previous release source ZIPs are retained; this cleanup does not erase historical materials.
- Updated 16 bundled Extension SDK and Plugin guides and included them in newly generated Windows packages.
- Corrected the outdated upstream baseline label in About to the actual baseline, 0.82.3.
- Strengthened publication-content checks and CI while retaining ordinary technical documentation, source, tests, licenses and third-party notices.
- Retained existing localization, product identifiers, data locations and manual updates. Resource-key parity is not proof that every screen or dynamic reference has been exercised.

## Downloads

- `nimbalyst-0.82.3-ja.2-windows-x64-setup.exe`
- `nimbalyst-0.82.3-ja.2-windows-x64-portable.zip`
- `nimbalyst-0.82.3-ja.2-source.zip`
- `SHA256SUMS.txt`

The Windows application and NSIS installer are unsigned. Do not disable warnings or protections. Compare each file against the SHA-256 entry for the same filename in SHA256SUMS.txt from this release. Matching hashes are not publisher signatures or safety guarantees.

The source corresponds to tag `v0.82.3-ja.2`. These are not renamed `v0.82.3-ja.1` binaries. Fully extract the portable ZIP into a new directory. It does not store user data beside the EXE; by default, it uses the same edition-specific profile location as the installed application.

## Verification scope and limitations

[Testing and Verification](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification-English) distinguishes ordinary-product observations, static checks, automated tests and historical results by version. Successful observations from earlier products are not treated as re-execution on this release.

The ordinary Windows product was checked for clean installation, Japanese/English/System display, explicit Japanese and English persistence after restart, retention of settings/test documents/Tracker across upgrade from ja.1, normal shutdown and uninstall. Placement and all SHA-256 hashes of the 16 bundled guides were verified; a byte-identical copy of one SDK guide was displayed in the normal editor. Direct display of every guide through its dedicated entry was not verified.

A File → Open test without a workspace displayed “Open a workspace to get started” instead of the document, in English even when Japanese UI was selected.

The first restart during the upgrade test recorded Main-process stalls of up to about 125 seconds and a temporarily unresponsive window on the same Windows host, followed by recovery. A security product also displayed connection prompts, but it has not been established as the cause. A final-ZIP recheck of the same profile completed ordinary operations, document retention and shutdown, while still recording one roughly 550ms delay. The original long delay's cause and recurrence conditions remain unknown; it is not claimed to be permanently resolved. Four fresh-profile starts did not record the same long delay.

Production authentication has not been repeated on this binary. Google sign-in, special recovery paths, server-side session revocation, cross-user NTFS effective access, external screen readers, every DPI/screen configuration and complete dynamic-translation coverage remain unverified. Team recovery requires the updated sync server and compatible clients; production-organization recovery and the complete procedure across independent real clients remain unverified.

Known Windows tests remain unpassed because EPERM prevents creation of a CLI symlink fixture and sandbox symlink-file and ancestor-directory fixtures. Rejection assertions that could not execute remain unverified. Linux success is not recorded as a Windows pass. Unverified areas are not confirmed defects or vulnerabilities.

Official automatic updates and manual update checks are disabled. Update manually through this repository's Releases. Simultaneous use with the official application is unsupported. This edition does not claim the default `nimbalyst://` handler; authentication uses a nonce-protected localhost callback. Open authentication email on the same Windows PC running the application.

## Licensing

The MIT License and `Copyright (c) 2024-2026 Nimbalyst Inc.` are retained. Bundled third-party licenses and notices are under `resources/legal`.
