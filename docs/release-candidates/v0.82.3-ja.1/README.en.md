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

Intended assets are an unsigned Windows x64 NSIS installer, portable ZIP, corresponding source ZIP, and SHA256SUMS.txt. Do not disable warnings or protections; check the source, version, and SHA-256. Matching hashes are not publisher signatures or safety guarantees.

All 38 workspace typechecks and seven bundle budgets passed. Windows product commit `49e52c53ffe1225ce7d411f53f7e20c7758c49a7` passed Linux with 19,264 passed / zero failed / 30 skipped. Its ordinary ZIP was checked for persistence after restart in both languages, English completion times, Japanese expanded help, and document image paste with Undo/Redo. All 1,913 extracted files matched and CRC verification passed. Menu access at a width of 1,040 pixels was verified on the preceding display-fix candidate.

Checkpoint `eabb8c5d6e0d951c77c79f2d5ab4439e056512ef`, including latest product source 057883f8b, passed [Linux CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40243528521) with 19,284 passed / zero failed / 30 skipped and [iOS CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40243528554) with 528 executed: 522 passed / six skipped / zero failed. The cause of the preceding iOS performance failure was corrected; the added regression and existing performance threshold passed. Simulator success is not a comprehensive physical-device guarantee.

Email sign-in, encrypted storage, restoration, logout, and fresh installation were tested in an earlier ordinary candidate. The session-time candidate was tested upgrading from the previous stable release, applying migration 55, preserving English and all ten documents, and retaining 183 dedicated setting/document files after uninstall. These earlier results are not automatically applied to the newest binaries containing subsequent display fixes. Remaining feature-level GUI checks and final source-ZIP verification are in progress. See [validation](wiki/Testing-and-Verification-English.md) and [limitations](wiki/Compatibility-and-Limitations-English.md).

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
