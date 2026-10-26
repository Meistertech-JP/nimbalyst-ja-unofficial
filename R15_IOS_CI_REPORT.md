# R15 iOS CI（初回PASS）

## 最新確定結果（f0c7b7929）

[run 40249364731](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40249364731) はsuccess。HEADは `f0c7b7929f18f57c6efac96f61154cfe442b4c74`。全体528実行は522 PASS／6 SKIP／0 FAILである。XCTestの終了行だけを厳密に集計し、全体summaryとも一致した。名前にFailedを含む試験の開始行を失敗件数へ誤算入しない。前段2試験は全体へ二重加算していない。

追加した実refresh SQLの検索計画回帰も成功した。既存性能閾値・SKIP設定は緩和していない。`tmp/r15-evidence/hosted-results-f0c7b7929-verified.json` と同名artifactディレクトリにログ・xcresultを保全した。iOSシミュレーターの結果であり、物理端末での全面検証ではない。以下は先行チェックポイントの履歴である。

対象コミット: `a9fcc204e44c39a0602342f8a8da763af32969bf`。

[macOS hosted iOS検証](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40182435823)、job ID `121136116413`。macos-15、Xcode 26.2、既存のhosted test projectでcandidateの全テストを実行する。workflow名のR13は過去から維持された名前であり、固定upstreamを古い版へ変更してはいない。

successで完了した。今回の全native test populationの実出力は、527実行、6 SKIP、0 FAIL。独立したstorage/projectionの2試験も先に成功したが、全母集団にも含まれるため加算しない。実ログは `tmp/r15-evidence/ios-ci-a9fcc204.log`。過去の527件を今回の成功数へ流用したのではなく、このrunのAll tests / NimbalystNativeTests.xctestの終了行を確認した。

この結果は上記コミットのiOSシミュレーターでの検証であり、実機全体の動作保証ではない。後続の変更が製品・iOSソースへ影響する場合は結果の適用範囲を再評価する。xcresultを含むGitHub artifactは保持されているが、ローカルへの全量復元はまだ行っていない。

## テスト分離修正コミットの再実行

`e5e207dce4d4bb3540b28720488d5b7b33047b66` の [40186642536](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40186642536) もsuccessで完了した。All testsとNimbalystNativeTests.xctestの実出力は527実行、6 SKIP、0 FAIL。実ログ `tmp/r15-evidence/ios-ci-e5e207dc.log` を保存した。後続のSessionListItem時刻表示修正はこのrunに含まれない。

## 時刻表示修正後の再確認

`3388c93c552a84fdaef90f987a26d9712bb163af` の [40188921757](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40188921757) もsuccess。実ログの全母集団は527実行、6 SKIP、0 FAILで、`tmp/r15-evidence/ios-ci-3388c93c.log` に保持した。Windows専用Rendererの変更だからという理由で結果を推測せず、このコミットでの再実行を確認した。

## 添付ガイド・モデル見出し・展開ヘルプ修正後

`7af4c3b6e72d4c7c92feb88ce1bbacd89fc628c2` の [40195005093](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40195005093) はsuccess。実ログ `tmp/r15-evidence/ios-ci-7af4c3b6e.log` のAll tests終了行は527実行、6 SKIP、0 FAIL。前段のstorage/projection試験は全母集団と重複するため加算していない。新しいWindows通常製品ビルドの認証・インストール成功を、このiOSシミュレーター結果から推測するものではない。

## 完了時刻・タイトルバー修正後

`b2cd7ea16927f52fe3b24dee4e215ecccbaf11bf` の [40198602522](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40198602522) はsuccess。実ログ `tmp/r15-evidence/ios-ci-b2cd7ea16.log` のAll testsは527実行、6 SKIP、0 FAIL。同時起動のLinuxは40198602456で、run listの順序からIDを逆に推定した初回記録をworkflow名の取得で訂正した。iOS成功をLinux成功とは扱わない。

## 英語prefix修正コミットの新しい性能試験失敗

49e52c53ffe1225ce7d411f53f7e20c7758c49a7の [40201861401](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40201861401) はfailure。前段のisolated試験でSessionListProjectionTests.testIncrementalRefreshCostDoesNotTrackHistorySizeが失敗し、全527件の実行へ進んでいない。固定groupの1k=1.881458ms、10k=12.291834msに対し、6倍閾値11.288748msを超えた。ストレージ失敗注入のログは当該別試験の正常なfixture記録で、今回の失敗原因と混同しない。

packages/iosには直前成功のb2cd7ea16から差分がなく、同試験のGit blobは双方a9be127b15178691f76545fdeff15d1faf6e9553。ただし未変更だけを理由に環境要因・pre-existingと断定しない。SQL・index・単発wallclock計測を調査中であり、閾値緩和、skip、再実行による失敗記録の置換は行っていない。生ログはios-ci-49e52c53f.log、xcresultとisolatedログはios-ci-49e52c53f-failure/に保持。既知Windows3件の例外へ含めない。

## 性能問題の原因と最小修正

変更前のSessionListProjection.refreshは、変更前後のmembershipを調べる2本のSQLでidx_slgm_childrenをprojectIdだけで検索し、プロジェクトの全membershipを走査した。固定upstream・b2cd7ea16・49e52c53fの同実装はblob bb5899a60c18ba811e106c9d4e408dcb5e077383で一致している。したがって翻訳変更由来とは考えられないが、単なるホスト計測ノイズと断定するのも誤りだった。

Swiftの実DDL・SQLを抽出した合成in-memory SQLiteで、履歴1k・10kに対して両クエリのproject-only検索を再現した。既存idx_slgm_session(projectId,sessionId)を2本とも明示すると、変更対象sessionIdによる検索になり、touched結果は同一。RED（exit1）・GREEN（exit0）はprojection-index-plan-RED.log／GREEN.log、別の親レビュー実行はprojection-index-plan-parent-review.log。Node SQLiteのプラン証拠をiOS実機SQLiteでの成功とは扱わない。

既存Swift試験ファイルへ、実際のrefreshが発行したSQLをGRDB traceで捕捉して両検索のEXPLAINを検証する回帰テストを先に追加した。旧→新グループへの移動、membership・時刻・live queryとの一致も確認する。既存6倍wallclock閾値と全assertionは変更していない。既存schemaVersion3が作成するindexを利用するため、新DDL・migrationは不要。Swift変更2ファイルはWindowsバイナリのソース対象ではないが、新しいmacOS/iOS CI検証は必要である。

性能修正1e4033ed9を祖先に持つ最新製品コミット057883f8bd230280dfeaa298a5c5e45f8252b508についても、通常pushは既知Windows fixture EPERMで停止し、GitHubのR15ブランチは49e52c53fのままである。新規コミットへ以前のpush例外を自動適用しておらず、新しいSwift compile・回帰・全体iOS試験は未実施。Windows製品GUIや合成SQLの成功をその代用とはしない。

## eabb8c5d6での修正後hosted検証

所有者の今回の既知3件限定承認を受け、通常ゲートを改めて実行して型38・容量7・後続静的検査が成功し、既知fixture EPERMだけであることを確認した。R15開発ブランチのみをfast-forward更新し、[run40243528554](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40243528554)を同一HEAD `eabb8c5d6e0d951c77c79f2d5ab4439e056512ef` で実行した。workflow・checkout・validation-sourceの実SHAを読み戻し、conclusion=successを確認した。main・タグ・Release・公開Wikiは変更していない。

実artifactの前段ログは2試験実行・0 FAIL、全体ログは528実行（6 SKIPを含む）・0 FAIL。Test Case行を独立集計すると522 PASS／6 SKIP／0 FAILで、先行527件へ新規回帰1件が加わっている。追加したtestActualIncrementalRefreshLooksUpTouchedGroupsByDirtySessionも0.373秒でPASS。前段と全体の件数を加えて「530件の全体母集団」とは表現しない。

既存性能試験の固定groupで無関係な履歴だけを増やす計測は、前段1k=1.86ms／10k=3.02ms、全体1k=1.75ms／10k=2.56msで既存6倍条件を通過した。一つの巨大group自体を増やす参考計測は前段2.73ms／18.76msであり、これを全条件の定数時間保証と読み替えない。閾値・期待値・SKIP条件は緩めていない。

全ログはios-ci-eabb8c5d6.log、artifactのr13-isolated.log／r13-hosted.logと両xcresultはtmp/r15-evidence/ios-ci-eabb8c5d6/に保存した。artifact ID12617539262、要約はios-ci-eabb8c5d6-result.json。前回の性能FAILと生ログは保持している。これはmacOS hosted iOSシミュレーターの成功で、物理端末での全面的な動作保証ではない。
