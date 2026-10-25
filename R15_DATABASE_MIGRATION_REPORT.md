# R15 データベース移行検証

固定upstreamは `84dcc00f3cd0abbb36eafc6bfad9389f960076db`。本書は統合中ソースの検証記録であり、最終Windows配布候補・実機更新の合格記録ではない。

## 変更と互換性

SQLiteの0055は `tracker_transactions.base_sync_id INTEGER` を追加する。旧編集がどの同期リビジョンに対するものだったかを、組織復旧後にも保持するための列である。既存行の値はNULLで、TrackerのID・チケット番号やセッションを再生成する処理はない。0055より前のSQLファイルには固定upstream間の変更がないことをGit差分で確認した。

PGLiteの対応変更はworkerのトランザクションキュー初期化にある `ADD COLUMN IF NOT EXISTS base_sync_id BIGINT`。JSONBやTIMESTAMPTZをSQLiteのTEXT/INTEGERと同一視せず、それぞれの実エンジンで確認した。

## 実行結果

| 対象 | 実行した範囲 | 結果 | 証拠 |
|---|---|---|---|
| MigrationRunner.test.ts | 全ファイル、新規作成、順序、二重初期化、再起動、0054→0055、失敗ロールバック・再試行 | 8 PASS / 0 FAIL / 0 SKIP | tmp/r15-evidence/sqlite-0055-upgrade.json |
| PGLiteToSQLiteMigrator.test.ts | 追加した復旧リビジョンの移行試験のみ | 1 PASS / 0 FAIL、27件は名前フィルター対象外 | tmp/r15-evidence/pglite-recovery-cutover.json |

追加したSQLite試験は、実際の0001〜0054を適用した合成DBへ日本語のセッション・下書き、チケットID/番号、待機中編集を投入する。0055適用後に全行を比較し、追加列のNULL以外に変化がないこと、台帳が順序どおりであること、integrity_checkとforeign_key_checkを確認する。

失敗試験では、合成スキーマの0055へ意図的な不正SELECTを付け加える。ALTERと台帳の双方がロールバックされ、既存行が変わらないことを確認した後、配布ソースの正常な0055で再試行し、二重実行されないことを確認する。配布SQL自体を失敗用に変更してはいない。

PGLite試験はworkerソースから実際のキュー初期化SQLを取り出し、旧行を保持した追加、同じSQLの再実行、base_sync_id=42の保持を確認する。その後、既存のバックエンド変換を実行し、SQLiteを閉じて開き直した後もリビジョン、編集ID・対象ID・状態が維持されることを確認した。

## 安全性と未完了範囲

実ユーザーDBを開いたり変更したりせず、テストが作成した専用一時DBだけを使用した。接続を閉じてから各fixtureを削除する。MigrationRunnerの従来の一時スキーマもafterEachで清掃するようにした。

この結果は、製品のWorker経由の起動、旧正式版からの実機更新、全テーブルを含む実プロジェクト、実認証状態、実サーバーの組織復旧を証明しない。これらはWindows候補生成後の検証が必要である。同期サーバーの対応は確認しておらず、本番組織で復旧を実行していない。
