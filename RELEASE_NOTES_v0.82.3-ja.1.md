# v0.82.3-ja.1 / Windows x64

## 日本語

Nimbalyst 日本語版（非公式）の次期配布候補です。本家v0.82.3、固定コミット `84dcc00f3cd0abbb36eafc6bfad9389f960076db` を基準とします。現在公開されている正式版はv0.82.1-ja.1で、本候補はまだ公開していません。本プロジェクトはNimbalyst, Inc.による開発・サポート・承認を受けた製品ではありません。

### v0.82.1-ja.1からの変更

- 本家の17コミット・144ファイルの変更を履歴ごと統合しました。組織復旧、Codexの変更帰属、セッション管理、Wiki、画像貼り付け、Transcript表示、開発サーバーの復旧などの変更を含みます。
- 設定の「セキュリティと暗号化」に、旧暗号化方式のチーム組織を元のチケット識別子・番号を保持して復旧する案内を追加しました。復旧の停止理由、診断情報の書き出し、暗号化された持ち運び用ソースの操作も日本語表示へ接続しています。
- 復旧前に待機していた編集が、復旧後の内容を意図せず上書きしないためのTracker競合通知を追加しました。
- Codexの並行実行で変更元を確定できない場合の案内と、貼り付け画像の既定ラベルを日本語化しました。ユーザーの文書・ファイル名や外部サービスの応答を自動翻訳するものではありません。
- 本家の自動CPUプロファイル保持制限を取り込み、Windowsでの同時整理時の扱いを補強しました。ログのファイル保存設定は維持しています。
- Windowsの数値版番号を0.82.3.1へ合わせ、製品版番号との不一致をパッケージ生成前に検出します。

### データと組織復旧

SQLiteの0055は、待機中のTracker編集へ同期基準リビジョンを保持する列を追加します。PGLiteにも対応する変更があります。合成テストデータで旧スキーマからの更新、既存行の保持、途中失敗のロールバック・再試行、PGLiteからSQLiteへの変換と再起動後の保持を確認しています。

**組織復旧には更新された同期サーバーが必要です。** 復旧対象を編集する他のクライアントにも対応版が必要です。本番組織を使った復旧、独立した実クライアント間の全手順、サーバー側の対応状況は確認していません。ローカルのテスト成功をサーバーを含む復旧成功とは扱いません。

### 表示言語と検証範囲

現在のWindows製品ソースは `7d5407c51` です。通常製品で画像コピー・貼り付け・Undo／Redo、本番メール認証・再起動復元・ログアウト後の未認証保持、両言語の再起動後保持、新規NSIS導入・起動・削除を確認しました。公開v0.82.1-ja.1からの更新でも英語設定・日英文書・Tracker項目とmigration55を確認し、削除後の専用データ274ファイルは不変でした。修正を含む `f0c7b7929` のLinuxは19,285 PASS／30 SKIP／0 FAIL、iOSは522 PASS／6 SKIP／0 FAILでした。最終ソースZIPの確定は継続中です。以下は先行候補の履歴です。

表示言語はSystem、English、日本語から選択します。エージェントの回答言語とは独立しています。翻訳リソースは27名前空間・英日各14,794キーで、キー・補間変数の差分と空の日本語訳を検査しています。キー数の一致は全画面の翻訳完了を意味しません。

最新製品ソース057883f8bで38ワークスペースの型検査、既存7エントリの容量上限、関連135テストが成功しています。同ソースの通常ZIPでTrackerの列名・操作案内・同期状態の日英切替と両言語再起動保持、全1,913ファイルの照合・CRC・ASAR監査を確認しました。英語完了時刻、日本語の展開ヘルプ、文書画像の新規貼り付け・Undo／Redoは先行49e52c53fで確認しています。最新製品ソースを含むeabb8c5d6のLinux CIは19,284 PASS／0 FAIL／30 SKIP、Test Filesは2,339 PASS／7 SKIP／0 FAILでした。

先行iOS性能試験の失敗原因を修正し、eabb8c5d6のシミュレーター試験は528実行（522 PASS／6 SKIP／0 FAIL）でした。実refresh SQLを検査する回帰と既存6倍性能条件を通過し、閾値は緩和していません。先行候補の認証・インストール・更新検証には適用範囲を明示し、新しいバイナリの実行成功と混同しません。最終ソースと配布候補の確定は継続中です。

Windowsではsymlink fixture作成のEPERMが残っています。fixture作成で停止した試験は、symlinkの拒否・保持動作そのものを検証できていません。全Windows試験の成功は主張しません。外部スクリーンリーダー、全画面・DPI、動的翻訳の完全な実行時確認、WSL実環境での全経路、Google認証や特殊な復旧、サービス側セッション失効は未検証です。

### 配布方針

Windows x64の未署名NSIS、ポータブルZIP、対応するソースZIPとSHA256SUMS.txtを配布対象とします。正式公開時は通常正式リリースとする方針ですが、現時点で本候補のダウンロードは提供していません。

公式版の自動更新と手動更新確認は無効です。本版の更新はこのリポジトリのGitHub Releasesから手動で行います。公式Nimbalystとの同時利用はサポートしません。アプリID `jp.meistertech.nimbalyst.ja.unofficial`、既定ユーザーデータ `%APPDATA%\Nimbalyst 日本語版（非公式）`、既定の `nimbalyst://` ハンドラーを取得しない方針を維持します。認証メールはアプリを起動した同じPCで開いてください。

未署名アプリに対する警告や保護を無効にせず、取得元・版番号・SHA-256を確認してください。ハッシュの一致はコード署名・無害性・動作保証を意味しません。MIT Licenseと本家の著作権表示を保持し、第三者ライセンス・通知を同梱します。

## English

This is the next Windows x64 distribution candidate for Nimbalyst — Unofficial Japanese Edition, based on upstream v0.82.3 at `84dcc00f3cd0abbb36eafc6bfad9389f960076db`. The currently published stable release remains v0.82.1-ja.1. This candidate has not been released. The project is not affiliated with, endorsed by, or supported by Nimbalyst, Inc.

### Changes since v0.82.1-ja.1

- Integrated the complete upstream history of 17 commits affecting 144 files, including organization recovery, Codex file attribution, sessions, Wiki, image paste, transcript rendering, and development-server recovery.
- Added Japanese guidance to legacy-encryption organization recovery in Security & Encryption, including blocking conditions, diagnostics export, and encrypted portable source bundles. Recovery is designed to retain ticket identities and numbers.
- Added Tracker notices for queued edits that require review after organization recovery rather than overwriting restored content.
- Localized uncertain Codex ownership explanations and the default pasted-image label. User documents, filenames, and external service responses are not automatically translated.
- Incorporated bounded automatic CPU-profile retention and improved handling of concurrent Windows cleanup while retaining diagnostic-file logging preferences.
- Aligned the numeric Windows build version to 0.82.3.1 and added a pre-packaging check for product-version mismatches.

### Data and organization recovery

SQLite migration 0055 adds the base synchronization revision to queued Tracker edits, with a corresponding PGLite change. Synthetic-data tests cover populated-schema upgrade, existing-row preservation, transaction rollback and retry, PGLite-to-SQLite conversion, and retention after reopening.

**Organization recovery requires the updated sync server.** Other clients editing recovered content must also be updated. Recovery of a production organization, the complete flow across independent real clients, and server deployment compatibility have not been verified. Local tests do not establish end-to-end recovery success.

### Language and verification scope

Current Windows product source is `7d5407c51`. Ordinary products passed image copy/paste, Undo/Redo, production email sign-in, account restoration, signed-out persistence, restarts in both languages, and fresh NSIS installation/launch/removal. Upgrade from published v0.82.1-ja.1 retained English, a Japanese/English document and a Tracker item, and applied migration 55. Removal retained all 274 dedicated data-file hashes. Checkpoint `f0c7b7929` passed Linux with 19,285 passed / 30 skipped / zero failed and iOS with 522 passed / six skipped / zero failed. Final source-ZIP verification is in progress. Earlier results below are historical.

Display-language options remain System, English, and Japanese, independent of the agent response language. Resources contain 27 namespaces and 14,794 keys per language. Key parity, interpolation consistency, and empty Japanese values are checked; equal key counts do not establish complete UI translation.

Latest product source 057883f8b passed all 38 workspace typechecks, seven existing bundle budgets, and 135 related tests. Its ordinary ZIP was checked for bilingual tracker column/action/sync-state display, persistence after restart in both languages, all 1,913 file hashes, CRC, and ASAR integrity. English completion times, Japanese expanded help, and fresh document image paste with Undo/Redo were checked on earlier 49e52c53f. Linux CI at eabb8c5d6 includes the latest product source and passed 19,284 tests with zero failures and 30 skips; Test Files were 2,339 passed / seven skipped / zero failed.

The cause of the preceding iOS performance-test failure was corrected. Simulator CI at eabb8c5d6 executed 528 tests: 522 passed / six skipped / zero failed. The actual-refresh SQL regression and existing six-times performance threshold passed without relaxing the threshold. Authentication, installation, and upgrade results from earlier candidates have a separately stated scope; they are not claimed as new-binary executions. The final source and distribution candidate remain under validation.

Windows symlink-fixture EPERM failures remain. A test stopped during fixture creation does not verify symlink rejection or retention. No all-Windows-tests-passed claim is made. External screen readers, every screen and DPI, complete runtime coverage of dynamic translations, all native WSL paths, Google sign-in, special recovery flows, and service-side session revocation remain unverified.

### Distribution policy

The intended assets are an unsigned Windows x64 NSIS installer, portable ZIP, matching source ZIP, and SHA256SUMS.txt. The intended publication is a regular stable release, but this candidate is not currently offered for download.

Official automatic updates and manual update checks are disabled; updates are installed manually from this repository's GitHub Releases. Running alongside official Nimbalyst is unsupported. The application ID remains `jp.meistertech.nimbalyst.ja.unofficial`, the default profile remains `%APPDATA%\Nimbalyst 日本語版（非公式）`, and the Windows edition does not claim the default `nimbalyst://` handler. Open authentication email on the same PC running the application.

Do not disable security warnings or protections for unsigned files. Verify the source, version, and SHA-256; a matching hash is not publisher signing, a safety guarantee, or an operational guarantee. The MIT License and upstream copyright are retained, with third-party licenses and notices included.
