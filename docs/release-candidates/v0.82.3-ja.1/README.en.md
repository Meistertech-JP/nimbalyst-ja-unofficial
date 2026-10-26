# Nimbalyst — Unofficial Japanese Edition

An unofficial Japanese-language build of Nimbalyst, based on version 0.82.3. Japanese localization covers desktop menus, settings, file management, AI sessions, trackers, dialogs, and other parts of the user interface. The display language can be switched between Japanese and English.

This project is not affiliated with, endorsed by, or supported by Nimbalyst, Inc.

[日本語](README.md) · [User guide](wiki/Home-English.md) · [Upstream Nimbalyst](https://github.com/nimbalyst/nimbalyst)

## Availability

v0.82.3-ja.1 is a Windows x64 distribution candidate under validation, not a published release. The current stable version remains [v0.82.1-ja.1](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1). Download published files from [this repository's Releases](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases).

The source is pinned to upstream v0.82.3 at `84dcc00f3cd0abbb36eafc6bfad9389f960076db`. Features and fixes differ from the latest official release. Upstream designates v0.82.3 a prerelease. This edition is intended to become a regular stable release after validation, but has not been published.

## Changes

The candidate incorporates legacy-encryption team recovery, Tracker recovery-conflict guidance, concurrent Codex file attribution, bounded CPU-profile retention, image paste, and fixes to Wiki, transcripts, and the development server.

**Team recovery requires the updated sync server.** Other editing clients must also support recovery. Production-organization recovery and the complete procedure across independent clients have not been verified. Check server compatibility and the intended recovery target before attempting recovery of an existing organization.

## Language and data

Select System, English, or Japanese in display-language settings. This is independent of the agent response language. User documents and external service responses are not automatically translated. Resources contain 27 namespaces and 14,794 keys per language; key parity does not establish complete UI translation.

The Windows application ID is `jp.meistertech.nimbalyst.ja.unofficial`; the default profile is `%APPDATA%\Nimbalyst 日本語版（非公式）`. Official settings are not moved or deleted. Running alongside the official application is unsupported. This edition does not claim the default `nimbalyst://` handler; authentication uses an instance-specific, nonce-protected localhost callback. Open authentication email on the same Windows PC.

Updates are manual through this repository's Releases. Official automatic updates and manual update checks are disabled. Uninstallation is configured to retain user data.

## Windows distribution and validation

The current Windows candidate uses product source `7d5407c51`. The extracted ZIP passed image copy/paste, Undo/Redo, production email sign-in, account restoration, signed-out persistence and restarts in both display languages. The same product's NSIS passed fresh installation, launch and removal. Upgrade from published v0.82.1-ja.1 retained English, a Japanese/English document and a Tracker item, and applied migration 55. Uninstallation retained all 274 dedicated data-file hashes.

Source checkpoint `f0c7b7929` passed [Linux CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40249364701) with 19,285 passed / 30 skipped / zero failed and [iOS CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40249364731) with 522 passed / six skipped / zero failed. Final source-ZIP verification remains in progress. Earlier-candidate results below are historical and limited to their stated commits.

Intended assets are an unsigned Windows x64 NSIS installer, portable ZIP, corresponding source ZIP, and SHA256SUMS.txt. Do not disable warnings or protections; check the source, version, and SHA-256. Matching hashes are not publisher signatures or safety guarantees.

All 38 workspace typechecks and seven existing bundle budgets passed. All 1,913 Windows ZIP files, ASAR contents and bundled legal files were verified. Tracker, Wiki and retained Codex-conversation UI checks from the preceding candidate remain separately scoped; their renderer/runtime sources are unchanged. See [validation](wiki/Testing-and-Verification-English.md) and [limitations](wiki/Compatibility-and-Limitations-English.md).

## Build from source

Use Node.js 24 or later, the repository's pnpm 12.9.1, and Windows native build tools.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @nimbalyst/i18n run build
corepack pnpm run build:workspace-deps
corepack pnpm --filter @nimbalyst/collab-bundle run build
corepack pnpm --filter @nimbalyst/runtime run build
$env:ALLOW_UNSIGNED_WINDOWS_BUILD = 'true'
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
corepack pnpm --dir packages/electron run build:win --publish never
```

Create a ZIP from the same completed payload in `packages/electron/release/win-unpacked`:

```powershell
corepack pnpm --dir packages/electron exec electron-builder --prepackaged release/win-unpacked --win zip --x64 --publish never
```

Successful generation does not establish successful startup, authentication, or upgrade. An unsigned build requires no signing credentials. Run typecheck with `corepack pnpm run typecheck`.

## License

MIT License. The original `Copyright (c) 2024-2026 Nimbalyst Inc.` and license text are retained. Third-party software remains subject to its own licenses. Inventories and notices are included under `packages/electron/resources/generated` in source and `resources/legal` in Windows packages.
