# R16 翻訳リソース認定

対象は製品修正 `1c1d54a851c340a8f0f9afc304379882a7319fa1`。監査証拠は `tmp/r16-evidence/translation-fixed-1/SUMMARY.json` と同ディレクトリの明細。後続 `07eac5ae2f00c3a22ff15bbcaf05c74c80f29f37` まで翻訳入力に変更はない。

## 結果

| 項目 | 結果 |
| --- | --- |
| 名前空間 | en 27 / ja 27 |
| リーフキー | en 14,795 / ja 14,795 |
| キー差分 | 0 |
| 空の日本語 | 0 |
| 補間変数差分 | 0 |
| 解析ソース | 7,323ファイル |
| production参照 | 12,327 |
| shared解決済み | 11,809 |
| local-memory解決済み | 106 |
| scope未確定 | 412 |
| 解決可能範囲のmissing | 0 |
| 動的参照候補 | 672 |
| 未分類JSX英語候補 | 378 |

復旧ヘルパー105参照と有限shell reason27参照の補足検査もmissing 0。動的候補・scope未確定・JSX候補は未翻訳件数ではない。全実行時経路や全画面の固定英語ゼロは証明していない。Swift/Kotlin・外部CLIの表示はこのJS/TS監査の対象外。

## 今回の追加

`aichat:session_naming_failure` を英日双方に1キー追加した。主要求成功後のセッション情報更新失敗を、主要求の失敗と混同しない案内である。英語は “The response is complete, but session information could not be updated.”、日本語は「応答は完了しましたが、セッション情報を更新できませんでした。」。生のprovider詳細は初期状態で閉じたtechnical detailsへ分離している。

Provider/Protocolの51テストとMain・parser・実Transcript row・翻訳資源の54テストで、主応答保持、日英切替、履歴再構成、二重表示防止を検証した。後者にはDOM試験が含まれるが、Windows通常製品で模擬エラーを表示した証拠の代用ではない。

## 実機確認の境界

新しい通常ZIP製品で日本語ウェルカム・メニュー・ファイル画面・セッション入力欄は確認済み。所有者からの画面操作再開承認後、英語設定画面・English選択値・ネイティブメニューを読み取り、通常終了とプロセス消失後の再起動で英語Project Managerと専用workspace表示の保持を確認した。日本語へ戻した際の値はsystemであり、その日本語表示も通常終了・再起動後に保持した。証拠は `tmp/r16-evidence/native-candidate1-english-restart.json` と `native-candidate1-japanese-restart.json`。明示ja値の実機保持と補助失敗案内のnative表示は未確認として区別する。R15の同項目成功を、新バイナリでの成功に読み替えない。

本番組織を必要とする復旧フォーム表示は、依頼で定められた検証対象外。既存のDOM・単体・統合試験とソース監査で評価し、実組織やダミー組織を作成していない。
