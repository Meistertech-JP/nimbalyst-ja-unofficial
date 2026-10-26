# R15 翻訳監査（検証継続中）

## 開発成果の凍結値

最終製品の資源は英日各27名前空間・14,794キー。`tmp/r15-translation-audit-app-schemes/SUMMARY.json` と入力manifestで、parity・空の日本語・補間差・解決済み参照の欠落0を確認した。後続の最終文書コミットに辞書・Runtime・Rendererの変更はなく、製品入力比較で継承を証明する。動的672候補、scope未確定412候補の完全な実行時追跡は未完了であり、全画面翻訳済みの主張ではない。以下の古い件数・未完了表現は各時点の履歴として保持する。

本家v0.82.3の新規UIを既存の `@nimbalyst/i18n` へ接続した。別の翻訳基盤は追加していない。現時点の結果は最終製品GUIでの全画面確認を意味しない。

## 辞書・参照

最新チェックポイントは `tmp/r15-translation-audit-post-migration-3/`。監査対象ソースのSHA-256一覧と使用したスキャナーのSHA-256を同梱する。監査中の入力変化は0。

| 項目 | 結果 |
|---|---:|
| 名前空間 | 英日各27 |
| キー | 英日各14,782 |
| キー差分 | 0 |
| 空の日本語訳 | 0（既存の意図的空白区切りを除く） |
| 補間変数差分 | 0 |
| JS/TS解析ファイル | 7,317 |
| production静的参照候補 | 12,274 |
| shared辞書へ解決済み | 11,783 |
| ローカルMemory辞書へ解決済み | 106 |
| 字句scope未解決 | 385 |
| 解決済み静的参照の欠落 | 0 |
| 動的参照候補 | 657 |
| Main復旧用helperの直接参照 | 105、欠落0 |
| 変更追跡理由の有限キー | 27、欠落0 |

Main用 `recoveryError` から `recoveryText` への転送は、key/fallback/valuesをそのまま渡す一箇所として別記した。直接参照ではないため、欠落キーとも任意の動的キーとも数えない。

## 追加範囲

- チーム復旧パネル、進行状態、確認、件数、パスフレーズ案内、診断書き出し用ネイティブダイアログ。
- Mainが生成する復旧の入力検証・容量制限・安全性・不一致・復旧停止理由。
- Trackerの復旧後競合、待機中編集を保持する通知。
- Codexの変更帰属が不明な理由とファイル監視中断。全理由の有限集合を辞書と照合。
- 貼り付け画像の既定キャプション。

外部サービスのerror/message、ユーザー文書、識別子、暗号化内容、ファイルパスは機械翻訳しない。復旧の内部検証例外のうち、UIへ直接出ず翻訳済みblockerへ変換されるものは技術文字列として保持する。

## 動的参照の確認範囲

本家変更ファイルの候補は、Tracker拒否理由の有限マップとprefix、ProjectRailのOS別表示、Trackerの単複案内、変更追跡理由callback、チャート種別の有限マップである。Tracker formatterの翻訳callbackは同ファイルの `useTranslation('tracker')` とコメントUI側の同名前空間から供給される。変更追跡callbackは表示側の `file_edits_sidebar` から供給される。Main用の引数転送は105の直接呼び出しに分解して補足監査した。

全657候補と385の未解決scopeについて、全プログラムの実行経路を確認したとは主張しない。378のJSX英語候補には固定upstream差分外、モバイル、意図的な識別子等も含まれ、すべてを未翻訳またはすべてを翻訳不要とは扱わない。最終分類・実GUI検証は継続する。

## 回帰証拠

Mainの日英切替、復旧パネルの初回操作・組織切替の安全性、全理由の日本語辞書、各ローカルエラー等のテストを追加・更新した。生のRED/GREENログは `tmp/r15-evidence/` に保持する。最終テスト母集団・製品ビルドでの画面確認は後続の報告書で確定する。

## 実GUIから見つかったセッション時刻の修正

先行Windows候補のセッション行で、aria-labelに「updated Just now」「updated 1 hr ago」が残ることを確認した。基準のv0.82.1-ja.1ソースにも同じ未接続箇所が存在するため、v0.82.3で新しく生じた回帰とは断定しない。SessionListItemの表示時刻・作成/更新ラベル・日時tooltipを既存sessions名前空間へ接続した。既存キーのみで辞書変更はない。分単位のidle tick、作成順/更新順の選択、ライブ活動timestampの優先は保持した。

REDは新規2件FAIL・既存3件PASS。GREENは関連4ファイル14件PASSで、日本語→英語→日本語、tooltip、aria-labelとidle tickを検証した。i18n資源の2ファイル9テストもPASS。通常フックで `3388c93c552a84fdaef90f987a26d9712bb163af` にコミットした。新しい製品バイナリでの再確認は必要。

最新静的チェックポイント `tmp/r15-translation-audit-session-relative-1/` は27名前空間・英日各14,782キーで、差分・空訳・補間差分・解決済み欠落0、入力変化0。production参照12,276件（shared解決11,785、Memory106、scope未確定385）。動的候補は659件で、前回からの2件はsessionsの作成/更新有限選択と相対時刻formatterへの翻訳callbackである。全動的経路の実行済みという意味ではない。

## 添付案内・推奨見出しの追加修正

実画面で「Claude Agent (Recommended)」と「Attach Files & Images」が残った。前者はModelSelectorの直書き、後者は既存日本語訳があってもCSS selectorで配置するstepにhelp識別子がなく、resolveWalkthroughStepCopyの対象外だった。同じ仕組みで、new-dropdown-buttonへ配置する初回セッション案内も翻訳に接続されていなかった。

表示位置のtargetとは別にhelpTestIdを明示し、既存のcommon.helpで表示時に解決する。対象要素、trigger、表示優先度、権限やモデルIDは変更しない。モデル見出しも同じhelp辞書を利用し、Claudeプラン認証も使える現行本家の説明へ英日資源を揃えた。キー追加・削除はない。

初回REDでは添付案内の不一致が再現したが、モデルの新規fixtureは既存mockのModelIdentifier不足で先に停止したため、その失敗を製品のRED証拠には使用しない。deep moduleの実exportを保持するnarrow mockへ直し、元の直書きへ一時的に戻した再試験で英語見出しの不一致を確認した（provider-heading-red2.json）。全16種類のガイドのtitle/body比較では初回セッション案内の接続漏れも再現した（attachment-provider-green2.jsonの失敗を保持）。修正後は関連3ファイル29テストがPASS。ポータル内の実Calloutで日英タイトル・本文・完了・閉じる・Escを、モデル見出しでは日英切替・モデル名/外部表示名の保持・選択callback非実行を確認した。

この修正は3388c93c5の製品バイナリに含まれない。新しい製品コミット・CI・パッケージ生成・実画面確認が必要で、先行候補を最終版としない。

ガイド・推奨見出しの修正を通常フックでcfdd0e07691c4b7a961ffbebacb59a41ae6b20aeへコミットした。全38型・7容量・i18n9件がPASS。通常pushは同じCLI fixture EPERMで停止し、例外を自動適用していない。静的監査 `r15-translation-audit-guide-provider-1` は27名前空間・英日各14,782キー、解決済み欠落0・補間差分0・空訳0である。

同じgetHelpContentの直接消費箇所を調査し、ContextUsageDisplayの展開ヘルプにも翻訳未接続があると確認した。既存試験はhelpをundefinedへmockしており、展開部を検査していなかった。実HelpContentを使用する新規試験で日本語タイトルの不在を再現し、共通ヘルパーへ接続した。最初の試験のクリック名は実際の辞書「これは何ですか？」と異なっていたため、その失敗を製品のREDとは扱わず、修正したcontext-help-red2.jsonを再現根拠にした。提供元の動的category名は外部データとして書き換えず、固定ヘルプの表示のみを修正している。

修正は通常フック付きコミット `7af4c3b6e72d4c7c92feb88ce1bbacd89fc628c2` まで確定した。関連4ファイル41テストがPASS（`guide-provider-context-green.json`）。全38ワークスペース型検査と容量7件もPASS。最新監査 `r15-translation-audit-complete-help-1` は27名前空間・英日各14,782キー、空訳・補間差分・解決済み欠落0。production参照12,277件、shared解決11,786件、Memory106件、scope未確定385件、動的候補659件、未分類JSX英語候補378件であり、全画面の英語残存0という判定には使用しない。

## 実Codex会話で発見した完了時刻の混在

7af4c3b6eの通常Windows製品で実Codex応答「R15 Codex検証OK」を確認した際、完了行が「at 10:18 pmに完了」と混在した。computeTranscriptRowInfosがformatTurnFinishedAtで英語文字列を先に生成し、翻訳済みfinished_atへ埋め込む経路だった。従来の表示テストはfinishedAtへ完成済みの「10:30」を直接渡していたため、この経路を覆えていなかった。

日時formatterと実compute→行表示の日英切替テストを先に追加し、2 FAIL／既存11 PASSのREDを `turn-finished-locale-red.json` に保存した。修正は元の数値timestampを任意フィールドで保持し、行のトップレベルi18nが現在言語で表示を解決する。メモ比較はtimestampも比較し、全行の再計算や永続化形式の変更は行わない。英語の従来文字列、当日と別日、深夜、日本語→英語→日本語を確認し、関連2ファイル13 PASS（`turn-finished-locale-green.json`）。型検査は実行中。この変更は未コミットであり、既存7af4c3b6eのCIやバイナリに含まれない。

その後、`typecheck-turn-finished-locale.log` で38型・7容量PASSを確認し、通常フックで `5b87255c0030e9a1daecb54b2bdfd9a58ff5137f` に4ファイルだけコミットした。辞書キーの変更はない。既存のセッション時刻修正の範囲でありfeature inventoryの変更はない。新コミットはまだpush・製品再生成・実画面再確認していない。

## 英語の時刻前置詞の二重表示

その後のb2cd7ea16製品をEnglishへ切り替えると「at at 10:18 pm」となった。英語resourceがatを付け、formatterもatを返すためである。先行試験の部分一致はこの重複を捕捉していなかった。表示全文へ強化した試験で2 FAIL／既存11 PASSを再現し、`turn-time-english-prefix-red.json` に保存した。

locale指定のformatterは翻訳文へ埋め込む時刻だけを返し、locale未指定の既存呼出しは従来のstandalone英語prefixを維持する。英語の当日・別日、日本語の当日・深夜・別日、実compute→行表示の言語切替を検証し、関連4ファイル48 PASS（`turn-time-english-prefix-green.json`）。通常フックで `49e52c53ffe1225ce7d411f53f7e20c7758c49a7` にコミットした。辞書変更はなく、新ビルド・CI・実画面での英語修正確認はまだ必要である。

同コミットの通常pushはCLI fixtureのsymlink EPERMで停止した。sandboxの個別実行はartifact 6 PASS、image-pins 15 PASS／fixture作成EPERM 2 FAIL。UI invariants・native dialogs・archive writesはPASS。新しいpush例外を自動適用せず承認確認中。修正後Windows製品ビルドを再生成中で、先行バイナリの画面確認をこの変更の実画面成功とは扱わない。

## 最新ソースでの再集計

1e4033ed9005faf11a68ad3277148fdf2c7d1e1cで監査を再実行し、r15-translation-audit-ios-index-source-1/SUMMARY.jsonへ保存した。27名前空間・英日各14,782キー、差分・空訳・補間差分・解決済み参照欠落0。解析7,317ファイル、production参照12,277件（shared解決11,786・ローカルMemory106・scope未確定385）、動的候補659、未分類JSX英語候補378。前回から翻訳ソース入力の変更はない。辞書整合と全UI・全動的経路の完全翻訳は区別する。

49e52c53fの通常ZIPでは英語at重複の解消、日英それぞれの再起動保持、日本語展開ヘルプを確認済み。iOSの後続変更は翻訳資源に影響しないが、そのSwift実行確認は未完了である。

## Trackerの実画面で発見した追加の固定英語

同ZIPのTrackerでTAGS、4h ago、Owner等とPublishedバッジを確認し、保存値とは別の固定UIである経路を特定した。標準フィールド名は軽量leaf helperで既存キーへ接続し、明示displayLabel・未知フィールド名・選択肢の保存値は保持した。Tags編集ラベル、チップの可視文字・aria-label・title、追加フィールドメニュー、読み取り専用表示を対象とする。公開状態のlabel/titleは元の可視性の説明を維持して翻訳した。状態値は変更していない。Table・RevoGrid・ページの相対時刻と日付hoverはトップレベルの現在言語から解決し、従来helperの英語default APIを維持する。i18nextへの新しい直接型依存は持ち込まず、必要十分な構造型と実getFixedTの代入検査を使用した。

通常コミット5306786dab05015fb83f2cb74212393f2d170e87。追加は英日それぞれ7キー（field操作tooltip2、公開状態と説明4、collectionラベル1）。監査r15-translation-audit-tracker-5306786daは27名前空間・英日各14,789キー、差分・空訳・補間差分・解決済み欠落0。production参照12,306、shared解決11,788、Memory106、scope未確定412、動的候補666、未分類JSX候補378。有限フィールドmap・公開状態・tooltipの20参照（19独立キー）は別途ASTから列挙し、両言語とも欠落0（tracker-finite-keys-5306786da.json）。未解決の全動的参照まで解決済みと扱わない。

新しい関連試験は11ファイル97テストPASS（tracker-related-builtin-labels-GREEN.log）。日英のライブ切替、可視ラベル・aria/title、カスタム名/値、Grid cellTemplate、日付のみと実時刻の境界、既存helper APIを確認した。最初の統合型検査はfixtureの過剰プロパティとsystemの不足で失敗し、型定義や製品側の契約を緩めずfixtureを修正した。resource試験の旧14,782件期待値も、新規7キーの内容を明示検証したうえで14,789へ更新した。原失敗ログは保持している。

当初のラベル修正時の単体REDログは保存されていなかったため、存在しないログを根拠にしていない。修正前の実画面を先行REDとし、後から元aac77079cの3つのGit blobをVite loadで読み込んだ独立再生では、新規翻訳試験3 FAIL／既存10 PASSを確認した（tracker-label-baseline-RED.log、loaded-blobs.json）。元のworktreeやGitを戻さず、これは事後の回帰検証であってtest-first証拠とは表現しない。時刻側のREDは別途先に保存されている。

5306786daの通常pushで38型・容量7件PASS。editor369,932／370,000、trackers-ui197,808／200,000、docs-ui89,138／92,000 gzip bytes。既知CLI fixture EPERMで停止し、手動sandboxは既知2 fixture EPERMだけ、後続静的3検査はPASS。例外の自動適用やテスト・上限の変更はない。新しいWindows製品は再生成中であり、source/unit成功を実画面の修正確認へ置き換えない。

## Desktopテーブルと固定同期状態の追加監査

67a004c7cの通常ZIP実展開版で、詳細フィールド・公開状態・リストとテーブルの相対日時の日本語表示、および英語へのライブ切替を確認した。しかしテーブル列名・表示設定・操作title/ariaと同期enumに固定英語が残ったため、最終合格とせず追加修正した。元の観測とスクリーンショットはtracker-native-67a004c7c.jsonに保持した。

列定義にはfixed/schema/customの表示由来を保持し、固定列と標準ID/roleだけを翻訳する。明示displayLabelがStatusのように既定英語と同じでもカスタム名として保持し、列ID・role・保存値は変更しない。Desktop・共有Grid・表示設定・埋め込みカード・型ページで元の列定義から表示名を解決する。グリッド操作・フィルター・お気に入りのtitle/ariaも両Grid callerから注入し、旧英語default APIとイベント処理を保持した。local/pending/syncedは表示だけを翻訳し、内部enum・色・未知値の表示は維持する。

追加資源は英日各5キー（grid.open_details、detail.sync_local/pending/synced、columns.publication）。Publication列に旧Sharedキーを転用せず、本家の公開状態という意味を維持した。作業ツリー監査r15-translation-audit-grid-controls-completeは27名前空間・英日各14,794キー、差分・空訳・補間差分・解決済み欠落0。production参照12,325（shared11,807・Memory106・scope未確定412）、動的候補672、未分類JSX候補378。有限map等の別監査は42参照・33独立キー・両言語欠落0。監査時HEADは67a004c7cだが新規修正はまだ未コミットの入力manifestが対象であり、67a004c7cのGit treeが14,794キーを持つという意味ではない。

監査の初回はsandbox内の読み取り専用Git子プロセスがspawnSync EPERMで停止した。失敗先を上書きせず、許可された読み取り実行で別の証拠先へ完了した。辞書欠落や製品障害と同一視しない。追加の独立レビューではカードの新memoが同じ型のschema更新を隠す可能性を発見し、毎renderの再解決と回帰テストへ修正した。全体型・容量検査の最初の完了時点では38ワークスペースPASS、全7上限PASS（editor369,926/370,000、trackers-ui198,509/200,000、docs-ui89,138/92,000）。後続の小変更と最終製品には改めて適合確認が必要である。

追加修正を057883f8bd230280dfeaa298a5c5e45f8252b508へ通常フックでコミットした。関連試験はtracker-grid-controls-integrated.logで10ファイル135 PASS。カードのformatValueにも現在の表示言語を渡し、Today/今日、2h ago/2時間前の切替と日付保存値の保持を確認した。カード修正後のcollab-client型検査もPASS。新規ファイルは型ページの実ラベルhelperとその回帰テストの2件で、一時成果物ではない。ビルドにより更新されたtracked宣言3ファイルもAPI変更と照合して同コミットに含めた。新しいWindows製品やhosted CIの成功まで主張しない。
