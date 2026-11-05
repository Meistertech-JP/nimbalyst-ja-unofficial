# v0.82.7-ja.1の検証範囲と既知制限

本版は、本家Nimbalyst v0.82.7（`826adb4f93dbe86db35b76ce2502a3a33abe0489`）に基づくWindows x64向けの非公式日本語版です。公開品質判定は **GO WITH KNOWN LIMITATIONS** です。全試験PASSや全機能の動作保証を意味しません。[English](#english)

## Windows端末の自然終了

外側のshellやCLIプロセスが自然終了すると、端末用の資源がアプリの生存中に残る場合があります。本家v0.82.7と本版の実端末管理処理を通した比較で、各20回の自然終了後にMainプロセスのメモリが約156 MiB増加し、20個のMessagePortとConPTY関連資源が残りました。管理対象の端末が0でも資源が残ることを確認しています。根本修正は未実施です。

これは永続shell内のコマンドを1回実行するたびに156 MiB増加するという意味ではありません。20回の結果から、無制限に線形増加することや全利用者への影響を断定しません。

調査範囲では、次の端末の作成失敗、データ損失、アプリ終了不能は観測していません。通常終了後に追跡対象の資源は回収されました。使用中の端末を明示的に閉じる比較ではMessagePortの増加は解消しましたが、すべての資源が完全に解放されたという認定ではありません。

**多数の端末セッションを自然終了させた後にメモリ使用量が増えた場合は、作業を保存し、Nimbalystを通常終了して再起動してください。** 使用中の端末はアプリの通常の閉じる操作を使用できます。自然終了した端末のパネルを後から閉じるだけで、残った資源が必ず回収されるとは限りません。

## 長文編集時のCPU使用率

大きなMarkdown文書など、編集可能な長文の表示でCPU使用率が高くなる場合があります。2,600項目の合成文書による同一ホストの比較では、Main CPU平均は本家39.72%、本版39.14%でした。1論理コアを100%とする値で、PC全体の使用率ではありません。この比較範囲では本版固有の大幅な悪化は確認されず、最大化・復元・文末移動・短文への切替も成立しました。

根本原因、全ホスト・DPI・入力条件での再現性は未確定です。アクセシビリティ機能やOSの保護機能を無効化する対処は推奨しません。

## 高負荷時のローカルWiki文脈

ローカルWikiのセッション開始時の追加文脈は、高負荷時に生成が遅延・省略される場合があります。本家・本版とも限定CPU負荷下の対象試験は各3回成功しましたが、以前のWindows全体負荷時には本版で単発の時間超過があり、直接原因は未確定です。データ損失や通常のWiki編集機能の破損が確認されたという結果ではありません。

文脈生成の期限は協調的な確認であり、停止したnative I/Oまで強制中断するhard timeoutではありません。

## Windows全体試験の状態

Windows全体試験は正常完走していません。本家・本版の双方で、同じNodeプロセスがloopbackサーバーと大容量HTTP送信を実行する条件に停止を観測しました。応答HTML／CSPのホスト上での書換え、POSIXのファイルmodeを前提とする試験の失敗もありました。特定のセキュリティソフトが停止原因であると断定していません。

実サーバーを別プロセスで動かした主要API比較は両版で成功しました。ページ作成・読取・更新、古いversionに対する409、添付の保存・読取、容量超過413、認証・origin・Host検査を含みます。実利用の重要な通信境界を確認した結果であり、元のWindows全体試験をPASSに変更するものではありません。

Linuxの固定比較では、本版19,754 PASS／0 FAIL／30 SKIP、本家18,533 PASS／0 FAIL／30 SKIPでした。[実行記録](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/42008631197)。これはGitHub Actions上の単体・静的等の検査であり、Linux向け日本語版製品の配布・動作保証ではありません。Windowsのsymlink fixture作成EPERMは拒否処理へ到達しないため、Linuxでの成功と区別します。

## 確認済み範囲と未検証範囲

Windows通常製品では、新規インストール、旧公開版からの更新、Portable起動、日英即時切替と再起動保持、通常終了、アンインストール、合成PGLiteデータのSQLite移行、rg.exe、主要なWorker・native依存、配布物とソースの対応を確認しました。移行試験は合成データによるもので、実ユーザーデータ全量の移行を保証しません。更新前に作業とプロジェクト文書をバックアップしてください。旧版へのダウングレード互換性は未検証です。

実際の共同編集サーバー・組織、旧新同期サーバーの相互運用、一部の有料AIプロバイダー通信、Claude in Chromeの実接続、実OSスリープ・復帰、非前面ブラウザー操作と信頼再試行の全経路は未検証です。共有機能には対応する同期サーバーが必要です。

本版の最終配布バイナリで本番認証を新たに再実行した結果ではありません。既存の認証観測、localhost callback・暗号化保存方針、回帰試験を区別します。Google認証、特殊復旧、サービス側セッション失効、別ユーザーのNTFS実効アクセスも網羅していません。

翻訳資源は27名前空間・英日各15,321キーで、キー差・空の日本語翻訳・補間差は0です。全画面、全動的参照、全DPI、外部スクリーンリーダーの検証完了を意味しません。ユーザー文書・モデル名・外部応答等は自動翻訳しません。

Windows配布物は未署名です。公式版との同時利用はサポートせず、独立したアプリID・ユーザーデータを使用します。公式自動更新・手動更新確認は無効で、本リポジトリのReleasesから手動更新します。保護機能を無効化せず、[Windowsガイド](WINDOWS_JA_UNOFFICIAL.md)と配布物のSHA-256を確認してください。

## English

# Verification scope and known limitations for v0.82.7-ja.1

This unofficial Windows x64 edition is based on upstream Nimbalyst v0.82.7 (`826adb4f93dbe86db35b76ce2502a3a33abe0489`). Its publication quality decision is **GO WITH KNOWN LIMITATIONS**, not a claim that all tests or features have been verified.

### Natural terminal exits

When an outer shell or CLI process exits naturally, terminal resources can remain while the app is alive. Product-manager-path comparisons of upstream v0.82.7 and this edition recorded about 156 MiB of Main-process memory growth after 20 natural exits in each edition, along with 20 MessagePorts and ConPTY resources. Resources remained despite an empty terminal-management map. The root cleanup issue is unfixed.

This is not 156 MiB for each command inside a persistent shell. Twenty observations do not establish an unlimited linear growth rate or an effect on every user.

Within the tested scope, there was no failure to create the next terminal, data loss or inability to quit. Tracked resources were reclaimed after normal app shutdown. Explicitly closing a running terminal eliminated the MessagePort increase in the comparison, but this is not certification of complete cleanup of every resource.

**If memory use grows after many terminal sessions exit naturally, save your work, quit Nimbalyst normally and restart it.** Use the app's normal close action for a running terminal. Closing a panel after its process has already exited may not reclaim the retained resources.

### CPU use with large documents

Large editable documents, including Markdown, can cause elevated CPU use. With the same synthetic 2,600-item document on one host, average Main CPU was 39.72% upstream and 39.14% in this edition, where one logical core is 100%. This is not whole-PC CPU use. No substantial edition-specific worsening was observed in that comparison; maximize/restore, navigation to the end and switching to a short document worked.

The root cause and behavior across all hosts, DPI settings and input conditions remain unconfirmed. Disabling accessibility or operating-system protections is not a recommended workaround.

### Local-wiki startup context under load

Additional local-wiki context generated at session startup can be delayed or omitted under heavy load. The original targeted test passed three times per edition under a bounded CPU load. An earlier single Windows full-load timing failure in this edition remains unexplained. This is not evidence of lost data or broken normal Wiki editing.

The context deadline is cooperative; it does not forcibly interrupt stalled native I/O.

### Windows full-suite status

The Windows full suite did not finish normally. Both revisions stalled when the same Node process hosted a loopback server and sent a large HTTP body. Host-side HTML/CSP rewriting and POSIX file-mode assumptions also caused test failures. A particular security product has not been established as the cause of the stall.

Major API comparisons with the real server in a separate process passed both revisions: page creation/read/update, stale-version 409, attachment storage/readback, oversize 413, and authentication/origin/Host checks. This covers important real-use communication boundaries but does not convert the original Windows full suite into a pass.

The [fixed Linux comparison](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/42008631197) recorded 19,754 PASS / 0 FAIL / 30 SKIP for this edition and 18,533 PASS / 0 FAIL / 30 SKIP upstream. These are unit/static checks in GitHub Actions, not distribution or runtime guarantees for a Linux Japanese edition. Windows symlink-fixture EPERM occurs before the rejection behavior is exercised and is recorded separately from Linux success.

### Verified and unverified scope

Regular Windows-product checks cover fresh installation, upgrade from the previous published edition, Portable startup, live Japanese/English switching and restart persistence, normal shutdown, uninstall, synthetic PGLite-to-SQLite migration, rg.exe, major Worker/native dependencies and distribution-to-source correspondence. Synthetic migration does not guarantee migration of every real profile. Back up work and project documents before updating. Downgrade compatibility is unverified.

Live collaboration servers/organizations, old/new sync-server interoperability, some paid AI-provider requests, live Claude in Chrome connections, actual OS sleep/resume, and every nonforeground-browser/trust-retry path remain unverified. Shared features require a compatible sync server.

Production sign-in was not newly repeated on the final distributed binary. Earlier authentication observations, localhost callback/encrypted-storage policy and regression tests are distinct evidence. Google sign-in, exceptional recovery, server-side session revocation and cross-user NTFS effective access are not comprehensively verified.

Resources contain 27 namespaces and 15,321 keys per language, with zero key, empty-Japanese or interpolation differences. This does not establish coverage of every screen, dynamic reference, DPI setting or external screen reader. User documents, model names and external responses are not automatically translated.

Windows distributions are unsigned. Running alongside the official edition is unsupported. This edition uses a separate application ID/profile, disables official automatic/manual update checks and is updated manually from this repository's Releases. Do not disable protections; read the [Windows guide](WINDOWS_JA_UNOFFICIAL.md#english) and check distribution SHA-256 values.
