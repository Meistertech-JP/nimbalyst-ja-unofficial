# Nimbalyst 日本語版（非公式）

Nimbalyst v0.81.7をベースに、デスクトップアプリのユーザーインターフェースを日本語化した非公式版です。

設定、ファイル管理、AIセッション、トラッカー、Git/プルリクエスト、拡張機能、ダイアログなどの表示に日本語を追加しています。表示言語は日本語と英語から選択できます。

本プロジェクトはNimbalyst, Inc.の公式製品ではなく、同社による開発・サポート・承認を受けたものではありません。

英語のREADMEは[README.en.md](README.en.md)を参照してください。

## ダウンロード

[GitHub Releases](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases)で公開するソースコードを利用できます。現時点ではWindowsインストーラーやポータブル版などの実行バイナリは提供していません。Windowsパッケージのプロトコル登録と、パッケージからの認証コールバックを確認できていないためです。

v0.81.7-ja.1はソース限定Prereleaseです。ローカルで生成したWindowsパッケージは未署名で、インストール・起動・認証・アンインストールを実機で検証していません。本ReleaseにWindowsバイナリは含まれません。

## バージョンと動作環境

- ベース: 公式Nimbalystデスクトップ版 v0.81.7
- 固定ベースコミット: `79b8c560c491061c39ea70d01097139055b62ae8`。CHANGELOGの既存項目には上流由来の履歴が含まれます。本版固有の変更は `v0.81.7-ja.1` のリリースノートを参照してください。
- Windows x64向けのソース構成です。配布用Windowsパッケージの実起動は未検証です。
- ビルド環境: Node.js 24以降、pnpm 12以降（リポジトリでは pnpm 12.9.1 を指定）
- 現在の公式最新版と本版では、機能および修正内容が異なる場合があります。本版は公式最新版への自動追従を行いません。

## 表示言語

アプリの設定画面で表示言語を日本語または英語に変更できます。選択した言語は保存され、アプリ再起動後も引き継がれます。

## 制限事項

- 旧クライアントから届く共同編集データには、未設定の既定名と実際の利用者名を区別する情報がありません。このデータの「Teammate」は実名を保護するため変更しません。本版が送信する既定名は由来情報を持ち、対応する表示では日本語・英語に切り替わります。
- Windows環境での全体単体テストには未解決の失敗があります。関連する日本語化テストの成功は、全機能の動作保証を意味しません。
- 固定upstreamベースでも再現する既知のテスト失敗があります。Windowsでは試験用symlinkの作成がEPERMで失敗するため、symlinkファイルとsymlink祖先ディレクトリの拒否処理を実行時に確認できていません。NTFS ACLによるアクセス制御と、Stytchの一部の認証復旧経路も未検証です。これらは検証上の制限であり、不具合や脆弱性が確認されたという意味ではありません。
- 動的翻訳参照119件について、実行時の完全な確認ができていません。日本語実画面の網羅的なE2E検証も未実施です。
- 特定のホスト環境で大容量CLIアップロードが停止しています。すべての環境で発生する問題とは確認されていません。
- 外部のBrowser/Embedホストと配布用アプリの実画面は未検証です。外部サービスや実行環境から返されるエラーメッセージ、旧形式の共同編集データには英語が含まれる場合があります。言語切替前に表示された通知は、閉じるまで元の言語が残る場合があります。
- 公式Nimbalystとの同時利用はサポートしていません。本版の認証コールバックはインスタンスごとに生成するnonce付きの `http://127.0.0.1:<port>/auth/callback` を使用します。Windowsで本版を起動しても `nimbalyst://` の既定ハンドラーは変更しません。認証以外の `nimbalyst://` リンクは、現在登録されている別のアプリで開かれる場合があります。Windowsインストーラーによるファイル関連付けとアンインストール時の挙動は未検証です。
- 本版は公式版の更新を自動取得・適用しません。手動の更新確認メニューも無効です。
- 配布用Windowsパッケージからの認証コールバックは未検証であり、現時点でWindowsバイナリを提供していません。
- 将来バイナリを配布する場合は、そのリリースに署名の有無を明記します。

## ソースからのビルド

リポジトリのルートで次を実行します。

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @nimbalyst/i18n run build
corepack pnpm run build:workspace-deps
corepack pnpm --filter @nimbalyst/collab-bundle run build
corepack pnpm --filter @nimbalyst/runtime run build
corepack pnpm --dir packages/electron run build:win
```

`build:win` はWindows x64向けパッケージの生成スクリプトです。生成物を配布する前に、Windows上でのインストール、起動、localhost認証コールバック、URL・ファイル関連付け、ユーザーデータの分離を個別に検証してください。ビルドの成功だけでは配布用アプリの動作確認にはなりません。

## ライセンス

本ソースコードは[MIT License](LICENSE)の条件で提供されます。著作権表示を含むライセンス本文は保持されています。第三者ソフトウェアのライセンス情報と通知は [`packages/electron/resources/generated/THIRD_PARTY_LICENSES.json`](packages/electron/resources/generated/THIRD_PARTY_LICENSES.json)、[`THIRD_PARTY_LICENSE_AUDIT.md`](packages/electron/resources/generated/THIRD_PARTY_LICENSE_AUDIT.md)、[`THIRD_PARTY_NOTICES.txt`](packages/electron/resources/generated/THIRD_PARTY_NOTICES.txt)を参照してください。

## 関連リンク

- [本家Nimbalystリポジトリ](https://github.com/nimbalyst/nimbalyst)
- [非公式日本語版の英語README](README.en.md)
