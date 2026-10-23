# Nimbalyst 日本語版（非公式）

Nimbalyst v0.81.7をベースに、デスクトップアプリのユーザーインターフェースを日本語化した非公式版です。

メニュー、設定、ファイル管理、AIセッション、トラッカー、ダイアログなどに日本語表示を追加しています。表示言語は日本語と英語から選択できます。

本プロジェクトはNimbalyst, Inc.の公式製品ではなく、同社による開発・サポート・承認を受けたものではありません。

[English](README.en.md) · [Windows利用ガイド](docs/WINDOWS_JA_UNOFFICIAL.md) · [次期版の変更内容](RELEASE_NOTES_v0.81.7-ja.3.md)

## 公開状況とダウンロード

公開済みの **v0.81.7-ja.2はソース限定Prerelease** です。[GitHub Releases](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases)から取得できます。この公開版にはWindowsインストーラー、ポータブルZIP、その他の実行バイナリはありません。[公開版のリリースノート](RELEASE_NOTES_v0.81.7-ja.2.md)は当時の検証状況を記録しています。

このソースは **v0.81.7-ja.3の未公開候補** です。未署名Windows x64版を対象としていますが、実アカウント認証、認証情報の保存・復旧、アクセス権の最終検証が完了しておらず、配布可否は未確定です。候補版のダウンロードリンクや公開済みバイナリはありません。

### 未署名版について

ローカルで生成した本版のWindowsアプリとインストーラーは未署名です。Windowsが証明書によって確認できる発行元はありません。アプリ情報に表示する名称や発行者の文字列は、コード署名の代わりにはなりません。

SmartScreenなどが警告する場合があります。保護機能や警告を無効にすることは案内しません。取得元、対象バージョン、SHA-256を確認できない場合は実行しないでください。SHA-256の一致は配布ファイルとのバイト一致を確認するもので、発行元の真正性や安全性を証明するものではありません。確認手順は[Windows利用ガイド](docs/WINDOWS_JA_UNOFFICIAL.md)に記載しています。

## バージョンと環境

- ベース: Nimbalystデスクトップ版 v0.81.7
- 固定upstream: `e14ddf383a8dbb40e511fc2c2ea50273d08e3579`
- Windows候補: x64。Windowsの全バージョン、構成、セキュリティ製品での動作を確認したものではありません。
- ビルド: Node.js 24以降、pnpm 12以降。リポジトリの指定は **pnpm 12.9.1**、Electronは **43.7.0** です。依存関係は `pnpm-lock.yaml` に固定されています。
- 現在の公式最新版とは機能・修正内容が異なります。公式mainの最新状態へ自動追従するものではありません。
- macOS、Linux、Android、iOSの配布物・実機動作は、このWindows候補の検証範囲に含めていません。

## 日本語表示

設定の表示言語で日本語または英語を選択します。表示言語はエージェントへの回答言語の指示とは別の設定です。ユーザー文書や外部サービスの応答を自動翻訳する機能ではありません。

候補版ではAbout、Settings、コメント通知、共有プロジェクトのエラー、Git修復用の入力下書き、ファイル作成・保存・エクスポート、同梱コマンドの説明などを追加で日本語化しています。日本語チュートリアルは新規作成時の表示言語に従って選択されます。既に作成・編集したチュートリアルを言語切替で書き換えません。

本候補の翻訳リソースには27名前空間、英語・日本語それぞれ14,551キーがあります。対応するキー・補間の一致を確認していますが、全画面や動的参照の実行時確認を意味しません。

ローカルWikiの静的出力は `nim wiki export --static <dir> --ui-language system|en|ja` で言語を指定します。CLIの省略時はシステム言語、プログラムAPIの省略時は互換性のため英語です。Wikiの翻訳は必要な名前空間を遅延読み込みします。この説明は本ソースの内容であり、公開済みnpmパッケージへの収録を示しません。

## 更新・認証・公式版との関係

- 公式版の更新の自動取得・適用と、手動更新確認は無効です。更新はこのリポジトリの公開内容を確認し、手動で行います。
- **公式Nimbalystとの同時利用はサポートしていません。** アプリ識別子、既定のインストール先、ユーザーデータ保存先は分離していますが、同時利用の互換性保証ではありません。
- Windowsアプリ識別子は `jp.meistertech.nimbalyst.ja.unofficial`。既定のユーザーデータ保存先は `%APPDATA%\Nimbalyst 日本語版（非公式）` です。公式版の既存データを移動・削除しません。
- 認証コールバックはインスタンスごとのnonce付き `http://127.0.0.1:<port>/auth/callback` を使用する構成です。認証URLやトークンを他者へ共有しないでください。実アカウントでの認証・復旧の最終確認は未完了です。
- Windowsでは `nimbalyst://` の既定ハンドラーを取得しません。認証以外の同プロトコルのリンクは、既存の登録先アプリで開かれる場合があります。
- インストーラーは本版のMarkdown用「プログラムから開く」項目を追加し、拡張子の既定アプリやExplorerのUserChoiceは変更しない構成です。アンインストール時は本版自身が所有する登録だけを対象とし、ユーザーデータを保持します。

## 検証状況と制限

直前のローカル検証用Windowsパッケージでは、インストール、SQLite Workerの起動、日本語・英語切替、両言語での再起動後の設定保持、選択した画面の表示、通常アンインストールを確認しています。同じ展開物を4種類の配置で起動し、監査対象の既存設定・関連付けが保持されたことも確認しました。これらは**新しいv0.81.7-ja.3パッケージの検証結果ではありません**。

- その基準ソースの型検査は38 workspace、関連テストは60ファイル591件で成功しています。全体テストの成功や実アカウント認証の保証ではありません。
- 同一Windows環境の固定upstreamでも再現した4件の試験失敗を保持しています。CLIのsymlink fixture作成EPERM、commit-hookの `/bin/sh` 起動ENOENT、sandboxのsymlinkファイルfixture作成EPERM、sandboxのsymlink祖先ディレクトリfixture作成EPERMです。後者2件はfixture作成段階の失敗で、拒否処理そのものを検証できたとは扱いません。
- 全体テストには未完走の履歴があり、全件成功とはしていません。特定環境での大容量CLIアップロード停止も、すべての環境で発生する不具合とは確定していません。
- 実アカウント認証、暗号化保存、NTFS ACL、Stytchの一部の認証復旧経路について、候補版の最終判定は未完了です。未検証事項は、確認済みの脆弱性や不具合とは区別します。
- 動的翻訳参照119件の完全な実行時確認、過去の静的監査で名前空間を確定できなかった旧来の参照370件、未訪問の画面・tooltip・アクセシビリティラベルなどは未証明範囲です。これらの数値は欠落キーや不具合の件数ではありません。
- 全製品の固定英語が0件とは判定していません。利用者の文書、外部サービスのエラー、技術識別子、既存通知、旧形式の共同編集データには英語が残る場合があります。旧クライアントの「Teammate」は実名との区別ができないため変更しません。
- 観察した画面・ズーム倍率・配置での結果は、すべての画面、DPI、端末、Browser/Embedホストの保証ではありません。

## ソースからのビルド

Corepackを利用できるNode.js環境で、リポジトリのルートから実行します。ネイティブ依存関係の再ビルドが必要な環境では、対応するビルドツールも必要です。

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @nimbalyst/i18n run build
corepack pnpm run build:workspace-deps
corepack pnpm --filter @nimbalyst/collab-bundle run build
corepack pnpm --filter @nimbalyst/runtime run build
corepack pnpm --dir packages/electron run build:win
```

`build:win` はElectron本体、Worker、Sandbox、拡張機能、リソース検査を実行し、Windows x64のNSISインストーラーを生成するリポジトリのスクリプトです。出力先は `packages/electron/release` です。署名用資格情報を渡さないローカルビルドは未署名になります。CIで意図的に未署名ビルドを行う場合の指定は `ALLOW_UNSIGNED_WINDOWS_BUILD=true` ですが、検証の省略や公開許可を意味しません。

型検査は `corepack pnpm run typecheck` です。生成成功だけではインストール・起動・認証・アンインストールの保証になりません。最終候補のソースと配布物の対応、実起動、データ分離を別途確認してください。ポータブル版の扱いは[Windows利用ガイド](docs/WINDOWS_JA_UNOFFICIAL.md)を参照してください。

## ライセンス

[MIT License](LICENSE)で提供します。元の `Copyright (c) 2024-2026 Nimbalyst Inc.` とライセンス本文を保持しています。

同梱第三者ソフトウェアには各ライセンスが適用されます。[ライセンス一覧](packages/electron/resources/generated/THIRD_PARTY_LICENSES.json)、[NOTICE](packages/electron/resources/generated/THIRD_PARTY_NOTICES.txt)、[ライセンス監査資料](packages/electron/resources/generated/THIRD_PARTY_LICENSE_AUDIT.md)を参照してください。Windowsパッケージには `resources/legal` として同梱します。

[本家Nimbalystリポジトリ](https://github.com/nimbalyst/nimbalyst) · [英語README](README.en.md)
