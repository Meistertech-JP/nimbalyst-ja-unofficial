# Nimbalyst 日本語版（非公式） v0.81.7-ja.1 — Preview

Nimbalyst デスクトップ版 v0.81.7をベースにした日本語化ソースのプレビューです。本版はNimbalyst, Inc.の公式製品ではなく、同社による開発・サポート・承認を受けたものではありません。

ソース限定Prereleaseです。Windowsバイナリは提供しません。ローカルで生成したWindowsパッケージは未署名で、インストール・起動・認証・アンインストールを実機で検証していません。

## 内容

- 設定、ファイル管理、AIセッション、トラッカー、Git/プルリクエスト、拡張機能、ダイアログなどのユーザーインターフェースに日本語表示を追加しました。
- アプリ設定で日本語と英語を切り替えられます。選択した表示言語は再起動後も保持されます。
- 非公式ビルドでは公式版の自動更新と手動更新確認を無効にしています。
- Windowsアプリ識別子と既定のユーザーデータ保存先を公式版と分離しています。既存の公式版ユーザーデータは移動・削除しません。

## 既知の制限

- 旧クライアントの共同編集データでは既定名と実名を区別できないため、「Teammate」は変更しません。本版が生成する既定名には由来情報を付け、対応する表示で日本語・英語を切り替えます。
- Windows環境での全体単体テストには未解決の失敗があります。関連する日本語化テストの成功は、全機能の動作保証を意味しません。
- 固定upstreamベースでも再現する既知のテスト失敗があります。Windowsでは試験用symlinkの作成がEPERMで失敗するため、symlinkファイルとsymlink祖先ディレクトリの拒否動作を実行時に確認できていません。NTFS ACLとStytchの一部の認証復旧経路も未検証です。未検証であることは、不具合や脆弱性が確認されたことを意味しません。
- 動的翻訳参照119件について実行時の完全な確認ができておらず、日本語実画面の網羅的なE2E検証も未実施です。
- 特定のホスト環境で大容量CLIアップロードが停止しています。すべての環境での再現は確認できていません。
- 外部のBrowser/Embedホストと配布用アプリの実画面は未検証です。外部サービスや実行環境のエラー、旧形式の共同編集データには英語が含まれる場合があります。表示中の通知は言語切替後も元の言語が残る場合があります。
- このプレビューにはソースコードのみを掲載し、Windowsインストーラーやポータブル版などの実行バイナリは含めていません。Windowsパッケージのプロトコル登録およびパッケージからの認証コールバックを確認できていないためです。
- 公式Nimbalystとの同時利用はサポート対象外です。本版の認証はインスタンス専用のnonce付きlocalhost HTTPコールバックを使用し、Windows起動時に `nimbalyst://` の既定ハンドラーを変更しません。認証以外の `nimbalyst://` リンクは現在の登録先アプリで開かれる場合があります。Windowsでのファイル関連付け、インストール・アンインストールは未検証です。
- 現在の公式最新版とは、機能や修正内容が異なる場合があります。本版は公式版の更新を自動適用しません。

## 配布物

このプレビューでは実行バイナリを配布しません。ソースコードはリポジトリから取得できます。将来Windowsバイナリを配布する場合は、署名の有無をリリースごとに明記します。

---

# Nimbalyst — Unofficial Japanese Edition v0.81.7-ja.1 — Preview

A source preview of the Japanese localization based on Nimbalyst desktop version 0.81.7. This is not an official product of Nimbalyst, Inc. and is not developed, supported, or endorsed by the company.

This is a source-only prerelease. Windows binaries are not provided. The locally generated Windows packages are unsigned; installation, startup, authentication, and uninstallation have not been validated on a Windows machine.

## Included

- Japanese UI text for settings, file management, AI sessions, trackers, Git and pull requests, extensions, dialogs, and other interface areas.
- Japanese and English display-language selection in the app settings. The selected language persists across restarts.
- Automatic updates and the manual update-check action are disabled in this unofficial build.
- A Windows application identifier and default user-data directory separate from the official release. Existing official user data is not moved or deleted.

## Known limitations

- “Teammate” values from older clients are preserved because generated and actual names cannot be distinguished. This edition marks generated fallback names for Japanese and English display in supported views.
- The full unit-test suite has unresolved failures on Windows. Passing localization tests does not establish that every application feature works.
- Known test failures also reproduce on the pinned upstream baseline. On Windows, EPERM during test-symlink creation prevents runtime verification of the rejection of symlinked files and symlinked ancestor directories. NTFS ACL behavior and some Stytch authentication recovery paths remain unverified. These verification gaps are not confirmed defects or vulnerabilities.
- Complete runtime verification of 119 dynamic translation references and exhaustive Japanese-language E2E and visual QA remain pending.
- Large CLI uploads stall in a particular host environment. This has not been established as a problem affecting all environments.
- External Browser/Embed hosts and the packaged application's visual UI have not been verified. External-service and runtime errors, and legacy collaboration data, may contain English. Existing notifications may retain their original language after a language change.
- This preview contains source code only; it does not include a Windows installer, portable build, or other executable binary. Windows package protocol registration and authentication callbacks from a packaged build have not been verified.
- Running this build alongside the official Nimbalyst application is not supported. Authentication uses an instance-specific, nonce-protected localhost HTTP callback. Starting this edition on Windows does not change the default `nimbalyst://` handler; non-authentication links may open in the currently registered application. Windows file associations, installation, and uninstallation have not been verified.
- Features and fixes may differ from the current official release. This edition does not automatically apply updates from the official release.

## Distribution

No executable binary is provided with this preview. Source code is available from the repository. If a Windows binary is distributed in a future release, its signing status will be stated for that release.
