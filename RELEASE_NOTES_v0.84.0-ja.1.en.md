# Nimbalyst — Unofficial Japanese Edition v0.84.0-ja.1

An unsigned Windows x64 regular Release. [Assets](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1) are the Setup EXE, Portable ZIP, corresponding Source ZIP and SHA256SUMS.txt. This is not an official Nimbalyst, Inc. product.

Upstream v0.84.0 is a GitHub prerelease. This unofficial edition is distributed as a regular GitHub Release and Latest; this is not upstream certification or a stability guarantee. `v0.84.0-ja.1` still contains a SemVer prerelease identifier; GitHub classification does not change that meaning.

## Upstream and edition-specific changes

Integrates upstream v0.83.0 and v0.84.0 changes since v0.82.8: Claude Fable 5.2 selection, batched queue delivery, Git-panel branch switching, Workstreams, folder-scoped commit proposals, nested Markdown list preservation, hidden-entry counts, Wiki publishing, SQLite backups and tool-output retention. Edition-specific changes add Japanese UI text and fix explicit profile boundaries and Windows file/path handling. Integration does not establish live verification of every feature.

Retains Japanese/English/System selection, separate application identity/settings/data, nonce-protected localhost authentication, disabled official updates and manual updating. Explicit isolated profiles now validate CLI arguments and persistence paths across restart and second instances, rejecting inconsistent settings/database boundaries. This is not a guarantee across every OS state, link race or concurrent-use condition; running alongside the official edition remains unsupported.

## Verification scope

Startup, Japanese/English switching, normal shutdown and language retention after restart were observed with final Windows 07d win-unpacked, fully extracted Portable and NSIS products. Fresh NSIS installation and NSIS/Portable upgrades from v0.82.8-ja.1 retained settings, synthetic-document hashes and displayed Tracker data in dedicated environments. This does not guarantee migration of every real profile or database field. Normal NSIS uninstallation retained dedicated user data; Start Menu registration checks were limited to the isolated environment. Downgrades are unverified.

Production email sign-in, encrypted credential-file creation, normal shutdown and restoration after restart, normal sign-out, credential-file removal and unauthenticated state after another restart were observed with the regular final Windows 07d win-unpacked product and a dedicated profile. New sign-in with the dedicated NSIS profile or a separate Portable profile, Google sign-in, service-side session revocation and special recovery remain unverified. These are Electron account observations, separate from Node credential-file tests.

The product-verification baseline is `29fdcc216f354cd1031dc9ef36672a5399bd6775` (product input `a7f82db90`, differing by one unit-test file). The Windows full Vitest run completed with 20,182 PASS / 108 FAIL / 37 SKIP and exit 1. All 108 remain unresolved. R22 has failures with the same path and test name for 99 cases, but names do not establish identical causes or harmlessness; neither all-new major regressions nor all-environment-only failures are established. All 39 workspace typechecks and seven existing size limits passed. Linux’s 20,296 PASS / 0 FAIL / 31 SKIP, Android Build SUCCESS (signed job skipped) and iOS 522 PASS / 0 FAIL / 6 SKIP are separate from Windows full-suite success.

Windows binaries reuse verified07d after confirming unchanged product inputs; the Source ZIP is generated from the final publication tag after documentation updates. Windows was not rebuilt from that documentation commit. Final-source CI Run IDs and asset SHA-256 values are recorded in the [Release body](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1).

## Limitations and installation

High CPU use with long Markdown remains unresolved. Wiki context under load, general resolution of Windows terminal resource retention, all dynamic translations, DPI settings and external screen readers are not comprehensively verified. Windows symlink fixture EPERM leaves rejection behavior untested on that host. Real microphones, speech-recognition APIs, live sync/collaboration servers, real organizations and old/new server interoperability are unverified. Wiki publishing and team permissions require a compatible server. Unverified areas are not equivalent to confirmed defects or vulnerabilities.

Shared resources contain 27 namespaces and 15,557 keys per language, with zero key or interpolation differences. One single-space value is an intentional shared formatting separator. The 489 dynamic-call candidates and 211 unresolved namespace scopes are not counts of missing translations or defects. This is not complete UI, dynamic-path or accessibility coverage; some dictation buttons still have English labels. User documents, AI answers and external responses are not automatically translated.

The assessment is **GO WITH KNOWN LIMITATIONS**. Read [known limitations](docs/KNOWN_LIMITATIONS_v0.84.0-ja.1.md#english) and [Windows installation/update](docs/WINDOWS_JA_UNOFFICIAL.md#english). Updates are manual. Extract the entire ZIP payload, not just its EXE. A matching SHA-256 is not a digital signature or safety guarantee. MIT and bundled third-party LICENSE/NOTICE files are retained.

[日本語](RELEASE_NOTES_v0.84.0-ja.1.md)
