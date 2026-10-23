# Nimbalyst — Unofficial Japanese Edition

An unofficial Japanese-language build of Nimbalyst, based on version 0.81.7.

Japanese localization covers desktop menus, settings, file management, AI sessions, trackers, dialogs, and other parts of the user interface. The display language can be switched between Japanese and English.

This project is not affiliated with, endorsed by, or supported by Nimbalyst, Inc.

[日本語](README.md) · [Windows guide](docs/WINDOWS_JA_UNOFFICIAL.md#english) · [Next-version changes](RELEASE_NOTES_v0.81.7-ja.3.md#english)

## Availability and downloads

The published **v0.81.7-ja.2 is a source-only prerelease**, available from [GitHub Releases](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases). That release contains no Windows installer, portable ZIP, or executable binary. Its [release notes](RELEASE_NOTES_v0.81.7-ja.2.md) preserve the verification status at publication.

This source is an **unpublished candidate for v0.81.7-ja.3**. It targets an unsigned Windows x64 build. Final verification of real-account authentication, credential storage and recovery, and access controls is incomplete, so distribution readiness remains undecided. There is no candidate download link or published candidate binary.

### Unsigned builds

Locally generated Windows applications and installers for this edition are unsigned. They have no certificate-verified Windows publisher. Product names and publisher strings in application metadata are not code signatures.

SmartScreen or other security software may display warnings. This project does not instruct users to disable protections or warnings. Do not run a file whose source, version, and SHA-256 you cannot verify. A matching SHA-256 establishes byte equality with the published file; it does not authenticate the publisher or establish safety. See the [Windows guide](docs/WINDOWS_JA_UNOFFICIAL.md#english) for verification steps.

## Version and requirements

- Base: Nimbalyst desktop v0.81.7
- Pinned upstream: `e14ddf383a8dbb40e511fc2c2ea50273d08e3579`
- Windows candidate: x64. Testing does not cover every Windows version, configuration, or security product.
- Build tools: Node.js 24 or later and pnpm 12 or later. The repository specifies **pnpm 12.9.1** and **Electron 43.7.0**. Dependencies are locked by `pnpm-lock.yaml`.
- Features and fixes differ from the current official release. This edition does not automatically track the latest official main branch.
- macOS, Linux, Android, and iOS distributions and native behavior are outside this Windows candidate's verification scope.

## Display language

Choose Japanese or English in the display-language settings. This is separate from the preferred language for an agent's responses. It does not automatically translate user documents or external service responses.

The candidate adds localization for About, Settings, comment notices, shared-project errors, Git repair drafts, file creation and save/export dialogs, and bundled command descriptions. A new tutorial is selected using the display language at creation time. Switching languages does not rewrite an existing or edited tutorial.

The candidate's translation resources contain 27 namespaces and 14,551 keys in each language. Matching keys and interpolation tokens have been checked; this is not complete runtime verification of all screens or dynamic references.

Static Wiki export accepts `nim wiki export --static <dir> --ui-language system|en|ja`. The CLI defaults to the system language. Programmatic exports default to English for compatibility. Wiki translations load namespaces on demand. This describes the source here, not availability in published npm packages.

## Updates, authentication, and the official release

- Downloading and applying official updates, including manual update checks, are disabled. Updates are manual, using this repository's published releases.
- **Running this edition alongside the official Nimbalyst application is not supported.** Application identity, default installation location, and user-data location are separated, but that is not a coexistence guarantee.
- The Windows application ID is `jp.meistertech.nimbalyst.ja.unofficial`. The default user-data directory is `%APPDATA%\Nimbalyst 日本語版（非公式）`. Existing official data is not moved or deleted.
- Authentication is configured to use an instance-specific, nonce-protected `http://127.0.0.1:<port>/auth/callback`. Do not share authentication URLs or tokens. Final verification of real-account sign-in and recovery is incomplete.
- The Windows build does not claim the default `nimbalyst://` handler. Non-authentication links using that scheme may open in the currently registered application.
- The installer adds this edition's Markdown “Open with” entry without changing extension defaults or Explorer UserChoice. Uninstallation targets registrations still owned by this installation and retains user data.

## Verification and limitations

The preceding local Windows validation package was tested for installation, SQLite Worker startup, Japanese/English switching, persistence after restarting in both languages, selected screen layouts, and normal uninstallation. The same extracted payload was launched in four selected locations, and monitored existing settings and associations were retained. These results **do not verify a new v0.81.7-ja.3 package**.

- That baseline passed typecheck in 38 workspaces and 591 related tests across 60 files. This is neither a full-suite pass nor a guarantee of real-account authentication.
- Four test failures reproduced on the same Windows host with the pinned upstream remain recorded: CLI symlink-fixture EPERM, commit-hook `/bin/sh` ENOENT, sandbox symlink-file-fixture EPERM, and sandbox symlink-ancestor-fixture EPERM. The latter two fail during fixture creation and do not verify the sandbox rejection behavior itself.
- Earlier full-suite runs did not complete; no all-tests-passed claim is made. A large CLI upload stalled in a particular environment, without establishing a failure on every host.
- Final candidate verification of real-account authentication, encrypted storage, NTFS ACLs, and some Stytch recovery paths is incomplete. Unverified areas are not confirmed vulnerabilities or defects.
- Complete runtime coverage of 119 dynamic translation references, 370 legacy references whose namespaces were unresolved in an earlier static audit, and unvisited screens, tooltips, and accessibility labels remains unproven. These counts are not counts of missing keys or confirmed defects.
- No product-wide zero-English claim is made. User content, external errors, technical identifiers, existing notices, and legacy collaboration data may contain English. Older clients' “Teammate” values are preserved because they cannot be distinguished from real user names.
- Observed screens, zoom levels, and placements do not establish coverage of every screen, DPI, device, or external Browser/Embed host.

## Build from source

Use a Node.js environment with Corepack and run these commands from the repository root. Environments that rebuild native dependencies also need the corresponding native build tools.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @nimbalyst/i18n run build
corepack pnpm run build:workspace-deps
corepack pnpm --filter @nimbalyst/collab-bundle run build
corepack pnpm --filter @nimbalyst/runtime run build
corepack pnpm --dir packages/electron run build:win
```

The repository's `build:win` script builds Electron, Workers, Sandbox, and extensions, validates resources, and produces a Windows x64 NSIS installer under `packages/electron/release`. A local build without signing credentials is unsigned. `ALLOW_UNSIGNED_WINDOWS_BUILD=true` permits an intentionally unsigned CI build; it does not waive validation or authorize publication.

Run typecheck with `corepack pnpm run typecheck`. Successful packaging does not verify installation, startup, authentication, or uninstallation. Verify the final source-to-artifact correspondence, actual launch, and data separation separately. See the [Windows guide](docs/WINDOWS_JA_UNOFFICIAL.md#english) for portable-build handling.

## License

The source is provided under the [MIT License](LICENSE). The original `Copyright (c) 2024-2026 Nimbalyst Inc.` and license text are retained.

Bundled third-party software remains subject to its own licenses. See the [license inventory](packages/electron/resources/generated/THIRD_PARTY_LICENSES.json), [notices](packages/electron/resources/generated/THIRD_PARTY_NOTICES.txt), and [license audit](packages/electron/resources/generated/THIRD_PARTY_LICENSE_AUDIT.md). Windows packages include them under `resources/legal`.

[Original Nimbalyst repository](https://github.com/nimbalyst/nimbalyst) · [Japanese README](README.md)
