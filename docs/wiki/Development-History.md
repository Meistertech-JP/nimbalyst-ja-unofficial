日本語 | [English](Development-History-English)

# 開発履歴

公開版の配布物と対象ソースは、各Releaseとタグで確認できます。

## v0.82.3-ja.2

[Windows x64正式版](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.2)では、公開前の作業資料を配布ソースから除外し、利用者・開発者向け文書と同梱ガイド16件を訂正しました。是正済みのソースから未署名NSISとポータブルZIPを新規生成しています。本家の固定基準と既存製品機能は変更していません。公開対象の自動検査を追加し、内部資料と製品ソース・技術文書を区別します。

旧版のタグ・Release・配布物・Git/Wiki履歴は保持しており、以前の資料が履歴から完全に削除されたという意味ではありません。版ごとの検証範囲は[テストと品質検証](Testing-and-Verification)を参照してください。

## v0.82.3-ja.1

本家v0.82.3の固定コミット `84dcc00f3cd0abbb36eafc6bfad9389f960076db` までの17コミット・144ファイルを統合しました。旧暗号化チーム復旧、SQLite0055の復旧リビジョン、Codexの変更帰属、CPUプロファイル保持制限、Wiki・Transcriptの変更を含みます。組織復旧の実サービス検証は行っておらず、更新済み同期サーバーが必要です。

翻訳資源は英日各14,608キーから14,795キーとなり、復旧・Tracker・時刻・添付案内・アクセシビリティ表示を追加しました。Windows画像コピーでは、カスタムschemeを一度に登録する修正を行いました。製品修正後のLinuxはTest Files 2,340 PASS・7 SKIP・0 FAIL、Tests 19,296 PASS・30 SKIP・0 FAILで成功しました。iOSは528件実行・522 PASS・6 SKIP・0 FAILで成功しました。未署名Windows x64 NSIS・ポータブルZIPを製品修正から再生成し、ASAR・ABI・Worker・ZIP全1,913ファイルを照合しました。通常製品の英語Settings・メニュー・Project Manager・Workspace表示と、英語選択後の再起動保持を確認しました。表示言語をSystemにした場合の日本語Renderer・ネイティブメニュー、Ctrl+Qによる正常終了と再起動後の日本語保持も確認しました。明示的な`ja`設定値の保持、認証、およびNSIS導入・更新・削除は未確認です。補助エラー警告は日英DOM試験で確認しましたが、通常製品画面では未確認です。

## v0.81.7-ja.1

[ソース限定Prerelease](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.81.7-ja.1)として公開しました。デスクトップUIの日本語表示、表示言語設定、公式版と異なるWindows識別子、公式更新の無効化、localhost認証を含みます。Windowsバイナリは提供していません。

## v0.81.7-ja.2

[次のソース限定Prerelease](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.81.7-ja.2)では、固定upstream `e14ddf383a8dbb40e511fc2c2ea50273d08e3579`までの変更を統合しました。ローカルWikiの静的出力と言語指定、バックアップ衝突時の保護などを含みます。

## v0.81.7-ja.3

2026年10月24日に[Windows x64向け正式版](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.81.7-ja.3)を公開しました。未署名NSIS、ポータブルZIP、対応ソースZIPとSHA256SUMSを提供しています。タグのコミットは`0871b7872bb9d043ff07acfaf62a3deb0eb6aef2`です。

About・設定・チュートリアル・認証通知などの日本語表示、Windows Workerの配置とリソース検査、暗号化保存とログアウト競合対策を含みます。作成・名前変更フォームは必要時ロードとし、読み込み失敗をダイアログ内で扱います。独立したエディタールートも表示言語の変更へ追従します。

認証・インストールを確認した先行製品ビルドと、再生成した最終配布ビルドの検証範囲は[リリースノート](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.81.7-ja.3/RELEASE_NOTES_v0.81.7-ja.3.md)に記録しています。公開後のCI失敗と開発ブランチでの対応は[テストと品質検証](Testing-and-Verification)を参照してください。

## v0.82.1-ja.1

[本家v0.82.1の固定コミット](https://github.com/nimbalyst/nimbalyst/commit/583ae0244dae266667be579733d6c571fd74e037)を基にした[Windows正式版](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1)です。新機能の日本語表示、候補メニューとセッション参照のアクセシビリティ表示、製品起動時の開発用デバッグポート抑制を含みます。通常製品ビルドで本番メール認証、言語保持、旧版からの更新、新規導入と通常アンインストールを確認しています。
