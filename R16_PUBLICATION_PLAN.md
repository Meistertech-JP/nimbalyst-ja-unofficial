# R16 正式公開の適用手順（未実行）

対象版は未署名Windows x64の通常正式版 `v0.82.3-ja.1`。本手順は公開承認ではない。現在の状態は認定途中であり、main・タグ・Release・公開Wikiへ変更を加えていない。

## 現在確定した参照

- 固定upstream: `84dcc00f3cd0abbb36eafc6bfad9389f960076db`。
- R15基点: `4198cb720bda3318f58b38e0b22e0dd9ccefbfbe`。旧R15ブランチ・保全166件を維持する。
- 修正済みWindows製品ソース: `1c1d54a851c340a8f0f9afc304379882a7319fa1`。
- 現在の開発ブランチ: `codex/r16-release-qualification-0823`、リモート取得済みHEAD `07eac5ae2f00c3a22ff15bbcaf05c74c80f29f37`。
- 読み戻した公開main: `b0432ce85977040461bf026aff063059bf6ffd1e`。現在の開発HEADの祖先であり、現時点の履歴関係はfast-forward可能。
- 旧正式タグ `v0.82.1-ja.1` のannotated tag object: `2548c7f85fae0c88243a71ea63021090225be16a`。公開時に旧タグ全体とRelease情報も再取得し、不変性を確認する。

## 認定完了までの残工程

1. 新ZIP製品のEnglish表示/再起動保持、System解決日本語の表示/再起動保持、正常終了を確認済み。明示ja値のnative保持と補助失敗カードnative表示は未検証として残し、DOM試験・ASAR検査と混同しない。変更影響・既存証拠による限定リスク判断は最終報告へ記載する。
2. HEAD07eac5ae2のLinux/iOS成功ログ・artifactを保全する。LinuxはFiles2,340 PASS／7 SKIP／0 FAIL、Tests19,296 PASS／30 SKIP／0 FAIL、iOSは522 PASS／6 SKIP／0 FAILを原ログで確認済み。後続文書コミットとの製品入力同一性を別途証明する。
3. 日英README・Release Notes・31ファイルのWiki原稿と全認定資料を最終レビューする。文書が引用する製品・CIコミットの対象範囲を区別する。
4. 通常フックを有効にして、明示的なファイル指定でR16文書の最終コミットを作る。`git commit --no-verify`、amend、履歴破壊は行わない。
5. 通常pushを実行する。既知3件だけで止まる場合も、07eac5ae2向けの一回限りの例外は再使用しない。必要な追加承認を得るまでpushしない。最終ソースがリモートから復元可能になる前にREADYにしない。
6. 最終コミット・tree・製品入力を再照合し、そのコミット由来のソースZIPを生成する。Git blob、CRC、全ファイルのサイズ/SHA-256、実展開、欠落・余剰なしを確認する。
7. NSIS・Portable ZIP・ソースZIP・SHA256SUMSと検証証拠を独立保全し、全件再ハッシュする。R14/R15保全物は変更しない。

## 別途正式公開を承認された後の順序

1. remote main・旧全タグ・旧Releaseを再取得し、認定時の参照と一致することを確認する。変化していれば自動統合・forceをせず停止する。
2. `docs/release-qualified/v0.82.3-ja.1/README.md` と `README.en.md` を公開用root READMEへ反映し、Release Notesを確定する。Wiki31件は別リポジトリ向け差分として扱う。
3. README適用によってGit treeが変わる場合は、通常コミット後に新たな最終ソースZIPを作り直す。前段のソースZIPを新コミット由来と称して使わない。製品入力が同一ならバイナリ再利用の範囲を明示して照合する。
4. 最終タグ対象コミットを確定し、公開main旧SHAがその祖先であることを確認する。通常fast-forward更新だけを実施する。未承認のフック迂回は行わない。
5. 確定コミットへannotated `v0.82.3-ja.1` を作成・公開する。旧タグを変更しない。
6. GitHub Releaseを `prerelease=false`、`draft=false`、latest指定の通常正式版として作る。日英Release Notes、未署名の注意、実施範囲と未検証事項を保持する。
7. 検証済みNSIS、Portable ZIP、同じタグ対象コミットのソースZIP、SHA256SUMS.txtだけを添付する。blockmap・win-unpacked・テストプロファイル・認証情報・内部rawログは添付しない。
8. 事前確認したWiki31件の変更を反映し、両言語・Sidebar/Footer・相互リンク・バージョン・ダウンロード導線を読み戻す。
9. GitHubからmain・新旧タグ・Release metadata・全添付物を再取得し、参照先、署名状態の表示、SHA-256、ソースZIPの全ファイル対応を独立確認する。root READMEとWikiのリンクを実際に開いて確認する。

## 未署名・制限の扱い

未署名は配布仕様であり、Windows保護を無効にしない。公式更新は無効、手動更新のみ。組織の作成・本番復旧は行わず、組織復旧の本番フォーム/サーバーE2Eは未検証として掲載する。Windows fixture EPERM3件は未通過のまま記録し、Linuxの成功でWindowsの拒否動作までPASSとしない。

現時点では正式タグ対象SHA・最終ソースZIP・独立保全sealが未確定であり、この手順は実行可能な最終公開承認書ではない。これらを確定後に報告を更新する。
