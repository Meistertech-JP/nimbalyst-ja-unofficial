日本語 | [English](Windows-Installation-English)

# Windowsへの導入と更新

対象は **v0.84.0-ja.1・Windows x64** です。[Releaseページ](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1)から取得してください。公式Nimbalystとは別のアプリで、配布物は未署名です。本家v0.84.0はPrereleaseで、本版の通常Release指定も安定性保証ではありません。

## 形式を選ぶ

- **setup.exe**：Windowsのアプリ一覧・ショートカットを使う、現在のユーザー向けの配置です。
- **Portable ZIP**：新しいフォルダーへ全ファイルを展開して起動します。EXEだけを取り出したりZIP内から直接起動したりしないでください。

ZIP版も設定をEXEの隣へ保存する方式ではありません。既定ではインストーラー版と同じ日本語版専用データを使うので、同時に起動しないでください。公式版との同時利用もサポートしません。

## ダウンロードを確認する

同じReleaseのSHA256SUMS.txtと、同じファイル名のSHA-256を照合します。PowerShellでは次を使えます。

~~~powershell
$artifact = Read-Host '確認するファイルのフルパス'
Get-FileHash -LiteralPath $artifact -Algorithm SHA256
~~~

不一致なら実行・展開を中止します。hash一致は電子署名や安全性保証ではありません。SmartScreenやウイルス対策等を無効にする手順は提供しません。判断できない場合は実行しないでください。

## 初回の導入

1. 作業を保存し、本版と公式版を終了します。
2. インストーラーでは製品名「Nimbalyst 日本語版（非公式）」と、公式版とは別の配置先を確認します。完了後にショートカットから起動してください。
3. ZIPでは全内容を新しい書き込み可能なフォルダーへ展開し、「Nimbalyst 日本語版（非公式）.exe」を起動します。
4. 初回案内を確認し、チュートリアルや作業用フォルダーを開きます。[はじめに](Getting-Started)へ進んでください。

管理者向けインストールではなく、完了時に自動起動しない構成です。Markdownの「プログラムから開く」に本版を追加しますが、既定アプリ・UserChoice・`nimbalyst://` の既定ハンドラーは変更しない構成です。

## 設定・文書の保存場所

既定のユーザーデータは `%APPDATA%\Nimbalyst 日本語版（非公式）`。公式版からデータを自動移動・削除しません。文書はアプリの配置先とは別の作業フォルダーで扱い、プロファイル全体を第三者へ送らないでください。

言語は[表示言語](Display-Language)、ログインは[アカウント認証](Account-and-Authentication)を参照してください。

## 前版v0.82.8-ja.1から更新する

更新は手動です。公式版のインストーラーを日本語版の更新として使わないでください。

1. [リリースノート](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/main/RELEASE_NOTES_v0.84.0-ja.1.md)と[既知制限](Compatibility-and-Limitations)を確認します。
2. 作業を保存し、重要な文書をバックアップして本版を終了します。
3. インストーラー版は同じ日本語版を更新します。ZIP版は旧版へ上書きせず、新しいフォルダーへ全内容を展開して起動します。
4. 設定・文書・Trackerを確認します。異なる版を同じプロファイルで同時に使わないでください。

専用環境では設定・文書・Tracker表示の保持を確認しましたが、全データの互換性保証ではありません。移行中に強制終了せず、旧版へのダウングレードを復旧方法として前提にしないでください。新しいセッション情報を旧版で読めない場合があります。

## アンインストール

インストーラー版はWindowsのアプリ一覧から本版を選びます。本版の登録を解除し、ユーザーデータは保持する構成です。ZIP版は終了後に展開先を削除します。文書・別の場所にあるプロファイルの削除とは別です。

詳しい操作と安全上の注意は[Windowsガイド](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/main/docs/WINDOWS_JA_UNOFFICIAL.md)、版ごとの実証範囲は[テストと品質検証](Testing-and-Verification)にまとめています。
