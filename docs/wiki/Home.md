日本語 | [English](Home-English)

# Nimbalyst日本語版（非公式）Wiki

NimbalystのデスクトップUIを日本語で利用するための非公式フォークです。Nimbalyst, Inc.による開発・認定・サポートを受けていません。最新版 **v0.84.0-ja.1** は本家v0.84.0（固定コミット `dc5a0ef938cf495a0667d797f871d09d0c44246f`）を基準とする未署名Windows x64版です。

本家v0.84.0はGitHub上でPrereleaseです。日本語版はGitHub上の通常Release・Latestとして配布しますが、本家による安定性保証や公式認定ではありません。`v0.84.0-ja.1` はSemVer上ではプレリリース識別子を含み、GitHubの分類はその意味を変更しません。

- [最新版のSetup EXE・Portable ZIP・Source ZIP・checksums](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1)
- [Release Notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.84.0-ja.1/RELEASE_NOTES_v0.84.0-ja.1.md)
- [ソース・README](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial)
- [前版v0.82.8-ja.1](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.8-ja.1)

品質判定は **GO WITH KNOWN LIMITATIONS**。本家v0.82.8以降のv0.83.0・v0.84.0を取り込みました。Claude Fable 5.2選択、キューの一括配送、Gitパネルのブランチ切替、Workstreams、フォルダー単位のコミット提案、Markdownネストリスト保存、ファイルツリー省略件数表示、Wiki公開、SQLiteバックアップ・ツール出力保持処理などを含みます。日本語版では新しいUIの翻訳、明示的な隔離プロファイルの保存先境界、Windowsのファイル・パス処理を修正しました。統合した機能すべての実接続を確認したわけではありません。

[確認済み範囲](Testing-and-Verification)と[既知制限](Compatibility-and-Limitations)を確認してください。公式更新は無効で手動更新します。旧タグ・Release・履歴は保持しています。このGitHub Wikiはアプリ内Local Wiki・Team Wikiとは別です。

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
