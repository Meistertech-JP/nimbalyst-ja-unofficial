# R16 チーム組織復旧の認定範囲

固定upstreamは `84dcc00f3cd0abbb36eafc6bfad9389f960076db`。復旧実装の評価対象はR15確定ソース4198cb720で、R16のCodex修正は復旧コード・権限条件・IPC契約を変更していない。

## 実施していないこと

実組織・ダミー組織の作成、実サービスへの組織登録、新規メンバー追加、本番の復旧操作は行っていない。所有者が組織を持たないことをREADY阻害条件にしない。実組織を用いたフォーム表示・復旧開始、実サーバー上の状態遷移、独立実クライアントの読戻し、チームデータ完全性と復旧後同期は未検証であり、PASSへ計上しない。

## ソース監査

- `TeamRecoverySection.tsx` は組織切替時に世代を進めて旧応答を無効化し、orgId不一致の応答を適用前に拒否、旧組織のMainメモリをreleaseする。復旧開始には準備完了・保存bundle・明示レビュー・passphraseを要求する。
- `TeamRecoveryService.ts` は認証と明示org IDを要求し、org/memberに結びついたclientとorg-scoped JWTを使う。Main登録・Preload・型宣言の接続は保持されている。403等は失敗として返す。
- `TeamRecoveryClient.ts` は診断org/status/key probeを検証し、custody不明・非legacy・未レビュー・未保存・読戻し不一致で完了にしない。restore後も独立検証までvalidatingに留める。
- `TeamRecoveryBundle.ts` はorg一致、orgをAADへ結合したAEAD、passphraseと形式を検証し、排他的作成と書戻し確認を行う。診断exportは明示的な公開対象だけで、秘密鍵を含めない。release/sign-out/completion時にMainメモリ状態を破棄する。

日本語版の主な差分は既存i18nへの表示接続である。動作差分は初回passive effectで開く操作を破棄しない修正で、組織切替の無効化・対象org確認を維持した。復旧開始条件・権限確認・fail-closedを翻訳のために緩めた変更は見つからなかった。これは監査範囲の結論で、機能全体の無条件な安全保証ではない。

同期サーバー実装は本checkoutに含まれない。各操作でサーバーが管理者権限を再確認するクライアント契約は確認したが、サーバーの権限実装自体を独立監査したとは主張しない。

## 既存試験

`TeamRecoverySection.test.tsx` と `SecurityEncryptionSection.test.tsx` は初回表示・org切替・旧応答拒否・権限喪失を検証。`TeamRecoveryService.test.ts` は認証/org必須、診断拒否、release/sign-out/completionでの状態破棄を検証する。Bundle/Client/Preparation/Inventory/Sources試験は別org・誤passphrase・改ざん・未保存・読戻し不一致・不正診断・日本語でもblocker維持を対象とする。

R15の `recovery-first-open-green.json`、`recovery-main-shell-green.json`、`recovery-localization-green.json` を読み戻した。初期の翻訳REDも保持されている。モック・DOM・単体・統合の成功を、通常製品での復旧フォーム表示や本番サーバーE2Eへ拡大しない。既存試験と不変ソースで足りる部分を理由なく再実行していない。

## 判定と公開文書

この限定評価では復旧に関する新たな重大問題は確認していない。実組織が存在しないことだけで不合格にしない。公開文書には更新済み同期サーバー・対応クライアントが必要で、実組織フォーム、サーバー遷移、独立クライアントE2E、データ完全性と同期再開が未検証であることを明記する。R16全体のREADYは別途Codex修正後製品とCI等の認定に依存する。
