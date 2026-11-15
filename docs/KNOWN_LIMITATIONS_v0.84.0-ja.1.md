# v0.84.0-ja.1 の既知制限

[English](#english)

本家v0.84.0はGitHub上でPrereleaseです。日本語版はGitHub上の通常Release・Latestとして配布しますが、本家による安定性保証や公式認定ではありません。`v0.84.0-ja.1` はSemVer上ではプレリリース識別子を含み、GitHubの分類はその意味を変更しません。

品質判定は **GO WITH KNOWN LIMITATIONS** です。未検証事項を確認済みの不具合・脆弱性と読み替えず、以下の範囲と制限を確認してください。

## Windows全Vitest

製品検証基準は `29fdcc216f354cd1031dc9ef36672a5399bd6775`（製品入力 `a7f82db90`、差は単体試験1ファイル）です。Windows全Vitestは20,182 PASS／108 FAIL／37 SKIP、exit 1で完走しました。108件は継続未解決です。R22にも同じパス・テスト名の失敗が99件ありますが、同名は原因同一・無害の証明ではなく、全108件を新規の重大回帰とも全環境依存とも断定しません。39 workspace型検査と7容量上限はPASS。Linuxの20,296 PASS／0 FAIL／31 SKIP、Android Build SUCCESS（署名job SKIP）、iOS 522 PASS／0 FAIL／6 SKIPはWindows全成功とは別の結果です。

## プロファイル隔離とデータ

Windowsのsymlink fixture作成EPERMと、実Electronで別途確認したjunction/hardlink境界拒否probeは異なる検証です。後者の成功で、前者の未到達試験や全symlink競合を検証済みとはしません。

明示的な隔離プロファイルの保存先整合、境界違反時のexit 1、別起動・app.relaunch後の設定Store/DB保存先を専用環境で確認しました。全シンボリックリンク競合、OS状態、同時利用条件での完全な安全保証ではありません。公式版との同時起動はサポートしません。公式版とは別のアプリID・既定保存先を使用します。

## 認証

最終Windows製品07dの通常win-unpackedと専用プロファイルで、本番メール認証、暗号化認証ファイルの生成、正常終了・再起動後の復元、通常サインアウト、認証ファイル削除、次回起動後の未認証保持を確認しました。NSIS専用プロファイル・別Portableでの新規認証、Google認証、サービス側セッション失効、特殊復旧は未確認です。Node資格情報ファイル試験とは別のElectronアカウント認証の観測です。

認証メールは起動中の同じWindows PCで開いてください。認証URLやトークンを共有しないでください。ローカル認証状態の削除とサーバー側セッション失効は別です。

## 更新と通常製品

通常Windows製品07dのwin-unpacked・完全展開Portable・NSISで起動、日英切替、正常終了と再起動後の言語保持を確認しました。NSIS新規導入、前版v0.82.8-ja.1からのNSIS/Portable更新では、専用環境の設定・合成文書hash・Tracker表示の保持を確認しました。全実ユーザーデータ・全DBフィールドの移行保証ではありません。NSISの通常アンインストール後も専用ユーザーデータを保持しました。Start Menu登録は隔離した環境での限定確認です。旧版へのダウングレードは未検証です。

未署名Windows配布で、公式自動更新・手動更新確認は無効です。日本語版Releaseから手動更新します。Portable ZIPは全ファイルを展開し、既定ではEXEの隣ではなく本版専用ユーザーデータを使います。SHA-256一致はバイト一致であり、電子署名・真正性・無害性の保証ではありません。

## 表示・性能・接続

長文Markdownの高CPU負荷は未解決です。高負荷Wiki文脈処理、Windows端末資源残留の一般的解消、動的翻訳全経路、全DPI・外部スクリーンリーダー条件は確認していません。Windows symlink fixture作成EPERMは拒否処理そのものの未検証範囲を残します。実マイク・実音声認識API、実同期・共同編集サーバー、実組織、旧新サーバー間相互運用は未検証です。Wiki公開・チーム権限等には対応サーバーが必要です。これらの未確認事項を確認済みの不具合・脆弱性と同一視しないでください。

共有翻訳資源は27名前空間、英語・日本語各15,557キー、キー差・補間差0です。単一スペース1件は英日共通の書式区切りです。489動的呼出し候補と211 namespace scope未確定は欠落訳・不具合の件数ではありません。全画面・全動的経路・全アクセシビリティ表示の翻訳保証ではなく、一部音声ボタンには英語ラベルが残ります。ユーザー文書やAIの回答・外部応答を自動翻訳しません。

## English

Upstream v0.84.0 is a GitHub prerelease. This unofficial edition is distributed as a regular GitHub Release and Latest; this is not upstream certification or a stability guarantee. `v0.84.0-ja.1` still contains a SemVer prerelease identifier; GitHub classification does not change that meaning.

The quality assessment is **GO WITH KNOWN LIMITATIONS**. Unverified areas are not confirmed defects or vulnerabilities.

### Windows full Vitest

The product-verification baseline is `29fdcc216f354cd1031dc9ef36672a5399bd6775` (product input `a7f82db90`, differing by one unit-test file). The Windows full Vitest run completed with 20,182 PASS / 108 FAIL / 37 SKIP and exit 1. All 108 remain unresolved. R22 has failures with the same path and test name for 99 cases, but names do not establish identical causes or harmlessness; neither all-new major regressions nor all-environment-only failures are established. All 39 workspace typechecks and seven existing size limits passed. Linux’s 20,296 PASS / 0 FAIL / 31 SKIP, Android Build SUCCESS (signed job skipped) and iOS 522 PASS / 0 FAIL / 6 SKIP are separate from Windows full-suite success.

### Profile isolation and data

Windows symlink-fixture creation EPERM is separate from the junction/hardlink boundary-rejection probes observed with real Electron. Those probes do not complete the blocked fixture tests or establish coverage of every symlink race.

Explicit isolated profiles were checked for consistent settings/database paths, exit 1 on boundary violations, separate launches and app.relaunch in dedicated environments. This is not a complete guarantee for all symlink races, OS states or concurrent use. Running alongside the official edition remains unsupported. Application identity and default profile are separate.

### Authentication

Production email sign-in, encrypted credential-file creation, normal shutdown and restoration after restart, normal sign-out, credential-file removal and unauthenticated state after another restart were observed with the regular final Windows 07d win-unpacked product and a dedicated profile. New sign-in with the dedicated NSIS profile or a separate Portable profile, Google sign-in, service-side session revocation and special recovery remain unverified. These are Electron account observations, separate from Node credential-file tests.

Open authentication email on the same Windows PC running the application. Do not share links or tokens. Clearing local state does not establish server-side revocation.

### Updates and regular products

Startup, Japanese/English switching, normal shutdown and language retention after restart were observed with final Windows 07d win-unpacked, fully extracted Portable and NSIS products. Fresh NSIS installation and NSIS/Portable upgrades from v0.82.8-ja.1 retained settings, synthetic-document hashes and displayed Tracker data in dedicated environments. This does not guarantee migration of every real profile or database field. Normal NSIS uninstallation retained dedicated user data; Start Menu registration checks were limited to the isolated environment. Downgrades are unverified.

Windows distributions are unsigned; official automatic updates and manual update checks are disabled. Update manually from this edition’s Release. Extract every Portable ZIP file; its default user data is the edition-specific profile, not necessarily beside the EXE. SHA-256 establishes byte equality, not a signature, authenticity or safety guarantee.

### Display, performance and integrations

High CPU use with long Markdown remains unresolved. Wiki context under load, general resolution of Windows terminal resource retention, all dynamic translations, DPI settings and external screen readers are not comprehensively verified. Windows symlink fixture EPERM leaves rejection behavior untested on that host. Real microphones, speech-recognition APIs, live sync/collaboration servers, real organizations and old/new server interoperability are unverified. Wiki publishing and team permissions require a compatible server. Unverified areas are not equivalent to confirmed defects or vulnerabilities.

Shared resources contain 27 namespaces and 15,557 keys per language, with zero key or interpolation differences. One single-space value is an intentional shared formatting separator. The 489 dynamic-call candidates and 211 unresolved namespace scopes are not counts of missing translations or defects. This is not complete UI, dynamic-path or accessibility coverage; some dictation buttons still have English labels. User documents, AI answers and external responses are not automatically translated.
