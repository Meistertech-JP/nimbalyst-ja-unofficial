# Nimbalyst — Unofficial Japanese Edition

An unofficial Japanese-language build of the Nimbalyst desktop application, based on version 0.81.7.

Japanese localization is included across settings, file management, AI sessions, trackers, Git and pull requests, extensions, dialogs, and other parts of the user interface. The display language can be switched between Japanese and English.

This project is not affiliated with, endorsed by, or supported by Nimbalyst, Inc.

日本語のREADMEは[README.md](README.md)を参照してください。

## Downloads

Source code is available from the [GitHub Releases](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases) page. No Windows installer, portable build, or other executable binary is currently provided. Windows package protocol registration and authentication callbacks have not been verified from a packaged build.

## Version and requirements

- Base: Nimbalyst desktop version 0.81.7
- Pinned base commit: `79b8c560c491061c39ea70d01097139055b62ae8`. Existing CHANGELOG entries include upstream history; edition-specific changes are described in the `v0.81.7-ja.1` release notes.
- The source is configured for a Windows x64 desktop build. A distributable Windows package has not been tested by launching it.
- Build environment: Node.js 24 or later and pnpm 12 or later (the repository specifies pnpm 12.9.1)
- Features and fixes may differ from the current official release. This edition does not automatically track or install updates from the official release.

## Display language

Choose Japanese or English in the application's settings. The selected language is saved and restored after restarting the app.

## Limitations

- Older clients do not distinguish a generated fallback name from an actual user name. Their “Teammate” values are left unchanged to protect real names. This edition marks generated fallback names so supported views can display them in Japanese or English.
- The full unit-test suite has unresolved failures on Windows. Passing localization tests does not establish that every application feature works.
- External Browser/Embed hosts and the packaged application's visual UI have not been verified. Errors returned by external services or the runtime environment, and legacy collaboration data, may contain English. Notifications already displayed before a language change may retain their original language until dismissed.
- Running this build alongside the official Nimbalyst application is not supported. Authentication uses an instance-specific, nonce-protected `http://127.0.0.1:<port>/auth/callback`. Starting this edition on Windows does not change the default `nimbalyst://` handler. Non-authentication `nimbalyst://` links may open in another application that currently owns the association. Windows installer file associations and uninstall behavior have not been verified.
- This edition does not download or apply updates from the official release. The manual update-check menu is also disabled.
- Authentication callbacks from a packaged Windows build have not been verified, so no Windows binary is currently provided.
- If a binary is distributed in a future release, its code-signing status will be stated for that release.

## Build from source

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
