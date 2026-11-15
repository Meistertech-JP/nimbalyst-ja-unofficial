# Nimbalyst 日本語版（非公式） v0.84.0-ja.1

Windows x64向けの未署名通常Releaseです。[配布物](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1)はSetup EXE、Portable ZIP、対応Source ZIPとSHA256SUMS.txtです。本版はNimbalyst, Inc.の公式製品ではありません。

本家v0.84.0はGitHub上でPrereleaseです。日本語版はGitHub上の通常Release・Latestとして配布しますが、本家による安定性保証や公式認定ではありません。`v0.84.0-ja.1` はSemVer上ではプレリリース識別子を含み、GitHubの分類はその意味を変更しません。

## 本家由来の変更と日本語版

本家v0.82.8以降のv0.83.0・v0.84.0を取り込みました。Claude Fable 5.2選択、キューの一括配送、Gitパネルのブランチ切替、Workstreams、フォルダー単位のコミット提案、Markdownネストリスト保存、ファイルツリー省略件数表示、Wiki公開、SQLiteバックアップ・ツール出力保持処理などを含みます。日本語版では新しいUIの翻訳、明示的な隔離プロファイルの保存先境界、Windowsのファイル・パス処理を修正しました。統合した機能すべての実接続を確認したわけではありません。

日本語・英語・Systemの切替、公式版とは別のアプリID・設定・データ、nonce付きlocalhost認証、公式更新無効化と手動更新を維持します。明示的な隔離プロファイルではCLI引数と保存先の整合、再起動・二重起動と設定/DB境界の拒否処理を修正しました。全OS状態・link競合・同時利用の完全な安全保証ではなく、公式版との同時起動はサポート対象外です。

## 検証範囲

通常Windows製品07dのwin-unpacked・完全展開Portable・NSISで起動、日英切替、正常終了と再起動後の言語保持を確認しました。NSIS新規導入、前版v0.82.8-ja.1からのNSIS/Portable更新では、専用環境の設定・合成文書hash・Tracker表示の保持を確認しました。全実ユーザーデータ・全DBフィールドの移行保証ではありません。NSISの通常アンインストール後も専用ユーザーデータを保持しました。Start Menu登録は隔離した環境での限定確認です。旧版へのダウングレードは未検証です。

最終Windows製品07dの通常win-unpackedと専用プロファイルで、本番メール認証、暗号化認証ファイルの生成、正常終了・再起動後の復元、通常サインアウト、認証ファイル削除、次回起動後の未認証保持を確認しました。NSIS専用プロファイル・別Portableでの新規認証、Google認証、サービス側セッション失効、特殊復旧は未確認です。Node資格情報ファイル試験とは別のElectronアカウント認証の観測です。

製品検証基準は `29fdcc216f354cd1031dc9ef36672a5399bd6775`（製品入力 `a7f82db90`、差は単体試験1ファイル）です。Windows全Vitestは20,182 PASS／108 FAIL／37 SKIP、exit 1で完走しました。108件は継続未解決です。R22にも同じパス・テスト名の失敗が99件ありますが、同名は原因同一・無害の証明ではなく、全108件を新規の重大回帰とも全環境依存とも断定しません。39 workspace型検査と7容量上限はPASS。Linuxの20,296 PASS／0 FAIL／31 SKIP、Android Build SUCCESS（署名job SKIP）、iOS 522 PASS／0 FAIL／6 SKIPはWindows全成功とは別の結果です。

Windowsバイナリは検証済み07dを製品入力不変の確認に基づいて再利用し、公開文書を確定した最終タグからSource ZIPを生成しています。文書更新後にWindowsを再ビルドしたものではありません。最終公開ソースのCI Run IDと配布物SHA-256は[Release本文](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1)を参照してください。

## 既知制限・導入

長文Markdownの高CPU負荷は未解決です。高負荷Wiki文脈処理、Windows端末資源残留の一般的解消、動的翻訳全経路、全DPI・外部スクリーンリーダー条件は確認していません。Windows symlink fixture作成EPERMは拒否処理そのものの未検証範囲を残します。実マイク・実音声認識API、実同期・共同編集サーバー、実組織、旧新サーバー間相互運用は未検証です。Wiki公開・チーム権限等には対応サーバーが必要です。これらの未確認事項を確認済みの不具合・脆弱性と同一視しないでください。

共有翻訳資源は27名前空間、英語・日本語各15,557キー、キー差・補間差0です。単一スペース1件は英日共通の書式区切りです。489動的呼出し候補と211 namespace scope未確定は欠落訳・不具合の件数ではありません。全画面・全動的経路・全アクセシビリティ表示の翻訳保証ではなく、一部音声ボタンには英語ラベルが残ります。ユーザー文書やAIの回答・外部応答を自動翻訳しません。

品質判定は **GO WITH KNOWN LIMITATIONS** です。[既知制限](docs/KNOWN_LIMITATIONS_v0.84.0-ja.1.md)と[Windows導入・更新](docs/WINDOWS_JA_UNOFFICIAL.md)を確認してください。更新は手動です。ZIPはEXEだけでなく全同梱ファイルを展開します。未署名ファイルのSHA-256一致は電子署名や安全性保証ではありません。MIT Licenseおよび同梱第三者LICENSE/NOTICEを保持しています。

[English](RELEASE_NOTES_v0.84.0-ja.1.en.md)
