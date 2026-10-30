# Nimbalyst 日本語版（非公式） v0.82.4-ja.1

## 日本語

本家Nimbalyst v0.82.4（`031a6e6de0b7817bbdcd16e6e5e758e45dfdcdc7`）に基づくWindows x64向けの非公式日本語版です。

### 変更内容

- ファイル一覧の並べ替え、外部からのファイル受渡し、長文検索などの本家の修正を取り込みました。
- AIセッションの質問・回答の帰属、古い質問への対応、送信時の承認待ち処理に関する修正を取り込みました。
- Transcriptの画像表示・Fit・ズーム操作、Tracker・共有ページに関する変更を取り込みました。
- 本家の変更に対応する翻訳を追加し、Trackerのラベル・参照カード・日時、保存ビュー、サンドボックス表示を改善しました。
- 長文検索のハイライト位置更新とチュートリアルの画像表示を修正し、共有UIの遅延読み込みを維持しました。
- Windowsに同梱する検索実行ファイルの検査を強化し、ZIP展開に使う依存ライブラリの互換性を修正しました。

日本語・英語・Systemの表示言語、公式版と分離した設定・データ、nonce付きlocalhost認証を維持しています。ユーザー文書や外部サービスの回答は自動翻訳しません。

### ダウンロードと更新

配布物は未署名です。次の4ファイルを提供します。

- `nimbalyst-0.82.4-ja.1-windows-x64-setup.exe` — NSISインストーラー
- `nimbalyst-0.82.4-ja.1-windows-x64-portable.zip` — 展開して実行するWindows版
- `nimbalyst-0.82.4-ja.1-source.zip` — 対応ソース
- `SHA256SUMS.txt` — 配布3ファイルのSHA-256

取得したファイルをチェックサムと照合してください。SHA-256一致は電子署名ではありません。OSやセキュリティソフトの保護機能を無効にする必要はありません。

自動更新と公式版の手動更新確認は無効です。本リポジトリのGitHub Releasesから手動で更新してください。旧版のタグ・Releaseは保持しています。

### 検証範囲と制限

型検査、翻訳資源、Linuxの単体・統合試験、バンドル容量、Windows配布物とソースの対応を確認しています。Windows通常製品では起動・終了、日英切替と再起動保持、ファイル一覧・長文検索・画像表示、テスト用インストールの更新・削除を確認しました。メール認証・復元・サインアウトの確認は、認証処理が同一の製品ビルドの証拠に基づきます。

共同編集用サーバー・組織がないため、実サーバー接続、共有Typed Pageの複数クライアント編集、旧新サーバー相互運用は未実施です。共有機能には対応する同期サーバーが必要です。Bedrock実通信、新しいClaude有料セッション、実OSスリープ復帰、非前面ブラウザーやバックエンド再試行の全ライブ経路も未実施です。動的翻訳の全経路、全DPI・スクリーンリーダー、Google認証・特殊復旧、別ユーザーのNTFS実効アクセスは網羅していません。

Windowsではsymlink試験用データの作成がEPERMで失敗する範囲があります。該当するsandbox拒否試験はLinuxでは成功していますが、Windowsの拒否動作まで確認済みとはしません。本家固定版との比較試験には暗号化復旧画面の失敗1件があり、本版のLinux候補では同じ試験を含め失敗0件でした。

公式版との同時利用はサポートしていません。本版は独自のアプリID・ユーザーデータ保存先を使用し、`nimbalyst://` の既定ハンドラーを取得しません。認証メールのリンクは、アプリを起動している同じWindows PCで開いてください。

本プロジェクトはNimbalyst, Inc.の公式製品ではなく、同社による開発・サポート・承認を受けていません。MITライセンスと本家の著作権表示を保持し、第三者ライセンス・NOTICEを同梱しています。

## English

Nimbalyst — Unofficial Japanese Edition for Windows x64, based on upstream v0.82.4 (`031a6e6de0b7817bbdcd16e6e5e758e45dfdcdc7`).

### Changes

- Incorporates upstream fixes for file ordering, opening files from outside the app and long-document search.
- Incorporates fixes for question/answer attribution, stale questions and approval deferral in AI sessions.
- Includes upstream changes to Transcript image viewing, Fit and zoom, Trackers and shared pages.
- Adds translations for upstream changes and improves Tracker labels, reference cards, dates, saved views and sandbox messages.
- Fixes search-highlight position updates and tutorial images while preserving lazy loading of shared UI.
- Strengthens validation of the bundled Windows search executable and fixes compatibility in a ZIP-extraction dependency.

System, English and Japanese display settings, separate application data and nonce-protected localhost authentication are retained. User documents and external service responses are not automatically translated.

### Downloads and updates

Windows distributions are unsigned. This release provides:

- `nimbalyst-0.82.4-ja.1-windows-x64-setup.exe` — NSIS installer
- `nimbalyst-0.82.4-ja.1-windows-x64-portable.zip` — extract and run
- `nimbalyst-0.82.4-ja.1-source.zip` — corresponding source
- `SHA256SUMS.txt` — SHA-256 checksums for the three distributions

Verify downloaded files against the checksums. Matching hashes are not code signatures. Do not disable operating-system or security-software protections.

Automatic updates and official-release update checks are disabled. Update manually through this repository's GitHub Releases. Earlier tags and releases are retained.

### Verification scope and limitations

Checks cover types, translation resources, Linux unit/integration tests, bundle budgets and the relationship between Windows distributions and source. Native Windows observations cover startup/shutdown, language switching and restart persistence, file lists, long-document search, image viewing, and test-installation upgrade/removal. Email sign-in, restoration and sign-out evidence comes from a product build with the same authentication implementation.

Live collaboration servers/organizations were unavailable, so server connections, multi-client shared Typed Page editing and old/new-server interoperability were not run. Shared features require a compatible sync server. Live Bedrock requests, new paid Claude sessions, actual OS sleep/resume, and every background-browser/backend-retry path were not run. Dynamic translations, all DPI and screen-reader conditions, Google sign-in, exceptional recovery and cross-user NTFS effective access are not exhaustively verified.

Some Windows symlink fixtures cannot be created because of EPERM. The corresponding sandbox rejection tests pass on Linux; that does not establish Windows rejection behavior. The fixed upstream comparison has one encryption-recovery UI test failure; this edition's Linux candidate passes the same test and has zero test failures.

Running alongside the official application is unsupported. This edition uses a separate application ID and user-data location and does not claim the default `nimbalyst://` handler. Open authentication email links on the same Windows PC that is running the app.

This project is not affiliated with, endorsed by or supported by Nimbalyst, Inc. The upstream MIT license and copyright notices are retained, with third-party licenses and notices included.
