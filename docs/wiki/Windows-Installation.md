日本語 | [English](Windows-Installation-English)

# Windowsへの導入と更新

## v0.82.3-ja.2

[対象Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.2)から `nimbalyst-0.82.3-ja.2-windows-x64-setup.exe`、`nimbalyst-0.82.3-ja.2-windows-x64-portable.zip`、対応ソースZIPと `SHA256SUMS.txt` を取得します。未署名の通常正式版です。修正した同梱ガイドを含む新しいパッケージであり、旧版を改名したものではありません。実機検証と未検証事項は[テストと品質検証](Testing-and-Verification)を参照してください。以下の旧版結果は履歴として保持します。

## v0.82.3-ja.1

v0.82.3-ja.1は未署名のWindows x64版です。NSISとポータブルZIPを製品修正から再生成し、ペイロードを照合しました。この版のインストール・更新・削除は実施していません。以前の製品での操作記録は、この版の検証結果ではありません。配布物は[対象Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.1)を参照してください。以下はWindows配布物の一般的な手順です。

## v0.82.1-ja.1

[正式Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1)からWindows x64用NSIS、ポータブルZIP、ソースZIP、SHA256SUMS.txtを取得します。ファイル名はReleaseの添付一覧に従ってください。未署名です。導入・照合・保存先・手動更新・削除の操作は以下の手順と共通です。

v0.81.7-ja.3からの更新で英語設定、プロジェクト、テスト文書、SQLiteバックエンドの保持を確認しました。文書SHA-256は一致し、新規・更新の両インストールで通常アンインストール後もテストデータが残りました。関連付けは検査対象12項目で事前状態に戻っています。全レジストリの比較や旧版へのダウングレード互換性は確認していません。

対象はWindows x64です。v0.82.1-ja.1は未署名の正式リリースです。公式Nimbalystとの同時利用はサポートしません。

## ダウンロードと照合

[対象Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.2)の添付一覧から、NSISインストーラー、WindowsポータブルZIP、対応ソースZIP、SHA256SUMS.txtを取得してください。

ファイル名とハッシュは同じReleaseの添付一覧とSHA256SUMS.txtで照合します。

PowerShellでダウンロードしたファイルのフルパスを指定します。

```powershell
$artifact = Read-Host '確認するファイルのフルパス'
Get-FileHash -LiteralPath $artifact -Algorithm SHA256
```

表示された64桁のHashを、同じReleaseの`SHA256SUMS.txt`にある同じファイル名の値と比較します。大文字・小文字は値に影響しません。不一致なら実行・展開を中止します。

アプリとインストーラーはAuthenticode未署名です。SmartScreenなどの警告が出る場合があります。保護機能を無効にする手順は提供しません。SHA-256は配布ファイルとのバイト一致を確認するもので、発行元を認証するコード署名や安全性の証明ではありません。

## インストーラー版

1. 編集内容を保存し、本版と公式版を終了します。
2. 照合済みのsetup.exeを実行し、製品名が「Nimbalyst 日本語版（非公式）」であることを確認します。
3. 公式版とは別のインストール先を使用します。現在のユーザー向けの構成で、管理者向けのインストールは提供しません。
4. 完了後、本版のショートカットから起動します。インストーラー完了時の自動起動は行わない構成です。

既定の配置は`%LOCALAPPDATA%\Programs\nimbalyst-ja-unofficial`、ユーザーデータは`%APPDATA%\Nimbalyst 日本語版（非公式）`です。公式版のデータを自動移動・削除しません。Markdownの「プログラムから開く」へ本版専用の項目を追加しますが、既定アプリやExplorerのUserChoice、`nimbalyst://`の既定登録は変更しない構成です。

## ZIP版

新しい書込み可能なディレクトリへZIP全体を展開し、`Nimbalyst 日本語版（非公式）.exe`を実行します。EXEだけを取り出したり、ZIP内から直接実行したりしないでください。DLLと`resources`などの同梱内容を保持します。

「ポータブル」はインストーラーを使わない配布形態です。設定がEXEの横へ保存される意味ではありません。既定ではインストーラー版と同じ本版専用プロファイルを使います。ZIPの移動や削除は、プロファイルの移動・削除とは別です。

## 終了・更新・削除

終了は「ファイル」メニューの「終了」を使い、終了処理が終わるまで待ちます。更新前は文書を保存し、本版を正常終了してプロジェクト文書をバックアップします。公式版の自動更新・手動更新確認は無効です。このフォークのReleasesで対象版の変更内容と制限を読み、新しい配布物を照合して手動更新します。

ZIP版は旧ディレクトリへ上書きせず、新しいディレクトリへ完全展開します。異なる版を同じプロファイルで同時実行しないでください。古い版へ戻した際のプロファイル互換性は保証していません。

インストーラー版の削除はWindowsのアプリ一覧で本版を選択します。アンインストーラーは現在の配置が所有する登録・ショートカットを対象とし、ユーザーデータを保持する構成です。ZIP版は正常終了後に展開先を削除できます。文書・認証情報・設定の削除とは区別してください。

v0.82.1-ja.1は、製品コードが一致する通常ビルドで本番認証・言語切替・旧版更新を確認し、再生成NSISでも新規インストール・全ペイロードのハッシュ照合・通常アンインストールを確認しています。[テストと品質検証](Testing-and-Verification)に検証範囲を記載しています。

次の操作は[表示言語](Display-Language)と[アカウント認証](Account-and-Authentication)へ、問題がある場合は[トラブルシューティング](Troubleshooting)と[制限事項](Compatibility-and-Limitations)へ進んでください。
