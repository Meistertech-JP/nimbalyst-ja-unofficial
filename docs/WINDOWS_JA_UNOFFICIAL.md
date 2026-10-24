# Nimbalyst 日本語版（非公式） — Windows利用ガイド

対象はWindows x64向けの未署名版です。本版はNimbalyst, Inc.の公式製品ではありません。[English](#english)

## 現在の提供状況

v0.81.7-ja.3はWindows x64向けの正式リリースです。[最新版](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/latest)から、未署名NSISインストーラー、ポータブルZIP、ソースZIP、`SHA256SUMS.txt`を取得できます。通常Windows版によるメール認証、暗号化保存、アカウント表示の復元、ログアウト、インストール・アンインストールを確認しています。旧v0.81.7-ja.2はソース限定のまま保持しています。

## 未署名と取得元の確認

配布するアプリとインストーラーは未署名です。Windowsが証明書で確認する発行元はありません。設定やファイル情報の「発行元」文字列は、電子署名による本人性の証明ではありません。同梱される第三者プログラムに署名があっても、本版全体やインストーラーの署名にはなりません。

配布物は[このリポジトリのReleases](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases)の対象バージョンと照合してください。SmartScreen、ウイルス対策ソフト、組織のポリシーで実行が制限される場合があります。警告・保護機能を無効にしたり、除外設定を追加したりする手順は提供しません。判断できない場合は実行を中止してください。

## ソースZIP・Windows配布物のSHA-256

ソースZIP、インストーラー、ポータブルZIPは、それぞれ対象ファイルのチェックサムと比較します。別バージョン、別形式のハッシュを使わないでください。配布の際に添付するチェックサムの対象は掲載されたファイルだけで、ソースから自分で再ビルドしたファイルが同じ値になる保証はありません。

PowerShellで、ダウンロードしたファイルを指定して計算します。

```powershell
$artifact = Read-Host '確認するファイルのフルパス'
Get-FileHash -LiteralPath $artifact -Algorithm SHA256
```

表示されたHashの64桁の16進数を、同じReleaseのチェックサムに記載された**同じファイル名**の値と照合します。大文字・小文字の違いは値に影響しません。不一致なら展開・実行を行わないでください。

SHA-256の一致で分かるのはファイルのバイト一致です。同じ配布元のファイルとチェックサムの両方が置き換わった場合を検出する署名ではなく、発行元の真正性、無害性、動作保証を証明しません。

ソースZIPは空の作業ディレクトリに展開し、既存プロジェクトへ上書きしないでください。公開ソースのタグ・コミット、ライセンス、ロックファイルと照合してからビルドします。Windows用ZIPも既存版へ上書き展開せず、新しいディレクトリへ完全に展開してください。

## インストーラー

1. 公式Nimbalystと本版を終了し、編集中の文書を保存します。公式版との同時利用はサポートしません。
2. 配布対象バージョンとSHA-256を確認したインストーラーを起動します。表示された製品名が **Nimbalyst 日本語版（非公式）** であることを確認します。
3. 公式版のインストール先とは別の場所を選択します。本版のインストーラーは現在のユーザー用で、管理者への昇格を提供しない構成です。
4. 完了後、作成された本版のショートカットから起動します。インストール完了時に自動起動しない構成です。

インストーラーは `jp.meistertech.nimbalyst.ja.unofficial.Markdown` を使い、Markdownの「プログラムから開く」に本版を追加します。既定アプリやUserChoice、`nimbalyst://` の既定ハンドラーを変更しない構成です。

## ポータブルZIP

ZIPの全内容を新しい書込み可能なディレクトリへ展開し、含まれる `Nimbalyst 日本語版（非公式）.exe` を起動します。EXEだけを取り出さず、`resources`、DLL、その他の同梱ファイルをそのまま保持してください。ZIP内から直接起動しないでください。

「ポータブル」はインストーラーを使わない配置を意味します。**ユーザーデータまでEXEの横に保存する意味ではありません。** 既定ではインストーラー版と同じ本版専用ユーザーデータを使うため、両方を同時起動したり異なるバージョンを同じプロファイルで同時使用したりしないでください。ZIPを移動してもユーザーデータは自動移動しません。

## 表示言語とデータ

設定の表示言語で日本語または英語を選びます。選択後はメニューや対応画面へ反映されます。今回の通常製品ビルドで、両方向の切替と、両言語の再起動後の設定保持を確認しています。未訪問の画面や、すべての端末・DPIでの表示保証ではありません。

既定の保存先は `%APPDATA%\Nimbalyst 日本語版（非公式）` です。公式版の保存先とは分離しています。既存の公式版データを本版へ自動移動・コピーしません。認証情報を含むプロファイル全体を第三者へ送らないでください。

## ログインとlocalhost callback

本版の認証フローは、その起動インスタンスのためのnonceを含むlocalhost callbackを使用します。ブラウザでの認証後に `http://127.0.0.1:<port>/auth/callback` へ戻ります。**認証メールはアプリを起動している同じPCで開いてください。** `127.0.0.1` はそのブラウザを実行している端末自身です。スマートフォンでメールを開くとスマートフォン自身へ接続するため、PCのアプリへ認証を返せません。使用済み・期限切れのリンクは、PCのアプリから新しいメールを送ってください。URLを書き換えたり、外部端末へ向けてポートを開放したりする必要はありません。

認証リンクやトークンを共有、転載、診断レポートへ添付しないでください。ログインできない場合に別アプリのURL関連付けやセキュリティ設定を変更することも推奨しません。今回の専用プロファイルではメール認証、暗号化保存、認証ファイルのACL、再起動後のアカウント表示、ログアウトを確認しています。ログアウトはローカル認証状態の削除であり、サービス側セッションの失効までは保証しません。Google認証、一部の復旧経路、他ユーザーを含む実効アクセスは未検証です。既存のWindows保護機能を回避した動作保証はありません。

公式Nimbalystとの同時利用はサポートしません。認証以外の `nimbalyst://` リンクは、現在そのプロトコルを登録しているアプリで開かれる場合があります。

## 手動更新とアンインストール

自動更新と手動更新確認メニューは無効です。公式リポジトリのインストーラーを本版の更新として使用しないでください。

更新前に作業を保存して本版を終了し、プロジェクト文書をバックアップします。対象Releaseの変更内容と既知の制限を読み、取得元とチェックサムを確認した新しい版を使用します。ZIP版は新しいディレクトリへ展開します。バージョンを戻したときのプロファイル互換性は保証しません。

インストーラー版はWindowsのアプリ一覧から **Nimbalyst 日本語版（非公式）** を選んでアンインストールします。本版がまだ所有している登録を解除し、ユーザーデータは保持する構成です。公式版や別の配置が所有する登録を一括削除しません。ZIP版は終了後に、その展開先だけを削除できます。いずれも文書・プロファイルの削除とは別です。

## ビルドとライセンス

ソースのビルド手順は[README](../README.md#ソースからのビルド)を参照してください。`build:win` はNSISインストーラーを生成します。`build:unpack` は検査用の展開済みアプリを生成するスクリプトで、ポータブルZIPそのものの生成や公開ではありません。ZIP配布物は同梱ファイル全体と最終ソースとの対応を検証する必要があります。

[MIT License](../LICENSE)と元の `Copyright (c) 2024-2026 Nimbalyst Inc.` を保持しています。第三者ライセンスと通知は[ソース内の一覧](../packages/electron/resources/generated/THIRD_PARTY_LICENSES.json)およびWindowsパッケージの `resources/legal` を参照してください。

---

## English

# Nimbalyst — Unofficial Japanese Edition — Windows guide

This guide covers an unsigned Windows x64 build. It is not an official product of Nimbalyst, Inc.

### Current availability

v0.81.7-ja.3 is a regular Windows x64 release. Download the unsigned NSIS installer, portable ZIP, source ZIP, and `SHA256SUMS.txt` from the [latest release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/latest). Production email sign-in, encrypted storage, account UI restoration, logout, installation, and uninstallation were verified in the ordinary Windows build. The earlier v0.81.7-ja.2 remains source-only.

### Unsigned files and provenance

Distributed application and installer files are unsigned and have no certificate-verified Windows publisher. Publisher metadata is not a digital signature. A signature on an included third-party executable does not sign this edition or its installer.

Match the file to the version on [this repository's Releases page](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases). SmartScreen, antivirus software, or organizational policies may restrict execution. This guide does not provide steps to disable warnings, add security exclusions, or turn off protections. Do not proceed if you cannot assess the file.

### SHA-256 for source and Windows archives

Check each source ZIP, installer, or portable ZIP against its own entry in the release checksum file. A different version or format has a different hash. Checksums cover the listed assets; they do not promise that a locally rebuilt binary will be byte-identical.

In PowerShell:

```powershell
$artifact = Read-Host 'Full path of the downloaded file'
Get-FileHash -LiteralPath $artifact -Algorithm SHA256
```

Compare the 64-digit hexadecimal Hash with the entry for the **same filename** in the same Release. Upper/lowercase is immaterial. Do not extract or run a mismatching file.

A match proves byte equality, not publisher authenticity, safety, or correct operation. An unsigned checksum does not detect replacement of both the file and its checksum by the same compromised source.

Extract source into a new empty working directory, not over an existing project. Check its published tag/commit, license, and lockfile before building. Extract a Windows ZIP fully into a new directory rather than overwriting an older installation.

### Installer

1. Save work and close both editions. Running alongside the official application is unsupported.
2. Run the installer only after checking its version and SHA-256. Confirm the product name **Nimbalyst 日本語版（非公式）**.
3. Choose a location separate from the official application. The installer is configured for the current user without an elevation offer.
4. Start the application from its own shortcut. The installer is configured not to launch it automatically on completion.

The installer uses `jp.meistertech.nimbalyst.ja.unofficial.Markdown` for an edition-specific Markdown “Open with” entry. It is configured not to change extension defaults, Explorer UserChoice, or the default `nimbalyst://` handler.

### Portable ZIP

Extract the entire ZIP into a new writable directory and run `Nimbalyst 日本語版（非公式）.exe`. Keep `resources`, DLLs, and all accompanying files together. Do not launch from inside the ZIP or copy only the EXE.

“Portable” means no installer is required; **it does not mean user data is stored beside the EXE**. By default, it shares this edition's user-data directory with the installer build. Do not run both simultaneously or concurrently use different versions with one profile. Moving the extracted application does not move its profile.

### Language and user data

Select Japanese or English in display-language settings. Supported views and menus update accordingly. Both switching directions and persistence after restarting in each language were observed in this ordinary production build. This is not coverage of every screen, device, or DPI.

The default profile is `%APPDATA%\Nimbalyst 日本語版（非公式）`, separate from the official application. Official data is not automatically copied or moved. Do not send a profile containing authentication information to others.

### Login and localhost callback

Authentication returns from the browser to `http://127.0.0.1:<port>/auth/callback` using a nonce for the current instance. **Open authentication email on the same PC running the application.** `127.0.0.1` refers to the device running that browser. Opening the email on a smartphone tries to connect to the phone itself, not the PC. Request a fresh email from the PC application if a link is consumed or expired. Do not rewrite the URL or expose the callback port to another device.

Do not share, publish, or attach authentication links or tokens to diagnostic reports. Changing another application's protocol association or bypassing security settings is not a recommended sign-in remedy. Email sign-in, encrypted storage, credential-file ACLs, restored account UI, and logout were observed in the dedicated profile. Logout clears local state without guaranteeing service-side session revocation. Google sign-in, some recovery paths, and effective access involving other users remain unverified.

Running alongside the official application is unsupported. Non-authentication `nimbalyst://` links may open in the application's current registered handler.

### Manual updates and uninstall

Automatic updates and manual update checks are disabled. Do not use an official-repository installer as an update for this edition.

Before updating, save work, close the application, and back up project documents. Read the target release's changes and limitations, then verify its source and checksums. Extract ZIP updates into a new directory. Downgrade compatibility of a user profile is not guaranteed.

For an installer build, select **Nimbalyst 日本語版（非公式）** in Windows' application list to uninstall. Uninstallation is configured to remove only registrations still owned by that installation and retain user data. It does not bulk-remove another edition's or placement's registrations. After closing a ZIP build, its extraction directory alone can be removed. Removing application files is separate from deleting documents or profiles.

### Building and licenses

See [Build from source](../README.en.md#build-from-source). `build:win` creates the NSIS installer. `build:unpack` creates an unpacked application for inspection, not a published portable ZIP. A ZIP distribution requires verification of the entire payload against its final source.

The [MIT License](../LICENSE) and original `Copyright (c) 2024-2026 Nimbalyst Inc.` are retained. See the [source license inventory](../packages/electron/resources/generated/THIRD_PARTY_LICENSES.json) and `resources/legal` in the Windows package for third-party notices.
