# 日本語化アーキテクチャ

[English](Localization-Architecture-English.md) · [ホーム](Home.md)

対象は本家v0.82.3を基準とするv0.82.3-ja.1候補です。翻訳資源は `packages/i18n/src/resources/en` と `ja` にあり、27名前空間・英日各14,782キーです。

## 共通資源とホスト

`@nimbalyst/i18n` はi18nextとreact-i18nextを使用します。`/locale` は資源を含まない言語選択方針、`/core` は資源付きインスタンス作成、`/react` はReact接続、`/resources` は翻訳資源を公開します。既定名前空間はcommon、fallbackは英語です。

MainとRendererは別々のインスタンスを使います。Mainの `createMainI18nController` は永続設定 `app.uiLanguage` の変更を購読し、言語更新後にネイティブメニューを再構築します。Rendererの `UiLanguageProvider` は設定とシステム言語を解決し、i18nextと `document.documentElement.lang` を更新します。設定の保存はホスト側が担います。

独立したエディターReactルートは親Contextを自動継承しません。`createTranslatedRoot` がライブのi18nインスタンスを渡します。`useTranslation` はコンポーネントのトップレベルで呼び、title、aria-label、placeholder、tooltipも翻訳対象として扱います。ユーザー文書、モデル名、識別子、外部サービスの応答は機械的に翻訳しません。

## 必要時ロード

docs-uiの作成・名前変更ダイアログと宛先生成は操作時に読み込みます。大きなbarrelではなくdeep exportを使い、フォーム依存を初期グラフへ戻さない境界を維持します。失敗は `DialogLoadBoundary` がダイアログ内で扱います。Electron Mainは静的importのままです。

候補のdocs-ui初期容量は89,138 gzip bytes、上限は92,000 bytesです。全7エントリの上限を維持しています。遅延チャンクが存在することだけで初期転送量削減と判定しません。

## 追加した翻訳と監査

チーム復旧の各段階・停止理由・診断書き出し、Trackerの復旧後競合、Codexの変更帰属が不明な理由、貼り付け画像の既定ラベルを既存資源へ接続しました。Mainの復旧用ヘルパーはローカルで生成する案内だけを翻訳し、サーバーから届く任意の文字列を書き換えません。

英日キー、空翻訳、補間変数、解決可能な静的参照を検査します。Mainヘルパーの直接参照105件と変更帰属の有限キー27件も照合しています。動的参照659候補、スコープ未確定385候補の完全な実行時追跡は未完了です。候補数は欠落キー数ではなく、キーの一致も全画面の翻訳完了を証明しません。セッション時刻の表示・aria-label・tooltipは表示言語に追従し、待機中も分単位の更新を継続します。
