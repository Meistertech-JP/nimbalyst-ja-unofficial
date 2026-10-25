# Nimbalyst — Unofficial Japanese Edition

An unofficial Japanese-language build of Nimbalyst, based on version 0.82.1.

Japanese localization covers desktop menus, settings, file management, AI sessions, trackers, dialogs, and other parts of the user interface. The display language can be switched between Japanese and English.

This project is not affiliated with, endorsed by, or supported by Nimbalyst, Inc.

[日本語](README.md) · [English Wiki](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Home-English) · [Japanese Wiki](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki) · [Release notes](RELEASE_NOTES_v0.82.1-ja.1.md#english)

## Downloads and requirements

**v0.82.1-ja.1 is a regular Windows x64 release.** Download the NSIS installer, portable ZIP, source ZIP, and `SHA256SUMS.txt` from the [versioned release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1). See the [Windows installation guide](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Windows-Installation-English) for installation and updates.

The Windows application and installer are unsigned. SmartScreen or other security software may display warnings. Do not disable protections; verify the source, version, and SHA-256. A matching hash establishes byte equality, not a verified publisher or a safety guarantee.

The previous stable [v0.81.7-ja.3](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.81.7-ja.3) and its [verification record](RELEASE_NOTES_v0.81.7-ja.3.md) are retained. v0.81.7-ja.2 remains a source-only prerelease. `ja.1` is this edition's update number. SemVer treats the hyphen suffix as a prerelease identifier, but this GitHub Release is designated a regular stable release.

The base is upstream v0.82.1, pinned to `583ae0244dae266667be579733d6c571fd74e037`. Features and fixes differ from the latest official release. Testing does not cover every Windows configuration. No distributions for other operating systems are provided.

## Display language

Select System, English, or Japanese in display-language settings. This is separate from the agent's response language and does not translate user documents or external service responses. Resources contain 27 namespaces and 14,608 keys in each language. Key parity, empty translations, and interpolation consistency were checked; matching keys do not establish complete UI translation.

Typeahead and session-reference accessibility strings follow the display language. External screen-reader behavior has not been tested. See the [display-language guide](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Display-Language-English).

## Updates and authentication

- Updates are manual through this repository's Releases. Official automatic updates and manual update checks are disabled.
- Running alongside the official Nimbalyst application is not supported. The application ID is `jp.meistertech.nimbalyst.ja.unofficial`; default user data is stored under `%APPDATA%\Nimbalyst 日本語版（非公式）`. Official data is not moved or deleted.
- The Windows build does not claim the default `nimbalyst://` handler. Authentication uses an instance-specific, nonce-protected localhost callback. Open authentication email on the same PC running the application. Do not share authentication URLs or tokens.
- Logout clears local authentication state; it does not guarantee service-side session revocation.
- Uninstallation targets registrations and shortcuts owned by this edition and retains user data.

See [account authentication](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Account-and-Authentication-English) and [compatibility and limitations](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Compatibility-and-Limitations-English).

## Verification and limitations

The ordinary Windows product was observed switching languages, retaining each language after restart, completing email sign-in, saving encrypted credentials, restoring the account, logging out, and remaining signed out after restart. Fresh installation, updating from v0.81.7-ja.3 with test settings and documents retained, and ordinary uninstallation were also checked. The final payload has 1,910 files byte-identical to the natively tested product; the remaining file differs only in the third-party license JSON generation timestamp. Installation and removal of the final NSIS itself, and verification of all 1,911 payload files, also succeeded.

Typecheck passed in 38 workspaces, and all seven bundle budgets passed. Linux recorded 19,130 passed, 30 skipped, and zero failed tests. iOS recorded 527 executed, six skipped, and zero failed tests. CI ran on `ae08d2235bab5e9c832c0ae32631bb3a94544704`, not the exact final source SHA. Subsequent changes are documentation, generated declarations, and license-generation timestamps; implementation and test code are unchanged.

Known Windows test failures involving symlink-fixture EPERM and missing `/bin/sh` remain recorded. Sandbox tests that stop during fixture creation do not verify the rejection behavior itself. No all-Windows-tests-passed claim is made.

Google sign-in, special authentication recovery, server-side revocation, effective NTFS access involving other users, external screen readers, and complete coverage of screens, DPI settings, and dynamic translations remain unverified. The static audit's 653 dynamic candidates and 382 unresolved scopes are not counts of missing keys or confirmed defects. Unverified areas are not established vulnerabilities. See [testing and verification](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification-English).

## Build from source

Use Node.js 24 or later, the repository's pnpm 12.9.1, and the required Windows native build tools.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @nimbalyst/i18n run build
corepack pnpm run build:workspace-deps
corepack pnpm --filter @nimbalyst/collab-bundle run build
corepack pnpm --filter @nimbalyst/runtime run build
corepack pnpm --dir packages/electron run build:win
```

NSIS output is written to `packages/electron/release`. Local builds without signing credentials are unsigned. Run typecheck with `corepack pnpm run typecheck`. Successful packaging does not establish successful startup or authentication. See [building from source](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Building-from-Source-English) and the [localization architecture](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Localization-Architecture-English).

## License

[MIT License](LICENSE). The original `Copyright (c) 2024-2026 Nimbalyst Inc.` and license text are retained. Bundled third-party software remains subject to its own licenses. The [inventory](packages/electron/resources/generated/THIRD_PARTY_LICENSES.json) and [notices](packages/electron/resources/generated/THIRD_PARTY_NOTICES.txt) are included under `resources/legal` in Windows packages.

[Original Nimbalyst repository](https://github.com/nimbalyst/nimbalyst)
