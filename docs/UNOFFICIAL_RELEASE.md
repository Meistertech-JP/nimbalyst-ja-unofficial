# 非公式日本語版のリリース

現行版は[v0.84.0-ja.1](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1)です。本家v0.84.0（`dc5a0ef938cf495a0667d797f871d09d0c44246f`）を基準とし、Windows x64向け未署名NSIS・Portable ZIP・対応Source ZIP・SHA256SUMS.txtを配布します。前版v0.82.8-ja.1を含む旧タグ・Releaseは保持します。公式版の署名・公開スクリプト・更新フィードは使用しません。

本家v0.84.0はGitHub上でPrereleaseです。日本語版はGitHub上の通常Release・Latestとして配布しますが、本家による安定性保証や公式認定ではありません。`v0.84.0-ja.1` はSemVer上ではプレリリース識別子を含み、GitHubの分類はその意味を変更しません。

品質判定は **GO WITH KNOWN LIMITATIONS** です。Windows全試験の108 FAILを含む[日英の既知制限](KNOWN_LIMITATIONS_v0.84.0-ja.1.md)を全試験PASSと読み替えません。

## 公開対象

製品ソース、依存関係の定義、ビルド・テスト、LICENSEと第三者通知、完成した利用者・開発者文書を含めます。Wikiの正規原稿は `docs/wiki/` で管理し、公開Wikiとは別のGitリポジトリとして同期します。

内部開発報告書、承認記録、引き継ぎ、生ログ、判定JSON、公開前原稿、個人環境の情報、認証情報は含めません。必要な検証証拠はGit管理外で保存します。既に追跡されているファイルは `.gitignore` だけでは除外できません。

## 公開前検査

1. 直前の公開タグと候補のGitツリーを比較し、追加・変更・削除をすべて分類します。
2. `node scripts/check-publication-content.mjs --ref HEAD --base v0.82.8-ja.1` を実行します。`--base` には準備中の版の直前に公開されたタグを指定します。警告は文脈を読んで分類します。成功だけで文書品質や秘密情報の不存在は保証されません。
3. 日英README、Release Notes、Windowsガイド、Wikiを読み、版・手順・リンク・検証範囲を確認します。
4. 通常の型検査・テスト・容量検査を実施し、最終コミットと製品入力を対応付けます。以前の実機結果を新しいバイナリでの再実行として扱いません。
5. ソースZIPは確定コミットから生成し、Git blob、ファイル一覧、サイズ、SHA-256、CRC、実展開結果を照合します。`--archive-list` にZIP全収録パスのUTF-8ファイルを指定し、公開対象と一致することも検査します。
6. NSIS・ポータブルZIP・ソースZIPの実ファイルからSHA-256を計算し、SHA256SUMS.txtを生成します。未署名と未検証範囲を明記します。

## 公開と照合

公開承認後、mainの祖先関係を確認してfast-forward pushを使用し、新規annotated tagと通常正式Releaseを作成します。既存タグの移動、force push、公開済み配布物の無断差し替えは行いません。

添付物はNSIS、ポータブルZIP、対応ソースZIP、チェックサムの4件です。win-unpacked、blockmap、更新用YAML、テストプロファイル、内部証拠は添付しません。

公開後は4件を別ディレクトリへ取得して全ハッシュを照合し、main・タグ・README・Release・ソースZIPの対応を確認します。Wikiは全原稿・記事本文・日英切替・Sidebar・Footer・リンクを読み戻します。

## 独立した公開条件

- 製品の動作と検証範囲が正確であること。
- 配布物が検証済みソースに対応すること。
- GitツリーとソースZIPに公開対象だけが含まれること。
- 文書が第三者向けの完成文章であること。

過去版の検証記録は対象版を明示します。現在のツリーから削除しても、過去のタグ・履歴・アーカイブから内部資料は消えません。履歴変更や配布物差し替えは別途判断します。

## English

The current [v0.84.0-ja.1 release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1) is based on upstream v0.84.0 at `dc5a0ef938cf495a0667d797f871d09d0c44246f`. It provides unsigned Windows x64 NSIS, Portable ZIP, corresponding Source ZIP and SHA256SUMS.txt. Previous v0.82.8-ja.1 and earlier assets remain available. Official release scripts and update feeds are not used.

Upstream v0.84.0 is a GitHub prerelease. This unofficial edition is distributed as a regular GitHub Release and Latest; this is not upstream certification or a stability guarantee. `v0.84.0-ja.1` still contains a SemVer prerelease identifier; GitHub classification does not change that meaning.

The assessment is **GO WITH KNOWN LIMITATIONS**. The 108 Windows full-suite failures and other [limitations](KNOWN_LIMITATIONS_v0.84.0-ja.1.md#english) are not all-pass results.

Publication checks inspect the exact outgoing Git tree, contextualize secret-like fixtures, review public guides and links, and verify release archives against Git blobs, paths, modes, CRC and physical extraction. Reusing a previously verified Windows payload requires proof that executable code, dependencies, builder configuration and bundled resources are unchanged. Documentation-only updates do not make an old source ZIP match a new tag; generate a new source ZIP from the final publication commit.

Commit through normal hooks, verify fast-forward ancestry, and retain existing tags/releases. Upload only the installer, portable ZIP, corresponding source ZIP and checksums; do not attach unpacked payloads, blockmaps, updater YAML or private evidence. After publication, independently download all four assets, compare hashes and read back main, the annotated tag, release metadata and Wiki article bodies. Public Wiki content is synchronized from `docs/wiki/` and checked separately from repository source.

Removing a file from the current tree does not erase it from historical tags or archives. Verification records must identify their version and distinguish tests, native observations and untested paths. Publication checks do not prove absence of every secret or guarantee runtime behavior.
