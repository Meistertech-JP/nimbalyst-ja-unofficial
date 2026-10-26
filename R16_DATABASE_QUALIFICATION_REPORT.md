# R16 SQLite移行の認定

SQLite0055は `tracker_transactions.base_sync_id INTEGER` を追加するだけで、既存Tracker識別子・チケット番号・セッションを再生成しない。登録順はMigrationRunner version55で、既存ledger skip、transaction内の再確認、SQLとledgerの一体更新、重複version拒否を保持する。R16 Codex修正ではSQL・runner・PGLite変換を変更していない。

既存 `MigrationRunner.test.ts` の8件PASSは、実0054合成DBからの移行・既存全行保持・NULL追加・順序・並行初期化・失敗rollback・再試行・再open・二重実行防止を含む。`sqlite-0055-upgrade.json` を読み戻した。PGLiteのbase_sync_id追加・再実行・42の保持・SQLite変換と再openは `pglite-recovery-cutover.json` の1 PASSで、名前フィルター対象外27件を全件成功へ加算しない。

R15の最終7d5407c51製品は、旧公開v0.82.1-ja.1からの隔離更新で `applied=55`・1〜54のskipを観測した。English設定、日英文書の全文・SHA256、Tracker1件、削除後274テストデータファイル不変を確認している。閉じたDBコピーの保存は外部DB接続ではなく、実製品DBの全行を別接続で比較したという証拠ではない。

今回の新R16候補について、上記旧製品実機結果を新バイナリ自体の再実行成功へ読み替えない。DB入力不変の対応を最終manifestへ記録し、変更がない合成試験の再実行は省略できる。新候補の起動・Worker実ロードは別のWindows認定で扱う。旧認証済みプロファイル更新、全実ユーザーデータ、サーバー組織復旧は未検証。実ユーザーDBを開いたり変更したりしていない。
