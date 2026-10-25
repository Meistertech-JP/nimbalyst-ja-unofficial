# Nimbalyst 日本語版（非公式）

Nimbalyst v0.82.1をベースに、デスクトップアプリのユーザーインターフェースを日本語化した非公式版です。

メニュー、設定、ファイル管理、AIセッション、トラッカー、ダイアログなどに日本語表示を追加しています。表示言語は日本語と英語から選択できます。

本プロジェクトはNimbalyst, Inc.の公式製品ではなく、同社による開発・サポート・承認を受けたものではありません。

[English](README.en.md) · [日本語Wiki](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki) · [English Wiki](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Home-English) · [リリースノート](RELEASE_NOTES_v0.82.1-ja.1.md)

## ダウンロードと環境

**v0.82.1-ja.1はWindows x64向けの通常正式リリースです。** [対象Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1)から、NSISインストーラー、ポータブルZIP、ソースZIP、`SHA256SUMS.txt`を取得します。導入・更新手順は[Windows導入ガイド](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Windows-Installation)を参照してください。

Windowsアプリとインストーラーは未署名です。SmartScreenなどの警告が出る場合があります。保護機能を無効にせず、取得元、バージョン、SHA-256を確認してください。ハッシュ一致はファイルのバイト一致を確認するもので、コード署名や安全性の保証ではありません。

旧正式版[v0.81.7-ja.3](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.81.7-ja.3)と、その[検証記録](RELEASE_NOTES_v0.81.7-ja.3.md)は保持しています。v0.81.7-ja.2はソース限定Prereleaseです。`ja.1`は本版の更新番号で、SemVerではハイフン以降がプレリリース識別子になりますが、このGitHub Releaseは通常正式版として指定しています。

ベースは本家v0.82.1、固定コミットは`583ae0244dae266667be579733d6c571fd74e037`です。公式最新版とは機能・修正内容が異なります。全Windows構成での動作保証ではなく、他OSの配布物は提供していません。

## 表示言語

設定の表示言語でSystem、English、日本語を選択できます。エージェントの回答言語とは別の設定で、利用者の文書や外部サービスの応答は自動翻訳しません。27名前空間、英日各14,608キーの対応・空翻訳・補間整合性を確認しています。キーの一致は全画面の翻訳完了を意味しません。

入力候補やセッション参照のアクセシビリティ文字列も表示言語に追従します。外部スクリーンリーダーによる検証は行っていません。[表示言語ガイド](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Display-Language)を参照してください。

## 更新と認証

- 更新は本リポジトリのReleaseから手動で行います。公式版の自動更新と手動更新確認は無効です。
- 公式Nimbalystとの同時利用はサポートしていません。アプリIDは`jp.meistertech.nimbalyst.ja.unofficial`、既定ユーザーデータは`%APPDATA%\Nimbalyst 日本語版（非公式）`です。公式版のデータを移動・削除しません。
- Windowsでは`nimbalyst://`の既定ハンドラーを取得しません。認証はインスタンス固有のnonce付きlocalhost callbackを使用します。認証メールはアプリを起動した同じPCで開いてください。認証URLやトークンを共有しないでください。
- ログアウトはローカル認証状態を削除します。サービス側セッションの失効を保証するものではありません。
- アンインストールは本版が所有する登録・ショートカットを対象とし、ユーザーデータは保持します。

詳しくは[アカウント認証](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Account-and-Authentication)と[制限事項](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Compatibility-and-Limitations)を参照してください。

## 検証範囲と制限

通常Windows製品で日本語・英語切替、再起動後の言語保持、メール認証、暗号化保存、アカウント復元、通常ログアウト、未認証での再起動を確認しました。新規インストール、v0.81.7-ja.3からの更新とテスト文書・設定保持、通常アンインストールも確認しています。最終ペイロードは実機検証済み製品と1,910ファイルがバイト一致し、残る1ファイルは第三者ライセンスJSONの生成時刻だけが異なります。最終NSIS自体の導入・削除と1,911ペイロードの照合も成功しています。

38 workspace型検査と7エントリの容量検査が成功しています。Linuxでは19,130 PASS／30 SKIP／0 FAIL、iOSでは527実行／6 SKIP／0 FAILです。CI実行コミットは`ae08d2235bab5e9c832c0ae32631bb3a94544704`で、最終ソースSHAそのもののCI実行ではありません。以後の差分は文書・生成型宣言・法務生成時刻で、実装・試験コードは同じです。

Windowsでのsymlink fixture作成EPERMと`/bin/sh`不在による既知の試験失敗を保持しています。fixture作成で停止したsandbox試験は拒否処理そのものを検証できていません。全Windowsテスト成功とはしていません。

Google認証、特殊な認証復旧、サーバー側失効、別ユーザーを含むNTFS実効アクセス、外部スクリーンリーダー、全画面・DPI・動的翻訳の完全な実行時確認は未完了です。静的監査の動的候補653件とスコープ未確定382件は、欠落キーや不具合の件数ではありません。確認済みの脆弱性とは区別します。[品質検証資料](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification)に範囲を記載しています。

## ソースからのビルド

Node.js 24以降、リポジトリ指定のpnpm 12.9.1とWindowsネイティブビルドツールを使用します。

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @nimbalyst/i18n run build
corepack pnpm run build:workspace-deps
corepack pnpm --filter @nimbalyst/collab-bundle run build
corepack pnpm --filter @nimbalyst/runtime run build
corepack pnpm --dir packages/electron run build:win
```

NSIS出力先は`packages/electron/release`です。署名資格情報を指定しないローカルビルドは未署名です。型検査は`corepack pnpm run typecheck`で実行します。生成成功は実起動や認証成功の保証ではありません。[ビルド手順](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Building-from-Source)と[日本語化アーキテクチャ](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Localization-Architecture)を参照してください。

## ライセンス

[MIT License](LICENSE)。元の`Copyright (c) 2024-2026 Nimbalyst Inc.`とライセンス本文を保持しています。同梱第三者ソフトウェアには各ライセンスが適用されます。[一覧](packages/electron/resources/generated/THIRD_PARTY_LICENSES.json)と[NOTICE](packages/electron/resources/generated/THIRD_PARTY_NOTICES.txt)はパッケージの`resources/legal`にも同梱します。

[本家Nimbalyst](https://github.com/nimbalyst/nimbalyst)
