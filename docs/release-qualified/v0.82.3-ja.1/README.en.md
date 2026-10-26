# Nimbalyst — Unofficial Japanese Edition

An unofficial Japanese-language build of Nimbalyst, based on version 0.82.3. Japanese localization covers desktop menus, settings, file management, AI sessions, trackers, dialogs, and other parts of the user interface. The display language can be switched between Japanese and English.

This project is not affiliated with, endorsed by, or supported by Nimbalyst, Inc.

[日本語](README.md) · [User guide](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Home-English) · [Upstream Nimbalyst](https://github.com/nimbalyst/nimbalyst)

## Availability

v0.82.3-ja.1 is an unsigned Windows x64 edition. The NSIS installer, portable ZIP, matching source and SHA256SUMS.txt are listed in the [release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.1).

The source is based on upstream v0.82.3 at `84dcc00f3cd0abbb36eafc6bfad9389f960076db`. Features and fixes differ from the latest official release. Upstream distributed v0.82.3 as a prerelease.

## Changes

This edition incorporates legacy-encryption team recovery, Tracker recovery-conflict guidance, concurrent Codex file attribution, bounded CPU-profile retention, image paste, and fixes to Wiki, transcripts, and the development server.

**Team recovery requires the updated sync server.** Other editing clients must also support recovery. Production-organization recovery and the complete procedure across independent clients have not been verified. Check server compatibility and the intended recovery target before attempting recovery of an existing organization.

## Language and data

Select System, English, or Japanese in display-language settings. This is independent of the agent response language. User documents and external service responses are not automatically translated. Resources contain 27 namespaces and 14,795 keys per language; key parity does not establish complete UI translation.

The Windows application ID is `jp.meistertech.nimbalyst.ja.unofficial`; the default profile is `%APPDATA%\Nimbalyst 日本語版（非公式）`. Official settings are not moved or deleted. Running alongside the official application is unsupported. This edition does not claim the default `nimbalyst://` handler; authentication uses an instance-specific, nonce-protected localhost callback. Open authentication email on the same Windows PC.

Updates are manual through this repository's Releases. Official automatic updates and manual update checks are disabled. Uninstallation is configured to retain user data.

## Windows distribution and validation

The Windows packages were rebuilt from product-fix commit `1c1d54a851c340a8f0f9afc304379882a7319fa1`. Their NSIS and portable ZIP payloads, ASAR, native ABI, Workers and all 1,913 ZIP files were checked. In the ordinary product, English settings, menus, Project Manager and Workspace views were observed, and English remained selected after restart. With the display-language setting set to System, Japanese appeared in the Renderer and native menus and remained after a normal Ctrl+Q shutdown and restart. Persistence of an explicit `ja` setting has not been checked. The auxiliary-error warning passed English and Japanese DOM tests, but its display in the ordinary product has not been observed. Authentication, NSIS installation, upgrade and removal were not exercised on this build; relevant authentication and installer source inputs were unchanged, which does not replace those runtime checks.

The earlier Linux result applies to historical commit `f0c7b7929f18f57c6efac96f61154cfe442b4c74`. Linux run `40269849525` for the product fix passed: 2,340 test files passed, seven skipped, zero failed (2,347 total); 19,296 tests passed, 30 skipped, zero failed (19,326 total). iOS run `40269849613` completed with 528 executed, 522 passed, six skipped and zero failed. The status of verification for the matching final source ZIP is recorded in the validation report.

Intended assets are an unsigned Windows x64 NSIS installer, portable ZIP, corresponding source ZIP, and SHA256SUMS.txt. Do not disable warnings or protections; check the source, version, and SHA-256. Matching hashes are not publisher signatures or safety guarantees.

After the product fix, 51 Provider/Protocol tests and 54 Main/parser/UI/i18n tests passed; 38 workspace typechecks and seven existing bundle budgets also passed. These test results do not verify authentication or NSIS installation in the ordinary product. See [validation](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification-English) and [limitations](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Compatibility-and-Limitations-English).

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
