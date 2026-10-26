日本語 | [English](Translation-and-Contributing-English)

# 翻訳と開発への参加

このフォークの表示・Windows配布に関する報告は[Issues](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/issues)へ、変更案は[Pull Requests](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/pulls)へ送ります。本家への問い合わせやPRと、このフォークへの報告を区別してください。

## 報告と修正の単位

翻訳漏れの報告にはバージョン、表示言語、画面名、操作順、実際の英文を含めます。スクリーンショットからメール・ユーザー名・認証URL・個人文書を除去します。大きな機能変更は実装前に目的と影響をIssueで説明します。

修正は一つの意味のまとまりにします。文言だけの変更でも、キーのスコープやレンダリング経路を確認します。翻訳のために本家の機能を削除したり、UI以外の内部識別子の意味を変えたりする変更は受け入れない方針です。

## キーと補間

資源は`packages/i18n/src/resources/en`と`ja`です。既存の名前空間とキーに同じ意味の文言があれば優先して使います。新しい意味には英語・日本語を同時に追加し、キー階層・補間変数・複数形などの構造を揃えます。`{{name}}`などの変数名を日本語へ変更しません。

動的なキーは、取りうる値とfallbackを確認します。文字列結合を静的検査が解決できない場合、画面の状態を変えて実際の表示を試験します。キー数一致や型検査だけで表示完了としません。

ReactのHookはコンポーネントのトップレベルで取得します。callback・map内へ`useTranslation`を置かず、必要な翻訳関数を渡します。JSXの波括弧、aria-label、title、placeholder、tooltip、portal、toast、ネイティブダイアログも確認します。

## 翻訳しないもの

ブランド名、モデルID、API識別子、プロトコル値、ファイルパス、Git参照名、ユーザー入力値、外部サービス由来データを文脈なく置換しません。コマンドに入力する固定リテラルを訳して動かなくすることも避けます。表示用説明と実行値が同じ文字列を使っている場合は責務を分けて検討します。

## 検証とPR

[ビルド手順](Building-from-Source)に従い、型検査・i18n資源試験・変更部分の回帰試験を実行します。画面変更は日本語と英語で操作し、言語切替、長いラベル、モーダルやtooltipの表示を確認します。初期importを変更した場合はバンドル容量も測定します。

PRには目的、変更範囲、実施したコマンドと結果、未検証範囲を記載します。本家由来の[CONTRIBUTING.md](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.1-ja.1/CONTRIBUTING.md)にはDCO・ライセンス・依存更新の注意があります。ただし、本家の担当者や署名付き公式Releaseの権限が、この非公式フォークにも存在するとは解釈しません。秘密鍵・認証情報・個人プロファイルを添付しないでください。

[アーキテクチャ](Localization-Architecture)・[品質検証](Testing-and-Verification)・[本家への追従](Following-Upstream)。
