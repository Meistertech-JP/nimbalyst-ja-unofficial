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
