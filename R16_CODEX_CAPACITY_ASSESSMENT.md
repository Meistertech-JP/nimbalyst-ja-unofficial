# R16 Codex補助要求失敗の評価・修正

最終認定追補: R16認定コミット4a642e5c95d174a9df8deaf8712ca8560b738d11のLinux/iOS成功と新通常Windows候補の照合・言語保持・正常終了を確認し、201件の独立seal receiptによりREADYを確定した。以下の「検証中」「実行中」は過去の時点記録。通常製品での補助失敗カードnative表示、実capacity事象のwire原因は依然として未確認で、これらをPASSにしていない。

状態: 製品修正コミット `1c1d54a851c340a8f0f9afc304379882a7319fa1`。単体・統合検証済み、通常Windows候補の再生成・実機検証中。READY判定ではない。

## 観測と分類

R15製品7d5407c51では、所有者が許可した主要求は9.8秒で成功し、自動セッション情報リマインダーにprovider報告のcapacityエラーが出た。実wire形状は保存していないため、同じ原因であったとは断定しない。実サービスへの再送・モデル変更は0。

R16では既存Providerと実Protocolのin-memory peerを使い、主要求成功後のterminal error、failed turn/completed、RPC開始拒否を再現した。Protocolはerrorを1件返すが上位errorは0で、3件のREDとなった。RPC開始拒否では次の合成要求終了後も通知購読が1件残った。willRetry→回復はPASSし、全ケースで主応答・thread ID・次要求は保持された。これは外部容量制限Aとは別に、製品側処理不足Bを実証した結果である。R15の実capacity事象がこの経路を通ったかはCのまま保持する。

## 最小修正

Providerは主要求のcompleteを維持し、補助要求のterminal failureを `auxiliary_error/session_naming` で1回だけ伝える。Mainはこれを通常provider errorや主要求失敗へ変換せず、生のエラーを新しいconsoleログへ出さない。Providerは再読込み用のsynthetic raw summaryを1件記録し、元rawは保持する。新writerで扱ったraw errorは二重表示せず、旧履歴の表示は維持する。

Transcript parserはsummaryをstatusとして復元し、実行中・再読込み後とも同じ案内を表示する。UIは「応答は完了しましたが、セッション情報を更新できませんでした。」を日英の既存i18nへ追加し、生のprovider文言は閉じたtechnical detailsに置く。主応答を失敗と誤表示せず、通常のprovider error経路も保持する。

Protocolのinput preparationとturn/startを既存finally境界へ含め、RPC拒否・途中throwでも通知/abort購読を解放する。自動再送・モデル変更・認証動作の追加はない。

## 回帰証拠

- 初期診断: 1 file、8 PASS／3 FAIL。fixture全文・rawログ・機械JSONを `tmp/r16-evidence/codex-reminder-qualification-*` に保持。
- 永続試験RED: `codex-reminder-fix-checkpoint01-RED` は4 FAIL／8 PASS。
- Provider/Protocol最終: `codex-reminder-fix-checkpoint03-GREEN` は2 files／51 PASS。中間checkpoint02のfixture3失敗も保持し、期待値や拒否条件を弱めずWindows policy RPC応答とpath.join期待を修正。
- Main・parser・実Transcript row・日英資源: `auxiliary-integration-final` は6 files／54 PASS。Mainの実順序text→complete→auxiliary_errorでも応答と完了を保持し、通常ai:errorとの差を確認。
- parser/UIの初期REDも `auxiliary-transcript-RED` に保持。日英切替、折り畳み詳細、再読込時status、旧raw error互換、二重表示なしを検査。
- 全体型検査初回はTS7030で失敗し、明示returnを加えた `auxiliary-typecheck38-corrected` は38 workspace PASS。元失敗ログを保持。容量7件は既存上限のままPASS。

上記は外部サービスなしの回帰試験であり、新Windowsバイナリの実機表示・新HEADのLinux/iOS CI成功を証明しない。新候補の配布物照合と実機確認後に認定を更新する。容量制限そのものを解消したとは記述しない。

## 通常製品での追加試験の限界

通常Windows製品へ補助エラーを安全に投入できる既存経路を調べた。SessionImportDialogは外部CLI履歴のscan/syncで、任意のNimbalyst raw envelopeを取り込むUIではない。CodexSourceは外部rollout形式を解釈し、新しい補助エラーenvelopeの直接import経路ではない。ProviderのProtocol/binary resolver注入はテスト用コンストラクター経路であり、通常設定からmock peerを選ぶ機能ではない。

したがって、実履歴の偽装、外部DB直接投入、製品バイナリ差替え、DevTools/CDP追加は行わない。実providerへ失敗を起こすための送信も行わない。現在の証拠は実Provider/Protocol、Main/parser、実Transcript rowのDOM日英表示・再構成までであり、通常Windows製品での補助失敗カードの実表示は未検証である。新候補ASARに修正handlerが含まれることは確認済みだが、実表示の代用にはしない。

修正後HEAD07eac5ae2のiOS CIは522 PASS／6 SKIP／0 FAILで完了した。Linux CIもTest Files 2,340 PASS／7 SKIP／0 FAIL、Tests 19,296 PASS／30 SKIP／0 FAILで完了し、rawログとlast-runのcommit fingerprintを照合した。旧R15のCI成功と新製品修正後のCIを分離して記録する。
