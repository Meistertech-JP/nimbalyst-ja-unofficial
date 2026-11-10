# Nimbalyst 日本語版（非公式） v0.82.8-ja.1

本家Nimbalyst v0.82.8を基準にしたWindows x64向け非公式日本語版です。本家由来の変更と、日本語版での実行確認範囲は区別して記載しています。

## 本家v0.82.8から取り込んだ変更

- 複数プロジェクト・ウィンドウ、Project Rail、プロジェクト移動やworktreeリンクの処理を更新しました。
- ファイルの再オープン、検索表示、添付ファイル、ウィンドウ間の受け渡しを含むファイル操作を更新しました。
- AIセッション、質問・承認カード、通知、履歴、Codex・Claude Code連携に関する変更を取り込みました。
- Transcript内画像の表示操作を更新しました。
- SQLiteの移行・保守、ターミナル資源管理、IPC・preload、Windows向け処理を更新しました。
- Trackerおよび共有ページ関連のコードを更新しました。
- macOS向けの任意の`nimbalyst`ターミナルコマンドとDictation（音声入力）のコード・UIを取り込みました。macOS固有機能はWindowsでの提供を意味しません。

上記はソース変更の概要であり、列挙した全経路の実機動作を保証するものではありません。

## 日本語版の変更

- v0.82.8で追加・変更されたユーザー向け文字列に日本語表示を追加しました。
- 表示言語の日本語・英語・System切替、Electronネイティブメニュー、日本語版固有のアプリIDとデータ保存先を維持しています。
- 公式版の自動更新・更新確認を無効にし、手動更新方式を維持しています。
- 本家v0.82.8に含まれるDictationのUI文字列を翻訳しています。音声入力の機能動作は未検証です。

## 検証範囲

全ワークスペース型検査、翻訳資源の整合性、関連する通常UI・ファイル・セッション処理のテストを実施しています。英語・日本語は27名前空間・各15,401キーで、キー差、空の日本語値、補間変数差はありません。静的整合性は全画面・全動的参照経路の実表示確認を意味しません。

音声入力の機能動作は未検証です。マイク録音、音声認識、文字起こしAPIとの連携、実機での一連の利用フローは確認していません。実際の共同編集・同期サーバー、実組織、サーバー間互換性のテストも実施していません。Windows全体テストや高負荷時のすべての条件を網羅したものではありません。詳細は[既知制限](docs/KNOWN_LIMITATIONS_v0.82.8-ja.1.md)を参照してください。

## 配布と注意事項

Windows x64向けNSISインストーラーとPortable ZIPは未署名です。対応するソースZIPとチェックサムも提供します。更新は手動で行ってください。過去の[v0.82.7-ja.1](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1)も保持しています。

本プロジェクトはNimbalyst, Inc.の公式製品ではありません。MITライセンスおよび第三者ソフトウェアのライセンス・NOTICEを保持しています。

---

# Nimbalyst — Unofficial Japanese Edition v0.82.8-ja.1

This is a Windows x64 unofficial Japanese-language edition based on upstream Nimbalyst v0.82.8. Upstream changes are distinguished from behavior exercised in this edition.

## Changes incorporated from upstream v0.82.8

- Updated multi-project and multi-window behavior, Project Rail, project moves and worktree-link handling.
- Updated file operations, including reopening, search display, attachments and transfers between windows.
- Incorporated changes to AI sessions, question and approval cards, notifications, history, and Codex/Claude Code integrations.
- Updated image viewing controls in transcripts.
- Updated SQLite migration and maintenance, terminal resource management, IPC/preload, and Windows-specific paths.
- Incorporated Tracker and shared-page changes.
- Incorporated the optional macOS `nimbalyst` terminal command and Dictation (voice input) code and UI. macOS-specific features are not a claim of Windows support.

These are summaries of source changes, not guarantees that every listed path was exercised in a packaged build.

## Japanese-edition changes

- Added Japanese display for user-facing strings introduced or changed in v0.82.8.
- Retained Japanese, English and System language selection, Electron native menus, and the edition-specific application ID and data directory.
- Retained disabled official automatic updates and update checks, with manual updates.
- Dictation UI strings are localized. Voice-input behavior has not been validated.

## Verification scope

Source checks include workspace typechecking, translation-resource consistency and relevant ordinary UI, file and session tests. The English and Japanese resources contain 15,401 keys in each of 27 namespaces, with no key, empty-Japanese-value or interpolation differences. Static consistency does not mean every screen or dynamic reference path was visually verified.

Voice-input behavior has not been validated. Microphone capture, speech recognition, transcription API integration, and the end-to-end user flow have not been verified. Live collaboration/sync servers, real organizations and server interoperability were also not tested. This does not cover every Windows full-suite or high-load condition. See the [known limitations](docs/KNOWN_LIMITATIONS_v0.82.8-ja.1.md#english).

## Distribution and notice

The Windows x64 NSIS installer and portable ZIP are unsigned. A corresponding source ZIP and checksums are also provided. Updates are manual. The earlier [v0.82.7-ja.1](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1) release remains available.

This project is not an official Nimbalyst, Inc. product. The MIT license and third-party license and NOTICE materials are retained.
