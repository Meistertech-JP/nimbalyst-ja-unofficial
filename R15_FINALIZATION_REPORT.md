# R15 開発成果確定報告

目標: DEVELOPMENT COMPLETE / RELEASE CONDITIONAL。PublicationはNOT AUTHORIZED、次工程はR16 Release Qualification。通常製品の追加開発と本家の追加追従は凍結する。

現在は保全・清掃工程の実行中。重大な未解決製品不具合を条件付き判定で隠さない。製品不一致・データ消失・認証漏洩等が確認された場合はNOT READYへ戻す。

固定upstreamは `84dcc00f3cd0abbb36eafc6bfad9389f960076db`。17コミット・144ファイルを監査し、10競合を個別解決して両履歴を保持した。製品ソースは `7d5407c51a6be1a4b8fb27ea5e3f694ade109ef7`。Linux/iOSの最終検証対象は `f0c7b7929f18f57c6efac96f61154cfe442b4c74` である。

最終ソースcommit/tree・ソースZIP SHA-256・保全ファイル数は、最終文書コミット後の外部 `R15_PRESERVATION_MANIFEST.json` と独立再ハッシュ結果を正とする。自己参照SHAをGit追跡文書へ埋め込まない。既存のソース候補や中間ZIPを新コミット由来とは扱わない。

CI・Windows・認証・画像・移行の適用範囲はR15_FINAL_REPORT_ja.md、残る公開前判断はR15_R16_HANDOFF.md、削除結果はR15_CLEANUP_REPORT.mdへ対応付ける。全ファイル照合と清掃の実測後に本書の最終結果を確定する。
