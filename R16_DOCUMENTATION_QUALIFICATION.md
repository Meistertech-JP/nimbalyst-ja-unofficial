# R16 公開文書の認定状況

公開Wikiは変更していない。公開Wikiの固定読戻し `530e76544dad3165c1241055c9e624e37906820a` を基準に、29記事（日英14組とEnglish Overview）・Sidebar・Footerの全31ファイルを確認した。日英README・日英併記Release Notesと合わせた34原稿は `docs/release-qualified/v0.82.3-ja.1/` に置く。

初期監査 `tmp/r16-evidence/DOCUMENTATION_AUDIT.json` は旧製品を対象とした時点の記録で、現候補の完成を示すものではない。今回の製品修正後に全原稿を読み直し、旧14,794キーを14,795キーへ更新し、製品修正1c1d54a85、新CI07eac5ae2、旧R15製品の履歴証拠を区別する修正を進めた。

重要な更新対象は、Home/Overview、互換性、認証、導入、検証、開発履歴、翻訳アーキテクチャ、表示言語、ビルド手順、upstream方針、トラブルシューティング、ライセンスとFooter。翻訳貢献手順の2記事とSidebarは、版非依存の手順・同じページ名を維持できるかを確認する。変更不要な記事も監査対象に含める。

現在の公開版はv0.82.1-ja.1のまま。v0.82.3-ja.1へのタグ・Releaseリンクは公開時用であり、現時点で到達可能とは報告しない。READMEをrootへコピーした後もWikiリンクが有効になるよう、READMEは絶対GitHub Wiki URL、Wiki内部は対応slugを使用する。

修正後の機械監査 `tmp/r16-evidence/DOCUMENTATION_AUDIT_FIXED1.json` はPASS。Wiki31ファイルのうち28変更・3維持、全原稿34件、ローカルリンク181件が一致した。正式公開時用の将来タグ/Releaseリンク27件は到達確認済みとしていない。個人パス・内部ラウンド名の禁止チェックも通過した。Preview/Betaへの位置付け変更は行っていない。

## 未完了

- 新Windows候補のEnglishとSystem解決日本語の表示・再起動保持・正常終了は確認済み。明示ja値のnative保持と補助失敗カードnative表示を未検証として原稿へ反映する。通常正式リリース候補であり、Preview/Beta/Experimentalへの変更はしない。
- Linuxの原ログ確認後の最終件数、iOSの確定件数を日英原稿全体へ揃え、内部ラウンド名・ローカル個人パス・旧製品を新製品と誤認する文言を再検査する。
- 全31 Wikiファイルの新旧ハッシュ・変更理由・リンク一覧を最終監査結果に記録する。raw Markdownの検査とブラウザーでのレンダリング確認は別の証拠である。
- 最終GitコミットとソースZIPの確定後に公開対象SHAを決める。文書更新後に古いソースZIPを流用しない。

現段階の判定は **DRAFTS UPDATED / FINAL PUBLICATION READINESS PENDING**。公開文書の内容修正は行っているが、公開操作・main更新・タグ作成・Release・公開Wiki編集は実施していない。
