# Nimbalyst — Unofficial Japanese Edition

Nimbalyst is an open-source workspace that lets you switch between multiple AI agents, including Claude Code and Codex, from a single app. It also lets you manage the files, tasks, and progress involved in writing and app development together in one place.

An unofficial Japanese-language build of Nimbalyst. Japanese localization covers desktop menus, settings, file management, AI sessions, trackers, dialogs, and other parts of the user interface. The display language can be switched between Japanese and English.

This project is not affiliated with, endorsed by, or supported by Nimbalyst, Inc.

[日本語](README.md) · [Windows installation](docs/WINDOWS_JA_UNOFFICIAL.md#english) · [User guide](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Home-English) · [Upstream Nimbalyst](https://github.com/nimbalyst/nimbalyst)

## Availability

The latest edition, **v0.84.0-ja.1**, is an unofficial, unsigned Windows x64 build based on upstream v0.84.0 at `dc5a0ef938cf495a0667d797f871d09d0c44246f`. Download its NSIS installer, Portable ZIP, matching Source ZIP and SHA256SUMS.txt from the [formal release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1). Use that release’s tag for corresponding source. [Previous v0.82.8-ja.1](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.8-ja.1) and earlier tags, releases and assets are retained.

Upstream v0.84.0 is a GitHub prerelease. This unofficial edition is distributed as a regular GitHub Release and Latest; this is not upstream certification or a stability guarantee. `v0.84.0-ja.1` still contains a SemVer prerelease identifier; GitHub classification does not change that meaning.

The quality assessment is **GO WITH KNOWN LIMITATIONS**. Read the [release notes](RELEASE_NOTES_v0.84.0-ja.1.en.md) and [known limitations](docs/KNOWN_LIMITATIONS_v0.84.0-ja.1.md#english).

## Japanese interface

Windows screenshots from v0.82.4-ja.1 illustrating the interface with sample documents and tasks. Some details differ in the latest edition.

### Document editing

![Japanese document editor](docs/screenshots/japanese-editor.png)

### Tracker and AI sessions

![Japanese Tracker details and session input](docs/screenshots/japanese-tracker.png)

### Display language and application settings

![Japanese advanced settings](docs/screenshots/japanese-settings.png)

## Changes in this version

Integrates upstream v0.83.0 and v0.84.0 changes since v0.82.8: Claude Fable 5.2 selection, batched queue delivery, Git-panel branch switching, Workstreams, folder-scoped commit proposals, nested Markdown list preservation, hidden-entry counts, Wiki publishing, SQLite backups and tool-output retention. Edition-specific changes add Japanese UI text and fix explicit profile boundaries and Windows file/path handling. Integration does not establish live verification of every feature.

**Team recovery requires the updated sync server.** Other editing clients must also support recovery. Production-organization recovery and the complete procedure across independent clients have not been verified. Check server compatibility and the intended recovery target before attempting recovery of an existing organization.

## Language and data

Select System, English, or Japanese in display-language settings. This is independent of the agent response language. User documents and external service responses are not automatically translated. Some Tracker names and statuses remain in English.

Shared resources contain 27 namespaces and 15,557 keys in each language, with zero key or interpolation differences. The sole whitespace-only Japanese value is the intentional formatting separator `common.local_wiki.export.note_separator`, which is also a single space in English. A static source audit found no missing references among 11,523 literal references. It also found 489 dynamic-call candidates; namespace scope could not be statically resolved for 211 references. These are not missing-key counts, but complete runtime verification of dynamic paths is still outstanding. Previous v0.82.8-ja.1 contains 15,401 keys per language.

The Windows application ID is `jp.meistertech.nimbalyst.ja.unofficial`; the default profile is `%APPDATA%\Nimbalyst 日本語版（非公式）`. Official settings are not moved or deleted. Running alongside the official application is unsupported. This edition does not claim the default `nimbalyst://` handler; authentication uses an instance-specific, nonce-protected localhost callback. Open authentication email on the same Windows PC.

Updates are manual through this repository's Releases. Official automatic updates and manual update checks are disabled. Uninstallation is configured to retain user data.

## Windows distribution and validation

The [verification record](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification-English) distinguishes native observations, automated tests and unverified areas for each version. Observations from earlier binaries are not treated as re-execution on a new distribution. Coverage does not extend to every screen, DPI setting or authentication path.

Release assets are an unsigned Windows x64 NSIS installer, portable ZIP, corresponding source ZIP, and SHA256SUMS.txt. Do not disable warnings or protections; check the source, version, and SHA-256. Matching hashes are not publisher signatures or safety guarantees.

An earlier version was observed retaining terminal resources after a shell/CLI exited naturally. In a single-host check of previous v0.82.8-ja.1, no child shell was observed three seconds after exit, but that does not establish a general resolution. If resource use grows, save work, quit normally and restart.

The product-verification baseline is `29fdcc216f354cd1031dc9ef36672a5399bd6775` (product input `a7f82db90`, differing by one unit-test file). The Windows full Vitest run completed with 20,182 PASS / 108 FAIL / 37 SKIP and exit 1. All 108 remain unresolved. R22 has failures with the same path and test name for 99 cases, but names do not establish identical causes or harmlessness; neither all-new major regressions nor all-environment-only failures are established. All 39 workspace typechecks and seven existing size limits passed. Linux’s 20,296 PASS / 0 FAIL / 31 SKIP, Android Build SUCCESS (signed job skipped) and iOS 522 PASS / 0 FAIL / 6 SKIP are separate from Windows full-suite success.

Startup, Japanese/English switching, normal shutdown and language retention after restart were observed with final Windows 07d win-unpacked, fully extracted Portable and NSIS products. Fresh NSIS installation and NSIS/Portable upgrades from v0.82.8-ja.1 retained settings, synthetic-document hashes and displayed Tracker data in dedicated environments. This does not guarantee migration of every real profile or database field. Normal NSIS uninstallation retained dedicated user data; Start Menu registration checks were limited to the isolated environment. Downgrades are unverified.

Production email sign-in, encrypted credential-file creation, normal shutdown and restoration after restart, normal sign-out, credential-file removal and unauthenticated state after another restart were observed with the regular final Windows 07d win-unpacked product and a dedicated profile. New sign-in with the dedicated NSIS profile or a separate Portable profile, Google sign-in, service-side session revocation and special recovery remain unverified. These are Electron account observations, separate from Node credential-file tests.

High CPU use with long Markdown remains unresolved. Wiki context under load, general resolution of Windows terminal resource retention, all dynamic translations, DPI settings and external screen readers are not comprehensively verified. Windows symlink fixture EPERM leaves rejection behavior untested on that host. Real microphones, speech-recognition APIs, live sync/collaboration servers, real organizations and old/new server interoperability are unverified. Wiki publishing and team permissions require a compatible server. Unverified areas are not equivalent to confirmed defects or vulnerabilities.

Google sign-in, special recovery paths, server-side session revocation, cross-user NTFS effective access, external screen readers and complete dynamic-translation coverage remain unverified. EPERM during Windows symlink-fixture setup leaves untested behavior; Linux success is recorded separately. See [limitations](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Compatibility-and-Limitations-English).

Features using shared built-in Tracker types require a compatible sync server. Compatibility with older servers and clients has not been verified. After using this edition, an older version may not be able to read the saved external-session cursor format. Downgrading and recovery have not been verified.

## Build from source

Use Node.js 24 or later, the repository's pnpm 12.9.1, and Windows native build tools.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @nimbalyst/i18n run build
corepack pnpm run build:workspace-deps
corepack pnpm --filter @nimbalyst/memory-engine run build
corepack pnpm --filter @nimbalyst/tracker-builtins run build
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
