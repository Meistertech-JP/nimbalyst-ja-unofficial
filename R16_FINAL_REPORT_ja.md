# R16 認定進捗報告（最終確定前）

判定は **VALIDATING / RELEASE QUALIFICATION PENDING / PUBLICATION NOT AUTHORIZED**。READYを宣言していない。本書は最終コミット・ZIP・独立保全seal確定後に最終報告へ更新する。

## 固定基準と修正

固定upstreamはv0.82.3 `84dcc00f3cd0abbb36eafc6bfad9389f960076db`。R15確定 `4198cb720bda3318f58b38e0b22e0dd9ccefbfbe` からR16ブランチを作成し、R15の未push文書履歴を保持した。R15保全166件の全サイズ・ハッシュとソースZIP9,721件、Windows ZIP1,913件の独立読戻しが一致した。R14/R15保全物は変更していない。

R16の模擬試験で、Codex補助セッション情報要求の終端失敗が上位へ伝わらない問題とRPC開始拒否時の購読残留を確認した。所有者のR16内修正指示に基づき `1c1d54a851c340a8f0f9afc304379882a7319fa1` で修正した。主応答成功は維持し、補助失敗を日英statusへ分離する。通常エラー処理・旧履歴・自動再試行方針は維持する。外部capacity制限を解消したとは扱わない。

現在のリモート開発HEADは `07eac5ae2f00c3a22ff15bbcaf05c74c80f29f37`、treeは `f8f13c91055ba8a19ea7ffb6662f60b25db7f658`。1c1d製品入力6,397件と一致し、CI設定2件とライセンスJSONのgeneratedAtだけを区別した。後続の文書はまだ未コミットであり、このHEADを最終認定ソースと称していない。

## 検査結果

| 検証 | 現在の結果 |
| --- | --- |
| Windows全型検査 | 38 workspace PASS |
| 既存容量制限 | 7件 PASS、上限変更なし |
| editor初期gzip | 369,922 / 370,000 bytes、余裕78 bytes |
| Provider/Protocol | 51 PASS、失敗RED・中間失敗ログ保持 |
| Main/parser/実Transcript row/i18n | 54 PASS、日英・履歴復元・二重表示・主応答保持 |
| Linux CI（07eac5ae2）Files | 2,340 PASS / 0 FAIL / 7 SKIP / 2,347 total |
| Linux CI（07eac5ae2）Tests | 19,296 PASS / 0 FAIL / 30 SKIP / 19,326 total |
| Linux scripts/sandbox | 例外なしPASS |
| iOS CI（07eac5ae2）Tests | 522 PASS / 0 FAIL / 6 SKIP / 528 total、シミュレーターのみ |
| 翻訳資源 | 27名前空間、英日各14,795キー、差分/空日本語/補間差分/missing 0 |
| 新Windows候補 | 通常NSIS/ZIP生成、ASAR1,021・出力341・法務4・ZIP1,913件一致 |
| ネイティブ依存 | 製品ElectronでSQLite/ONNX/node-pty3 addons実dlopen成功 |
| 新候補GUI | 日本語起動、English表示・再起動保持、System解決の日本語表示・再起動保持、正常終了PASS。明示ja値の実機保持は未確認 |

Linux [run40269849525](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40269849525) とiOS [run40269849613](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40269849613) を取得し、原ログ・実行SHA・個別test結果・last-run fingerprintを照合した。旧R15の件数を新結果へ流用していない。

通常pushは既知CLI fixture symlink EPERMで停止した。個別sandboxの既知fixture EPERM2件も未通過。他の型・容量・静的検査を確認し、所有者の一回限定承認により07eac5ae2だけを開発ブランチへpushした。今後の文書コミットへの迂回承認としては使用しない。Linux成功をWindowsの拒否動作の検証成功へ読み替えない。

## 新配布候補

| 成果物 | bytes | SHA-256 |
| --- | ---: | --- |
| Windows x64 NSIS | 443,184,903 | `7768ed5a19cb150fe1b380eff4fb7defc65ea656de4c2a425b43b401fcefbca9` |
| Windows x64 ZIP | 576,221,973 | `0f21cd0dd4ee4731ab379a8356159a4ed391eb852f8cf1576994d6f6618e493a` |

ASARは `d6dc0009167aa3a6b9b203a66cd55ffdad3c678fbf7cef83d45dd2c5dda12a7c`。製品Electron43.7.0、Node24.21.0、ABI148。PE FileVersion0.82.3.1、ProductVersion0.82.3.0。未署名は配布仕様。R15バイナリを新製品として流用していない。

## 継承証拠と制限

認証・NSIS・更新・削除・画像コピー・SQLite0055の既存証拠を読み戻し、変更のない入力と対応付ける。R15の成功は歴史的証拠であり、新R16バイナリで同じ操作を再実行したとは記載しない。不要な本番再認証は行わない。

組織を作成・登録せず、本番復旧操作も行っていない。復旧のorg/権限/状態/IPCとfail-closedの監査、既存DOM・単体・統合試験で評価した。実組織フォーム、サーバー遷移、独立クライアントE2E、チームデータ完全性と同期再開は未検証。組織を所有していないこと自体はREADY阻害条件ではない。

動的672・scope未確定412・JSX英語378は静的候補であり、未翻訳件数ではない。Google認証、特殊復旧、サーバー失効、全動的翻訳、外部スクリーンリーダー等は未検証として保持する。補助失敗案内はDOM検証済みだが通常製品での実表示は未確認。正式なfixture投入経路がなく、DB直接編集・CLI偽装・DevTools有効化で補完していない。

## 残工程

物理Escapeによる停止後、所有者から再開承認を得て英語実表示・再起動保持・通常終了を確認した。「Set up agents」は権限を自動選択せず所有者へ引き継いだ。後続の所有者操作後にSystem解決日本語の再起動保持も確認済み。残るのは公開原稿34件の最終レビュー、最終文書コミット、開発remote復元確認、対応するソースZIP全ファイル照合、チェックサム、独立保全sealである。

後続の所有者操作後に、表示言語値systemで日本語になったことを確認し、通常終了・プロセス消失後の新PID29796でも日本語メニューと設定画面が保持された。明示ja値のnative保持とは区別する。実機検証終了後もControl+Qで正常終了し、専用製品プロセス0件・強制停止なしを確認した。現在の残工程は最終文書・ソース/remote/ZIP対応・独立保全であり、GUI操作待ちではない。

## 検証制限のリスク判断

新バイナリでの本番認証・NSIS導入/更新/削除の再実行は省略する。理由は関連auth/installer/DB入力が変わらず、既存通常製品の実認証とインストール全工程証拠が保持され、新候補でも通常起動・終了・言語保持・Worker実ロードと配布payload照合が成功しているため。これは未実施範囲をPASSにする判断ではなく、変更影響に基づく限定的な再利用である。

補助失敗カードのnative実表示と明示ja値の実機保持は未検証だが、実Provider/Protocol→Main→parser→実Transcript rowの日英DOM・履歴試験、通常製品ASAR内の修正との照合、既存i18n設定契約と今回のEnglish/System日本語再起動試験で主要な回帰を評価している。主応答を失敗へ変えないことと購読解放は合成RED→GREENで確認した。実provider容量不足の誘発、本番再送、DB注入、認証/権限偽装で追加確認する危険は取らない。これらの限定的未検証範囲だけを重大な既知不具合として扱わず、公開文書へ明記する。最終成果物不一致や未承認pushがあればREADYにしない。

公開main `b0432ce85977040461bf026aff063059bf6ffd1e` と旧annotated tag object `2548c7f85fae0c88243a71ea63021090225be16a`（参照先同main）は読み戻し一致。mainは現開発HEADの祖先。main・タグ・Release・公開Wikiを変更していない。正式公開は依然として未承認。

## 中間保全

`../r16-evidence-checkpoint-20261026-fixed1/` に証拠・原稿・監査スクリプト137ファイル、23,313,375 bytesを独立コピーした。別PowerShellプロセスで全サイズ・SHA-256・母集団件数を再確認し、不一致0。manifest SHA-256は `176ed33e4753b493f46492a78f436b465cf45d9480689d7c6598f5c0f0389b8e`。receiptは同ディレクトリの `INDEPENDENT_READBACK.json`。配布バイナリ・依存関係・プロファイルは重複コピーしていない。これは時点固定チェックポイントで、最終ソースZIPや最終認定sealではない。
