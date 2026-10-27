[日本語](Testing-and-Verification) | English

# Testing and Verification

## v0.82.3-ja.2

This revision covers the corrected publication source and new Windows NSIS and portable ZIP packages with 16 updated bundled guides. The fixed upstream baseline remains `84dcc00f3cd0abbb36eafc6bfad9389f960076db`; older binaries are not simply renamed. Native observations, resource/unit tests, type/budget checks, CI on the publication commit and full payload comparisons cover distinct requirements.

### Static checks and related tests

- All 38 workspace typechecks and seven initial-load size budgets passed without raising their limits. The editor measures 369,922 / 370,000 gzip bytes and docs-ui 89,138 / 92,000 gzip bytes.
- Resources contain 27 namespaces and 14,795 keys in each language. Key/interpolation differences, unapproved empty translations and missing statically resolved references were zero. The 436 dynamic candidates and 200 unresolved scopes have not been exhaustively exercised at runtime; these are not defect counts.
- After correcting the About baseline label and a race that restored discarded organization-creation state from a late response, all 38 workspace typechecks and the related batch passed: 12 test files and 104 tests, zero failures and zero skips, covering language behavior, authentication contracts, update isolation and organization creation. Earlier batches of 11 files / 83 tests and individual checks overlap and are not added to this total. Windows credential tests use a disposable private-profile fixture to check real DACLs, junction rejection and an unchanged target. They do not establish repair of arbitrary permissive ACLs or effective access by another user.
- The Windows ZIP, NSIS application payload and win-unpacked were regenerated in the normal build configuration after correcting About's baseline label to 0.82.3 and fixing the organization-creation race. Each contains 1,913 files with matching paths, sizes and SHA-256 hashes. CRC and physical extraction, integrity of all 1,021 ASAR files and byte-for-byte equality of the 16 bundled guides with their Git blobs were checked again, rather than reusing results from the earlier binary.
- Packaged Electron 43.7.0 / ABI 148 loaded better-sqlite3 through the resolution paths used by the SQLite Workers and queried an in-memory database. The ONNX module loaded, and node-pty produced the expected output and normal exit from a dedicated child process. These checks did not start Worker threads or establish GUI behavior, every terminal feature or authentication with agent services.

### Startup and upgrade in the ordinary Windows product

The new NSIS containing the organization-creation fix was installed with a dedicated fresh profile. Native checks covered Japanese resolved from System, settings, menus, Workspace and the editor. Switching to English updated the interface immediately and English persisted after normal shutdown and restart. System resolved back to Japanese, and explicit Japanese selection also persisted after restart. Japanese Tracker and one copied guide's contents in the ordinary editor were observed. The Japanese/English About version and baseline observations belong to the earlier candidate; corrected labels in the new package were checked statically rather than claiming a new About GUI observation.

A separate dedicated copy was opened in v0.82.3-ja.1, where one 120-byte test document and a newly created Tracker item specific to that copy were checked and saved before upgrading through the new NSIS. The English setting/display, document contents and SHA-256, and Tracker title were retained; document and Tracker display were also observed after restart. All 1,913 application-payload files in the updated installation match the new win-unpacked. Ordinary uninstall retained all file hashes for 93 fresh-profile files and 92 upgrade-profile files. Removal of this edition's owned registrations/shortcuts and preservation of 13 sampled protocol/default-association/UserChoice entries were checked. The new ZIP was subsequently launched with English and Japanese displays and ended normally. This does not establish compatibility with every existing dataset or preservation of the entire Windows registry.

### Observed startup delay and guide-display scope

The first restart in the upgrade test recorded roughly 10–125-second Main-process stalls and a temporarily unresponsive window on this Windows host. A security product displayed connection prompts during the same period; this does not establish it as the cause. The application recovered without changing protection settings. A contained recheck of the same older profile using the final ZIP with the same payload displayed the screen in about seven seconds and completed document/Tracker operations and normal shutdown. It still recorded one roughly 550ms Main-process delay, not zero lag. The original long delay's cause and recurrence conditions remain unknown; these observations do not establish a permanent fix.

Those observations belong to the candidate preceding the organization-creation fix. Two normal shutdowns of the new candidate took about 9.8 seconds from the start of quitting to completed cleanup. Logs recorded PostHog flush errors and roughly 9.7-second Analytics shutdown waits; each process exited without forced termination. This is not instantaneous shutdown or proof that the delay is resolved, nor does it establish the same cause as the earlier 125-second startup stall.

Selecting a bundled guide through File → Open displayed “Open a workspace to get started” rather than its contents; this guidance remained in English even with Japanese UI selected. The relevant code matches the baseline source, but this was not reproduced in a baseline product binary. Separately, one copied SDK guide with bytes and SHA-256 identical to the bundled file was displayed in the ordinary editor from a dedicated workspace. Placement and byte equality of all 16 guides are distinguished from rendering that single copy. Direct access through the dedicated documentation entry and native display of all 16 guides have not been verified.

Production authentication has not been repeated on this binary. Email sign-in, encrypted storage, restoration and logout observed in earlier products remain historical results for those versions. Google sign-in, special recovery, service-side session revocation, cross-user NTFS effective access, external screen readers, every DPI configuration and complete dynamic-translation coverage remain unverified.

Known Windows tests fail with EPERM when creating the CLI symlink fixture and sandbox symlink-file and ancestor-directory fixtures, before the relevant assertions run. Success on Linux does not establish the rejection behavior on Windows. Results for earlier versions and development commits below are not reused as CI execution results for this release.

CI on the final commit containing the organization-creation fix remains a separate publication gate from these local checks and new-product observations. A preceding commit's Linux success is not reported as execution on the new product code's identical SHA.

## v0.82.3-ja.1

Qualification covers the Windows NSIS and portable ZIP rebuilt from product-fix commit `1c1d54a851c340a8f0f9afc304379882a7319fa1`. Both package payloads, ASAR, native ABI, Workers and all 1,913 ZIP files were checked; actual SQLite Worker, ONNX and node-pty loading was observed. In the ordinary product, English Settings, menus, Project Manager and Workspace views were observed and English persisted after restart. With the language setting set to System, Japanese appeared in the Renderer and native menus and remained after Ctrl+Q shutdown and restart. Persistence of an explicit `ja` setting has not been checked. The auxiliary-error warning passed English and Japanese DOM tests but has not been observed in the ordinary product. Authentication and NSIS installation, upgrade and removal were not exercised on this build; earlier product records are historical.

For final qualification commit `4a642e5c95d174a9df8deaf8712ca8560b738d11`, [Linux run `40277550288`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40277550288) passed: 2,340 test files passed, seven skipped, zero failed (2,347 total); 19,296 tests passed, 30 skipped, zero failed (19,326 total). [iOS run `40277550251`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40277550251) completed with 522 passed, six skipped and zero failed (528 total). These runs do not target the publication-documentation commit's identical SHA. Older release and development results below remain historical for their respective commits.

Organization recovery was assessed using existing mocks, DOM/unit/integration tests and an upstream-diff audit only. No real or dummy organization was created; ordinary-product recovery-form display, server state transitions and independent real-client E2E remain unverified. The updated sync server is required. Regression tests for the earlier observed post-request session-metadata reminder failure now cover Provider/Protocol, Main, parser and UI behavior. Whether the earlier live capacity incident used the same path, and whether the warning appears in the ordinary product, remain unknown. Three Windows fixture EPERM failures remain unpassed and are separate from Linux results. Older results below remain historical.

## v0.82.1-ja.1

The [release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1) and SHA256SUMS.txt identify source and distributions. Verification covers 38 workspace typechecks, seven initial-load budgets and resource consistency across 27 namespaces with 14,608 keys per language. docs-ui measures 89,138 of its 92,000 gzip-byte limit.

The ordinary Windows build's EXE, ASAR and Workers match the native-tested product byte for byte; the only rebuilt payload difference is the license JSON generation timestamp. The final NSIS also passed installation, all 1,911 payload hashes and ordinary uninstall. Physical restoration, hashes and CRC checks passed for 9,643 source files and 1,911 Windows ZIP files. Authentication, language and upgrade observations apply through that matching product code. Linux/iOS commit identities and counts appear in the development-commit table below; CI was not run on the identical final documentation/declaration commit SHA.

Static checks, unit tests, development E2E tests, product GUI checks and live authentication cover different behavior. Matching resource counts and successful builds do not establish complete UI or authentication coverage.

## Published stable v0.81.7-ja.3

The release commit is [`0871b7872bb9d043ff07acfaf62a3deb0eb6aef2`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/commit/0871b7872bb9d043ff07acfaf62a3deb0eb6aef2). Its [release notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.81.7-ja.3/RELEASE_NOTES_v0.81.7-ja.3.md) identify the builds and verification scope.

- Typechecking passed in 38 workspaces, along with 34 tests covering size reduction, delayed forms and language propagation.
- Resources contain 27 namespaces and 14,579 keys per language. Key shapes, interpolation and statically resolvable references are checked.
- The final distribution was checked for language switching and restart persistence, Local Wiki forms, load-failure notifications with the workspace preserved, and normal shutdown.
- Production email authentication, encrypted storage, restoration, logout and NSIS upgrade/uninstall reuse observations from an earlier product build with unchanged authentication code. These were not repeated on the final distribution itself.

Complete runtime coverage remains unverified for 651 dynamic translation candidates and 382 unresolved scopes. These are not defect or missing-key counts.

## Post-release CI and development branch

The published version retains failed [Linux CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40069697146) and [iOS test](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40069697221) results. The [Android build](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40069697158) succeeded; this does not establish behavior on an Android device.

For development commit [`ae08d2235bab5e9c832c0ae32631bb3a94544704`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/commit/ae08d2235bab5e9c832c0ae32631bb3a94544704), which includes subsequent corrections, the following results were checked on October 25, 2026:

| Environment | Result |
| --- | --- |
| [Linux CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40151947723) | Test Files: 2,320 passed, 7 skipped, 0 failed. Tests: 19,130 passed, 30 skipped, 0 failed |
| [iOS tests](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40151947722) | 527 executed, 6 skipped, 0 failures |

Development-branch success does not rewrite failures recorded for the published tag or indicate a new Windows release. The linked source includes page leave, replacement and load-completion tests for iOS.

## Windows environment-dependent tests

Comparison with fixed upstream source on the same Windows host identified EPERM while creating three CLI/sandbox symlink fixtures, and ENOENT from missing `/bin/sh` in a commit-hook test. Tests that stop during fixture creation do not exercise symlink rejection itself. These tests are retained.

Linux success and unverified Windows behavior are recorded separately. An unverified area is not a confirmed defect or vulnerability.

## Verification methods

Type checks, related unit tests and resource audits are supplemented by measuring all seven initial-load entries under the same gzip conditions when imports change. In v0.81.7-ja.3, docs-ui decreased from 92,295 to 89,138 gzip bytes while retaining its 92,000-byte limit. Those historical measurements do not replace size checks for v0.82.3-ja.1. Delayed forms are also checked for display, cancellation, reopening and import failure.

Windows distribution checks cover ASAR, Workers, native ABI, PE metadata, licenses, hashes of every ZIP file and physical restoration. Reusing native observations for another artifact requires source, configuration and binary correspondence. These checks do not establish coverage of every screen, DPI, external screen reader or authentication path.

[Limitations](Compatibility-and-Limitations-English) · [Building from Source](Building-from-Source-English) · [Following Upstream](Following-Upstream-English)
