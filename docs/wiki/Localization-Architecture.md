日本語 | [English](Localization-Architecture-English)

# 日本語化アーキテクチャ

対象は[v0.82.3-ja.2](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.2)です。本家v0.82.3の固定コミット `84dcc00f3cd0abbb36eafc6bfad9389f960076db`を基準とします。復旧パネル、Tracker、セッション時刻、入力・添付案内も同じi18nへ接続しています。

## 共通資源とホストの責務

翻訳資源は`packages/i18n/src/resources/en`と`ja`にあり、27名前空間・英日各14,795キーです。`common`を既定の名前空間、`en`をfallbackとします。`createI18nInstance`はホストごとにi18nextインスタンスを作ります。MainとRendererが同じプロセスのオブジェクトを共有するのではなく、共通の資源・ロケール解決方針を使います。

`@nimbalyst/i18n/locale`は資源を持たないロケール方針、`/core`は資源付きインスタンス作成、`/react`はReactへの接続を提供します。言語方針だけが必要なコードから資源全体をimportしないことが、初期依存を増やさないための境界になります。

```text
app.uiLanguage（永続設定）
  ├─ Main: createMainI18nController → changeLanguage → メニュー再構築
  └─ Renderer: UiLanguageProvider → I18nextProvider → 対応UI
                                      └─ 独立エディタールートへ同じinstance
```

Mainの制御は[mainI18n.ts](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.3-ja.2/packages/electron/src/main/i18n/mainI18n.ts)にあります。`app.uiLanguage`を購読し、言語変更後にメニュー更新のコールバックを実行します。変更のrevisionとdispose状態を確認し、古い非同期完了による更新を避けます。メニュー・通知・ネイティブダイアログにはそれぞれの名前空間を使います。Electron Mainの静的import規則は維持します。

Rendererの[UiLanguageProvider](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.3-ja.2/packages/i18n/src/react.tsx)は、ホストから受け取った設定とシステムロケールを解決し、`changeLanguage`と`document.documentElement.lang`を更新します。永続化はProvider自体ではなくホスト側の設定機構の責務です。設定の伝達と画面の購読を区別します。

## Reactと独立ルート

コンポーネントは`useTranslation`で表示用の`t`を取得します。HookはReactコンポーネントのトップレベルだけで呼び、callback・useEffectの本体・mapの内部へ置きません。関数へ渡す場合は、その関数が使う名前空間と`t`のスコープを確認します。title・aria-label・placeholder・tooltipも表示文字列です。

タブ内のエディターは別の`createRoot`で描画される場合があり、親ReactツリーのContextを自動継承しません。[createTranslatedRoot](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.3-ja.2/packages/electron/src/renderer/components/TabContent/translatedRoot.tsx)は、そのルートを`I18nextProvider`で包みます。

react-i18next 17の`useTranslation().i18n`が持つ言語スナップショットを独立ルートへ渡すと、設定を変えても開いたエディターの入力案内が古い言語に残る場合があります。v0.81.7-ja.3の`TabContent`は`useContext(I18nContext)`からライブのインスタンスを取得します。独立ルートを生成して言語を変更する回帰テストで、この動作を検査しています。

## docs-uiの必要時ロード（v0.81.7-ja.3での変更）

この節の容量値と実画面での観測はv0.81.7-ja.3の変更時の記録です。遅延ロードの実装はv0.82.3-ja.2でも保持していますが、過去の容量値を現行ビルドの測定値として扱いません。

docs-uiの初期容量は修正前92,295 gzip bytesで、上限92,000を295 bytes超過していました。作成・名前変更ダイアログを静的に参照すると、そのフォームと宛先ツリー構築などの依存が初期グラフへ入ります。画面表示時には不要なフォームを、操作時にだけ評価する境界へ移しました。

[CollabSidebar](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.3-ja.2/packages/collab-client/src/docs-ui/CollabSidebar.tsx)では`React.lazy`で`CollabCreateItemDialog`と`InputModal`を読みます。宛先生成を作成フォーム側へ留め、別の利用箇所には`@nimbalyst/collab-client/docs-ui/CollabCreateItemDialog`のdeep exportを使います。大きなbarrel経由で初期グラフへ戻す参照を避けるためです。型用importと実行時importも区別します。

遅延チャンクを作るだけでは、起動直後に必ず要求するなら初期転送量は減りません。この変更はダイアログを開くまでフォームをマウントしない必要時ロードです。失敗を`DialogLoadBoundary`で受け、ダイアログ内の翻訳済みエラーと「閉じる」を表示します。ワークスペース全体をエラー画面に置き換えません。

最終値は89,138 gzip bytes、削減3,157 bytesです。エラー境界追加前の中間値88,811とは区別します。上限・gzip計算・翻訳キーを変更して通したものではありません。最終ビルドではフォーム表示と、チャンク通信を遮断した際の通知・閉じた後のsidebar保持を確認しました。

## 静的整合と実行時の差

キー数・補間の一致や静的解決可能な参照の検査は、翻訳資源の構造を検証します。動的キー、外部コンポーネント、既存データ、外部エラーの完全な実行時表示を証明しません。ブランド名やモデルIDは翻訳対象と同一視しません。

静的解析の動的672候補・scope未確定412候補・JSX英語378候補は欠落キー数ではありません。有限Tracker参照42件は英日両資源で解決しています。製品修正後の既存7バンドル容量上限はPASSしています。数値は対象コミットと同じビルド出力を照合して参照してください。

関連資料：[ビルド](Building-from-Source)・[品質検証](Testing-and-Verification)・[本家への追従](Following-Upstream)・[翻訳への参加](Translation-and-Contributing)。
