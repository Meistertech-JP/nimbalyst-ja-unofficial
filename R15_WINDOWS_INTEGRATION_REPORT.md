# R15 Windows統合検証（継続中）

## 候補の固定点

製品ソースは `a9fcc204e44c39a0602342f8a8da763af32969bf`。本家v0.82.3統合コミットは `e9b53cf59f291f32c5c1327962d7ccf16fc367e1`。アプリ版番号は0.82.3-ja.1、数値buildVersionは0.82.3.1。

製品識別子は `jp.meistertech.nimbalyst.ja.unofficial`、製品名は `Nimbalyst 日本語版（非公式）`。公開・署名資格情報を与えず、通常のbuild:winとelectron-builderのprepackaged ZIP経路を使用した。開発用CDPは有効化していない。

## ビルド・静的監査

- Runtime・Electron・Worker・拡張機能の通常ビルドとNSIS生成がexit 0。`tmp/r15-evidence/windows-package-build1.log`。
- NSIS暫定SHA-256: `72727c20d3221d835357f2d3ad22160e4b7958f2701522bbda304346eafd9f7c`。最終保全時に再計算する。
- ペイロードEXE: FileVersion 0.82.3.1、ProductVersion 0.82.3.0、CompanyName Meistertech-JP、製品名・説明は非公式日本語版名。AuthenticodeはNotSigned。署名済みとは扱わない。
- 同じwin-unpackedからZIPを作るため、追加の製品再ビルドは行っていない。最終ZIP全ファイル・CRC・復元・NSISペイロード照合は未完了。
- 生成ライセンス一覧は1,003パッケージ、要レビュー0。既存一覧との差分は生成時刻とbetter-sqlite3のインストール配置に伴う相対パス。本文の削除はない。最終ソースへの保全は後続で行う。

## SDK・ネイティブ実行確認

afterPackでパッケージ入力・依存解決と29組み込み拡張を確認。初回のABI補助試験は、Git管理下のTempに置かれた.jsがESMとして評価されるためrequireエラーを出した。これをABI不整合や製品成功とは扱わず、生の警告を保持した。

完成したアプリの絶対パスを指定し、Git外の専用F側Tempで既存validatorを実行した結果はexit 0。4 SDKの実ESM import、3ネイティブ実行ファイル、8 Worker bundleと6 externalの解決が成功し、SQLiteの3 WorkerとONNX backendはElectron-as-Nodeで実dlopenが成功。証拠は `packaged-sdk-native-absolute-validation.log`。相対パスでの誤った呼び出し失敗も別ログで保持し、成功結果に書き換えていない。

これはSDKの実認証や実エージェント会話の成功、Workerを使う全アプリ操作の保証ではない。

## 起動と隔離

新規専用プロファイル `F:\Private_Dev\nimbalyst-r15-validation-temp\candidate-01\profile`、専用Documents `workspace` を指定して通常EXEを起動した。初回PIDは13380。実ユーザーデータを指定・コピーしていない。初期の日本語ウェルカムとプロジェクトマネージャーを実画面・アクセシビリティ情報で確認し、専用側にSQLite DBとテストチュートリアルが作られた。

起動直後の当該Mainプロセスの待受ポートはなく、9222/9223にも待受がないことを確認。実画面操作が終了した段階で再確認する。

Computer Useの画像取得は2回タイムアウトした。Windows 10互換経路の画面取得とアクセシビリティ情報は得られた。入力後に別のネイティブファイル選択が開いたことはWindows MCPで確認し、Escapeで閉じる操作を行った。ウィンドウの再生成やユーザー入力検知時には再取得し、古いelement indexを使わない。

## 未完了

日英の両方向切替と再起動後保持、新しい復旧画面、Tracker/Wiki/Codex/画像貼り付け、正常終了、本番認証回帰、新規・更新インストール、アンインストール後の専用データ保持、ASAR・ZIP・ソースの全照合は未完了。旧正式版の成功証拠で代替しない。現時点でWindows候補を全面PASSまたはREADYとは判定しない。

## 後続の実機・ZIPチェックポイント

- 日本語System表示からEnglishへ切り替え、設定、メニュー、使用量tooltipが英語へ更新された。専用app-settingsのuiLanguage=enを確認。
- メニューのQuitから通常終了し、PID13380の消失とbefore-quit/cleanup完了を確認。同じ専用プロファイルでPID27616として再起動し、英語の設定・メニュー・CLI導入案内を確認した。
- Englishから日本語へ戻してuiLanguage=jaを確認。Ctrl+Qによる通常終了後、同じプロファイルでPID27680として再起動し、日本語の設定・メニュー・CLI導入案内を確認した。従って日英の両方向切替と両言語での再起動後保持は、この通常製品についてPASS。
- 英語・日本語の実画面画像は `tmp/r15-evidence/private-gui/` に保存。デスクトップ全体の互換キャプチャを含むため公開原稿・ソースZIP・公開添付物へ入れない。
- PID27680の待受は127.0.0.1:3456で、ソースのstartMcpHttpServerに対応する。9222/9223のCDP待受はない。MCPの待受がある状態を「すべてのポートが閉じている」とは記載しない。
- ポータブルZIPのCRC、パス安全性、実展開、全1,913ファイルのサイズ・SHA-256照合が成功。欠落・余分・不一致は0。`tmp/r15-evidence/windows-zip-integrity1/` に元・復元の全ファイルmanifestと結果を保存した。
- ZIP SHA-256: `0c93b42447080beec1b07cd1a203cf322472448c36dc4c77e64b493b5445c727`。展開物の実起動検証へ切り替え中であり、win-unpackedの起動結果だけでZIP実起動済みとは扱わない。
- インストール先と既存アンインストール登録を読み取り確認した時点では、本版のテスト対象インストール先は存在せず、本版のUninstall登録もなかった。まだNSISを実行していない。

R15の修正前テストが作った空の `F:\test-user-data` は、作成時刻、通常ディレクトリ、内容0、参照プロセスなしを再確認して非再帰削除した。ソース・Git・設定ファイル・ログの削除はなく、空ディレクトリの削除を大きな回収容量とは数えない。使用中のZIP復元物は実機検証後の清掃対象。

## 実展開版とASARの追加確認

ZIP復元先の通常EXEをMain PID38700で起動し、同じ専用プロファイルの日本語設定・メニュー・導入案内を実際のアクセシビリティツリーで確認した。復元ZIPからの実起動はPASS。導入案内を閉じ、アカウント画面の日本語表示と未認証状態を確認した。本番認証の本人操作は別途待機中であり、画面表示を認証成功とは扱わない。

完成済みASARの1,021ファイルについてサイズ・SHA-256と存在するブロックintegrityを照合し、不一致0。うち117ファイルがunpacked指定で、ビルド出力341ファイルも現在のoutと一致した。LICENSE・第三者NOTICE・ライセンスJSON・監査一覧の4ファイルは生成元と同梱物がバイト一致した。証拠は `tmp/r15-evidence/asar-integrity.json`。Windows上のASARパス区切りに対応する監査スクリプトの修正を経て、出力ファイル照合0件では成功させないガードを追加した。ASAR全体SHA-256は `cfc45c8bd4e30cf4848352fb95abdc44d25a5226a5c0ad238ec63c5810f5386f`。

## 通常ZIP製品の認証回帰

所有者が専用アカウント画面でメール認証を実施した後、サインインフォームがなくサインアウト操作が存在する表示へ変わった。アプリのログに暗号化保存完了の固定メッセージが1件あり、stytchの暗号化保存ファイル2件を確認した。内容・メールアドレス・認証URL・トークンは証拠へ出力していない。通常終了後に同じ製品を再起動し、PID35312のアカウント画面で認証状態の復元を確認した。

所有者が通常サインアウトを実施し、サインインフォームへの復帰と認証ファイル2件の不在を確認。再び通常終了・再起動したPID17112でも未認証表示と両ファイルの不在が維持された。ログアウトのローカル状態削除を、サーバー側のセッション失効とは扱わない。nonce不一致・再使用の実攻撃試験はしていない。

F側の専用テストフォルダーが広いACLを継承していたため、実ユーザー環境ではなくcandidate-01だけを本人・SYSTEM・Administratorsへ制限し、認証ファイルにもその3主体だけが継承されることを確認した。これはテストデータの保護措置であり、製品自身のNTFS ACL強化や別ユーザーの実効アクセス検証成功ではない。初期の固定DPAPIヘッダー判定は一致しなかったため、その判定を暗号化の成否に使用せず、safeStorage経路の実装・保存完了記録・製品による再起動復元を根拠とした。

証拠の機密情報を含まない要約は `tmp/r15-evidence/authentication-checkpoint.json`。NSIS版の認証を別途実施したという主張はしない。

## 先行候補のNSISライフサイクル

ハッシュ確認した先行NSISを、未使用だった本版専用インストール先へユーザー単位でsilent新規導入し、終了コード0を確認。製品名・数値版番号0.82.3.1・NotSigned、スタートメニューとデスクトップの専用ショートカットを確認した。既定のプロトコル・Markdown関連付け・UserChoiceは前後で不変。完成したビルド元1,913ファイルは導入先で全一致し、追加は本版のアンインストーラー1件だけだった。

PID37148として導入先EXEをF側の同じ専用設定で起動し、日本語設定・Wiki・Trackerを確認した。ローカルWikiに「R15-Wiki-検証」を作成し、日本語・英語の検証用本文を入力。Trackerに「R15 Tracker 保存確認 0823」を新規作成し、Tasksが3から4へ増え、項目タイトルの表示を確認した。モデル選択操作時にモード案内が表示されたため閉じ、権限設定は変更していない。実Codex会話の成功とは扱わない。

テストアプリの正常終了を待ち、ハッシュ確認した付属アンインストーラーで当該インストールだけを削除した。導入先・両ショートカット・本版所有Markdown ProgIDの不在を確認。F側の専用profile/workspace全93ファイルは前後ハッシュが全一致した。証拠は `tmp/r15-evidence/nsis-fresh1/`。最初の削除試行は正常終了処理中のプロセスが残っていたため削除前に安全停止し、消失を再確認後に実行した。

このGUI確認でセッション行の英語時刻が見つかった。`3388c93c552a84fdaef90f987a26d9712bb163af` で修正し、RED新規2件FAILから関連4ファイル14件PASS、i18n9件PASS、38型・7容量PASSを確認した。先行候補を最終バイナリとせず、新しい通常パッケージを再生成中である。先行NSIS/ZIPは `tmp/r15-evidence/pre-session-time-candidate1/` に移し、最終照合・保全後の重複整理対象として区別した。

## 時刻修正後の通常製品と旧正式版からの更新

`3388c93c552a84fdaef90f987a26d9712bb163af` から通常Windowsビルドと同ペイロードZIPを再生成し、どちらもexit 0。新NSISは443,174,326 bytes、SHA-256 `60d9f90d5f7aea33fe0aa4acd1d549a8ce854af37a3c5322acbe82614a6be723`。新ZIPは576,218,331 bytes、SHA-256 `695058be821ab3645af11c9d969455ce20cb38bc21c4c0ba3c25d7c1d8de786c`。

新ZIPはCRC・安全な実展開・全1,913ファイルのハッシュが一致。ASAR1,021ファイル、ビルド出力341ファイル、法務4ファイルも一致。SQLiteの3 WorkerはElectron実dlopenで成功。ASAR SHA-256は `2e37aacc5e11a10f516a25d4186f15ace525420d623ccf1e68af6c62dccd8b4d`。認証済み先行ZIPとのMain・Preload全63ファイルはバイト一致し、Renderer時刻修正とは切り分けた。証拠は `windows-zip-integrity2/`、`asar-integrity-session-time.json`、`auth-payload-equivalence.json`。

公開v0.82.1-ja.1のNSISを公開チェックサム `60c38b176a5a1c42d59736c6c34cf0e90c7b6033aa514f1c1b6416b7eedf16bf` と照合して同じテストインストール先へ導入した。別の保護されたF側upgrade-01プロファイルで旧版を起動し、UIから英語へ変更、日英の検証用Markdownを作成・保存した。Documents差替先の空フォルダーを作り忘れた最初のチュートリアル起動はENOENTで停止し、専用workspaceを作成してから成功した。製品コードの変更でこの準備不足を回避していない。

旧版を通常終了して設定・閉じたSQLite・文書ハッシュを保全し、新NSISへ更新した。exit 0、数値版0.82.3.1、同じ専用プロファイルで通常起動した。ログはmigration 55の適用と1〜54のskipを記録。英語メニュー、既存TrackerのTasks 3／Bugs 3／Plans 3とタイトル、テスト文書の全本文を確認した。正常終了後の比較で英語設定と全10文書のハッシュが一致した。SQLiteを別プロセスで開いて全行を比較したという主張はせず、行保持・失敗処理は合成データによる移行回帰試験と区別する。証拠は `upgrade01-before/`、`upgrade01-after/`。

更新後の導入ペイロード1,913ファイルは新ビルド元と全一致。candidate-01で新インストール版を起動し、セッション行の日本語aria-labelが「最終更新 1時間前」「最終更新 40分前」となることを確認。画面画像はprivate-gui内に保全した。英語へ切替えて通常終了し、新ZIP実展開版PID30856で英語の設定・メニュー・導入案内を確認。日本語へ戻して正常終了し、PID24376で日本語表示保持を確認した。両PIDで9222/9223の待受はなく、127.0.0.1:3456のMCP待受は存在した。

最後に正常終了・子プロセス消失を待ち、更新検証後の専用C側アプリを付属アンインストーラーで削除した。導入先・両ショートカット・本版Markdown ProgIDは消失。F側candidate-01とupgrade-01の設定・文書全183ファイルは削除前後で全ハッシュ一致。C空き容量は78,913,163,264から80,557,735,936 bytesへ増えた（観測差1,644,572,672 bytes、約1.53 GiB。他の同時ディスク活動を完全分離した測定ではない）。必要なF側検証データと公開R14保全物は削除していない。

## 添付案内と展開ヘルプ修正後の再生成

製品コミット `7af4c3b6e72d4c7c92feb88ce1bbacd89fc628c2` から通常 `build:win --publish never` と、完成した同ペイロードを使うWindows ZIP生成を再実行し、両方exit 0。先行NSIS/ZIPは `pre-help-candidate2/` にハッシュ確認後移動して保全した。新しいZIPはCRC・パス安全性・実展開・全1,913ファイル照合にPASS（`windows-zip-integrity3/RESULT.json`）。ZIP SHA-256は `a2d996293163e96ad91f9d724fcbe623804a48593cd48154a7cee6b86b7f79fa`。

ASAR全1,021ファイルの整合性、ビルド出力341ファイル、LICENSE等4ファイルが一致（`asar-integrity-complete-help.json`）。ASAR SHA-256は `b4f630c3f13f0c6af7a9ec521ce2db562b69e7dc3a76a0b057436d875163306f`。パッケージ検査はSDK4・native3・Worker8をPASSし、SQLite Worker3種類とonnxのElectron dlopenも成功。製品EXEの署名状態はNotSigned。

新しいwin-unpackedを保護されたcandidate-01プロファイルでPID26524として起動した。日本語メニュー・セッション時刻・設定をUI Automationで確認。ガイドのカンバン見出し・本文も日本語だった。添付案内そのものと英語切替の新候補実画面確認は継続中であり、ここまでの読み取りを全画面合格としない。Computer Useのclickはgeometry unavailableで未実行となったため、再取得したWindows-MCPの対象要素で導入案内を閉じた。デバッグポートを開いて代替操作する変更はしていない。

新NSISは443,174,436 bytes、SHA-256 `db5579b3b8cecb925ff646476ab5b76ac9917155c0baee68ffc5fbcc765d5302`。新ZIPは576,218,663 bytes。モデル一覧を実製品で開き、見出しが「Claude Agent（推奨）」になったことをUI Automationで確認した。モデルは選択変更していない。PID26524による9222/9223の待受は確認されなかった。

今回の既知3件だけの例外承認を受け、R15開発ブランチを3388c93c5から7af4c3b6eへ通常fast-forward pushした。mainと公開タグの参照は直前照合で不変。新HEADのLinux run `40195005111` とiOS run `40195005093` は実行中であり、まだPASSと記載しない。

同じ新win-unpackedの通常UIで表示言語をEnglishへ変更し、保存されたuiLanguage=enを読み取り確認した。モデル一覧を再度開き「Claude Agent (Recommended)」へ切り替わったことを確認。日本語時の「Claude Agent（推奨）」とともに新候補の実画面で確認済みであり、モデル選択は変更していない。添付案内の再表示に必要な専用プロファイルのガイド既読リセットは、実行直前の確認待ち。新候補の英語再起動保持はこの時点では未確認。

所有者の承認後、candidate-01の設定画面でガイド既読状態だけをリセットした。通常製品のDeveloper > Show Walkthroughs > Attach Filesから同じ添付ガイドを表示し、英語の「Attach Files & Images」・本文・Close・Doneを確認。Escで閉じ、日本語へ戻して同じガイドを再表示すると「ファイルと画像を添付」・日本語本文・閉じる・完了となった。`private-gui/attachment-guide-ja-7af4c3b6e.png` に実画面を保存した。DevTools・CDP・renderer evalで状態を注入した結果ではない。

この確認中、幅1,040のウィンドウでは日本語メニューの右端がクリップされ、開発者ボタンのUI Automation領域が隣の新規セッションボタンまで及ぶ状態を観察した。開発者ボタンへのWindows-MCP clickが新しい空セッションを2件作成したため、その操作をメニュー成功とは扱わず、以降は最大化して表示を確認した。実ユーザー環境ではなく専用テストプロファイル内の空セッションだけで、プロンプト送信はない。ソースでは左右対称gridの左列内でmenuがoverflow:hiddenとなる構造を確認した。クリップされたUIA座標と実際のヒット位置の差を、描画上の重なりと断定しない。この幅でのメニューへの到達性は未解決の表示課題として記録し、全幅・全DPIの合格を主張しない。

## 通常製品によるCodexセッション

7af4c3b6eの専用空セッションでモデル一覧のtypeaheadからGPT-6.1 Sol（OpenAI Codex）へ変更した。ツール・ファイル読み書き・コマンド実行をしない短い固定応答を要求し、実応答「R15 Codex検証OK」と13.8秒の完了表示を確認した。続いて製品側のセッション命名処理により名前・タグ・phaseのメタデータ更新と、その応答が表示された。後者までツール非実行だったとは主張しない。右側の編集済みファイルは0件で、通常リクエストが完了してキャンセル待ちでないことを確認した。

この操作中、終了時刻の「at 10:18 pmに完了」という混在を新たに確認したため、既存候補を最終版とせず追加修正した。ソースの関連13テストは成功したが、新修正バイナリ・新CIは未実施。観察後、専用製品だけにCtrl+Qで通常終了を要求した。CPU保持や変更帰属の並行実行・自動コミット等の全検証を、この短い会話成功だけから推測しない。

## 狭幅タイトルバーの修正作業

旧配置は左右に同じ残余幅を割り当て、中央のidentityをauto幅にするgridだった。日本語メニューがその左列を超える場合、左親のoverflow:hiddenで操作項目が切れる。今回、左右の操作列をauto、中央identityをminmax(0,1fr)へ変更し、左親のクリップを除去した。OSタイトルバー用env()領域と固定の高さ、menu/dropdown機能、識別子・翻訳キーは維持した。中央identityは既存ellipsisで縮む。

WindowTopBar・WindowMenuBarと完了時刻の関連4ファイル48テストがPASS（`topbar-turn-locale-green.json`）。jsdom試験は実レイアウトを計測できないため、これだけを狭幅での修正成功とは扱わない。新しい通常製品ビルドで幅1,040と最大化、日英表示のメニュー到達性を再確認する必要がある。

レイアウト修正は通常フックで `b2cd7ea16927f52fe3b24dee4e215ecccbaf11bf` にコミット。直後の通常pushは38型・7容量を通過し、同じCLI symlink fixture EPERMでexit 1。手動の後続検査はsandbox artifact 6 PASS、image-pins 15 PASS／既知fixture EPERM 2 FAIL、UI invariants・native dialogs・archive writesはPASS。新しい例外は自動適用せず確認中。新Windowsビルドは `windows-build-topbar-turn.log` に記録中で、先行候補のNSIS/ZIPを `pre-topbar-turn-candidate3/` へハッシュ確認後保全した。

## 時刻・狭幅修正後の製品確認

所有者の同じ3件限定の再承認後、リモートmain・公開タグの不変と開発ブランチのfast-forward条件を照合し、R15ブランチだけをb2cd7ea16へpushした。workflow名の読み戻しで正しい対応はLinux `40198602456`、iOS `40198602522` と確認した。初回はrun listの順序から逆に記載し、iOSログをLinux名で取得してartifact名不一致となったため、ログを正しいiOS名へ移した。この観測ミスをテスト失敗とは扱わず、iOSの成功をLinuxへ流用しない。

通常Windowsビルドと完成したペイロードのZIP生成はexit 0。新NSISは443,184,824 bytes、SHA-256 `0f34397ecd51126aa0a36098814d2dc6afb9d3b49bb3f69124cb1a1a58034730`。新ZIP SHA-256は `b40fdb91835fffacd6b1e7fa39d4aafce8dbf9e8bb85862b8aae4519f6b5dbeb`。CRC・安全な実展開・全1,913ファイルのハッシュ一致（`windows-zip-integrity4/RESULT.json`）、ASAR1,021ファイル・出力341ファイル・法務4ファイル一致（`asar-integrity-topbar-turn.json`）。ASAR SHA-256は `3c62913546ff080261a529ca4ded094c4f51beab266f5dd668bdc00a76ee8dea`。

新ZIP実展開版をcandidate-01でPID22768として起動し、既存Codex会話と日本語設定の保持、完了行「22:18に完了」を確認した。127.0.0.1:3456のMCP待受だけを確認し、開発用9222/9223はない。最大化状態から通常へ復元したあと、Windows-MCPで明示的に1,040×776へリサイズした。日本語の開発者・ヘルプ・新規セッションが別々の領域に表示され、開発者メニューをクリックして正常に展開できた。`private-gui/titlebar-1040-ja-b2cd7ea16.png` が実際の狭幅証拠。先行の `titlebar-maximized-ja-b2cd7ea16.png` は最大化画像であり、狭幅成功の根拠には使用しない。全DPI・全最小幅を検証したものではない。

リポジトリのicon.pngだけを新規Paintで開き、全選択・コピーしたネイティブ画像をAI入力の未送信下書きへ貼り付けた。「処理中…」からPNGプレビューへ遷移し、既存テキスト「R15画像貼り付け・下書き保持テスト（送信しない）」は維持された。Ctrl+Z後は添付プレビューと挿入されたファイル参照だけが外れ、元テキストが残った。画像や下書きはモデルへ送信していない。Paintの元画像を編集・保存したわけではない。これはWindowsネイティブ経路の確認であり、WSL環境・非同期中のセッション切替・文書エディター経路までの実機成功とは扱わない。

同じ製品でEnglishへ切り替え、設定ファイルのuiLanguage=enと英語メニューを確認。コンテキスト使用量22k/475kのpopoverで「What is this?」を開き、「Context Window」とその英語本文、Session totalsと値の表示を確認した。この時刻の英語表示で「at at 10:18 pm」を新たに確認したため、最終候補とは判定せず49e52c53fで追加修正している。新しいソースの関連48テストはPASSだが、当該修正の製品再生成・実画面確認は未実施。

英語時刻修正49e52c53fの通常pushも全38型・7容量を通過し、同じCLI fixture EPERMだけで停止。sandboxを個別実行するとartifact 6 PASS、image-pins 15 PASS／fixture EPERM 2 FAIL、後続静的3検査はPASSだった。既知3件の例外確認は新たに依頼し、自動適用していない。製品を英語設定のまま通常終了し、プロセス消失とuiLanguage=enを確認した後、b2cd7ea16のハッシュ確認済みNSIS/ZIPを `pre-english-prefix-candidate4/` へ保全して新ビルドを開始した。実行中のハンドルは44685、記録は `windows-build-english-turn-prefix.log`。これは新候補の英語再起動保持成功そのものではなく、次の起動の前提記録である。

その後、所有者が49e52c53fについて同じ3件限定のpush例外を承認した。リモートmain・公開タグの不変と開発ブランチのfast-forward条件を照合し、R15ブランチだけを更新した。通常Windowsビルドはexit 0、完成ASARの1,021エントリ・出力341ファイル・法務4ファイル一致を確認した（`asar-integrity-english-turn-prefix.json`）。同ペイロードZIP生成とその実展開確認は進行中である。

## 英語時刻修正候補の実展開・起動

49e52c53fのNSIS/ZIP生成はともにexit 0。NSIS 443,180,417 bytes、SHA-256 `c94ab7c0bae6fc62e6eb7873e6f9593547882d250a4bab4f5b26d8c9036fa4b6`。ZIP 576,219,733 bytes、SHA-256 `5c59a223f4496482ca710292e0bf9ada6e5f72b234570182bdde8905ee761546`。CRC・安全な展開・全1,913ファイル一致（`windows-zip-integrity5/RESULT.json`）。ASAR SHA-256は `6d0ccfbe135be8e77eecf6b78a5722f840644ca3c93b08c59cd3415c40c2d76c`。

旧テスト製品の消失をGet-ProcessとComputer Useの双方で確認し、保存済みuiLanguage=enのcandidate-01で新ZIPをPID26300として起動。英語メニュー、既存Codex会話、未送信下書きの保持と、2つの完了行が「at 10:18 pm」（at重複・日本語混在なし）になることを確認した。`private-gui/english-turn-prefix-49e52c53f.png` に保存した。PEは製品名Nimbalyst 日本語版（非公式）、CompanyName Meistertech-JP、ProductVersion0.82.3.0、FileVersion0.82.3.1、NotSignedだった。

Win32_Processの読み取りが一度アクセス拒否となったため、その失敗をプロセス終了と判断せず、Get-Processと現在ウィンドウ一覧へ切り替えて不在を確認した。システム設定・権限を緩めて回避していない。新HEADのLinux run40201861327・iOS run40201861401はworkflow名とSHAを取得済みで、現在実行中。

新ZIPの通常UIで日本語へ戻し、uiLanguage=jaと日本語設定画面を確認した。Ctrl+Qで通常終了し、Get-Process・現在ウィンドウ一覧の両方で消失を確認してから同じZIPをPID26260として再起動。日本語の「ファイル」「詳細設定」「後で通知する」が表示されることを確認した。最新49e52c53f候補での日英それぞれの再起動保持を確認済みであり、先行候補の記録を代用していない。

同候補のコンテキスト使用量22k/475kの「これは何ですか？」を展開し、日本語のコンテキストウィンドウ見出し・本文・累計詳細を確認した。Fileモードで専用R15-native-image-paste.mdをUIから作成し、日本語の確認文章を入力。Paintでリポジトリのicon.pngをコピーして文書へ貼り付け、元文章の保持、画像表示、保存、Undoでの画像除去と文章保持、Redoでの復元を確認した。Markdown参照先PNGのSHA-256は0c1e988784b47cb4bed0e3c22f61c1fb095932fc69875a970b88ae71eb35737eでファイル名と一致する。実画面はprivate-gui/document-image-paste-49e52c53f.png。これはネイティブWindows経路で、WSLそのものや非同期完了前のセッション切替の全実機経路まで確認したものではない。

## 最新候補の認証に関する差分範囲

a9fcc204の実認証成功候補と49e52c53fの完成ASARを改めて比較した。Main/Preloadの63ファイル中62件一致、out/main/index.jsだけ不一致であり、旧3388候補の「63件一致」を最新候補へ流用できない。比較結果はauth-payload-equivalence-49e52c53f.jsonに不一致を含め保持した。これは一致検査のFAILで、認証動作の失敗を観測したという意味ではない。

同コミット間のMain/Preloadソース差分はCPU保持に関するテスト2ファイルのみで、認証・サービス・preload実装に差分はない。共通翻訳資源には英日それぞれ3行の説明修正があり、Mainも共通資源を含む。ただしこれだけを根拠にコンパイル済みindex全体の意味的同一性や新バイナリの実認証成功まで断定しない。最新候補では実認証の再試行を行っていない。

追加の読み取り専用比較で、Gitの英日common資源から抽出した変更6値がコンパイル済みindexに各1箇所存在することを確認した。旧indexをメモリ内でその6値だけ新値へ置換すると、新indexの全バイトと一致した。元のASAR・ソース・実行中プロセスは変更していない。auth-main-resource-delta-49e52c53f.jsonへ記録した。したがってMain/Preloadの唯一のバイト差は既知のモデル説明用翻訳6値であると確認できたが、新しい認証試行そのものを観測したという意味ではない。補助スクリプトの初回はASAR内パス区切りの誤り、次はsandbox内のgit子プロセスEPERMで停止し、Windowsネイティブ区切りへの修正と読み取り権限下での再実行により比較を完了した。

## アンインストール後の最終関連付け読み戻し

新規導入前に記録したnimbalyst protocol、Markdown既定、Explorer UserChoiceを含む8レジストリキーを再取得した。存在状態と全値が8件とも一致し、本版のテスト用インストール先も不在だった。associations-final-readback.jsonへ記録した。レジストリへ書き込みは行っていない。
