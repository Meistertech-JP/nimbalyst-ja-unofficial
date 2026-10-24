# v0.82.1-ja.1 リリース候補 / Release candidate

この文書は未公開候補の検証状況です。現在の公開正式版は v0.81.7-ja.3 です。この候補の配布開始を示すものではありません。公開する場合は、未署名の通常正式リリースとします。

## 日本語

Nimbalyst 日本語版（非公式）は、Nimbalyst, Inc.による開発・サポート・承認を受けた製品ではありません。本候補は本家 v0.82.1、コミット `583ae0244dae266667be579733d6c571fd74e037` を基準とします。

### v0.81.7-ja.3からの変更

- 本家のWikiベースパス指定、選択範囲のコンテキスト、ページのスクロール復元、トラッカーの所有権検査、ターミナルのライフサイクル、モバイルの確認・同期処理などの変更を取り込みました。
- 追加された画面とエラー案内の日本語を更新しました。翻訳リソースは27名前空間、英日各14,608キーです。キー数の一致は全画面の翻訳完了を意味しません。
- データベースWorkerのソース実行、アカウントと組織の関連付け試験、応答しないページエディターの離脱処理を修正しました。
- エディターとコメント入力の候補メニューに、表示言語に追従するアクセシビリティラベルを追加しました。Lexical本体の文字列やユーザーの文書内容は変更しません。
- 通常製品ビルドが開発用のCDPデバッグポートを自動的に開かないよう、パッケージ版の起動条件を修正しました。

### 検証状況

候補の検証を継続しています。全38ワークスペースの型検査、7エントリの容量制限、翻訳キー・補間の整合、対象コンポーネントおよび認証契約の単体テストが成功しています。通常製品パッケージでの本番メール認証、新規・更新インストール、アンインストール、および最終コミットのLinux／iOS検証は未完了です。過去の製品ビルドの結果を本候補の実機成功として扱いません。

### 配布・更新・制限

- Windows x64アプリとインストーラーは未署名です。SHA-256照合は発行元のコード署名に代わるものではありません。セキュリティ保護の無効化は案内しません。
- 公式版の自動更新と手動更新確認は無効です。本版の更新はGitHub Releasesから手動で行います。
- 公式Nimbalystとの同時利用はサポートしません。アプリ識別子は `jp.meistertech.nimbalyst.ja.unofficial`、既定ユーザーデータは `%APPDATA%\Nimbalyst 日本語版（非公式）` です。
- Windows版は共有の `nimbalyst://` 既定ハンドラーを取得しません。認証はインスタンス専用のnonce付きlocalhost callbackを使います。認証メールのリンクはアプリを起動した同じPCで開いてください。
- Windowsのsymlink fixture作成には既知のEPERM失敗があります。fixtureを作れなかった試験を、symlink拒否処理の成功として扱いません。
- 外部スクリーンリーダー、全画面・全DPI、動的翻訳参照の完全な実行時確認、Google認証、特殊な認証復旧経路、サービス側セッション失効は未検証です。通常ログアウトによるローカル認証削除とは区別します。

MITライセンスです。本家の著作権表示とLICENSEを保持します。同梱依存関係の条件は第三者ライセンス一覧を参照してください。

## English

Nimbalyst — Unofficial Japanese Edition is not affiliated with, endorsed by, or supported by Nimbalyst, Inc. This candidate is based on upstream v0.82.1, commit `583ae0244dae266667be579733d6c571fd74e037`.

This is an unpublished candidate verification record. The current public stable release remains v0.81.7-ja.3. If approved for publication, this candidate will be an unsigned regular stable release.

### Changes since v0.81.7-ja.3

- Incorporated upstream changes to Wiki base paths, selection context, page scroll restoration, tracker ownership checks, terminal lifecycle, and mobile confirmation and synchronization.
- Updated Japanese text for new screens and errors. Resources contain 27 namespaces and 14,608 keys per language. Matching key counts do not imply complete UI translation.
- Fixed database-worker source execution, account-to-organization binding test compatibility, and navigation away from an unresponsive page editor.
- Added language-aware accessibility labels to editor and comment completion menus. Lexical itself and user-authored document content are unchanged.
- Corrected packaged startup so ordinary product builds do not automatically enable the development CDP debugging port.

### Verification status

Candidate verification is ongoing. All 38 workspace typechecks, seven bundle budgets, translation-key and interpolation consistency checks, and focused component and authentication-contract unit tests passed. Production email authentication in the ordinary product package, clean installation, upgrade, uninstallation, and final-commit Linux/iOS validation remain incomplete. Results from earlier product builds are not treated as native acceptance of this candidate.

### Distribution, updates, and limitations

- The Windows x64 application and installer are unsigned. SHA-256 verification is not a substitute for publisher code signing. Disabling security protection is not recommended.
- Official automatic updates and manual update checks are disabled. Updates to this edition are installed manually from GitHub Releases.
- Running this edition alongside official Nimbalyst is unsupported. Its application ID is `jp.meistertech.nimbalyst.ja.unofficial`; default user data is stored in `%APPDATA%\Nimbalyst 日本語版（非公式）`.
- The Windows edition does not claim the shared `nimbalyst://` default handler. Authentication uses an instance-owned nonce-protected localhost callback. Open the authentication email link on the same PC running the application.
- Known Windows symlink fixture creation failures return EPERM. Tests unable to create their fixtures do not demonstrate successful symlink rejection.
- External screen readers, every screen and DPI, complete runtime coverage of dynamic translations, Google authentication, special recovery paths, and server-side session invalidation are unverified. Server-side invalidation is distinct from deleting local authentication state during ordinary logout.

MIT-licensed. The upstream copyright notices and LICENSE are retained. Consult the bundled third-party license inventory for dependency terms.
