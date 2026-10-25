# Nimbalyst 日本語版（非公式）

Nimbalyst v0.82.3をベースに、デスクトップアプリのユーザーインターフェースを日本語化した非公式版です。メニュー、設定、ファイル管理、AIセッション、トラッカー、ダイアログなどに日本語表示を追加しています。表示言語は日本語と英語から選択できます。

本プロジェクトはNimbalyst, Inc.の公式製品ではなく、同社による開発・サポート・承認を受けたものではありません。

[English](README.en.md) · [利用ガイド](wiki/Home.md) · [本家Nimbalyst](https://github.com/nimbalyst/nimbalyst)

## 提供状況

v0.82.3-ja.1は検証中のWindows x64配布候補です。まだ公開していません。現在の正式版は[v0.82.1-ja.1](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1)です。配布物は[このリポジトリのReleases](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases)から取得してください。

対象ソースは本家v0.82.3の固定コミット `84dcc00f3cd0abbb36eafc6bfad9389f960076db` です。公式最新版とは機能・修正内容が異なります。本家ではv0.82.3をPrereleaseとして提供しています。本版は検証後の通常正式版を予定していますが、現時点で公開済みとは扱いません。

## 主な変更

旧暗号化方式のチーム復旧、Trackerの復旧後競合案内、Codexの並行セッションにおける変更帰属、CPUプロファイルの保持制限、画像貼り付け、Wiki・Transcript・開発サーバーの修正を取り込んでいます。

**チーム復旧には更新された同期サーバーが必要です。** 他の編集クライアントにも対応版が必要です。本番組織の復旧や独立クライアント間の完全な復旧手順は未検証です。既存組織の復旧を試す前に、サーバーの対応状況と復旧対象を確認してください。

## 表示言語とデータ

設定の表示言語でSystem、English、日本語を選択します。エージェントの回答言語とは別の設定です。ユーザー文書や外部サービスの応答を自動翻訳しません。翻訳資源は27名前空間・英日各14,794キーです。キー一致は全画面の翻訳完了を意味しません。

WindowsアプリIDは `jp.meistertech.nimbalyst.ja.unofficial`、既定ユーザーデータは `%APPDATA%\Nimbalyst 日本語版（非公式）` です。公式版の設定を移動・削除しません。公式版との同時利用はサポートしません。本版は `nimbalyst://` の既定ハンドラーを取得せず、認証にはインスタンス固有のnonce付きlocalhost callbackを使用します。認証メールは同じWindows PCで開いてください。

更新は本リポジトリのReleasesから手動で行います。公式版の自動更新と手動更新確認は無効です。アンインストールはユーザーデータを保持する構成です。

## Windows配布と検証範囲

配布対象は未署名Windows x64 NSIS、ポータブルZIP、対応するソースZIPとSHA256SUMS.txtです。警告や保護機能を無効にせず、取得元・バージョン・SHA-256を確認してください。ハッシュ一致は電子署名や安全性の保証ではありません。

38ワークスペース型検査、7エントリの容量上限を確認しています。Windows製品コミット `49e52c53ffe1225ce7d411f53f7e20c7758c49a7` のLinuxは19,264 PASS／0 FAIL／30 SKIPでした。同製品の通常ZIPでは日英それぞれの再起動後保持、英語完了時刻、日本語の展開ヘルプ、文書への画像貼り付け・Undo／Redoを確認し、全1,913ファイルの照合とCRCに成功しました。幅1,040でのメニュー操作は先行する表示修正候補で確認しました。

最新のiOS CIは、履歴件数に対する更新性能の試験が失敗し、全体試験へ進んでいません。検索範囲を変更セッションへ限定する修正と回帰テストを追加しましたが、修正後のiOS実行は未確認です。過去の527実行／6 SKIP／0 FAILを最新ソースの成功とは扱いません。

メール認証・暗号化保存・復元・ログアウト、新規導入は先行候補の通常製品で確認しました。時刻表示修正時点の候補では旧正式版からの更新、マイグレーション55、英語設定と全10文書の保持、アンインストール後の専用設定・文書183ファイルの保持を確認しています。その後の表示修正を含む最新バイナリへ、先行候補の結果を無条件に適用していません。機能別GUIの残りと最終ソースZIP照合は継続中です。[検証範囲](wiki/Testing-and-Verification.md)と[制限事項](wiki/Compatibility-and-Limitations.md)を参照してください。

## ソースからのビルド

Node.js 24以降、リポジトリ指定のpnpm 12.9.1、Windowsネイティブビルドツールを使用します。

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @nimbalyst/i18n run build
corepack pnpm run build:workspace-deps
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
