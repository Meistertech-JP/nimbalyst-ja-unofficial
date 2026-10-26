# R16 Windows候補の認定進捗

R16内修正を所有者が承認したため、R15製品7d5407c51をそのまま最終候補として認定する方針から、新コミット `1c1d54a851c340a8f0f9afc304379882a7319fa1` の通常製品を検証する方針へ変更した。旧R15候補・報告・保全166件は変更していない。

## 新候補

正規 `build:win --publish never` と完成win-unpackedを指定したelectron-builder ZIP生成を使用し、別出力 `tmp/r16-windows-candidate1/` に保存した。NSISは443,184,903 bytes、SHA256 `7768ed5a19cb150fe1b380eff4fb7defc65ea656de4c2a425b43b401fcefbca9`。ZIPは576,221,973 bytes、SHA256 `0f21cd0dd4ee4731ab379a8356159a4ed391eb852f8cf1576994d6f6618e493a`。

ZIPのCRC・パス安全性・実展開・全1,913ファイルのサイズとSHA256が一致。ASARは `d6dc0009167aa3a6b9b203a66cd55ffdad3c678fbf7cef83d45dd2c5dda12a7c`、1,021 integrity、341ビルド出力、法務4件が一致。監査器のWindows区切り不足による初期失敗2ログを保持し、製品不一致とは区別した。

SDK4 import・native3配置・Worker8本・externals6を検査し、SQLite Worker3本とONNXを製品Electronで実dlopenした。node-pty3 addonも製品Electron43.7.0／Node24.21.0／ABI148で実dlopen成功。対話端末操作の実行ではない。PEは製品名Nimbalyst 日本語版（非公式）、FileVersion0.82.3.1、ProductVersion0.82.3.0。未署名は仕様であり、不合格理由とはしない。

## 実機確認

新規の専用 `tmp/r16-native-profile1` でZIP実展開版を起動。デバッグポート追加なし、実ユーザープロファイル使用なし。日本語ウェルカムと、所有者操作後の日本語メニュー・ファイル画面・セッション入力欄を確認した。日英切替・再起動保持・正常終了と、修正後案内の通常製品での表示確認は継続中。Computer UseのWindows 10 capture timeoutと入力geometry不足を記録し、互換captureを使用している。

チュートリアル操作では既存のDocuments内Tutorialが表示されたため、文書内容・認証・権限は操作していない。追加の編集操作はF側の専用workspaceへ限定する。

所有者からEnglishへ変更完了の連絡があった。直後の読み取りは、物理EscapeによるComputer Use停止を返したため、英語実表示の確認済み証拠として計上していない。画面入力・再起動は中止している。所有者の変更報告と、ツールによる表示・保持確認は分ける。

その後、所有者から画面操作の再開承認を得て英語設定画面・ネイティブメニュー・English選択値を読み取った。Control+Qによる通常終了とプロセス消失、同じ専用profileでの新プロセス起動後の英語Project Manager表示を確認した。終了ログにもsession/MCP等の正常shutdownがある。別の再起動でF側専用workspaceを指定し、英語ファイル画面を確認。既存C側Tutorialを追加編集していない。証拠は `tmp/r16-evidence/native-candidate1-english-restart.json`。

日本語への切替・再起動保持は引き続き未確認。F側workspaceの起動時に「Set up agents」が出て設定画面を遮っているため、権限選択を自動操作せず所有者の操作を待つ。新補助失敗案内のnative表示は未確認のまま。

後続確認で、所有者の切替後の値は明示jaではなくsystem（「システム設定に従う」）だった。日本語の設定本文・全ネイティブメニューを確認し、Control+Qで通常終了、専用製品プロセス消失を確認してから同じprofile/workspaceで再起動した。新PID29796でも日本語メニュー・設定・新規セッション・案内の日本語を確認した。systemで解決した日本語の再起動保持はPASS、明示ja値の実機保持は未確認として区別する。途中に旧英語メニューが一時表示された観測も保持するが、その後の独立読取りと再起動では日本語へ更新されている。新たな永続的混在不具合とは断定しない。

証拠は `tmp/r16-evidence/native-candidate1-japanese-restart.json`。表示設定操作以外の権限・認証は変更していない。補助失敗案内のnative表示は依然として未確認であり、合成DOMの日英表示・再構成試験と製品ASAR対応で評価する。

新製品入力1c1d54a85とリモート開発HEAD07eac5ae2の照合では、6,397入力が一致した。差分はCIブランチ設定2件と第三者ライセンスJSONのgeneratedAtのみ。ライセンスJSON本体を構造比較し、timestamp以外の差分がないことも確認した。証拠は `tmp/r16-evidence/FIXED_SOURCE_BINARY_EQUIVALENCE.json`。最終文書コミット確定後にも再照合が必要であり、現時点で最終ソースZIP認定ではない。

R15の本番認証・新規/更新/削除は7d製品そのものの成功記録であり、新R16バイナリでの再実行成功とは扱わない。認証/DB/NSIS入力の不変性と適用範囲を最終報告へ対応付ける。新NSIS実行・更新・削除の要否は変更影響に基づき判断し、理由のない反復は行わない。
