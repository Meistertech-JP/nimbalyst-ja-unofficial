# Nimbalyst — Unofficial Japanese Edition

An unofficial Japanese-language build of the Nimbalyst desktop application, based on version 0.81.7.

Japanese localization is included across settings, file management, AI sessions, trackers, Git and pull requests, extensions, dialogs, and other parts of the user interface. The display language can be switched between Japanese and English.

This project is not affiliated with, endorsed by, or supported by Nimbalyst, Inc.

日本語のREADMEは[README.md](README.md)を参照してください。

## Downloads

Source code is available from the [GitHub Releases](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases) page. No Windows installer, portable build, or other executable binary is currently provided. Windows package protocol registration and authentication callbacks have not been verified from a packaged build.

v0.81.7-ja.2 is a source-only prerelease. Changes since v0.81.7-ja.1 are described in the [release notes](RELEASE_NOTES_v0.81.7-ja.2.md).

Previously generated local Windows packages are unsigned. Installation, startup, authentication, and uninstallation have not been validated on a Windows machine. This release provides source code only, without Windows binaries.

## Version and requirements

- Base: Nimbalyst desktop version 0.81.7
- Pinned upstream target: `e14ddf383a8dbb40e511fc2c2ea50273d08e3579`. This incorporates 24 upstream commits affecting 121 files since the previous pinned base, `79b8c560c491061c39ea70d01097139055b62ae8`. It does not track all changes on the current official main branch.
- Existing [CHANGELOG](CHANGELOG.md) entries include upstream history. Edition-specific changes are described in the [release notes](RELEASE_NOTES_v0.81.7-ja.2.md).
- The source is configured for a Windows x64 desktop build. A distributable Windows package has not been tested by launching it.
- Build environment: Node.js 24 or later and pnpm 12 or later (the repository specifies pnpm 12.9.1)
- Features and fixes may differ from the current official release. This edition does not automatically track or install updates from the official release.

## Display language

Choose Japanese or English in the application's settings. The selected language is saved and restored after restarting the app.

This version extends Japanese display to session context usage, GitHub author and label search, document outlines, local Wiki views, and static-site exports. Resources contain 26 namespaces and 14,401 keys in each language. Additions since the previous version comprise 111 keys for upstream UI changes and one backup-collision error message per language. Matching key sets do not establish complete UI coverage or runtime correctness.

For static exports, use `nim wiki export --static <dir> --ui-language system|en|ja`. The CLI defaults to the system language when the option is omitted. Programmatic exports default to English for API compatibility. Wiki translations load namespaces on demand. These changes are included in this source; their inclusion does not imply availability in published npm packages.

## Incorporated upstream changes

The pinned range includes the session context-usage bar, GitHub author and label search, local Wiki static export, opening Wiki pages from Quick Open, and hierarchical document outlines. It also includes changes to unread group rollups, Cursor attachments, session and task retention, import retries, database-history retention, Runtime transcript and approval handling, and document synchronization. Exhaustive testing of these features in a running application is not complete.

This edition also changes Wiki re-export to retain existing backups. An unrelated backup at the expected path stops the export; an existing earlier export is retained and an unused numbered backup path is selected. Windows Markdown file classes use an edition-specific identifier. These changes do not establish safety under every concurrent write or verify installation, file associations, or uninstallation on a Windows machine.

Startup and authentication diagnostics now record counts or fixed classifications instead of arbitrary URLs, authentication responses, identity fields, and error contents. This change covers the reviewed diagnostic paths; it does not establish successful real sign-in or exhaustive verification of every application log.

## Limitations

- Older clients do not distinguish a generated fallback name from an actual user name. Their “Teammate” values are left unchanged to protect real names. This edition marks generated fallback names so supported views can display them in Japanese or English.
- Full-suite runs against the pinned upstream baseline and this edition remain incomplete at a CLI REST create/update test. No failures unique to this edition were found in the captured failure records, but neither run is a full-suite pass. Passing localization tests does not establish that every application feature works.
- Four fixture failures also reproduce on the pinned upstream baseline on the same Windows host: CLI symlink creation, starting `/bin/sh` for a commit-hook fixture, creating a sandbox symlink-file fixture, and creating a sandbox symlink-ancestor fixture. The three symlink fixtures fail with EPERM; the shell fixture fails with ENOENT. The sandbox's symlink-rejection behavior itself has not been runtime-verified. NTFS ACL access controls and some Stytch authentication recovery paths also remain unverified. These are verification limitations, not confirmed defects or vulnerabilities.
- Complete runtime verification of 119 dynamic translation references is pending. Exhaustive Japanese-language E2E and visual QA has not been performed.
- A broader static audit leaves 370 legacy translation references with unresolved namespaces. They are separate from the reviewed changed paths; this does not establish 370 missing keys or display defects.
- Large CLI uploads stall in a particular host environment; this has not been established as a problem affecting all environments.
- Localization of new and changed UI is distinct from an audit of every existing screen. Untranslated English remains in legacy UI; a product-wide count of zero English strings has not been established. External Browser/Embed hosts and the packaged application's visual UI have not been verified. Errors returned by external services or the runtime environment, and legacy collaboration data, may contain English. Notifications already displayed before a language change may retain their original language until dismissed.
- Running this build alongside the official Nimbalyst application is not supported. Authentication uses an instance-specific, nonce-protected `http://127.0.0.1:<port>/auth/callback`. Starting this edition on Windows does not change the default `nimbalyst://` handler. Non-authentication `nimbalyst://` links may open in another application that currently owns the association. Windows installer file associations and uninstall behavior have not been verified.
- This edition does not download or apply updates from the official release. The manual update-check menu is also disabled.
- The Windows application identifier is `jp.meistertech.nimbalyst.ja.unofficial`. The display name and default user-data location are separate from the official application. Existing official user data is not moved or deleted. Separation has not been verified by launching the packaged application.
- Authentication callbacks from a packaged Windows build have not been verified, so no Windows binary is currently provided.
- Native Android and iOS behavior has not been verified for this edition. Earlier mobile CI results do not establish that this version works on a device.
- Windows packaging of the final source stopped with EPERM while renaming the Electron extraction directory. The cause is unconfirmed, and no final installer or ZIP was generated. Earlier local artifacts also retain discrepancies between ASAR declarations and externally placed files. Neither observation establishes a startup failure or vulnerability.
- If a binary is distributed in a future release, its code-signing status will be stated for that release.

## Build from source

This source passes typecheck in all 38 workspaces, 216 tests across 30 related files, 35 Wiki/CLI tests across seven files, and 40 targeted authentication-diagnostic tests. Runtime, Electron, Collab bundle, Worker, Sandbox, Extensions, CLI, and Wiki builds also pass. A built-CLI smoke test in a fresh temporary project verifies Japanese → English → Japanese static exports, links, document contents, and retained backups. This is not browser or distributable-application launch testing.

Run these commands from the repository root:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @nimbalyst/i18n run build
corepack pnpm run build:workspace-deps
corepack pnpm --filter @nimbalyst/collab-bundle run build
corepack pnpm --filter @nimbalyst/runtime run build
corepack pnpm --dir packages/electron run build:win
```

`build:win` is the repository script for producing a Windows x64 package. Before distributing its output, verify installation, launch, localhost authentication callbacks, URL and file associations, and user-data separation on Windows. A successful build alone does not verify the distributable application's behavior.

## License

The source code is provided under the [MIT License](LICENSE). The original copyright and license notices are retained. Third-party license information and notices are available in [`packages/electron/resources/generated/THIRD_PARTY_LICENSES.json`](packages/electron/resources/generated/THIRD_PARTY_LICENSES.json), [`THIRD_PARTY_LICENSE_AUDIT.md`](packages/electron/resources/generated/THIRD_PARTY_LICENSE_AUDIT.md), and [`THIRD_PARTY_NOTICES.txt`](packages/electron/resources/generated/THIRD_PARTY_NOTICES.txt).

## Links

- [Original Nimbalyst repository](https://github.com/nimbalyst/nimbalyst)
- [Japanese README](README.md)
