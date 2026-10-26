日本語 | [English](Building-from-Source-English)

# ソースからのビルド

この手順はv0.82.3-ja.1のソースとスクリプトを対象とします。追従後の版ではpackage.jsonとlockfileを再確認してください。公開済みnpm CLIが、このフォークの全機能を含むことを意味しません。

## 取得と依存関係

Node.js 24以降、pnpm 12以降を使用します。`packageManager`は`pnpm@12.9.1`、Electronは43.7.0です。Windowsのネイティブ依存の再ビルドには、その依存に対応するビルドツールが必要になる場合があります。

```powershell
git clone https://github.com/Meistertech-JP/nimbalyst-ja-unofficial.git
Set-Location nimbalyst-ja-unofficial
git switch --detach v0.82.3-ja.1
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @nimbalyst/i18n run build
corepack pnpm run build:workspace-deps
corepack pnpm --filter @nimbalyst/collab-bundle run build
corepack pnpm --filter @nimbalyst/runtime run build
```

新規cloneで固定タグを選ぶ例です。変更のある既存worktreeを切り替える指示ではありません。依存は`pnpm-lock.yaml`と`pnpm-workspace.yaml`を使います。rootでnpm installして別の解決結果を作らないでください。`allowBuilds`はビルドスクリプトを許可する依存の一覧、`minimumReleaseAge`は新規公開依存の解決制限です。検査回避のために設定を外さないでください。

## 型検査と関連試験

```powershell
corepack pnpm run typecheck
corepack pnpm exec vitest run packages/i18n/src/__tests__
corepack pnpm run test:prepush-gate
```

最初のコマンドはworkspaceの型検査、2番目はi18nパッケージのテスト、3番目はscripts・sandboxの検査です。i18nのテストだけで製品の全関連試験を代替できません。変更した画面・設定・Main処理に応じた試験を追加して実施します。通常の全体単体試験は`corepack pnpm run test:prepush`です。結果の母集団と環境を記録してください。[既知の失敗](Testing-and-Verification)を参照してください。

## ElectronとWindowsパッケージ

```powershell
corepack pnpm --dir packages/electron run build:win
```

`build:win`はElectron、Worker、Sandbox、拡張機能をビルドし、更新設定と追加リソースを検査してWindows x64のNSISを生成します。通常の出力は`packages/electron/release`です。Electron MainとRenderer、Workerは異なる実行経路です。Mainだけが成功してもSQLite Workerの動作は保証されません。

NSISに加えてZIPを生成する場合は、上記ビルドと検査が終わった状態から同じElectron Builder設定で両targetを指定します。

```powershell
corepack pnpm --dir packages/electron exec electron-builder --win nsis zip --x64
```

`build:unpack`は検査用の展開済みアプリを生成します。unpacked EXE単体は配布しません。`resources`とDLLを含む完全な配布物が必要です。

署名資格情報を渡さないローカルビルドは未署名です。CIで意図的に未署名を許可する場合はPowerShellで`$env:ALLOW_UNSIGNED_WINDOWS_BUILD = 'true'`を設定します。この指定は署名を作成せず、試験・公開ゲートも免除しません。秘密鍵・APIキーをソースやWikiへ保存しないでください。

## 配布前の検査

ASARのファイル人口・payloadとintegrity block、展開版とZIPの全ファイル、Workerの配置を確認します。SQLiteなどのNativeモジュールはElectronのABIに対応している必要があります。v0.82.3-ja.1の検査対象はElectron 43.7.0・ABI 148でした。システムNodeで読み込めた結果だけでElectronの互換性を判定しません。

PEの製品名・版・識別子、公式更新feedの不在、`resources/legal`のLICENSEと第三者通知を確認します。製品コードコミットと公開用文書コミットの差分、ソースZIPの全ファイルハッシュと復元結果、配布物SHA-256を記録します。

最後に通常製品ビルドで起動・終了、言語切替、再起動後の保持、変更箇所の画面を試験します。インストール・認証は別の検証項目です。ビルドコマンドの成功はそれらの実動作を保証しません。

[品質検証](Testing-and-Verification)・[アーキテクチャ](Localization-Architecture)・[ライセンス](License-and-Attribution)。
