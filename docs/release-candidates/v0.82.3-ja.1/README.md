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

現在のWindows候補は製品ソース `7d5407c51` を基準とします。実展開ZIPで画像コピー・貼り付け・Undo／Redo、本番メール認証、再起動後の復元、ログアウト後の未認証保持、両言語での再起動後保持を確認しました。同じ製品のNSISで新規導入・通常起動・削除を確認しています。公開v0.82.1-ja.1からの更新でも英語設定、日英文書、Tracker項目とマイグレーション55を確認し、削除後も専用データ274ファイルが不変でした。

最新ソース `f0c7b7929` の[Linux CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40249364701)は19,285 PASS／30 SKIP／0 FAIL、[iOS CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40249364731)は522 PASS／6 SKIP／0 FAILでした。最終ソースZIPの確定は継続中です。以下は先行候補に限定した履歴です。

配布対象は未署名Windows x64 NSIS、ポータブルZIP、対応するソースZIPとSHA256SUMS.txtです。警告や保護機能を無効にせず、取得元・バージョン・SHA-256を確認してください。ハッシュ一致は電子署名や安全性の保証ではありません。

38ワークスペース型検査と既存7エントリの容量上限を通過しています。Windows ZIP全1,913ファイル、ASARと同梱法務ファイルを照合しました。UI側のソースが変わっていないTracker・Wiki・既存Codex会話の表示は先行候補の実画面記録と区別して適用範囲を記録しています。[検証範囲](wiki/Testing-and-Verification.md)と[制限事項](wiki/Compatibility-and-Limitations.md)を参照してください。

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
