# Nimbalyst 日本語版（非公式） v0.81.7-ja.3 — 未公開候補

Nimbalystデスクトップ版 v0.81.7をベースとする非公式日本語版の次期候補です。Nimbalyst, Inc.の公式製品ではなく、同社による開発・サポート・承認を受けたものではありません。

**この版は未公開です。** 公開済みのv0.81.7-ja.2は引き続きソース限定Prereleaseで、変更しません。v0.81.7-ja.3のWindows配布可否、最終成果物、チェックサムはまだ確定していません。実アカウント認証・認証情報保護の最終検証が残っています。

## v0.81.7-ja.2からの変更

- About画面に非公式版の名称・説明・注意事項を表示し、言語・テーマの変更を反映します。
- Settingsのグループ見出し、長いラベル、tooltip、コメントのfocus通知、共有プロジェクトのアプリ側fallbackを日本語表示へ接続します。外部エラーの詳細やユーザーが入力した名前は翻訳で置き換えません。
- Git修復用の入力下書き、新規ファイルの説明、DataModel・Mockupの初期内容、保存・エクスポート用ダイアログ、HTML出力、同梱コマンドの説明を表示言語に対応させます。Gitコマンドやファイルパスの意味は変えず、下書きを自動送信しません。
- 日本語のチュートリアル文書、トラッカー、セッション例を追加します。新規作成時に言語を選び、既存のチュートリアルやその編集内容を保持します。
- 本候補の翻訳リソースは27名前空間、英日各14,551キーです。公開済みソースから各言語150キーを追加し、1キーの内容を変更しています。既存キーの削除はありません。リソース整合は、全画面の動作や翻訳完了の保証ではありません。
- Windows Workerを外側のNode.jsモジュール設定から分離する配置・モジュール形式を使用し、SQLiteと同梱リソースの起動・パッケージ検査を強化します。
- Windows x64インストーラーの圧縮設定を同梱展開器と整合させます。Markdownの「プログラムから開く」は本版専用の登録とし、拡張子の既定値やUserChoiceを上書きしません。
- アプリの既定プロファイル分離を起動初期に適用します。公式更新は引き続き無効です。
- サインイン情報は暗号化保存の成功後に反映し、保存できない場合は平文へ切り替えず失敗を通知します。ログアウトや同じアカウントの再認証後に古い更新応答が状態を上書きしないようにし、認証情報の保存エラーを日英で表示します。
- ファイルへのログ保存を無効にした設定を、レンダラー・終了時の診断ログと自動CPUプロファイルにも適用します。更新処理がこの設定を上書きしないようにします。

固定upstreamは `e14ddf383a8dbb40e511fc2c2ea50273d08e3579` のままです。公式mainの新しい変更を取り込んだ版ではありません。Wikiの翻訳遅延ロードと静的出力機能は維持します。

## 確認済みの範囲

直前のローカル検証用パッケージで、通常インストール・起動・アンインストール、日本語から英語／英語から日本語への切替、両言語での再起動後の設定保持、選択したSettings画面とnative menu、同一展開物の4種類の配置を確認しました。監査対象の既存プロファイル・関連付けなどについて差分がないことを確認しています。これは全ホスト状態の同一性や公式版との同時利用を保証しません。

基準ソースでは38 workspaceの型検査と、関連60ファイル591テストが成功しています。**これらは新しいv0.81.7-ja.3最終パッケージの試験結果ではありません。** 実アカウントの認証、暗号化保存、再起動・ログアウト後の取り扱い、NTFS ACL、認証復旧は最終判定待ちです。

## 配布・署名・更新

候補の対象は未署名Windows x64版です。ローカル生成したアプリとインストーラーには、証明書に基づくWindows発行元の証明がありません。SmartScreenなどの警告が表示される可能性があります。保護機能の無効化は案内しません。

配布が承認された成果物だけを、対応するソースとSHA-256チェックサムとともに掲載します。現時点でこの版のバイナリやチェックサムは公開されていません。SHA-256はファイルの一致確認用であり、コード署名や発行元認証の代わりではありません。

公式Nimbalystの更新は自動取得・適用せず、手動更新確認も無効です。更新は本リポジトリの公開内容から手動で行います。

## 互換性と制限

- 公式Nimbalystとの同時利用はサポートしません。Windowsアプリ識別子は `jp.meistertech.nimbalyst.ja.unofficial` で、インストール先・ユーザーデータを分離しています。
- 認証はインスタンスごとのnonce付きlocalhost callbackを使用する構成です。Windows版は `nimbalyst://` の既定ハンドラーを取得しません。同プロトコルの認証以外のリンクは現在の登録先で開かれる場合があります。
- 固定upstreamでも再現した4件のWindows試験失敗は未通過のままです。CLI symlink fixtureとsandboxの2種類のsymlink fixtureはEPERM、commit-hookの `/bin/sh` はENOENTです。sandboxの拒否処理を実行できたとは扱いません。
- 全体テストには未完走の履歴があり、全件成功とはしていません。動的翻訳参照119件の完全な実行時確認と、過去の静的監査で名前空間が未確定だった旧来の参照370件の網羅的確認も未完了です。
- 未訪問の画面、tooltip、アクセシビリティラベル、Browser/Embedホスト、すべてのDPI・端末を確認したものではありません。全製品の固定英語0件とは判定しません。
- NTFS ACLとStytchの一部の認証復旧経路の最終確認は未完了です。これらの未検証事項は、確認済みの脆弱性・不具合とは区別します。
- 外部エラー、技術識別子、ユーザー文書、表示済み通知や旧形式の共同編集データに英語が残る場合があります。
- macOS、Linux、Android、iOSの配布物・実機動作は今回のWindows候補の検証範囲外です。

## 利用方法とライセンス

[README](README.md)にビルド方法、[Windows利用ガイド](docs/WINDOWS_JA_UNOFFICIAL.md)に未署名版、展開・インストール、チェックサム、手動更新を記載しています。

[MIT License](LICENSE)と `Copyright (c) 2024-2026 Nimbalyst Inc.` を保持しています。同梱ソフトウェアの[ライセンス一覧](packages/electron/resources/generated/THIRD_PARTY_LICENSES.json)と[NOTICE](packages/electron/resources/generated/THIRD_PARTY_NOTICES.txt)も参照してください。[本家リポジトリ](https://github.com/nimbalyst/nimbalyst)とは独立した非公式版です。

---

## English

# Nimbalyst — Unofficial Japanese Edition v0.81.7-ja.3 — Unpublished candidate

This is the next candidate of the unofficial Japanese edition based on Nimbalyst desktop v0.81.7. It is not affiliated with, endorsed by, or supported by Nimbalyst, Inc.

**This version is not published.** The published v0.81.7-ja.2 remains a source-only prerelease and is unchanged. Windows distribution readiness, final artifacts, and checksums for v0.81.7-ja.3 have not been finalized. Real-account authentication and credential-protection verification remain open.

### Changes since v0.81.7-ja.2

- About presents the unofficial edition's name, description, and notices, and responds to language and theme changes.
- Settings group headings, long labels, tooltips, comment-focus notices, and application-owned shared-project fallbacks are localized. External error details and user names are not replaced.
- Git repair drafts, new-file descriptions, DataModel and Mockup seeds, save/export dialogs, HTML output, and bundled command descriptions follow the display language. Git commands and paths retain their meaning; drafts are not sent automatically.
- Japanese tutorial documents, trackers, and session examples are included. Language is selected when a tutorial is created; existing tutorials and user edits are retained.
- The candidate's translation resources have 27 namespaces and 14,551 keys in each language: 150 additions and one changed value per language since the published source, with no removals. Resource consistency is not complete runtime or translation coverage.
- Windows Workers use a layout and module format isolated from an enclosing Node.js module setting; SQLite startup and packaged-resource checks are strengthened.
- Windows x64 installer compression is aligned with the bundled extractor. Markdown “Open with” uses an edition-specific registration without replacing extension defaults or UserChoice.
- Default profile separation takes effect early in startup. Official updates remain disabled.
- Sign-in state is published only after encrypted storage succeeds; storage failure is reported without falling back to plaintext. Stale refresh responses cannot overwrite sign-out or successful reauthentication of the same account, and storage errors have Japanese and English messages.
- Disabling file logging also disables renderer and shutdown diagnostic files and automatic CPU-profile files. The updater no longer overrides the shared logging setting.

The pinned upstream remains `e14ddf383a8dbb40e511fc2c2ea50273d08e3579`. This candidate does not incorporate a newer official main. Wiki translation lazy loading and static export are retained.

### Verified scope

The preceding local validation package was tested for normal installation, startup and uninstallation, Japanese/English switching, persistence after restarting in both languages, selected Settings screens and native menus, and four placements of the same extracted payload. Monitored existing profile and association state was preserved. This does not prove whole-host equality or compatibility with simultaneous official-edition use.

The baseline passed typecheck in 38 workspaces and 591 related tests across 60 files. **These results do not verify the final v0.81.7-ja.3 package.** Real-account authentication, encrypted storage, restart/logout handling, NTFS ACLs, and authentication recovery await final assessment.

### Distribution, signing, and updates

The candidate targets unsigned Windows x64 distribution. Locally generated application and installer files have no certificate-backed Windows publisher identity. SmartScreen or other security software may show warnings. This project does not advise disabling protections.

Only artifacts approved for distribution will be listed with their corresponding source and SHA-256 checksums. No binary or checksum for this version is currently published. SHA-256 verifies file equality; it is not a code signature or publisher authentication.

Official Nimbalyst updates are not downloaded or applied, and manual update checks are disabled. Updates are manual through this repository's published releases.

### Compatibility and limitations

- Running alongside the official application is not supported. The Windows application ID is `jp.meistertech.nimbalyst.ja.unofficial`, with separate installation and user-data locations.
- Authentication is configured for an instance-specific nonce-protected localhost callback. The Windows build does not claim `nimbalyst://`; non-authentication links may open in the currently registered application.
- Four Windows test failures reproduced with the pinned upstream remain failures: EPERM for the CLI symlink fixture and two sandbox symlink fixtures, and ENOENT for commit-hook `/bin/sh`. The sandbox rejection behavior itself was not exercised.
- Earlier full-suite runs did not complete; no all-tests-passed claim is made. Complete runtime verification of 119 dynamic references and comprehensive review of 370 legacy references with unresolved namespaces from an earlier static audit remain incomplete.
- Unvisited screens, tooltips, accessibility labels, Browser/Embed hosts, and all DPI/device combinations are not covered. There is no product-wide zero-English claim.
- Final NTFS ACL and some Stytch recovery-path verification is incomplete. Unverified areas are not confirmed defects or vulnerabilities.
- External errors, technical identifiers, user documents, existing notices, and legacy collaboration data may remain in English.
- macOS, Linux, Android, and iOS distributions and native behavior are outside this Windows candidate's verification scope.

### Documentation and license

See the [README](README.en.md) for builds and the [Windows guide](docs/WINDOWS_JA_UNOFFICIAL.md#english) for unsigned builds, installation/extraction, checksums, and manual updates.

The [MIT License](LICENSE) and `Copyright (c) 2024-2026 Nimbalyst Inc.` are retained. See the bundled-software [license inventory](packages/electron/resources/generated/THIRD_PARTY_LICENSES.json) and [notices](packages/electron/resources/generated/THIRD_PARTY_NOTICES.txt). This edition is independent of the [original repository](https://github.com/nimbalyst/nimbalyst).
