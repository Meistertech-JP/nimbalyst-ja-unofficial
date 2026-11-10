# v0.82.8-ja.1の検証範囲と既知制限

本版は本家v0.82.8（`ab9da8f121e4e6fddebc523ced671863e8892ff6`）を基準にしています。以下は実施した確認の範囲と未検証事項です。

## 音声入力

本家v0.82.8由来のDictationコードとUIを取り込み、UI文字列を英語・日本語リソースへ接続しています。音声入力の機能動作は未検証です。マイク録音、オンデバイス認識、OpenAI文字起こしAPIとの連携、実機での一連の利用フローは確認していません。正常動作を確認済みとは扱いません。

## 共同編集・同期サーバー

実サーバー、組織、同期サーバー間の相互運用テストは実施していません。サーバー関連サービスの新設・起動や組織作成も行っていません。クライアント側の静的確認・型検査・モック試験は実サーバー互換性の証明ではありません。

## Windowsターミナル自然終了後の資源

旧版ではshellの自然終了3秒後も子プロセスが残りました。本版の同一ホストでの一回の比較では終了3秒後に子shellは観測されませんでした。改善を示す限定的な観測ですが、一般的な解消や原因の特定を証明するものではありません。

## 大きなMarkdown文書のCPU使用率

472,048バイト・5,000項目の合成文書を通常のWindows候補で開き、`TOKEN`検索で「1 of 5000」と一致箇所のハイライト、`R24NORESULT`検索で「No results」を確認しました。候補プロセスツリーのCPU時間は、検索ありの安定した15秒区間で2.08秒、該当なしの15秒区間で2.05秒でした。検索欄を閉じても文書を開いたままの後続20秒区間では4.00秒でした（単一コア換算でそれぞれ約14%、14%、20%；マシン全体のCPU使用率ではありません）。検索語の有無による差はほぼありません。文書を閉じた状態やアプリのアイドル時の比較基準は取得しておらず、CPU負荷の原因は分離できていません。検索直後の短い高い値は持続しませんでした。高CPU問題は解消と判定していません。

## 高負荷時のWiki文脈処理

高負荷時におけるセッション開始文脈の遅延・省略は、本版で同一条件の比較を行っていません。

## 翻訳とアクセシビリティ

共有翻訳資源は27名前空間、英日各15,401キーで静的整合性を確認しています。動的参照の全実行経路や外部由来の全値を実画面で確認したものではありません。外部スクリーンリーダー、全DPI、全アクセシビリティ条件は未検証です。モデル名、ユーザー文書、外部サービス応答などは自動翻訳しません。

## Windows・配布物

Windows x64 NSIS・Portableの通常起動・終了、日本語／英語切替、再起動後の言語保持を確認しました。NSISの新規導入・旧版からの更新とユーザーデータ保持、Portable版の更新とテスト文書保持も専用環境で確認しています。製品は未署名です。Windowsローカルの全体Vitestは完走していません。また、symlink試験ではfixture作成時のEPERMにより拒否動作まで到達しなかったものがあります。Linux CIの成功とは区別します。

## 認証

展開済みWindows製品の専用プロファイルで本番メール認証、暗号化認証ファイルの生成、再起動後の復元、通常ログアウト後の認証ファイル削除と未認証状態を確認しました。その後の再ログインではサインイン済み画面と暗号化ファイルを確認しましたが、再ログイン後の再起動・ログアウトは再試験していません。NSIS専用プロファイルでの認証成功、nonce検証やlocalhost callback配送の独立計測、Google認証、サーバー側セッション失効、特殊な復旧経路は未検証です。ローカルのログアウトはサーバー側のセッション失効を意味しません。

## English

# Verification scope and known limitations for v0.82.8-ja.1

This edition is based on upstream v0.82.8 (`ab9da8f121e4e6fddebc523ced671863e8892ff6`). The sections below describe the verification performed and its limitations.

### Dictation

Upstream Dictation code and UI are included, and UI strings are connected to English and Japanese resources. Voice-input behavior has not been validated. Microphone capture, on-device recognition, integration with the OpenAI transcription API, and the end-to-end user flow have not been verified. No claim of verified voice-input behavior is made.

### Collaboration and sync servers

No live collaboration/sync server, organization or server-interoperability tests were performed. No server was created or started and no organization was created. Client-side static checks, typechecking and mock tests do not prove compatibility with a live server.

### Resources retained after natural Windows terminal exits

An earlier version retained a child shell three seconds after natural exit. In one comparison on the same host, no child shell was observed three seconds after exit in this edition. This limited observation suggests improvement but does not establish a general resolution or identify the cause.

### CPU with large Markdown documents

In the regular Windows candidate, a 472,048-byte synthetic Markdown document with 5,000 items was opened. The UI showed “1 of 5000” and highlighted the match for `TOKEN`; `R24NORESULT` showed “No results.” Candidate process-tree CPU time was 2.08 seconds over a settled 15-second interval with matches, 2.05 seconds over 15 seconds with no results, and 4.00 seconds over a later 20-second interval with the find bar closed but the document still open (about 14%, 14% and 20% of one core, not total-machine CPU). The match/no-match difference was negligible. No baseline with the document closed or the app idle was captured, so the cause was not isolated. The higher short samples immediately after search did not persist. The large-document CPU issue is not considered resolved.

### Wiki context under load

R24 has not yet completed a same-condition comparison of delayed or omitted session-start context under heavy load. Results from earlier versions are not reused as an R24 verdict.

### Localization and accessibility

Static consistency was checked for 15,401 English and Japanese keys across 27 namespaces. Not every dynamic reference, external value or execution path has been visually exercised. External screen readers, every DPI setting and all accessibility conditions remain unverified. Model names, user documents and external service responses are not automatically translated.

### Windows and distributions

Windows x64 NSIS and Portable builds were checked for normal launch/shutdown, Japanese/English switching and language persistence after restart. NSIS fresh installation/update and data retention, plus Portable update and test-document retention, were checked in isolated environments. The Windows binaries are unsigned. The local Windows full Vitest suite did not complete; symlink-fixture EPERM also prevented some tests from reaching rejection behavior. These results are distinct from successful Linux CI.

### Authentication

In an isolated profile using the unpacked Windows build, production email sign-in, encrypted credential-file creation, restart restoration, and credential-file removal and signed-out state after normal logout were observed. A later sign-in also showed the signed-in UI and encrypted files, but restart and logout after that sign-in were not repeated. Successful sign-in in the dedicated NSIS profile, independent nonce and localhost-callback instrumentation, Google sign-in, server-side session revocation and exceptional recovery paths remain unverified. Local logout is not the same as server-side session revocation.
