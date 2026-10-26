# テストと品質検証

[English](Testing-and-Verification-English.md) · [ホーム](Home.md)

対象はv0.82.3-ja.1候補です。以下は現時点の確認範囲であり、正式公開の完了や全面的な動作保証を意味しません。

## 現在のWindows候補

最新の通常ZIP8で新規Codex要求に固定応答が返り、9.8秒の完了を確認しました。その後の自動セッション情報リマインダーは「Selected model is at capacity」という応答で失敗しました。新規要求の成功と、後続処理のサービス側容量不足を分けて記録しています。手動再送はしていません。復旧フォームはDOM単体試験までで、該当する隔離テスト組織がないため通常製品の日本語フォーム表示は未確認です。

現在の製品ソースは `7d5407c51a6be1a4b8fb27ea5e3f694ade109ef7` です。ZIP全1,913ファイル・CRC・ASAR照合が成功し、実展開版で画像コピー、AI入力欄の画像添付と下書き保持、文書の貼り付け・Undo／Redo、本番メール認証・再起動復元・ログアウト後の未認証保持、日英それぞれの再起動後保持を確認しました。

同じ製品のNSISで新規導入・起動・削除が成功。公開v0.82.1-ja.1からの更新を別プロファイルで実行し、英語設定、日英文書の全文・ハッシュ、Tracker項目1件とmigration55を確認しました。削除後も専用データ274ファイルと既存関連付け8項目は不変でした。実製品DBを別接続で開いて全行を比較したものではなく、旧認証状態付きの更新は未検証です。最終ソースZIPの確定は継続中です。

この修正はMainの起動時scheme登録を変更しています。修正を含む `f0c7b7929` の[Linux CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40249364701)はTest Files 2,340 PASS／7 SKIP／0 FAIL（計2,347）、Tests 19,285 PASS／30 SKIP／0 FAIL（計19,315）でした。[iOS CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40249364731)は522 PASS／6 SKIP／0 FAIL（計528）。型38件、既存容量7件、関連174テストも通過しています。以下の先行候補の記録は履歴として区別します。

## 先行チェックポイントの検証

| 対象 | 確認内容 |
|---|---|
| 型・容量 | 38 workspace型検査、既存7エントリの容量上限を通過 |
| 翻訳 | 27名前空間、英日各14,794キー、キー差分・空の日本語訳・補間差分0 |
| SQLite | 合成データによる0055への更新、既存行保持、失敗時ロールバック・再試行、PGLite変換後の保持 |
| Windows | 通常製品の日英切替、両言語の再起動後保持、ZIP実展開版の起動 |
| 配布物 | Windows ZIP全1,913ファイルの照合、CRC、ASAR1,021ファイルのintegrity、ビルド出力341ファイルと法務4ファイルの一致 |
| ネイティブ | ElectronによるSQLite WorkerとONNX backendの実dlopen、SDK import・配置解決 |
| iOS | 修正後の全体528実行（522 PASS、6 SKIP、0 FAIL）。追加SQL検索計画の回帰試験と既存性能条件も通過 |
| Linux | 19,284 PASS、0 FAIL、30 SKIP。Test Filesは2,339 PASS、7 SKIP、0 FAIL、計2,346 |

Linux初回は19,250 PASS、2 FAIL、30 SKIPと、別途1件の収集時エラーがありました。CPU保持処理と新規キャプチャのpath参照を同一視したテスト、およびloggerが合成パスへ書き込むテスト初期化が原因でした。製品の保持処理は削らず、狭いmockと独立した検証へ修正し、全体CIを再実行して成功しました。失敗記録を成功結果へ書き換えていません。

CIのチェックポイントは `eabb8c5d6e0d951c77c79f2d5ab4439e056512ef`。[Linux](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40243528521)と[iOS](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40243528554)が成功し、最新Windows製品ソース `057883f8bd230280dfeaa298a5c5e45f8252b508` を含みます。先行[iOS試験](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40201861401)では既存6倍性能条件を超えて停止しました。更新対象を探すSQLが無関係な履歴まで走査する原因を修正し、実refresh SQLの検索計画を検査する回帰試験と全体試験を通過しました。閾値は変更せず、失敗記録も保持しています。前段2試験は全体528実行へ二重加算していません。

最新の通常ZIP製品057883f8bでは、Tracker列名・操作とフィルター案内・同期状態の日英表示、ライブ切替、両言語それぞれの再起動保持、詳細を開く操作、正常終了を確認しました。関連回帰試験は10ファイル135件が成功しています。先行49e52c53fでは英語完了時刻、日本語の展開ヘルプ、Wiki/Tracker保持、文書へのネイティブ画像貼り付け・Undo／Redoを確認しました。幅1,040での日本語メニューとAI入力の画像貼り付けによる下書き保持はさらに先行する表示修正候補の確認です。すべてを最新バイナリで再実行したという意味ではありません。

WindowsのCLI symlink fixture作成1件とsandbox fixture作成2件はEPERMで未通過です。同条件の固定upstreamでも再現し、テストを削除・skipしていません。fixture作成で停止したsandboxの拒否動作自体は未確認です。

先行候補の通常製品でメール認証・暗号化保存・復元・ログアウトと、新規導入・削除を確認しました。3388c93c5の候補では、その認証済み候補とMain／Preload全63ファイルが一致し、旧正式版からの更新・マイグレーション55・英語設定・全10文書の保持を確認しました。アンインストール後も専用設定・文書183ファイルは全ハッシュ一致でした。これらは後続の全バイナリで同じ実機操作を再実行したという意味ではありません。残りの機能別GUI確認と最終ソースZIPの確定は検証中です。外部スクリーンリーダー、全DPI、全動的翻訳、WSL実環境の全経路、サーバーを含む組織復旧は未検証です。
