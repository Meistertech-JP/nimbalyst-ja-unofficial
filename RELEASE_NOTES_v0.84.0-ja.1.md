# Nimbalyst 日本語版（非公式） v0.84.0-ja.1

Windows x64向けの未公開候補です。本家v0.84.0（Prerelease）を基準とし、v0.82.8以降のv0.83.0・v0.84.0の変更を取り込んでいます。日本語版の正式公開は未決定です。

## 本家由来の変更

- Claude Fable 5.2のモデル選択、キューメッセージの一括配送、使用量グラフ、質問カードとセッション検索の処理を更新しました。
- Gitパネルのブランチ切替、Workstreamsによるセッショングループ化、フォルダーを指定するコミット提案を取り込みました。
- ファイルツリーの省略件数表示、Markdownのネストしたリスト保存、ローカルWikiのfrontmatter処理を更新しました。
- `nim wiki publish`、コメントと編集の整合、ツール出力・画像の保持期間、SQLiteバックアップのローテーションに関する変更を取り込みました。

これは統合したソースの概要であり、すべての経路の実機検証完了を意味しません。Wiki公開とチーム権限の一部には対応する同期サーバーが必要です。

## 日本語版

新しいWorkstreams、Git操作、設定、確認画面などに日本語訳を追加しています。日本語・英語・System切替、非公式版の独立した設定・データ、nonce付きlocalhost認証、公式更新の無効化と手動更新方針を維持します。

Windowsでは、添付フォルダーのパス末尾区切りや大文字小文字の違いによる重複登録・解除失敗を修正しました。

Windows配布は未署名です。公式Nimbalyst, Inc.の製品ではありません。最終候補の認証、NSIS新規導入・更新検証はまだ完了していません。[既知制限](docs/KNOWN_LIMITATIONS_v0.84.0-ja.1.md)を確認してください。

## 検証状況

最終候補のLinux CI、Android Build、iOS Simulator/Native Testsは成功しています。最終コミットからWindows x64 NSIS・Portable候補とSource ZIPを生成し、ZIPとGit treeの整合を確認しました。候補03では日本語の初期画面を確認しましたが、修正後のWindows全体テスト、本番認証、候補03のNSIS新規導入・更新、英語切替・再起動保持は未実施です。ローカル判定はGO WITH KNOWN LIMITATIONSであり、本家v0.84.0がPrereleaseであることも踏まえ、正式公開の判断は別途行います。確認範囲とNOT RUN項目は[検証記録](docs/wiki/Testing-and-Verification.md)と[既知制限](docs/KNOWN_LIMITATIONS_v0.84.0-ja.1.md)を参照してください。

[English](RELEASE_NOTES_v0.84.0-ja.1.en.md)
