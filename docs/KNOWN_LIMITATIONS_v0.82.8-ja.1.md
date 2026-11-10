# v0.82.8-ja.1候補の検証範囲と既知制限

この文書は未公開候補の記録です。`v0.82.8-ja.1` ReleaseおよびWindows配布物はまだ公開されていません。本家v0.82.8（`ab9da8f121e4e6fddebc523ced671863e8892ff6`）を基準にしています。

## 音声入力

本家v0.82.8由来のDictationコードとUIを取り込み、UI文字列を英語・日本語リソースへ接続しています。音声入力の機能動作は未検証です。マイク録音、オンデバイス認識、OpenAI文字起こしAPIとの連携、実機での一連の利用フローは確認していません。正常動作を確認済みとは扱いません。

## 共同編集・同期サーバー

実サーバー、組織、同期サーバー間の相互運用テストは実施していません。サーバー関連サービスの新設・起動や組織作成も行っていません。クライアント側の静的確認・型検査・モック試験は実サーバー互換性の証明ではありません。

## Windowsターミナル自然終了後の資源

過去のv0.82.7比較では、外側のshell／CLIプロセス自然終了後に端末資源とMainメモリが残る現象が本家・日本語版の双方で観測されました。R24で修正が入った可能性はありますが、R24候補の最終通常製品で同一条件の反復比較が終わるまでは解消済みと判定しません。

## 大きなMarkdown文書のCPU使用率

472,048バイト・5,000項目の合成文書を通常のWindows候補で開き、`TOKEN`検索で「1 of 5000」と一致箇所のハイライト、`R24NORESULT`検索で「No results」を確認しました。候補プロセスツリーのCPU時間は、検索ありの安定した15秒区間で2.08秒、該当なしの15秒区間で2.05秒でした。検索欄を閉じても文書を開いたままの後続20秒区間では4.00秒でした（単一コア換算でそれぞれ約14%、14%、20%；マシン全体のCPU使用率ではありません）。検索語の有無による差はほぼありません。文書を閉じた状態やアプリのアイドル時の比較基準は取得しておらず、CPU負荷の原因は分離できていません。検索直後の短い高い値は持続しませんでした。高CPU問題は解消と判定していません。

## 高負荷時のWiki文脈処理

R24候補の高負荷時におけるセッション開始文脈の遅延・省略は、まだ同一条件で比較検証していません。過去版の結果をR24の合否へそのまま流用しません。

## 翻訳とアクセシビリティ

共有翻訳資源は27名前空間、英日各15,401キーで静的整合性を確認しています。以前の監査記録では動的翻訳参照484件を分類していますが、この候補工程ではその全件一覧と分類を独立に再照合していません。今回差分のAST監査では変更された125ソース内の33箇所（基準27箇所から6箇所追加）を確認し、追加分に参照欠落はありませんでした。いずれも外部由来の全値・全実行経路を網羅した実画面確認ではありません。外部スクリーンリーダー、全DPI、全アクセシビリティ条件は未検証です。モデル名、ユーザー文書、外部サービス応答などは自動翻訳しません。

## Windows・配布物

R24候補のWindows x64 NSIS・Portableを生成し、通常起動・終了、日本語／英語切替、再起動後の言語保持を確認しました。NSISの新規導入・旧版からの更新とユーザーデータ保持、Portable版の更新とテスト文書保持も専用環境で確認しています。製品は未署名です。Windows symlink fixture作成時のEPERMでは拒否動作まで到達しない場合があります。R20・R23以前の証拠はR24候補の実動作結果として扱っていません。

## 認証

R24 `win-unpacked`候補の専用プロファイルでは、ユーザー操作による本番メール認証、サインイン状態の同一プロファイル再起動後復元、通常ログアウト時の暗号化認証ファイル削除を確認しました。ログアウト後の再起動ではサインイン画面を確認しています。認証ファイルの内容は読んでいません。後続の再読込では一時的に未サインインフォームと認証ファイル不在を確認しましたが、その後同じ専用プロファイルで再度ログインし、サインイン済みUIと暗号化認証ファイルの存在を読み戻しました（ファイル内容は不読）。この最新のログイン後の再起動保持とログアウトは再試験していません。NSIS専用プロファイルは再起動後にサインアウト状態で、同じNSISプロファイルでの認証成功は未確認です。nonce検証やlocalhost callback配送は独立計測していません。Google認証、サーバー側セッション失効、特殊な復旧経路も未検証です。ローカルのログアウトとサーバー側セッション失効を同一視しません。

## English

# Verification scope and known limitations for the v0.82.8-ja.1 candidate

This is an unpublished candidate record. The `v0.82.8-ja.1` Release and Windows distributions are not available. The fixed base is upstream v0.82.8 (`ab9da8f121e4e6fddebc523ced671863e8892ff6`).

### Dictation

Upstream Dictation code and UI are included, and UI strings are connected to English and Japanese resources. Voice-input behavior has not been validated. Microphone capture, on-device recognition, integration with the OpenAI transcription API, and the end-to-end user flow have not been verified. No claim of verified voice-input behavior is made.

### Collaboration and sync servers

No live collaboration/sync server, organization or server-interoperability tests were performed. No server was created or started and no organization was created. Client-side static checks, typechecking and mock tests do not prove compatibility with a live server.

### Resources retained after natural Windows terminal exits

Earlier v0.82.7 comparisons observed retained terminal resources and Main-process memory after outer shell/CLI processes exited naturally in both upstream and this edition. R24 may include a fix, but it remains unconfirmed until the final regular product is tested repeatedly under the same conditions.

### CPU with large Markdown documents

In the regular Windows candidate, a 472,048-byte synthetic Markdown document with 5,000 items was opened. The UI showed “1 of 5000” and highlighted the match for `TOKEN`; `R24NORESULT` showed “No results.” Candidate process-tree CPU time was 2.08 seconds over a settled 15-second interval with matches, 2.05 seconds over 15 seconds with no results, and 4.00 seconds over a later 20-second interval with the find bar closed but the document still open (about 14%, 14% and 20% of one core, not total-machine CPU). The match/no-match difference was negligible. No baseline with the document closed or the app idle was captured, so the cause was not isolated. The higher short samples immediately after search did not persist. The large-document CPU issue is not considered resolved.

### Wiki context under load

R24 has not yet completed a same-condition comparison of delayed or omitted session-start context under heavy load. Results from earlier versions are not reused as an R24 verdict.

### Localization and accessibility

Static consistency was checked for 15,401 English and Japanese keys across 27 namespaces. An earlier audit record classifies 484 dynamic translation references, but this candidate pass did not independently reconcile the complete list and classifications. The AST audit of 125 changed sources examined 33 call sites (six more than the 27-site baseline) and found no missing references among the additions. This does not visually exercise every external value and runtime path. External screen readers, every DPI setting and all accessibility conditions remain unverified. Model names, user documents and external service responses are not automatically translated.

### Windows and distributions

R24 Windows x64 NSIS and Portable candidates were generated. Normal launch/shutdown, Japanese/English switching and language persistence after restart were checked. NSIS fresh installation/update and data retention, plus Portable update and test-document retention, were checked in isolated environments. The Windows binaries are unsigned. Windows symlink-fixture EPERM may prevent a test from reaching the rejection behavior. R20/R23 evidence is not substituted for R24 runtime results.

### Authentication

In the R24 `win-unpacked` candidate and an isolated profile, user-completed production email sign-in, signed-in state after a same-profile restart, and removal of encrypted credential files after normal logout were observed. The post-logout restart displayed the signed-out form. Credential file contents were not read. A later readback temporarily showed the signed-out form with no credential files; after another login in that same isolated profile, the account page showed the signed-in state and both encrypted credential files were present (contents unread). Restart persistence and logout were not repeated after this latest login. The dedicated NSIS profile was signed out after relaunch; successful authentication in that exact NSIS profile is unverified. Nonce validation and localhost callback delivery were not independently instrumented. Google sign-in, server-side session revocation and exceptional recovery paths remain unverified. Local logout is not the same as server-side session revocation.
