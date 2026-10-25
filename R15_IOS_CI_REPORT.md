# R15 iOS CI（初回PASS）

対象コミット: `a9fcc204e44c39a0602342f8a8da763af32969bf`。

[macOS hosted iOS検証](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40182435823)、job ID `121136116413`。macos-15、Xcode 26.2、既存のhosted test projectでcandidateの全テストを実行する。workflow名のR13は過去から維持された名前であり、固定upstreamを古い版へ変更してはいない。

successで完了した。今回の全native test populationの実出力は、527実行、6 SKIP、0 FAIL。独立したstorage/projectionの2試験も先に成功したが、全母集団にも含まれるため加算しない。実ログは `tmp/r15-evidence/ios-ci-a9fcc204.log`。過去の527件を今回の成功数へ流用したのではなく、このrunのAll tests / NimbalystNativeTests.xctestの終了行を確認した。

この結果は上記コミットのiOSシミュレーターでの検証であり、実機全体の動作保証ではない。後続の変更が製品・iOSソースへ影響する場合は結果の適用範囲を再評価する。xcresultを含むGitHub artifactは保持されているが、ローカルへの全量復元はまだ行っていない。
