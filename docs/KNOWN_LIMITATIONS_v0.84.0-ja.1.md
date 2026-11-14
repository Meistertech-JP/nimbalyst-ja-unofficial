# v0.84.0-ja.1 の既知制限

本家v0.84.0はPrereleaseです。この非公式日本語版は未公開候補で、最終品質判定は未確定です。

- 長文Markdownの高CPU負荷と高負荷時のWiki文脈遅延は、解消したと判定していません。
- Windowsターミナル終了後の資源保持やiOS WKWebView待機の不安定性は、全環境での解消を保証できません。
- 実マイク録音、実音声認識API、実同期・共同編集サーバー、実組織と旧新サーバー間の相互運用は未検証です。
- Wiki公開とチームゲスト権限には対応サーバーが必要です。未対応サーバーでの動作を保証しません。
- 翻訳資源の一致は、全画面・動的参照・DPI・スクリーンリーダーの確認完了を意味しません。ユーザー文書や外部サービスの応答は自動翻訳しません。
- Windowsのsymlink fixture作成はOS権限により失敗する場合があります。fixture作成失敗は拒否処理自体の検証成功ではありません。
- 最終候補の本番メール認証・再起動復元・ログアウト、インストール・更新と成果物対応の確認は未完了です。過去版の成功を新しい製品の成功として流用しません。

Windows版は未署名です。公式版とは異なるアプリIDと設定・データを使用します。公式自動更新・更新確認は無効で、更新には対応する日本語版配布物の手動導入が必要です。

## English

Upstream v0.84.0 is a prerelease. This unofficial edition is an unpublished candidate with no final quality decision yet.

- High CPU usage with long Markdown and Wiki context delays under load are not considered resolved.
- Terminal resource retention on Windows and unstable iOS WKWebView waits are not guaranteed resolved across environments.
- Real microphone capture, speech-recognition APIs, live sync/collaboration servers, real organizations and old/new server interoperability are not verified.
- Wiki publishing and team guest permissions require a compatible server.
- Translation parity does not prove every UI, dynamic reference, DPI or screen-reader path. User documents and external responses are not automatically translated.
- Windows permissions may prevent symlink fixture creation; this does not verify the rejection behavior itself.
- Final-candidate email authentication, restart restoration, logout, installation/update and artifact/source correspondence checks remain incomplete. Earlier versions' results do not establish success for this candidate.

Windows binaries are unsigned. Application identifiers, settings and data are separate from the official edition. Official automatic updates and update checks are disabled; install matching Japanese-edition distributions manually to update.
