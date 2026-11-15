# Windowsへの導入と更新

[English](#english) · [最新版のRelease](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1)

このガイドは、非公式日本語版 **v0.84.0-ja.1・Windows x64** を使う方向けです。Nimbalyst, Inc.の公式製品ではありません。本家v0.84.0はPrereleaseで、日本語版の通常Release・Latest指定も安定性保証を意味しません。

## インストーラーとZIP、どちらを選ぶか

- **インストーラー（setup.exe）**：Windowsのアプリ一覧やショートカットから起動・アンインストールしたい場合に選びます。現在のユーザー用で、管理者向けのインストールではありません。
- **Portable ZIP**：インストーラーを使わず、展開したフォルダーから起動したい場合に選びます。EXEだけでなく同梱ファイル全体が必要です。

どちらも既定では同じ日本語版専用の設定・データを使います。「Portable」は、設定もEXEの隣へ保存するという意味ではありません。インストーラー版とZIP版、公式版と本版を同時に起動しないでください。

## ダウンロードしたファイルを確認する

[Releaseページ](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1)から、選んだWindows配布物とSHA256SUMS.txtを取得します。対応Source ZIPは、自分でビルドしたい方向けです。

配布アプリとインストーラーは**未署名**です。Windowsやウイルス対策ソフトの警告・組織のルールを無効にする手順は提供しません。確認できない場合は実行を中止してください。ファイル情報の発行元文字列や、同梱第三者プログラムの署名は、本版全体の電子署名ではありません。

PowerShellでダウンロードしたファイルのフルパスを指定します。

~~~powershell
$artifact = Read-Host '確認するファイルのフルパス'
Get-FileHash -LiteralPath $artifact -Algorithm SHA256
~~~

表示された64桁のHashを、SHA256SUMS.txtの**同じファイル名**の値と比べます。大文字・小文字の違いは値に影響しません。不一致なら実行・展開をしないでください。

hash一致は配布物とのバイト一致を示すもので、電子署名や安全性保証ではありません。配布物とチェックサムが両方置き換わった場合の真正性を保証するものでもありません。自分で再ビルドしたファイルが同じhashになる保証はありません。

## インストーラーで導入する

1. 作業を保存して本版と公式版を終了します。
2. 照合済みのsetup.exeを起動し、製品名が「Nimbalyst 日本語版（非公式）」であることを確認します。
3. 公式版とは別のインストール先を使います。既定は `%LOCALAPPDATA%\Programs\nimbalyst-ja-unofficial` です。
4. 完了後、作成された本版のショートカットから起動します。インストール完了時に自動起動しない構成です。

本版はMarkdownの「プログラムから開く」に専用項目を追加しますが、既定アプリやUserChoice、`nimbalyst://` の既定ハンドラーは変更しない構成です。

## ZIPから起動する

1. ZIPの全内容を、新しい書き込み可能なフォルダーへ展開します。ZIP内から直接起動しないでください。
2. DLLやresourcesフォルダーをそのまま残し、「Nimbalyst 日本語版（非公式）.exe」を起動します。

EXEだけを別の場所へ取り出すと動作しません。ZIPのフォルダーを移動しても、設定・ユーザーデータが一緒に移動するわけではありません。

## 最初の設定とログイン

表示言語は、設定 → アプリ → 詳細設定 → 表示言語で日本語・English・Systemから選べます。エージェントの回答言語や、自分の文書の言語とは別です。

既定のユーザーデータは `%APPDATA%\Nimbalyst 日本語版（非公式）` に保存します。公式版のデータを自動移動・削除しません。文書はアプリの配置先とは別の作業フォルダーに保存し、認証情報を含むプロファイル全体を第三者へ送らないでください。

Nimbalystのメール認証は、設定のアカウント画面から開始します。**アプリを起動している同じWindows PCでメールのリンクを開いてください。** 認証後に戻る127.0.0.1は、そのブラウザーを動かしている端末自身を指すため、スマートフォンで開いてもPCのアプリへ結果を返せません。

使用済み・期限切れなら、PCのアプリから新しいメールを送ります。URLを書き換えたり、外部向けポートを開放したりする必要はありません。認証リンクやコードは共有しないでください。NimbalystのログインとClaude・Codex等の認証は別です。[認証の案内](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Account-and-Authentication)を参照してください。

## v0.82.8-ja.1から手動で更新する

自動更新と公式版の更新確認は無効です。本リポジトリのReleaseを使い、公式版のインストーラーを日本語版の更新として実行しないでください。

1. [リリースノート](../RELEASE_NOTES_v0.84.0-ja.1.md)と[既知制限](KNOWN_LIMITATIONS_v0.84.0-ja.1.md)を確認します。
2. 作業を保存し、重要な文書をバックアップして本版を終了します。
3. インストーラー版は、照合済みの新しいsetup.exeで同じ日本語版を更新します。ZIP版は新しいフォルダーへ完全に展開し、旧版へ上書き展開せず、新しいEXEから起動します。
4. 設定・文書・Trackerを確認します。異なるバージョンを同じプロファイルで同時使用しないでください。

専用環境では前版からの更新時の設定・文書・Tracker表示の保持を確認しましたが、すべての実ユーザーデータの互換性保証ではありません。データ移行中に強制終了せず、**旧版へのダウングレードを復旧方法として前提にしないでください**。旧版で新しいセッション情報を読めない場合があり、ダウングレードは未検証です。

長文Markdownの高CPU負荷とWindows全テストの未解決FAILは残っています。実サーバーを使うチーム機能にも制限があります。詳しい確認範囲は[検証記録](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification)へ分けています。

## アンインストールする

インストーラー版はWindowsのアプリ一覧で「Nimbalyst 日本語版（非公式）」を選びます。本版の登録を解除し、ユーザーデータは保持する構成です。公式版や別の配置が所有する登録をまとめて削除するものではありません。

ZIP版は本版を終了した後、その展開先を削除します。どちらも、文書や別の場所にあるプロファイルを削除する操作とは別です。

## ソースとライセンス

ソースをビルドする場合は[対象タグのソース](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/tree/v0.84.0-ja.1)と[ビルド手順](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Building-from-Source)を使います。Source ZIPは空の作業フォルダーへ展開し、既存プロジェクトへ上書きしないでください。

[MIT License](../LICENSE)と元の著作権表示を保持しています。第三者ライセンスは[ソース内の一覧](../packages/electron/resources/generated/THIRD_PARTY_LICENSES.json)と配布物のresources/legalにあります。

---

## English

# Windows installation and updates

This guide covers the **unofficial v0.84.0-ja.1 edition for Windows x64**, not an official Nimbalyst, Inc. product. Upstream v0.84.0 is a prerelease; publishing this edition as a regular GitHub Release and Latest is not a stability guarantee.

### Choose an installer or ZIP

- **Installer (setup.exe):** choose this for Windows app-list entries, shortcuts and uninstallation. It installs for the current user, not as an administrator-wide installation.
- **Portable ZIP:** choose this to run from an extracted folder without an installer. You need the entire payload, not just the EXE.

Both use the same edition-specific settings and data by default. Portable does not mean that settings are stored beside the EXE. Do not run the installer and ZIP editions simultaneously, or alongside the official app.

### Check your download

Get your chosen Windows distribution and SHA256SUMS.txt from the [Release page](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1). The corresponding Source ZIP is for users who want to build the application.

The app and installer are **unsigned**. Do not disable Windows warnings, antivirus protections or organizational policies to run them. Stop if you cannot assess the file. Publisher text in file properties, or a signature on a bundled third-party program, is not a signature on this edition.

In PowerShell:

~~~powershell
$artifact = Read-Host 'Full path of the downloaded file'
Get-FileHash -LiteralPath $artifact -Algorithm SHA256
~~~

Compare the 64-digit Hash with the entry for the **same filename** in SHA256SUMS.txt. Letter case does not change the value. Do not run or extract a mismatching download.

A matching hash establishes byte equality with the distribution, not a signature or safety guarantee. It does not establish authenticity if both the download and checksum have been replaced. Locally rebuilt files are not guaranteed to have the same hash.

### Install

1. Save work and close this edition and the official app.
2. Run the verified setup.exe and check the product name: Nimbalyst 日本語版（非公式）.
3. Use a location separate from the official app. The default is `%LOCALAPPDATA%\Programs\nimbalyst-ja-unofficial`.
4. Start it from its new shortcut. The installer is configured not to launch the app automatically at completion.

This edition adds its own Markdown Open With entry. It is not configured to replace the default app, Explorer UserChoice or the default `nimbalyst://` handler.

### Run from ZIP

1. Extract the whole ZIP into a new writable folder. Do not launch it from inside the archive.
2. Keep DLLs, resources and other files together, then run Nimbalyst 日本語版（非公式）.exe.

Moving just the EXE breaks the installation. Moving its folder does not move your settings or user data.

### Set a language and sign in

Open Settings → App → Advanced → Display language and select Japanese, English or System. This is separate from an agent's response language or the language of your documents.

The default profile is `%APPDATA%\Nimbalyst 日本語版（非公式）`. Official data is not automatically moved or deleted. Keep documents in a working folder separate from the application files, and do not send anyone your whole profile, which can include credentials.

Start Nimbalyst email sign-in under Settings → Account. **Open the email link on the same Windows PC running the app.** The return address, 127.0.0.1, refers to the device running the browser. Opening the link on a phone cannot return the result to the app on your PC.

For an expired or used link, request a fresh email from the PC app. Do not rewrite the URL, expose a port externally or share links or codes. Nimbalyst sign-in is separate from Claude, Codex and other agent authentication. See [Account and Authentication](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Account-and-Authentication-English).

### Update manually from v0.82.8-ja.1

Automatic updates and official update checks are disabled. Use this repository's Release, not an official-edition installer.

1. Read the [release notes](../RELEASE_NOTES_v0.84.0-ja.1.en.md) and [known limitations](KNOWN_LIMITATIONS_v0.84.0-ja.1.md#english).
2. Save work, back up important documents and quit this edition.
3. For an installed copy, run the verified new setup.exe to update the same unofficial edition. For ZIP, extract completely into a new folder, rather than over an old copy, and launch the new EXE.
4. Check your settings, documents and Tracker. Do not run different versions against the same profile simultaneously.

Settings, documents and displayed Tracker data were retained in dedicated upgrade checks, not every real profile or migration scenario. Do not force-quit during migration or assume that **downgrading is a recovery method**. An older app may not understand newer session information; downgrades remain unverified.

Long-Markdown high CPU use and unresolved Windows full-suite failures remain. Team integrations also have server requirements. The detailed scope is in [Testing and Verification](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification-English).

### Remove the app

For an installed copy, choose Nimbalyst 日本語版（非公式） in Windows' app list. Its own registrations are removed and user data is configured to remain. This does not remove registrations belonging to the official app or another installation.

For a ZIP copy, quit the app and remove its extracted folder. Neither operation is the same as deleting documents or a profile stored elsewhere.

### Source and licenses

Use the [release-tag source](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/tree/v0.84.0-ja.1) and [build guide](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Building-from-Source-English) when building. Extract the Source ZIP into an empty working folder, not over an existing project.

The [MIT License](../LICENSE) and upstream attribution are retained. See the [source inventory](../packages/electron/resources/generated/THIRD_PARTY_LICENSES.json) and resources/legal in the distribution for third-party licenses.
