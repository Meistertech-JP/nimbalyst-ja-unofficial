# Nimbalyst 日本語版（非公式）

Nimbalyst v0.82.4をベースに、デスクトップアプリのユーザーインターフェースを日本語化した非公式版です。メニュー、設定、ファイル管理、AIセッション、トラッカー、ダイアログなどに日本語表示を追加しています。表示言語は日本語と英語から選択できます。

本プロジェクトはNimbalyst, Inc.の公式製品ではなく、同社による開発・サポート・承認を受けたものではありません。

[English](README.en.md) · [Windows導入手順](docs/WINDOWS_JA_UNOFFICIAL.md) · [利用ガイド](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki) · [本家Nimbalyst](https://github.com/nimbalyst/nimbalyst)

## 提供状況

v0.82.3-ja.2はWindows x64向けの未署名版です。NSISインストーラー、ポータブルZIP、対応ソース、SHA256SUMS.txtは[対象Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.2)から取得できます。

配布物に対応するソースはタグ `v0.82.3-ja.2` です。継続的に更新される `main` ではなく、対象ReleaseのタグとソースZIPを使用してください。旧版のタグ・Release・配布物は保持しています。

このソースは本家v0.82.4の固定コミット `031a6e6de0b7817bbdcd16e6e5e758e45dfdcdc7` を基準とする `v0.82.4-ja.1` のリリース候補です。上記の公開済み配布物とは一致しません。公式最新版とは機能・修正内容が異なる場合があります。

## 主な変更

本家v0.82.4のファイル操作、検索、AIセッションの質問処理、共有ページなどの変更を取り込んでいます。公開済みv0.82.3-ja.2の変更については[リリースノート](RELEASE_NOTES_v0.82.3-ja.2.md)を参照してください。

**チーム復旧には更新された同期サーバーが必要です。** 他の編集クライアントにも対応版が必要です。本番組織の復旧や独立クライアント間の完全な復旧手順は未検証です。既存組織の復旧を試す前に、サーバーの対応状況と復旧対象を確認してください。

## 表示言語とデータ

設定の表示言語でSystem、English、日本語を選択します。エージェントの回答言語とは別の設定です。ユーザー文書や外部サービスの応答を自動翻訳しません。Trackerの一部の名前や状態には英語が残ります。

WindowsアプリIDは `jp.meistertech.nimbalyst.ja.unofficial`、既定ユーザーデータは `%APPDATA%\Nimbalyst 日本語版（非公式）` です。公式版の設定を移動・削除しません。公式版との同時利用はサポートしません。本版は `nimbalyst://` の既定ハンドラーを取得せず、認証にはインスタンス固有のnonce付きlocalhost callbackを使用します。認証メールは同じWindows PCで開いてください。

更新は本リポジトリのReleasesから手動で行います。公式版の自動更新と手動更新確認は無効です。アンインストールはユーザーデータを保持する構成です。

## Windows配布と検証範囲

版ごとの実機操作、自動テスト、未検証事項は[検証記録](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification)に区別して記載しています。以前のバイナリの成功を、新しい配布物での再実行結果とは扱いません。全画面・全DPI・全認証経路の保証はありません。

配布対象は未署名Windows x64 NSIS、ポータブルZIP、対応するソースZIPとSHA256SUMS.txtです。警告や保護機能を無効にせず、取得元・バージョン・SHA-256を確認してください。ハッシュ一致は電子署名や安全性の保証ではありません。

Google認証、特殊な復旧経路、サーバー側のセッション失効、別ユーザーのNTFS実効アクセス、外部スクリーンリーダー、動的翻訳参照の全経路は未検証です。Windowsのsymlink fixture準備でEPERMとなる試験には未検証範囲があり、Linuxでの成功と区別します。[制限事項](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Compatibility-and-Limitations)を参照してください。

共有Trackerの組み込み型を使用する機能には対応する同期サーバーが必要です。旧サーバー・旧クライアントとの互換性は未検証です。また、本版使用後に旧版へ戻すと、保存された外部セッションのカーソル形式を旧版が読み取れない場合があります。ダウングレードと復旧は未検証です。

## ソースからのビルド

Node.js 24以降、リポジトリ指定のpnpm 12.9.1、Windowsネイティブビルドツールを使用します。

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @nimbalyst/i18n run build
corepack pnpm run build:workspace-deps
corepack pnpm --filter @nimbalyst/tracker-builtins run build
corepack pnpm --filter @nimbalyst/collab-bundle run build
corepack pnpm --filter @nimbalyst/runtime run build
$env:ALLOW_UNSIGNED_WINDOWS_BUILD = 'true'
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
corepack pnpm --dir packages/electron run build:win --publish never
```

完成した `packages/electron/release/win-unpacked` から同じペイロードのZIPを生成できます。

```powershell
corepack pnpm --dir packages/electron exec electron-builder --prepackaged release/win-unpacked --win zip --x64 --publish never
```

生成成功は実起動・認証・更新成功の保証ではありません。未署名ビルドに署名資格情報は不要です。型検査は `corepack pnpm run typecheck` で実行します。

## ライセンス

MIT Licenseです。元の `Copyright (c) 2024-2026 Nimbalyst Inc.` とライセンス本文を保持しています。同梱第三者ソフトウェアには各ライセンスが適用されます。ソース内の `packages/electron/resources/generated` と配布物の `resources/legal` に一覧・NOTICEを同梱します。
