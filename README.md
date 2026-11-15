# Nimbalyst 日本語版（非公式）

Nimbalystは、Claude CodeやCodexなど、複数のAIエージェントを一つのアプリから使い分けられる、オープンソースの作業環境です。文章の執筆やアプリ開発に必要なファイル、タスク、進捗状況も、ひとつの画面でまとめて管理できます。

この非公式版では、メニュー・設定・ファイル管理・AIセッションなどを日本語で利用できます。Nimbalyst, Inc.の公式製品ではなく、同社の承認・サポートは受けていません。

[English](README.en.md) · [利用ガイド](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki) · [本家Nimbalyst](https://github.com/nimbalyst/nimbalyst)

## ダウンロード

最新版は **v0.84.0-ja.1（Windows x64）** です。

- [インストーラー](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/download/v0.84.0-ja.1/nimbalyst-0.84.0-ja.1-windows-x64-setup.exe)：Windowsのアプリ一覧やショートカットから使う方向け。
- [Portable ZIP](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/download/v0.84.0-ja.1/nimbalyst-0.84.0-ja.1-windows-x64-portable.zip)：インストーラーを使わず、全ファイルを展開して起動する方向け。

[Releaseページ](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1)には対応ソースとSHA256SUMS.txtもあります。実行前に[Windows導入手順](docs/WINDOWS_JA_UNOFFICIAL.md)を確認してください。配布物は未署名です。

## この版で何が変わったか

前版v0.82.8-ja.1から、本家v0.83.0・v0.84.0の変更を取り込みました。

- **関連するAIの会話をまとめて整理。** エージェントモードの「新しいワークストリーム…」で作る、複数の会話をまとめる名前付きフォルダーです。既存の会話は「ワークストリームへ移動…」で整理できます。「調査」「実装」など同じ仕事の会話を一か所で扱えます。エージェントの指揮・担当関係とは別の整理方法です。
- **作業中の追加指示をまとめて渡す。** エージェントが処理中に送ったメッセージはキューに入り、同じ文書を対象とする通常のメッセージを次のターンでまとめて渡します。誰が送ったかも区別されます。コマンドや対象文書の異なる指示は別に扱われ、Claude Code CLIを使う経路では1件ずつ処理されます。
- **Gitパネルからブランチを切り替え。** GitパネルのLog上部にある現在のブランチ名から、既存ブランチ・リモートにだけあるブランチへの切替や、新しいブランチの作成を行えます。ブランチ操作のために別の画面へ移る必要が減ります。
- **フォルダー内の変更をまとめてコミット提案。** AIにフォルダーを対象とするコミット提案を依頼すると、その中の変更ファイルを一覧にしてレビューし、フォルダー単位・個別に選択できます。承認前に、対象ファイルと差分を確認してください。
- **Markdownのリストやコメント周辺の編集を改善。** 番号付きリストの下の入れ子が保存後も保たれるよう修正し、太字・インラインコードの一部にコメントがある付近をAIが編集した際の書式崩れも修正しました。
- **ローカルWikiをチームのレビューへ。** CLIの `nim wiki publish` で、ローカルWikiをチームのプロジェクトへ一方向に反映できます。コメント権限でのレビューに対応します。対応する同期サーバーと利用権限が必要です。Webへの一般公開や、このGitHub Wikiの更新とは別の機能です。

操作の入口は[はじめに](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Getting-Started)、変更の説明は[リリースノート](RELEASE_NOTES_v0.84.0-ja.1.md)で案内しています。これらは本家から取り込んだ機能であり、すべての接続先での実動作を確認したという意味ではありません。

### 日本語版独自の変更

新しい画面や操作の日本語表示を追加しました。また、保存先を指定した起動時の設定の扱いと、Windowsのファイル・パス処理を修正しています。公式版とは別の設定・データを使い、更新はこのリポジトリから手動で行います。

## 使い始める

1. 上の配布物を取得し、SHA-256を照合してから導入します。ZIP版はEXEだけでなく全同梱ファイルを展開します。
2. 初回案内を確認し、チュートリアルか作業用フォルダーを開きます。エージェントを使うには、利用するサービスの認証・契約も必要です。
3. 表示言語を変えるときは、設定 → アプリ → 詳細設定 → 表示言語を開き、日本語・English・Systemから選びます。

表示言語を変えても、自分の文書やAIの回答を自動翻訳するものではありません。Nimbalystアカウントのログインと、Claude・Codex等の認証は別です。[認証の案内](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Account-and-Authentication)も参照してください。

## 利用前に知っておきたいこと

- **本家v0.84.0はPrereleaseです。** 日本語版はGitHub上の通常Release・Latestとして公開していますが、本家による安定性保証や公式認定ではありません。
- **Windowsの全テストには108件の未解決FAILがあります。** 全検査合格とはしていません。影響と検証範囲は[既知制限](docs/KNOWN_LIMITATIONS_v0.84.0-ja.1.md)に記載しています。
- **長いMarkdown文書でCPU使用率が高くなる問題は未解決です。**
- **未署名・手動更新です。** 自動更新と公式版の更新確認は無効です。警告・保護機能を無効にせず、取得元とチェックサムを確認してください。
- **チーム機能には対応サーバーが必要です。** 実際の同期・共同編集サーバーとの接続や、旧サーバーとの互換性は未検証です。
- 公式版との同時利用はサポートしません。更新前には作業を保存し、重要な文書をバックアップしてください。旧版へのダウングレードは未検証です。

詳しい試験結果・未検証事項は[テストと品質検証](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification)にまとめています。Linux CIの成功をWindows全テストの成功とは扱っていません。

## 日本語の画面

画面構成を示すv0.82.4-ja.1のWindows実画面です。文書とタスクはサンプルで、最新版とは表示・操作が一部異なる場合があります。

### 文書の編集

![日本語の文書編集画面](docs/screenshots/japanese-editor.png)

### トラッカーとAIセッション

![日本語のトラッカー詳細とセッション入力欄](docs/screenshots/japanese-tracker.png)

### 表示言語とアプリケーション設定

![日本語の詳細設定画面](docs/screenshots/japanese-settings.png)

## ガイドとソース

- [Windowsへの導入・更新・アンインストール](docs/WINDOWS_JA_UNOFFICIAL.md)
- [既知制限](docs/KNOWN_LIMITATIONS_v0.84.0-ja.1.md)
- [ソースからのビルド](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Building-from-Source)
- [前版v0.82.8-ja.1と過去の配布物](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases)

## ライセンス

[MIT License](LICENSE)。本家の著作権表記とライセンス本文を保持しています。同梱第三者ソフトウェアには、それぞれのLICENSE・NOTICEが適用されます。
