# Nimbalyst 日本語版（非公式）

Nimbalyst v0.82.3をベースに、デスクトップアプリのユーザーインターフェースを日本語化した非公式版です。メニュー、設定、ファイル管理、AIセッション、トラッカー、ダイアログなどに日本語表示を追加しています。表示言語は日本語と英語から選択できます。

本プロジェクトはNimbalyst, Inc.の公式製品ではなく、同社による開発・サポート・承認を受けたものではありません。

[English](README.en.md) · [Windows導入手順](docs/WINDOWS_JA_UNOFFICIAL.md) · [利用ガイド](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki) · [本家Nimbalyst](https://github.com/nimbalyst/nimbalyst)

## 提供状況

v0.82.3-ja.1はWindows x64向けの未署名版です。NSISインストーラー、ポータブルZIP、対応ソース、SHA256SUMS.txtは[対象Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.1)に掲載します。

対象ソースは本家v0.82.3の固定コミット `84dcc00f3cd0abbb36eafc6bfad9389f960076db` を基準にしています。公式最新版とは機能・修正内容が異なります。本家がPrereleaseとして提供したv0.82.3を基準としています。

## 主な変更

旧暗号化方式のチーム復旧、Trackerの復旧後競合案内、Codexの並行セッションにおける変更帰属、CPUプロファイルの保持制限、画像貼り付け、Wiki・Transcript・開発サーバーの修正を取り込んでいます。

**チーム復旧には更新された同期サーバーが必要です。** 他の編集クライアントにも対応版が必要です。本番組織の復旧や独立クライアント間の完全な復旧手順は未検証です。既存組織の復旧を試す前に、サーバーの対応状況と復旧対象を確認してください。

## 表示言語とデータ

設定の表示言語でSystem、English、日本語を選択します。エージェントの回答言語とは別の設定です。ユーザー文書や外部サービスの応答を自動翻訳しません。翻訳資源は27名前空間・英日各14,795キーです。キー一致は全画面の翻訳完了を意味しません。

WindowsアプリIDは `jp.meistertech.nimbalyst.ja.unofficial`、既定ユーザーデータは `%APPDATA%\Nimbalyst 日本語版（非公式）` です。公式版の設定を移動・削除しません。公式版との同時利用はサポートしません。本版は `nimbalyst://` の既定ハンドラーを取得せず、認証にはインスタンス固有のnonce付きlocalhost callbackを使用します。認証メールは同じWindows PCで開いてください。

更新は本リポジトリのReleasesから手動で行います。公式版の自動更新と手動更新確認は無効です。アンインストールはユーザーデータを保持する構成です。

## Windows配布と検証範囲

製品修正コミット `1c1d54a851c340a8f0f9afc304379882a7319fa1` からWindows NSIS・ポータブルZIPを再生成し、ASAR、ネイティブABI、Worker、ZIP全1,913ファイルを照合しました。通常製品で英語の設定・メニュー・Project Manager・Workspace表示と、英語選択後の再起動保持を確認しました。日本語は表示言語をSystemに設定した状態でRendererとネイティブメニューに表示され、Ctrl+Qによる正常終了後の再起動でも保持されました。明示的な`ja`設定値の再起動保持は未確認です。修正後の補助エラー警告は日英DOM試験で確認しましたが、通常製品の実画面表示は未確認です。認証・NSIS導入/更新/削除の製品操作は本版では実施していません。関連ソース入力に変更はありませんが、それは実操作の確認に代わるものではありません。

認定コミット `4a642e5c95d174a9df8deaf8712ca8560b738d11` のLinux run `40277550288` はTest Files 2,340 PASS・7 SKIP・0 FAIL（計2,347）、Tests 19,296 PASS・30 SKIP・0 FAIL（計19,326）で成功しました。iOS run `40277550251` は528実行・522成功・6スキップ・0失敗で完了しました。正式公開用コミットは認定後の文書変更のみで、製品入力との対応を確認しています。[検証記録](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification)も参照してください。

配布対象は未署名Windows x64 NSIS、ポータブルZIP、対応するソースZIPとSHA256SUMS.txtです。警告や保護機能を無効にせず、取得元・バージョン・SHA-256を確認してください。ハッシュ一致は電子署名や安全性の保証ではありません。

製品修正後の回帰ではProvider/Protocol 51件、Main/parser/UI/i18n 54件が成功し、38ワークスペース型検査と既存7エントリの容量上限もPASSしました。これらのテスト結果は、新しい通常製品での認証やNSIS導入を意味しません。[検証範囲](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification)と[制限事項](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Compatibility-and-Limitations)を参照してください。

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
