日本語 | [English](Testing-and-Verification-English)

# テストと品質検証

## v0.84.0-ja.1

本家v0.84.0はGitHub上でPrereleaseです。日本語版はGitHub上の通常Release・Latestとして配布しますが、本家による安定性保証や公式認定ではありません。`v0.84.0-ja.1` はSemVer上ではプレリリース識別子を含み、GitHubの分類はその意味を変更しません。

### 検証対象

以下はv0.84.0-ja.1の配布版に対する検証結果です。対象ソースのコミットは **a2f2fbccdb10c3542222851e07f945dbb774ca91**、Git treeは **b90b2ae82cd5b23e2a035189c02c0af48556a364** です。

| 対象・環境 | Run ID | PASS / FAIL / SKIP・結果 |
| --- | --- | --- |
| main・Linux通常CI | [43723712039](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43723712039) | 20,296 / 0 / 31。全5 jobs SUCCESS |
| main・Android | [43723712088](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43723712088) | unsigned APK/AAB・Gradle unit task SUCCESS。署名job SKIP、個別case数未出力 |
| main・iOS | [43723712100](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43723712100) | 528実行、522 PASS / 0 FAIL / 6 SKIP。Simulator・Transcript検査SUCCESS |
| 最終a2のPR・Linux | [43718950152](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43718950152) | 20,296 / 0 / 31、SUCCESS |
| 最終a2のPR・Android | [43718950189](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43718950189) | SUCCESS、署名job SKIP |
| 最終a2のPR・iOS | [43718950130](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43718950130) | 528実行、522 PASS / 0 FAIL / 6 SKIP、SUCCESS |

### 公開配布物と公開後照合

2026-11-15 23:51:17 JSTにRelease ID446131556をDraft=false／Prerelease=false／Latest=trueで公開しました。タグobjectはd0a95c7ffb94ddb3539ba5f49c853da1a6282e59で、上記a2を指します。

| ファイル | bytes | SHA-256 |
| --- | ---: | --- |
| nimbalyst-0.84.0-ja.1-windows-x64-setup.exe | 484,693,329 | `1df7a78d12e4ed1ba3cf17d85b22be2201a25bc5bf9922b2ced9d49dae3e9c66` |
| nimbalyst-0.84.0-ja.1-windows-x64-portable.zip | 628,480,194 | `2501d5337704bf5fb78a6eeada7860127627d4d69aec828223f6084b50ed4cb5` |
| nimbalyst-0.84.0-ja.1-source.zip | 56,381,300 | `f64950bd91b56808903156890cfcddc1e4ec88b162885957b811ce0e4b8788ba` |
| SHA256SUMS.txt | 322 | `22c036c133181791c27333b23d315517a8cd6a38e7c3d40c749bb8f3e3d3a587` |

4件すべてを認証情報なしで再取得し、原本・API digest・実ファイルhashを照合しました。Source ZIP全9,971件のGit blob/mode/pathとCRC、Portable ZIP全1,915ファイル（directoryを含む2,331 entries）のCRC・内容・安全なパスを照合しました。欠落・余剰・重複・危険パスは0。別担当も別取得ファイルと公開Git/API・Wikiを照合しました。NSIS内部payloadの別担当による抽出、GUI・認証の別担当による再実行は未実施です。旧タグ・旧Releaseの資産は保持しています。

共有資源の静的監査は27名前空間、英日各15,557キー、キー差・補間差0。保持した静的記録の11,523リテラル参照に欠落0、動的489候補・scope未確定211は不具合件数でも全実行時確認でもありません。書式区切りの単一スペース1件は英日共通の意図した値です。

製品検証基準は `29fdcc216f354cd1031dc9ef36672a5399bd6775`（製品入力 `a7f82db90`、差は単体試験1ファイル）です。Windows全Vitestは20,182 PASS／108 FAIL／37 SKIP、exit 1で完走しました。108件は継続未解決です。R22にも同じパス・テスト名の失敗が99件ありますが、同名は原因同一・無害の証明ではなく、全108件を新規の重大回帰とも全環境依存とも断定しません。39 workspace型検査と7容量上限はPASS。Linuxの20,296 PASS／0 FAIL／31 SKIP、Android Build SUCCESS（署名job SKIP）、iOS 522 PASS／0 FAIL／6 SKIPはWindows全成功とは別の結果です。

製品検証基準29の固定CI証拠: [Linux43708311391](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43708311391)、[Android43708311340](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43708311340)、[iOS43708311334](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43708311334)。最終文書コミットのRun IDではありません。

通常Windows製品07dのwin-unpacked・完全展開Portable・NSISで起動、日英切替、正常終了と再起動後の言語保持を確認しました。NSIS新規導入、前版v0.82.8-ja.1からのNSIS/Portable更新では、専用環境の設定・合成文書hash・Tracker表示の保持を確認しました。全実ユーザーデータ・全DBフィールドの移行保証ではありません。NSISの通常アンインストール後も専用ユーザーデータを保持しました。Start Menu登録は隔離した環境での限定確認です。旧版へのダウングレードは未検証です。

最終Windows製品07dの通常win-unpackedと専用プロファイルで、本番メール認証、暗号化認証ファイルの生成、正常終了・再起動後の復元、通常サインアウト、認証ファイル削除、次回起動後の未認証保持を確認しました。NSIS専用プロファイル・別Portableでの新規認証、Google認証、サービス側セッション失効、特殊復旧は未確認です。Node資格情報ファイル試験とは別のElectronアカウント認証の観測です。

共有翻訳資源は27名前空間、英語・日本語各15,557キー、キー差・補間差0です。単一スペース1件は英日共通の書式区切りです。489動的呼出し候補と211 namespace scope未確定は欠落訳・不具合の件数ではありません。全画面・全動的経路・全アクセシビリティ表示の翻訳保証ではなく、一部音声ボタンには英語ラベルが残ります。ユーザー文書やAIの回答・外部応答を自動翻訳しません。

最終配布Windowsは通常07d（製品入力a7）を入力不変性の照合後に再利用しています。NSIS 484,693,329 bytes/SHA-256 `1df7a78d12e4ed1ba3cf17d85b22be2201a25bc5bf9922b2ced9d49dae3e9c66`、Portable 628,480,194 bytes/SHA-256 `2501d5337704bf5fb78a6eeada7860127627d4d69aec828223f6084b50ed4cb5`。Portable全1,915ファイル/CRC、ASAR・Worker・Native ABI・SQLite・PTY・ripgrep・LICENSE/NOTICEを照合しました。最終Source ZIPは公開時の確定コミットから別に生成し、Git blob/mode/path/CRC/物理復元を照合しました。文書更新後のWindows再ビルドと説明しません。

長文Markdownの高CPU負荷は未解決です。高負荷Wiki文脈処理、Windows端末資源残留の一般的解消、動的翻訳全経路、全DPI・外部スクリーンリーダー条件は確認していません。Windows symlink fixture作成EPERMは拒否処理そのものの未検証範囲を残します。実マイク・実音声認識API、実同期・共同編集サーバー、実組織、旧新サーバー間相互運用は未検証です。Wiki公開・チーム権限等には対応サーバーが必要です。これらの未確認事項を確認済みの不具合・脆弱性と同一視しないでください。


## v0.82.8-ja.1

固定対象は本家タグv0.82.8、コミット [`ab9da8f121e4e6fddebc523ced671863e8892ff6`](https://github.com/nimbalyst/nimbalyst/commit/ab9da8f121e4e6fddebc523ced671863e8892ff6) です。Windows版は未署名です。

- 39ワークスペース型検査：PASS。
- 翻訳資源：27名前空間、英日各15,401キー。キー差・空の日本語・補間変数差0。静的参照欠落0。以前の動的参照484件の分類は今回全件を独立再照合しておらず、全実行値・全画面を実動作確認したものではありません。
- collab-bundleの7容量検査：PASS（commenting-ui 40,177/44,000、canvas 151,352/160,000、editor 366,452/370,000、docs-ui 89,202/92,000、feedback-ui 35,089/35,500、trackers-ui 197,427/200,000、inbox 5,542/6,000 gzip bytes）。
- 今回の最終翻訳修正に関連するテスト：i18n 11 PASS、Settings route 12 PASS、Windows shell-command installer 2 PASS／4 SKIP。4件はWindowsで実行対象にならないUnix shell・symlink条件で、Linux/macOSでの実行結果とは区別します。
- 実画面の大きなMarkdown検索では5,000項目の検索結果と一致箇所の表示を確認しました。文書を閉じたアイドル状態との比較は行っておらず、高CPU問題は未解決です。

製品コードを含む候補コミット `49eab4338e870e1f8b71c34662022f3cfbba2a8d` の[Linux CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/42800530294)は19,896 PASS／30 SKIP／0 FAIL、[Android Build](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/42800530382)と[iOS Simulator](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/42802135881)も成功しました。音声・同期関連のmockテストを含みますが、実マイク・認識API・外部同期サーバーの検証ではありません。Windowsの認証・更新の確認範囲、全体テスト未完走、端末資源と高負荷Wiki文脈の制限は[既知制限](Compatibility-and-Limitations)を参照してください。

## v0.82.7-ja.1

[v0.82.7-ja.1 Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1)のWindows x64向け非公式版を対象とします。本家v0.82.7の固定コミット [`826adb4f93dbe86db35b76ce2502a3a33abe0489`](https://github.com/nimbalyst/nimbalyst/commit/826adb4f93dbe86db35b76ce2502a3a33abe0489)を基準とします。品質判定は **GO WITH KNOWN LIMITATIONS** です。以下は確認済みの範囲と未解決事項を分けた記録であり、Windows全体試験PASSを意味しません。

### 翻訳資源と統合機能

翻訳資源は27名前空間・英日各15,321キーで、キー差0、補間差0、空の日本語訳0を確認しています。この静的整合は、全画面・全動的経路の翻訳完了や外部応答の日本語化を保証しません。統合された本家更新にはLexical 0.53の色付きテキスト、PGLiteからSQLiteへの移行、Claude Code・Codex SDK更新、承認・質問処理と長大なセッション履歴の改善、週次使用量履歴、Claude in Chrome対応、Windows固有のGit・CLI修正、Trackerのローカル番号修正、本家Issue #1889由来の修正が含まれます。実際の有料AIプロバイダー通信、Claude in Chrome接続、共同編集サーバー・組織環境のライブ検証は行っていません。

### 既存の静的・Linux検証

[Linux比較run `42008631197`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/42008631197)では、固定した日本語版ソースと本家ソースを比較し、日本語版候補が19,754 PASS・0 FAIL・30 SKIP、本家が18,533 PASS・0 FAIL・30 SKIPでした。この比較はLinux上の単体・静的等の検証であり、Linux向け配布物の保証でもWindows試験の代替でもありません。

製品ソースに対する既存検証記録では、39ワークスペースの型検査と7件の容量上限検査がPASSです。これらは製品検証であり、文書の品質検査結果ではありません。Windowsの新規導入・更新・Portable起動・日英即時切替と再起動後の設定保持・通常終了・アンインストール、および合成データでのPGLite→SQLite移行は製品検証済み範囲です。実ユーザーデータ全量の移行は保証しません。

### Windows全体試験とAPI経路

Windows全体試験は正常完走していません。検証ホストでは、同一プロセス内のnative loopback通信が停止し、応答HTML/CSPの書換えによる検査失敗も発生しました。これとは別に、RESTサーバーspecを対象として観測を有効にしたローカル実行を行い、評価された12件中8 PASS・4 FAIL（exit 1）でした。失敗にはHTML/CSP差の2件と、Windows上でPOSIX形式のファイルmodeを期待する2件が含まれます。この12件の結果はWindows全体試験の集計ではありません。別プロセスの実サーバーを用いた主要API試験は、本家・日本語版の双方で成功しました。これは通信経路を限定した確認であり、Windows全テストPASSではありません。

### 端末資源の残留

shellまたはCLIプロセスが自然終了した後、アプリを終了するまで端末用資源が残る場合があります。本家と日本語版の双方で、自然終了20回後にMainプロセスのメモリが約156 MiB増加し、MessagePortとConPTY関連資源が残ることを確認しました。これは永続shell内の通常コマンドを1回実行するたびに増えるという意味ではなく、20回の観測から無制限の線形増加も断定しません。試験した範囲では次の端末作成失敗・データ損失・通常終了不能は観測されず、アプリの通常終了後に追跡資源は回収されました。根本修正は未実施です。使用中の端末は通常の閉じる操作を使い、メモリ増加時は作業を保存してアプリを通常終了・再起動してください。自然終了後にパネルを閉じるだけでは回収される保証はありません。

### 長文編集とローカルWiki

大きなMarkdown文書の編集でCPU使用率が高くなる場合があります。比較した範囲では、本家に対する日本語版固有の悪化は確認されていませんが、根本原因と全条件での再現性は未確定です。アクセシビリティ機能を無効にする対処は推奨しません。

高負荷時には、ローカルWikiのセッション開始時に追加する文脈の生成が遅れたり省略されたりする場合があります。限定負荷比較では本家・日本語版の各3回がPASSしましたが、以前の単発約4,450 msの時間超過の直接原因は未確定です。データ損失や通常のWiki編集機能の破損を示す結果ではありません。

Nimbalystアカウントのライブメール認証、Google認証、特殊復旧、サービス側セッション失効、実際の共同編集サーバー・組織での認証やデータ復旧、ライブの有料AI通信、Chrome接続、動的翻訳の全経路、全DPI・スクリーンリーダー条件、全実ユーザーデータの移行は未検証です。共同編集には対応する同期サーバーも必要です。ほかの版の履歴と対象SHAは以下に分けて記載しています。

## v0.82.4-ja.1

本家v0.82.4の固定コミット `031a6e6de0b7817bbdcd16e6e5e758e45dfdcdc7` を統合したWindows x64版を対象とします。通常製品の実機操作、自動試験、静的検査、パッケージとソースの照合は別々の範囲として記録します。公開文書の更新は、実行コード・依存関係・ビルド入力の対応を確認して配布物へ適用します。

### 固定ソースのLinux検証

[比較run `40994285881`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40994285881)は、候補 `68697952fac7b158201cf8ac56f4892b89d0e2f8` と未変更の固定本家を、Node.js 24.16.0・pnpm 12.9.1・それぞれの固定lockfileで実行しました。

| 対象 | Test Files: PASS / FAIL / SKIP / 合計 | Tests: PASS / FAIL / SKIP / 合計 | job |
| --- | --- | --- | --- |
| 日本語版候補 | 2,374 / 0 / 7 / 2,381 | 19,585 / 0 / 30 / 19,615 | SUCCESS |
| 固定本家v0.82.4 | 2,143 / 1 / 7 / 2,151 | 18,373 / 1 / 30 / 18,404 | FAILURE |

比較用本家は `SecurityEncryptionSection.test.tsx` の `keeps an open recovery session when the custody status is checked again` 1件が失敗し、日本語版候補では同じ試験が成功しました。そのため比較workflow全体は **FAILURE**、候補jobは **SUCCESS** です。比較結果を書き換えたり、異なる母集団を合算したりしていません。

39ワークスペースの型検査、scriptsと静的検査、sandboxのartifact/RPC 6件とimage/staging 17件、公開内容検査、全7容量検査が候補で成功しました。Linuxの容量はcommenting-ui 40,177／44,000、canvas 151,352／160,000、editor 361,344／370,000、docs-ui 89,202／92,000、feedback-ui 35,089／35,500、trackers-ui 196,249／200,000、inbox 5,542／6,000 gzip bytesです。Windows測定のtrackers-uiは196,386で、他の6件は同じ値です。上限と計算方式は維持しています。

### 翻訳・ビルド・配布物

翻訳は27名前空間・英日各15,254キーです。キー・補間不一致、未承認の空翻訳、解決可能な静的参照の欠落は0でした。動的735候補、解析scope未確定451候補、分類済みJSX英語371候補は、欠落や不具合の件数ではありません。全実行時経路や読み上げ動作まで確認済みという意味ではありません。

Runtime、Extension SDK、Electron Main/Renderer、Worker、拡張機能とtracker-builtinsのビルドが成功しました。Windows通常製品のASAR内容、ZIPの1,911ファイルと物理復元、16同梱ガイド・法的ファイルを照合しました。Electron 43.7.0／Node 24.21.0／ABI 148でSQLiteのメモリ照会とPTYロード、Workerの配置・ABIを確認しています。PE FileVersionは0.82.4.1、ProductVersionは0.82.4.0で、未署名です。ソースZIPは正式タグのGit treeと全ファイルを照合する対象であり、以前の候補ZIPの件数・ハッシュを固定値として扱いません。

### 通常Windows製品での観測

最終配布ペイロードで日本語→英語→正常終了・再起動→英語保持→日本語→再起動後の保持を確認しました。System選択もja-JPホストでの再起動後に日本語へ解決しました。205ファイルの一覧順とファイル表示、同じ検索実装で2,501一致の移動・最大化／復元後のハイライト、Transcript画像の100→125→100とFitによる全体表示を確認しました。全DPIや性能閾値を保証する試験ではありません。

更新インストール後に専用の文書・言語設定・Trackerのmetadataが保持され、通常アンインストール後にもテスト設定と文書が保持されました。最終payloadとインストール先は1,911ファイル一致し、ZIP実行と通常終了も確認しました。旧正式版を起点にしたテストデータは途中の製品更新を経ており、旧正式版から最終payloadへ直接新規更新した試験とは区別します。既存Tracker本文の十分な保持fixtureや、全ユーザーデータの互換性は確認していません。

本番メール認証、暗号化保存、再起動復元、通常サインアウト、認証ファイル消失と次回起動後の未認証状態は、認証・起動コードに差分のない先行通常製品で確認しました。最終ペイロードで新しいメール認証を再実施したとは記載しません。Google認証・特殊復旧・サーバー側失効・他ユーザーのNTFS実効アクセスは未検証です。

### NOT RUNとWindowsの制限

共同編集の実サーバー・実組織接続、旧／更新済み同期サーバーの相互運用、本番組織復旧は環境がないため **NOT RUN** です。Bedrock実通信、新しいClaude有料セッション、実OSスリープ・復帰、非前面ブラウザーの全経路、バックエンド信頼設定の実ライブ再試行も **NOT RUN** です。関連コードの自動試験と実サービス検証を区別します。全動的翻訳経路・全画面条件・外部スクリーンリーダーも網羅していません。

Windowsでのsymlink fixture作成EPERM、worktreeパス表記、ホストの大容量loopback書込みによる未通過・途中停止は記録を保持しています。Linuxの全体試験成功と拒否試験を含むsandbox 17件の成功で、Windows側の未到達assertionを成功へ変更していません。以下の旧版の失敗と成功も、その版の履歴として保持します。

## v0.82.3-ja.2

公開内容を是正したソースと、同梱ガイド16件を更新した新しいWindows NSIS・ポータブルZIPを対象とします。本家の固定基準は `84dcc00f3cd0abbb36eafc6bfad9389f960076db` のままです。旧版のバイナリを改名して提供するものではありません。実機操作、リソース・単体試験、型検査・容量検査、公開コミットのCI、配布物の全ファイル照合は、それぞれ異なる検証範囲です。

### 静的検査と関連試験

- 38ワークスペースの型検査と、7エントリの初期読み込み容量検査が成功しました。容量上限は変更していません。editorは369,922／370,000 gzip bytes、docs-uiは89,138／92,000 gzip bytesです。
- 翻訳は27名前空間、英日各14,795キーです。キー・補間変数の差と未承認の空翻訳は0件、静的に解決できる参照の欠落も0件でした。動的候補436件とスコープ未確定200件は、完全な実行時確認を終えたものではなく、不具合の件数でもありません。
- Aboutの基準表記訂正と、破棄した組織作成フォームへ遅延応答が状態を復元する競合の修正後、38ワークスペースの型検査と、言語・認証契約・更新分離・組織作成フォームに関する12ファイル・104テストが成功し、FAIL・SKIPは0でした。先行する11ファイル・83テストや個別試験は重複するため合算していません。Windowsの資格情報試験は、権限を限定した使い捨てプロファイルで実DACLを確認し、junctionの拒否・参照先不変性を検証しています。任意の緩いACLを修復する保証や、別ユーザーの実効アクセス確認ではありません。
- Aboutの基準表記を0.82.3へ訂正し、組織作成フォームの競合を修正した後に通常構成で再生成したWindows ZIP、NSIS内のアプリケーションpayload、win-unpackedは各1,913ファイルで、全パス・サイズ・SHA-256が一致しました。CRCと物理展開、ASAR全1,021ファイルの整合性、同梱ガイド16件のGit blobとの実バイト一致も改めて確認しました。修正前バイナリの検査結果の流用ではありません。
- 同梱Electron 43.7.0／ABI 148でSQLite Workerが使用する解決経路からbetter-sqlite3をロードし、メモリDBを照会しました。ONNXモジュールのロードと、node-ptyから専用の子プロセスの正常終了・出力も確認しました。Worker threadの起動、GUI操作、全ターミナル機能、エージェントサービスの認証を検証した結果ではありません。

### 通常Windows製品での起動・更新確認

組織作成フォームの修正を含む新NSISを専用プロファイルで新規インストールし、System解決の日本語、設定・メニュー・Workspace・エディターを確認しました。英語への即時切替と、通常終了・再起動後の英語保持を確認しました。Systemへ戻すと日本語になり、明示的な日本語選択も再起動後に保持されました。日本語のTrackerと通常エディターでのガイドコピー1件の本文表示も確認しました。Aboutの日英の版・基準表記は先行候補での確認と区別し、新候補の配布物には訂正済み表記が含まれることを静的に照合しています。

別の専用コピーでは、旧v0.82.3-ja.1でテスト文書1件（120 bytes）と、このコピー専用のTracker項目1件を確認・保存してから新NSISへ更新しました。英語の設定・表示、文書本文とSHA-256、Tracker項目のタイトルが保持され、再起動後にも文書・Trackerの表示を確認しました。更新先の製品payload全1,913件は新しいwin-unpackedと一致しました。新規・更新それぞれの通常アンインストール後に、保存対象93件・92件の全ファイルSHA-256が保持されました。本版所有の登録・ショートカットの削除と、既存protocol・既定関連付け・UserChoiceの検査対象13項目の不変も確認しました。その後、新ZIPを実際に起動し、英語・日本語の画面と通常終了を確認しています。これは全既存データの互換性やOS全レジストリの不変を保証するものではありません。

### 起動遅延の観測とガイド表示の範囲

更新試験の最初の再起動では、このWindowsホストでMainに約10〜125秒の遅延と一時的なウィンドウ無応答を観測しました。同時期にセキュリティ製品の通信確認が表示されましたが、それが原因だったとは断定していません。保護設定は変更せず応答が回復しました。同じ旧プロファイルを同一payloadの最終ZIPで再確認した際は約7秒で画面が表示され、文書・Trackerの操作と通常終了を確認しました。ただし約550msのMain遅延1件を記録しており、遅延0とはしていません。最初の長時間遅延の原因と再発条件は未確定で、恒久的な解消を保証する結果ではありません。

上記は組織作成フォーム修正前の候補の履歴です。修正後の新候補でも、通常終了の開始から後処理完了まで約9.8秒かかった2回の終了を観測しました。ログにはPostHogの送信失敗と約9.7秒のAnalytics終了待ちがあり、各プロセスは強制停止せず終了しました。即時終了や遅延解消とは扱わず、以前の125秒の起動停滞と同一原因とも断定しません。

同梱ガイドを「ファイル」→「開く」で選択した実機試験では、本文ではなく、日本語UIでも英語の「Open a workspace to get started」という案内が表示されました。この経路のコードは基準ソースと同じですが、基準版の製品で同じ操作を再現した結果ではありません。一方、同梱SDKガイド1件と実バイト・SHA-256が一致するコピーを専用ワークスペースの通常エディターで表示しました。配置と全16件の実バイト一致、およびこのコピー1件の本文描画を区別します。ガイドの専用導線からの直接参照や、全16件の実画面表示まで確認したものではありません。

本版では本番認証を再実施していません。以前の版で確認したメール認証・暗号化保存・復元・ログアウトは、その版の履歴として保持します。Google認証、特殊復旧、サービス側セッション失効、別ユーザーのNTFS実効アクセス、外部スクリーンリーダー、全DPI・全動的翻訳経路も未検証です。

WindowsのCLI symlink fixtureとsandboxのsymlinkファイル・祖先ディレクトリfixtureは、作成時のEPERMにより対象assertionへ到達しない既知の試験です。Linux側の成功はWindows側の拒否動作の確認ではありません。以下の旧版・開発コミットの結果を本版のCI実行結果へ流用しません。

組織作成フォーム修正後の最終コミットに対するCIは、上記のローカル検査・新製品操作とは別の公開ゲートです。先行コミットのLinux成功を、新しい製品コードの同一SHAでの成功へ読み替えません。

## v0.82.3-ja.1

製品修正コミット `1c1d54a851c340a8f0f9afc304379882a7319fa1` から再生成したWindows NSIS・ポータブルZIPを対象とします。両パッケージのpayload、ASAR、ネイティブABI、Worker、ZIP全1,913ファイルを照合し、SQLite Worker・ONNX・node-ptyの実ロードを確認しました。通常製品では英語のSettings・メニュー・Project Manager・Workspace表示と、英語選択後の再起動保持を確認しました。表示言語をSystemにした状態で、日本語Renderer・ネイティブメニュー、Ctrl+Qによる正常終了、再起動後の日本語保持も確認しました。明示的な`ja`設定値の保持は未確認です。補助エラー警告は日英DOM試験で確認しましたが、通常製品画面では未確認です。認証およびNSIS導入・更新・削除の製品操作はこの版では未実施で、以前の製品の履歴は本版の実操作結果ではありません。

最終確認コミット `4a642e5c95d174a9df8deaf8712ca8560b738d11` の[Linux run `40277550288`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40277550288) はTest Files 2,340 PASS・7 SKIP・0 FAIL（計2,347）、Tests 19,296 PASS・30 SKIP・0 FAIL（計19,326）で成功しました。[iOS run `40277550251`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40277550251) は528件実行・522 PASS・6 SKIP・0 FAILで成功しました。これらは公開用文書コミットと同一SHAの実行ではありません。以下の旧版・開発コミットの結果も、それぞれのSHAに対応する履歴として区別しています。

組織復旧は既存モック・DOM・単体・統合試験と本家差分の監査までです。実組織やダミー組織を作成せず、通常製品の復旧フォーム・サーバー状態遷移・独立実クライアントE2Eは未検証です。更新された同期サーバーが必要です。以前に観測したCodex主要求後の自動セッション情報リマインダーcapacity失敗について、修正後のMain/parser/UI/Provider/Protocol回帰試験は成功しています。過去の実機capacity事象が同一経路か、警告が通常製品画面に表示されるかは未確定です。Windows fixture EPERM3件は未通過のまま保持し、Linuxでの例外なし成功と区別します。以下は旧版の履歴です。

## v0.82.1-ja.1

ソース・配布物は[Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1)とSHA256SUMS.txtで確認できます。38ワークスペース型検査、7初期ロード容量、27名前空間・英日各14,608キーの整合を検査しています。docs-uiは89,138／92,000 gzip bytesです。

通常Windows製品ビルドのEXE・ASAR・Workerは実機検証済み製品とバイト一致し、再生成差分はライセンスJSONの生成時刻だけです。最終NSISもインストール・全1,911ファイル照合・通常アンインストールを確認しています。ソースZIPの9,643ファイルとWindows ZIPの1,911ファイルの物理復元・ハッシュ・CRC検査は成功しています。本番認証・言語・旧版更新の検証は、この一致する製品コードに対応します。Linux・iOSの実行SHAと件数は下の開発コミットの表を参照してください。最終文書・型宣言コミットそのものを同一SHAでCI実行したという意味ではありません。

静的検査、単体試験、開発用E2E、製品GUI、実認証は異なる範囲を検証します。キー数の一致やビルド成功だけでは、全画面の表示や認証の実動作を保証できません。

## 公開正式版 v0.81.7-ja.3

対象コミットは[`0871b7872bb9d043ff07acfaf62a3deb0eb6aef2`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/commit/0871b7872bb9d043ff07acfaf62a3deb0eb6aef2)です。[リリースノート](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.81.7-ja.3/RELEASE_NOTES_v0.81.7-ja.3.md)に製品ビルドと検証範囲を記録しています。

- 38ワークスペースの型検査と、容量修正・遅延フォーム・言語追従に関する34テストが成功しています。
- 翻訳リソースは27名前空間、英日各14,579キーです。キー・補間の整合と静的に解決できる参照を検査しています。
- 最終配布ビルドでは日英切替・再起動後保持、ローカルWikiのフォーム、ロード失敗時の通知と画面保持、正常終了を確認しています。
- 本番メール認証・暗号化保存・復元・ログアウトとNSIS更新・アンインストールは、認証コードが同じ先行製品ビルドの検証結果を利用しています。最終配布物そのもので再試験した結果ではありません。

動的翻訳候補651件とスコープ未確定382件は完全な実行時確認を終えていません。これらは不具合や欠落キーの件数ではありません。

## 公開後CIと開発ブランチ

公開版の[Linux CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40069697146)と[iOS試験](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40069697221)には失敗記録があります。[Androidビルド](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40069697158)は成功していますが、Android実機の動作確認ではありません。

公開後の修正を含む開発コミット[`ae08d2235bab5e9c832c0ae32631bb3a94544704`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/commit/ae08d2235bab5e9c832c0ae32631bb3a94544704)について、2026年10月25日に次を確認しています。

| 環境 | 結果 |
| --- | --- |
| [Linux CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40151947723) | Test Files: 2,320成功・7スキップ・0失敗。Tests: 19,130成功・30スキップ・0失敗 |
| [iOS試験](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40151947722) | 527実行・6スキップ・0失敗 |

開発ブランチの成功は、公開タグの失敗記録を書き換えるものではありません。新しいWindows配布物の公開も意味しません。iOSのページ離脱・置換・読み込み完了試験を含むソースはリンク先から参照できます。

## Windows環境依存試験

固定upstreamとの同一Windows環境での比較で、CLIとsandboxの3種類のsymlink fixture作成EPERM、およびcommit-hook試験の`/bin/sh`不在ENOENTを確認しています。fixture作成で停止した試験は、symlink拒否処理そのものを検証できていません。テストは保持しています。

Linuxでの成功とWindowsでの未検証範囲は区別します。未検証であることは、不具合や脆弱性を確認したことを意味しません。

## 検証方法

型検査・関連単体試験・リソース監査に加え、初期読み込み依存を変更する場合は全7エントリの容量を同じgzip条件で測定します。docs-uiはv0.81.7-ja.3で92,295から89,138 gzip bytesへ削減し、92,000の上限を維持しました。この過去の測定値はv0.82.3-ja.1の容量測定を代替しません。遅延フォームは表示・キャンセル・再表示とロード失敗時の動作も検査します。

Windows配布物はASAR、Worker、Native ABI、PE情報、ライセンス、全ZIPファイルのハッシュと復元を検査します。実機結果を別の成果物へ適用する場合は、ソース・設定・バイナリの対応を確認します。全画面・全DPI・外部スクリーンリーダー・全認証経路を確認したとは扱いません。

[制限事項](Compatibility-and-Limitations) · [ビルド](Building-from-Source) · [本家への追従](Following-Upstream)

## 利用ガイドから集約した過去版の確認記録

以下は旧利用ガイドに分散していた記録です。各版・母集団・未検証の扱いを保持し、上の試験件数と合算しません。

### Windows-Installation — v0.82.8-ja.1


[対象Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.8-ja.1)から未署名のWindows x64インストーラー、ポータブルZIP、対応ソースZIPと `SHA256SUMS.txt` を取得できます。各ファイルを同じReleaseのチェックサムと照合してください。本家v0.82.8に基づく非公式版です。[確認範囲](Testing-and-Verification)と[制限事項](Compatibility-and-Limitations)も参照してください。

### Windows-Installation — v0.82.7-ja.1


[対象Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1)から、`nimbalyst-0.82.7-ja.1-windows-x64-setup.exe`、`nimbalyst-0.82.7-ja.1-windows-x64-portable.zip`、`nimbalyst-0.82.7-ja.1-source.zip`、`SHA256SUMS.txt`を取得します。本家v0.82.7を基準とする未署名Windows x64版です。ファイル名とハッシュは同じReleaseの一覧・チェックサムで照合してください。[Release Notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.7-ja.1/RELEASE_NOTES_v0.82.7-ja.1.md)も参照してください。

Windows版の新規導入・更新・Portable起動・言語切替と再起動後の保持・通常終了・アンインストール、および合成データでのPGLiteからSQLiteへの移行を確認しています。全ての実ユーザーデータの移行を保証するものではありません。Windows全体試験も正常完走していません。手順の詳細は[テストと品質検証](Testing-and-Verification)、制限事項は[対応環境と制限事項](Compatibility-and-Limitations)を参照してください。

### Windows-Installation — v0.82.4-ja.1


[対象Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.4-ja.1)から `nimbalyst-0.82.4-ja.1-windows-x64-setup.exe`、`nimbalyst-0.82.4-ja.1-windows-x64-portable.zip`、`nimbalyst-0.82.4-ja.1-source.zip` と `SHA256SUMS.txt` を取得します。本家v0.82.4を基準とする、Windows x64向け未署名の通常正式版です。自動更新は行わず、以下の手順で手動更新します。

通常製品で日英切替、明示的な日本語と英語の再起動保持、Systemの日本語解決、ファイル・検索・画像表示を確認しています。認証・起動処理に変更のない先行ビルドでは本番メール認証とサインアウト、新規導入を確認しました。最終配布ペイロードでは更新インストール、設定・文書・Tracker項目の保持、通常アンインストールとデータ保持を確認しました。全データの更新互換性やすべての認証経路を検証したものではありません。詳しい範囲は[テストと品質検証](Testing-and-Verification)に記載しています。

### Windows-Installation — v0.82.3-ja.2


[対象Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.2)から `nimbalyst-0.82.3-ja.2-windows-x64-setup.exe`、`nimbalyst-0.82.3-ja.2-windows-x64-portable.zip`、対応ソースZIPと `SHA256SUMS.txt` を取得します。未署名の通常正式版です。修正した同梱ガイドを含む新しいパッケージであり、旧版を改名したものではありません。実機検証と未検証事項は[テストと品質検証](Testing-and-Verification)を参照してください。以下の旧版結果は履歴として保持します。

### Windows-Installation — v0.82.3-ja.1


v0.82.3-ja.1は未署名のWindows x64版です。NSISとポータブルZIPを製品修正から再生成し、ペイロードを照合しました。この版のインストール・更新・削除は実施していません。以前の製品での操作記録は、この版の検証結果ではありません。配布物は[対象Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.1)を参照してください。以下はWindows配布物の一般的な手順です。

### Windows-Installation — v0.82.1-ja.1


[正式Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1)からWindows x64用NSIS、ポータブルZIP、ソースZIP、SHA256SUMS.txtを取得します。ファイル名はReleaseの添付一覧に従ってください。未署名です。導入・照合・保存先・手動更新・削除の操作は以下の手順と共通です。

v0.81.7-ja.3からの更新で英語設定、プロジェクト、テスト文書、SQLiteバックエンドの保持を確認しました。文書SHA-256は一致し、新規・更新の両インストールで通常アンインストール後もテストデータが残りました。関連付けは検査対象12項目で事前状態に戻っています。全レジストリの比較や旧版へのダウングレード互換性は確認していません。

対象はWindows x64です。v0.82.1-ja.1は未署名の正式リリースです。公式Nimbalystとの同時利用はサポートしません。

### Account-and-Authentication — v0.82.8-ja.1


展開済みWindows製品の専用プロファイルで本番メール認証、暗号化認証ファイルの生成、再起動後の復元と通常ログアウト後の削除を確認しました。最新の再ログイン後の再起動・ログアウト、およびNSIS専用プロファイルでの認証成功は未確認です。Google認証、特殊復旧、サービス側失効も未検証です。[詳細](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.8-ja.1/docs/KNOWN_LIMITATIONS_v0.82.8-ja.1.md#認証)を参照してください。

### Account-and-Authentication — v0.82.7-ja.1


v0.82.7-ja.1では、Nimbalystアカウントのライブメール認証を新たに実施していません。Google認証、特殊復旧、サービス側セッション失効も未検証でした。以下の手順と過去版の観測は、この版での実認証成功を示すものではありません。[テストと品質検証](Testing-and-Verification)を参照してください。

### Account-and-Authentication — v0.82.4-ja.1


認証・起動処理に変更のない先行通常Windows製品で、本番メール認証、同じPCからのlocalhost callback、暗号化保存、再起動後の復元、通常サインアウト、次回起動後の未認証状態を確認しました。最終配布物自体で新しいメール認証を再実施したものではありません。nonce・保存失敗時のfail-closed・古い応答による復元防止は回帰試験で確認しています。実アカウントのcallback改変・再送、Google認証、特殊復旧、サーバー側セッション失効、他ユーザーのNTFS実効アクセスは未検証です。

### Account-and-Authentication — v0.82.3-ja.2


本版では本番認証を再実施していません。nonce付きlocalhost callback、暗号化保存、通常サインアウトの既存方針を維持しますが、関連ソースや契約テストの確認と通常製品の実認証は異なる検証です。過去版の認証結果はその版の履歴として扱います。Google認証、特殊復旧、サーバー側セッション失効、別ユーザーのNTFS実効アクセスは未検証です。

### Account-and-Authentication — v0.82.3-ja.1


通常製品での認証・NSIS導入・更新・削除操作はこの版では再実施していません。今回の製品変更では認証およびインストーラーの入力・設定を変更していませんが、これは実操作の確認に代わるものではありません。過去製品の認証結果はそれぞれの版に限定した履歴です。Google認証、特殊復旧、サーバー側セッション失効、別ユーザーのNTFS実効アクセスも未検証です。以下は実装上の手順・保存方針を説明します。

### Account-and-Authentication — v0.82.1-ja.1


メール認証は通常のWindows製品ビルドで確認しています。同じPCのブラウザーからlocalhost callbackを受理し、暗号化保存、正常終了後の認証復元、通常サインアウト、再起動後の未認証状態保持を確認しました。nonce不一致と再受理拒否は契約テストで検査しています。実アカウントのcallbackを改変・再送する試験は行っていません。Google認証、特殊な復旧経路、サービス側のセッション失効、他アカウントからのNTFS実効アクセスは未検証です。

Nimbalystアカウントは正規のNimbalystサービスを利用します。このフォークが別の認証サーバーやアカウントを提供するわけではありません。Nimbalystへのログインと、Claude・Codex・Grokなど個々のエージェントの認証は別です。

### Display-Language — v0.82.8-ja.1


Windows製品で日本語・英語の切替と再起動後の保持を確認しました。翻訳資源は27名前空間・英日各15,401キーです。全画面・全動的表示・全DPI・外部スクリーンリーダーを確認したものではありません。

### Display-Language — v0.82.7-ja.1


Windows版の製品操作で日本語・英語の即時切替と、設定した言語の再起動後の保持を確認しました。これは全画面・全動的表示・全DPI・外部スクリーンリーダーの確認ではありません。翻訳資源は27名前空間・英日各15,321キーで、キー差・補間差・空の日本語訳は0件ですが、資源の整合だけで全UI表示を保証するものではありません。

表示言語は日本語・英語・Systemに対応します。v0.82.4-ja.1では、通常Windows製品で日英双方向の切替、明示的な`en`・`ja`の再起動後の保持、System選択のja-JPホストでの日本語解決を確認しました。別のOS言語や全画面の条件を網羅するものではありません。版ごとの実機確認範囲は[テストと品質検証](Testing-and-Verification)に記載しています。

v0.82.3-ja.1では通常製品で英語の設定・メニュー・Project Manager・Workspace表示と、英語設定後の再起動保持を確認しました。表示言語をSystemにした状態で、日本語Renderer・ネイティブメニューと、Ctrl+Qによる正常終了・再起動後の日本語保持も確認しました。同版での明示的な`ja`設定値の保持は未確認でした。修正後の補助エラー警告は日英DOM試験で確認していますが、通常製品での表示は未確認です。これらと以下のv0.82.1-ja.1の観測は先行版の履歴として区別します。

アプリ設定を開き、「アプリ」内の「詳細設定」で表示言語を選択します。英語表示の場合はApplication Settings → Advancedです。選択肢は日本語、英語、システム設定です。

### Compatibility-and-Limitations — v0.82.8-ja.1


本版は本家v0.82.8の固定コミット `ab9da8f121e4e6fddebc523ced671863e8892ff6` に基づく未署名Windows x64版です。音声入力の実動作・実認識API、実共同編集サーバーや実組織との接続は未検証です。5,000件の検索結果表示は確認しましたが、長文Markdownの高CPU問題は解消と判定していません。高負荷Wiki文脈処理の同条件比較も未完了です。詳しい範囲は[既知制限](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.8-ja.1/docs/KNOWN_LIMITATIONS_v0.82.8-ja.1.md)を参照してください。

### Compatibility-and-Limitations — v0.82.7-ja.1


[v0.82.7-ja.1 Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1)は、本家v0.82.7の固定コミット [`826adb4f93dbe86db35b76ce2502a3a33abe0489`](https://github.com/nimbalyst/nimbalyst/commit/826adb4f93dbe86db35b76ce2502a3a33abe0489)を基準とするWindows x64向け非公式・未署名版です。Nimbalyst, Inc.の公式製品ではなく、同社の承認・サポートを受けていません。品質判定は **GO WITH KNOWN LIMITATIONS** です。Windows全体試験のPASS、すべての経路の検証完了、PTY資源残留の根本修正を意味しません。更新はこのリポジトリのReleaseから手動で行います。

翻訳資源は27名前空間・英日各15,321キーで、キー差・補間差・空の日本語訳は0件です。これは全画面・動的表示の完全な翻訳保証ではありません。PGLiteからSQLiteへの移行は合成データで確認していますが、すべての実ユーザーデータを移行できる保証ではありません。

Windowsでは、shellまたはCLIプロセスが自然終了した後も、アプリが動作中は端末用資源が残る場合があります。本家と日本語版の双方で、自然終了20回後にMainプロセスのメモリがそれぞれ約156 MiB増え、MessagePortとConPTY関連資源が残ることを観測しました。通常コマンドを永続shell内で実行するたびに増えるという意味ではなく、20回を超えて線形に増えるとも断定できません。確認した範囲では次の端末を作れない状態・データ損失・通常終了不能は観測されず、アプリの通常終了後に追跡した資源は回収されました。根本修正は未実施です。使用中の端末は通常の閉じる操作を使い、メモリ増加時は作業を保存してアプリを通常終了・再起動してください。自然終了後にパネルを閉じるだけで回収される保証はありません。

大きな編集可能文書でCPU使用率が高くなる場合があります。比較した範囲では本家より日本語版が大幅に悪化する傾向は確認されていませんが、原因と全条件での再現性は未確定です。アクセシビリティ機能を無効にすることは対処として推奨しません。

高いシステム負荷のもとでは、ローカルWikiのセッション開始時に追加する文脈の生成が遅れたり省略されたりする場合があります。限られた負荷比較では本家・日本語版の各3回が成功しましたが、以前の単発約4,450 msの時間超過の原因は未確定です。データ損失や通常のWiki編集機能の破損が確認されたという意味ではありません。

Windows全体試験は正常完走していません。同一プロセスのloopback通信停止、応答HTML/CSPの書換えによる試験失敗などがありました。一方、別プロセスの実サーバーを使った主要API試験は本家・日本語版の双方で成功しました。これをWindows全試験のPASSとは扱いません。

Nimbalystアカウントのライブ認証、実際の共同編集サーバー・組織環境、一部の有料AIプロバイダーとの通信、Claude in Chromeの実接続、全ての動的翻訳経路、全DPI・アクセシビリティ条件、実ユーザーデータ全量の移行は未検証です。詳細な試験範囲は[テストと品質検証](Testing-and-Verification)を参照してください。

### Compatibility-and-Limitations — v0.82.4-ja.1


本家v0.82.4の固定コミット `031a6e6de0b7817bbdcd16e6e5e758e45dfdcdc7` を基準とする、未署名Windows x64の通常正式版です。公式版とは別の識別子・保存先、手動更新、nonce付きlocalhost認証を維持しています。通常Windows製品の日英切替・明示的な日本語と英語の再起動保持、Systemの日本語解決、主要なファイル・長文検索・画像表示、更新と通常アンインストールを確認しました。過去版とは別の結果として[テストと品質検証](Testing-and-Verification)に記録しています。

共同編集の実サーバー・実組織、旧同期サーバーとの相互運用、本番組織の復旧は **NOT RUN** です。対応する同期サーバーが必要であり、ローカルの単体・統合試験はサービス接続の成功を証明しません。Bedrockへの実通信、新しいClaude有料セッション、実OSスリープ・復帰、非前面ブラウザー操作の全経路、バックエンド信頼設定後の実ライブ再試行も **NOT RUN** です。関連実装の自動回帰試験と区別します。

翻訳資源は27名前空間・英日各15,254キーです。動的735候補・解析scope未確定451候補は欠落キーや不具合件数ではなく、全実行時経路を検証した値でもありません。全画面・全DPI・外部スクリーンリーダー、画像の全操作条件、別OS言語、既存Tracker本文の全更新経路は網羅していません。

本番メール認証・暗号化保存・復元・通常サインアウトは、認証・起動処理に変更のない先行通常製品で確認しました。最終配布物そのもので新たに認証を繰り返したものではありません。Google認証、特殊復旧、サーバー側セッション失効、他ユーザーのNTFS実効アクセスも未検証です。

Windowsではsymlink fixture作成のEPERM、Git worktreeパス表記、ホストの大容量loopback書込みで未通過・未完了の試験を記録しています。Linux候補の全体試験とsymlink拒否試験は成功しましたが、Windows固有動作の全成功とは扱いません。これらの未検証範囲は、確認済みの不具合や脆弱性という意味ではありません。

旧v0.82.3-ja.2で観測した起動遅延やガイド表示の範囲は、以下の当該版の記録として保持しています。新しい版で再発しない保証でも、同一現象が確認されたという意味でもありません。旧版へのダウングレードは未検証です。

### Compatibility-and-Limitations — v0.82.3-ja.2


未署名Windows x64の通常正式版です。公開ソースの整理・訂正と同梱ガイド16件の更新を含み、本家基準・既存製品機能・保存先・手動更新方針は維持しています。旧版のタグ・Release・配布物・履歴は保持されるため、過去の内部資料がすべて消去されたわけではありません。

このWindowsホストでの更新後の初回再起動に、最大約125秒のMain遅延と一時的な無応答を観測しました。応答は回復し、同じプロファイルの最終ZIP再試験では通常操作・終了とデータ保持を確認しましたが、約550msの遅延1件は残りました。新規プロファイル4回の起動では同じ長時間遅延を記録しませんでした。原因・再発条件は未確定であり、同時期に表示されたセキュリティ製品の通信確認が原因だったとも、恒久的に解消したとも断定していません。

同梱ガイド16件は配置と全ファイルのSHA-256を検査し、SDKガイド1件と同じバイトのコピーを通常エディターで表示しています。ワークスペースを持たない「ファイル」→「開く」の試験では、日本語UIでも本文ではなく英語の「Open a workspace to get started」が表示されました。専用導線による全ガイドの直接表示は未確認です。

本版では本番認証を再実施していません。Google認証、特殊復旧、サーバー側セッション失効、認証済み旧プロファイルの全更新経路、別ユーザーのNTFS実効アクセス、外部スクリーンリーダー、全DPI・全画面・全動的翻訳経路は未検証です。チーム復旧の実組織・独立実クライアントを使う完全な手順も未検証で、対応する同期サーバーが必要です。未検証であることを、確認済みの不具合や脆弱性とは扱いません。

Windowsのsymlink fixture準備でEPERMとなるCLI 1件・sandbox 2件には未検証範囲があります。fixtureが作れず実行されなかった拒否動作を、Linuxの成功で確認済みにしません。版ごとの実機操作とCIの結果は[テストと品質検証](Testing-and-Verification)に区別します。

### Compatibility-and-Limitations — v0.82.3-ja.1


本家v0.82.3の固定コミット `84dcc00f3cd0abbb36eafc6bfad9389f960076db` を基準とする未署名Windows x64版です。英日各27名前空間・14,795キーで、動的672候補・scope未確定412候補・JSX英語378候補は不具合件数ではなく、全実行時経路を確認したものでもありません。

通常製品で英語のSettings・メニュー・Project Manager・Workspace表示と、英語選択後の再起動保持を確認しました。表示言語をSystemにした状態で、日本語Renderer・ネイティブメニューと、Ctrl+Qによる正常終了後の再起動保持も確認しました。明示的な`ja`設定値の保持は未確認です。修正後の補助エラー警告は日英DOM試験で確認しましたが、通常製品での表示は未確認です。認証・NSIS導入/更新/削除の操作はこの版では未実施です。以前の製品での成功記録はそれぞれの版の履歴として区別します。Google認証・特殊復旧・サーバー側失効、旧認証済みプロファイル更新、別ユーザーACL、外部スクリーンリーダー、全DPI・WSL実環境の全経路も未検証です。

旧暗号化方式のチーム復旧には更新された同期サーバーと対応クライアントが必要です。既存モック・DOM・単体・統合試験を評価しましたが、実組織での復旧フォーム表示、復旧開始、サーバー状態遷移、独立実クライアントの読戻し、本番チームデータの完全性、復旧後同期は未検証です。検証目的の実組織・ダミー組織の作成やサービス登録、本番復旧操作は行っていません。

過去のCodex主要求は成功しましたが、自動セッション情報リマインダーはprovider報告のcapacityエラーを返しました。回帰試験で補助要求の終端失敗が主要求の失敗状態へ混入する問題と、RPC開始失敗時の通知購読解放漏れを特定して修正しました。主応答・完了を維持し、日英の利用者向け警告を表示するDOM試験は成功しています。通常製品での警告表示は未確認です。過去のprovider capacity事象が同一経路かは未確定であり、provider自身の容量制限を解消する修正ではありません。7つのバンドル容量上限は修正後もPASSです。Windows fixture作成EPERM3件は未通過で、拒否動作自体の未検証範囲を残しています。以下の旧版結果はそれぞれの版に限定した履歴です。

### Compatibility-and-Limitations — v0.82.1-ja.1


Windows x64向けの未署名正式版です。本家v0.82.1の固定コミット `583ae0244dae266667be579733d6c571fd74e037`を基準とします。識別子・保存先・手動更新・localhost認証の方針は以下の表と同じです。

通常製品ビルドで日英表示と再起動保持、本番メール認証・暗号化状態の復元・ローカルログアウト、新規導入、v0.81.7-ja.3からの更新、通常アンインストールを確認しました。翻訳は27名前空間・英日各14,608キーです。動的653候補・スコープ未確定382件と全画面の実行時表示は完全には確認していません。Google認証、特殊な復旧経路、サービス側失効、NTFS実効アクセス、外部スクリーンリーダー、全DPI・端末構成は未検証です。

すべてのWindowsバージョン・DPI・セキュリティ製品・端末構成を試験した結果ではありません。
