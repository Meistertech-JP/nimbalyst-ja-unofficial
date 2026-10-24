# Nimbalyst 日本語版（非公式）

Nimbalyst v0.81.7をベースに、デスクトップアプリのユーザーインターフェースを日本語化した非公式版です。

メニュー、設定、ファイル管理、AIセッション、トラッカー、ダイアログなどに日本語表示を追加しています。表示言語は日本語と英語から選択できます。

本プロジェクトはNimbalyst, Inc.の公式製品ではなく、同社による開発・サポート・承認を受けたものではありません。

[English](README.en.md) · [Wiki（日本語）](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki) · [Wiki (English)](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Home-English) · [Windows利用ガイド](docs/WINDOWS_JA_UNOFFICIAL.md) · [v0.81.7-ja.3の変更内容](RELEASE_NOTES_v0.81.7-ja.3.md)

## ドキュメント

GitHub Wikiに利用・開発資料を掲載しています。各記事の冒頭から対応する英語版へ移動できます。これはGitHub上の文書であり、アプリ内のLocal Wiki・Team Wikiとは別のものです。

- [はじめに](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Getting-Started)
- [Windowsへの導入と更新](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Windows-Installation)
- [表示言語の設定](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Display-Language)
- [アカウント認証](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Account-and-Authentication)
- [トラブルシューティング](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Troubleshooting)
- 開発者向け資料：[日本語化アーキテクチャ](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Localization-Architecture)、[ソースからのビルド](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Building-from-Source)、[テストと品質検証](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification)

## 公開状況とダウンロード

**v0.81.7-ja.3はWindows x64向けの正式リリースです。** [最新版のダウンロード](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/latest)から、NSISインストーラー、ポータブルZIP、ソースZIP、`SHA256SUMS.txt`を取得してください。通常製品ビルドで、正規のNimbalystサービスによるメール認証、暗号化保存、再起動後のアカウント表示の復元、ログアウトを確認しています。

過去のv0.81.7-ja.2はソース限定Prereleaseのまま保持しています。[当時のリリースノート](RELEASE_NOTES_v0.81.7-ja.2.md)は、その版の検証状況を記録しています。`ja.3`は日本語フォークの更新番号です。SemVer対応ツールではハイフン以降がプレリリース識別子になりますが、本版のGitHub Releaseは正式版として指定しています。パッケージ管理ツールの自動選択に頼らず、対象バージョンを確認してください。

### 未署名版について

配布する本版のWindowsアプリとインストーラーは未署名です。Windowsが証明書によって確認できる発行元はありません。アプリ情報に表示する名称や発行者の文字列は、コード署名の代わりにはなりません。

SmartScreenなどが警告する場合があります。保護機能や警告を無効にすることは案内しません。取得元、対象バージョン、SHA-256を確認できない場合は実行しないでください。SHA-256の一致は配布ファイルとのバイト一致を確認するもので、発行元の真正性や安全性を証明するものではありません。確認手順は[Windows利用ガイド](docs/WINDOWS_JA_UNOFFICIAL.md)に記載しています。

## バージョンと環境

- ベース: Nimbalystデスクトップ版 v0.81.7
- 固定upstream: `e14ddf383a8dbb40e511fc2c2ea50273d08e3579`
- Windows配布対象: x64。Windowsの全バージョン、構成、セキュリティ製品での動作を確認したものではありません。
- ビルド: Node.js 24以降、pnpm 12以降。リポジトリの指定は **pnpm 12.9.1**、Electronは **43.7.0** です。依存関係は `pnpm-lock.yaml` に固定されています。
- 現在の公式最新版とは機能・修正内容が異なります。公式mainの最新状態へ自動追従するものではありません。
- macOS、Linux、Android、iOSの配布物・実機動作は、このWindows版の検証範囲に含めていません。

## 日本語表示

設定の表示言語で日本語または英語を選択します。表示言語はエージェントへの回答言語の指示とは別の設定です。ユーザー文書や外部サービスの応答を自動翻訳する機能ではありません。

本版ではAbout、Settings、コメント通知、共有プロジェクトのエラー、Git修復用の入力下書き、ファイル作成・保存・エクスポート、同梱コマンドの説明などを追加で日本語化しています。日本語チュートリアルは新規作成時の表示言語に従って選択されます。既に作成・編集したチュートリアルを言語切替で書き換えません。

本版の翻訳リソースには27名前空間、英語・日本語それぞれ14,579キーがあります。対応するキー・補間の一致を確認していますが、全画面や動的参照の実行時確認を意味しません。

ローカルWikiの静的出力は `nim wiki export --static <dir> --ui-language system|en|ja` で言語を指定します。CLIの省略時はシステム言語、プログラムAPIの省略時は互換性のため英語です。Wikiの翻訳は必要な名前空間を遅延読み込みします。この説明は本ソースの内容であり、公開済みnpmパッケージへの収録を示しません。

## 更新・認証・公式版との関係

- 公式版の更新の自動取得・適用と、手動更新確認は無効です。更新はこのリポジトリの公開内容を確認し、手動で行います。
- **公式Nimbalystとの同時利用はサポートしていません。** アプリ識別子、既定のインストール先、ユーザーデータ保存先は分離していますが、同時利用の互換性保証ではありません。
- Windowsアプリ識別子は `jp.meistertech.nimbalyst.ja.unofficial`。既定のユーザーデータ保存先は `%APPDATA%\Nimbalyst 日本語版（非公式）` です。公式版の既存データを移動・削除しません。
- 認証コールバックはインスタンスごとのnonce付き `http://127.0.0.1:<port>/auth/callback` を使用します。認証メールはアプリを起動している同じPCで開いてください。スマートフォンで開くと `127.0.0.1` はスマートフォン自身を指し、PCのアプリへ戻れません。使用済み・期限切れのリンクはアプリから再送してください。認証URLやトークンを他者へ共有しないでください。
- ログアウトは本版のローカル認証状態を削除します。サービス側セッションの失効までは保証しません。
- Windowsでは `nimbalyst://` の既定ハンドラーを取得しません。認証以外の同プロトコルのリンクは、既存の登録先アプリで開かれる場合があります。
- インストーラーは本版のMarkdown用「プログラムから開く」項目を追加し、拡張子の既定アプリやExplorerのUserChoiceは変更しない構成です。アンインストール時は本版自身が所有する登録だけを対象とし、ユーザーデータを保持します。

## 検証状況と制限

v0.81.7-ja.3の配布対象ビルドで、NSISによる更新インストール、インストール済みアプリとZIP展開版の起動、通常アンインストールを確認しました。通常製品ビルドで日本語・英語の切替、両言語の再起動後の設定保持、選択した作成メニュー・ダイアログ・使用量案内の表示を確認しています。インストール済みファイルとZIPの全1,911ファイルが検証対象の展開物と一致しました。

メールによる本番認証、IPv4 localhost callback、暗号化保存、専用プロファイルでの再起動後のアカウント表示の復元、通常ログアウト、ログアウト後の未認証状態を確認しました。認証ファイル2個とSQLite関連ファイルの実測ACLは、現在のユーザー・SYSTEM・Administratorsに限定されていました。監査対象の既存設定、既定の関連付け、公式版ショートカットは維持され、アンインストールによる削除は本版自身の登録・ショートカットに限られていました。これは全ホスト状態の同一性や、他の端末での動作保証ではありません。

- 検証対象ソースの型検査は38 workspace、関連テストは重複を除いた88ファイル925件で成功しています。全体テストの成功を意味しません。
- 同一Windows環境の固定upstreamでも再現した4件の試験失敗を保持しています。CLIのsymlink fixture作成EPERM、commit-hookの `/bin/sh` 起動ENOENT、sandboxのsymlinkファイルfixture作成EPERM、sandboxのsymlink祖先ディレクトリfixture作成EPERMです。後者2件はfixture作成段階の失敗で、拒否処理そのものを検証できたとは扱いません。
- 全体テストには未完走の履歴があり、全件成功とはしていません。特定環境での大容量CLIアップロード停止も、すべての環境で発生する不具合とは確定していません。
- Google認証、サービス側のセッション失効、Stytchの一部の復旧経路、別ユーザーやグループを含むNTFS実効アクセスは未検証です。確認済みの脆弱性や不具合とは区別します。
- 現在の静的監査で抽出した動的翻訳候補651件、翻訳スコープを確定できなかった382件、未訪問の画面・tooltip・アクセシビリティラベルなどの完全な実行時確認は未完了です。過去の119件・370件とは監査範囲・数え方が異なり、欠落キーや不具合の件数ではありません。
- NSISの無効な管理者向け選択肢には英語注記が残っています。現在のユーザー向けのインストール・アンインストール完了画面は日本語で確認しています。
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
