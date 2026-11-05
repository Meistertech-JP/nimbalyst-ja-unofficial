日本語 | [English](Home-English)

# Nimbalyst日本語版（非公式）Wiki

NimbalystのデスクトップUIを日本語で利用するための、非公式フォークの利用・開発資料です。Nimbalyst, Inc.の公式製品ではなく、同社による承認・サポートを受けていません。

対象版は **v0.82.7-ja.1** です。本家v0.82.7の固定コミット [`826adb4f93dbe86db35b76ce2502a3a33abe0489`](https://github.com/nimbalyst/nimbalyst/commit/826adb4f93dbe86db35b76ce2502a3a33abe0489) を基準とする、Windows x64向け未署名版です。Lexical 0.53の色付きテキスト、SQLiteへの移行、AIセッション関連の更新、TrackerとWindows固有の修正などを取り込み、日本語表示を追加しています。翻訳資源の一致は全画面・全動的経路の表示保証ではありません。主な更新は[Release Notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.7-ja.1/RELEASE_NOTES_v0.82.7-ja.1.md)、確認済み範囲と制限は[テストと品質検証](Testing-and-Verification)および[対応環境と制限事項](Compatibility-and-Limitations)を参照してください。ユーザー文書や外部サービスの応答を自動翻訳する機能ではありません。

- [ダウンロードと変更内容](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1)
- [Release Notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.7-ja.1/RELEASE_NOTES_v0.82.7-ja.1.md)
- [ソースコード・README](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial)
- [MIT License](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.7-ja.1/LICENSE)

公式版の自動更新・手動更新確認は無効です。本リポジトリのReleasesから手動で更新します。PGLiteからSQLiteへの自動移行を含みますが、すべての実ユーザーデータの移行を保証するものではありません。旧Releaseと配布物は過去版として保持しています。

このWikiはGitHub上の文書です。アプリ内のLocal Wiki・Team Wikiとは別のものです。

## 利用する

- [はじめに](Getting-Started)：初回起動、ファイルとプロジェクトの扱い。
- [Windowsへの導入と更新](Windows-Installation)：インストーラーとZIP、照合、更新、削除。
- [表示言語の設定](Display-Language)：日本語・英語の切替と保存、翻訳しない内容。
- [アカウント認証](Account-and-Authentication)：同じPCでのメール認証、localhostと保存・ログアウト。
- [トラブルシューティング](Troubleshooting)：起動・ログイン・表示・配布物の問題。
- [対応環境と制限事項](Compatibility-and-Limitations)：検証範囲と未検証の経路。

## 開発する

- [日本語化アーキテクチャ](Localization-Architecture)：MainとRenderer、共有資源、独立Reactルート、必要時ロード。
- [ソースからのビルド](Building-from-Source)：pnpmとWindowsパッケージ。
- [テストと品質検証](Testing-and-Verification)：検査の母集団と公開後CI。
- [本家Nimbalystへの追従](Following-Upstream)：固定基準、差分分類、保持するフォーク仕様。
- [翻訳と開発への参加](Translation-and-Contributing)：Issue、翻訳キー、テスト、PR。

## プロジェクト

- [開発履歴](Development-History)
- [ライセンスと謝辞](License-and-Attribution)
- [English Home](Home-English)
- [English Overview（旧入口）](English-Overview)
