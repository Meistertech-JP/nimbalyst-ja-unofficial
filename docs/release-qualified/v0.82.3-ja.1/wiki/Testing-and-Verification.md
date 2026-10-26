日本語 | [English](Testing-and-Verification-English)

# テストと品質検証

## v0.82.3-ja.1

製品修正コミット `1c1d54a851c340a8f0f9afc304379882a7319fa1` から再生成したWindows NSIS・ポータブルZIPを対象とします。両パッケージのpayload、ASAR、ネイティブABI、Worker、ZIP全1,913ファイルを照合し、SQLite Worker・ONNX・node-ptyの実ロードを確認しました。通常製品では英語のSettings・メニュー・Project Manager・Workspace表示と、英語選択後の再起動保持を確認しました。表示言語をSystemにした状態で、日本語Renderer・ネイティブメニュー、Ctrl+Qによる正常終了、再起動後の日本語保持も確認しました。明示的な`ja`設定値の保持は未確認です。補助エラー警告は日英DOM試験で確認しましたが、通常製品画面では未確認です。認証およびNSIS導入・更新・削除の製品操作はこの版では未実施で、以前の製品の履歴は本版の実操作結果ではありません。

以前のLinux結果はコミット `f0c7b7929f18f57c6efac96f61154cfe442b4c74` の履歴です。製品修正後のLinux run `40269849525` はTest Files 2,340 PASS・7 SKIP・0 FAIL（計2,347）、Tests 19,296 PASS・30 SKIP・0 FAIL（計19,326）で成功しました。iOS run `40269849613` は528件実行・522 PASS・6 SKIP・0 FAILで成功しました。旧Linux結果は別コミットの履歴として区別しています。

組織復旧は既存モック・DOM・単体・統合試験と本家差分の監査までです。実組織やダミー組織を作成せず、通常製品の復旧フォーム・サーバー状態遷移・独立実クライアントE2Eは未検証です。更新された同期サーバーが必要です。以前に観測したCodex主要求後の自動セッション情報リマインダーcapacity失敗について、修正後のMain/parser/UI/Provider/Protocol回帰試験は成功しています。過去の実機capacity事象が同一経路か、警告が通常製品画面に表示されるかは未確定です。Windows fixture EPERM3件は未通過のまま保持し、Linuxでの例外なし成功と区別します。以下は旧版の履歴です。

## v0.82.1-ja.1

ソース・配布物は[Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1)とSHA256SUMS.txtで確認できます。38ワークスペース型検査、7初期ロード容量、27名前空間・英日各14,608キーの整合を検査しています。docs-uiは89,138／92,000 gzip bytesです。

通常Windows製品ビルドのEXE・ASAR・Workerは実機検証済み製品とバイト一致し、再生成差分はライセンスJSONの生成時刻だけです。最終NSISもインストール・全1,911ファイル照合・通常アンインストールを確認しています。ソースZIPの9,643ファイルとWindows ZIPの1,911ファイルの物理復元・ハッシュ・CRC検査は成功しています。本番認証・言語・旧版更新の検証は、この一致する製品コードに対応します。Linux・iOSの実行SHAと件数は下の開発コミットの表を参照してください。最終文書・型宣言コミットそのものを同一SHAでCI実行したという意味ではありません。

静的検査、単体試験、開発用E2E、製品GUI、実認証は異なる範囲を検証します。キー数の一致やビルド成功だけでは、全画面の表示や認証の実動作を保証できません。

## 公開正式版 v0.81.7-ja.3

対象コミットは[`0871b7872bb9d043ff07acfaf62a3deb0eb6aef2`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/commit/0871b7872bb9d043ff07acfaf62a3deb0eb6aef2)です。[リリースノート](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.81.7-ja.3/RELEASE_NOTES_v0.81.7-ja.3.md)に製品ビルドと検証範囲を記録しています。

- 38ワークスペースの型検査と、容量修正・遅延フォーム・言語追従に関する34テストが成功しています。
- 翻訳リソースは27名前空間、英日各14,579キーです。キー・補間の整合と静的に解決できる参照を検査しています。
- 最終配布ビルドでは日英切替・再起動後保持、ローカルWikiのフォーム、ロード失敗時の通知と画面保持、正常終了を確認しています。
- 本番メール認証・暗号化保存・復元・ログアウトとNSIS更新・アンインストールは、認証コードが同じ先行製品ビルドの検証結果を利用しています。最終配布物そのもので再試験した結果ではありません。

動的翻訳候補651件とスコープ未確定382件は完全な実行時確認を終えていません。これらは不具合や欠落キーの件数ではありません。

## 公開後CIと開発ブランチ

公開版の[Linux CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40069697146)と[iOS試験](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40069697221)には失敗記録があります。[Androidビルド](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40069697158)は成功していますが、Android実機の動作確認ではありません。

公開後の修正を含む開発コミット[`ae08d2235bab5e9c832c0ae32631bb3a94544704`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/commit/ae08d2235bab5e9c832c0ae32631bb3a94544704)について、2026年10月25日に次を確認しています。

| 環境 | 結果 |
| --- | --- |
| [Linux CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40151947723) | Test Files: 2,320成功・7スキップ・0失敗。Tests: 19,130成功・30スキップ・0失敗 |
| [iOS試験](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40151947722) | 527実行・6スキップ・0失敗 |

開発ブランチの成功は、公開タグの失敗記録を書き換えるものではありません。新しいWindows配布物の公開も意味しません。iOSのページ離脱・置換・読み込み完了試験を含むソースはリンク先から参照できます。

## Windows環境依存試験

固定upstreamとの同一Windows環境での比較で、CLIとsandboxの3種類のsymlink fixture作成EPERM、およびcommit-hook試験の`/bin/sh`不在ENOENTを確認しています。fixture作成で停止した試験は、symlink拒否処理そのものを検証できていません。テストは保持しています。

Linuxでの成功とWindowsでの未検証範囲は区別します。未検証であることは、不具合や脆弱性を確認したことを意味しません。

## 検証方法

型検査・関連単体試験・リソース監査に加え、初期読み込み依存を変更する場合は全7エントリの容量を同じgzip条件で測定します。docs-uiは公開版で92,295から89,138 gzip bytesへ削減し、92,000の上限を維持しました。遅延フォームは表示・キャンセル・再表示とロード失敗時の動作も検査します。

Windows配布物はASAR、Worker、Native ABI、PE情報、ライセンス、全ZIPファイルのハッシュと復元を検査します。実機結果を別の成果物へ適用する場合は、ソース・設定・バイナリの対応を確認します。全画面・全DPI・外部スクリーンリーダー・全認証経路を確認したとは扱いません。

[制限事項](Compatibility-and-Limitations) · [ビルド](Building-from-Source) · [本家への追従](Following-Upstream)
