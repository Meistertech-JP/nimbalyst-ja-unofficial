[日本語](Testing-and-Verification) | English

# Testing and Verification

## v0.82.3-ja.1

Qualification covers the Windows NSIS and portable ZIP rebuilt from product-fix commit `1c1d54a851c340a8f0f9afc304379882a7319fa1`. Both package payloads, ASAR, native ABI, Workers and all 1,913 ZIP files were checked; actual SQLite Worker, ONNX and node-pty loading was observed. In the ordinary product, English Settings, menus, Project Manager and Workspace views were observed and English persisted after restart. With the language setting set to System, Japanese appeared in the Renderer and native menus and remained after Ctrl+Q shutdown and restart. Persistence of an explicit `ja` setting has not been checked. The auxiliary-error warning passed English and Japanese DOM tests but has not been observed in the ordinary product. Authentication and NSIS installation, upgrade and removal were not exercised on this build; earlier product records are historical.

The earlier Linux result below is historical for commit `f0c7b7929f18f57c6efac96f61154cfe442b4c74`. Linux run `40269849525` for the product fix passed: 2,340 test files passed, seven skipped, zero failed (2,347 total); 19,296 tests passed, 30 skipped, zero failed (19,326 total). iOS run `40269849613` passed 528 tests: 522 passed, six skipped, zero failed. The earlier Linux result is kept distinct because it belongs to a different commit.

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

Type checks, related unit tests and resource audits are supplemented by measuring all seven initial-load entries under the same gzip conditions when imports change. In the published version, docs-ui decreased from 92,295 to 89,138 gzip bytes while retaining its 92,000-byte limit. Delayed forms are also checked for display, cancellation, reopening and import failure.

Windows distribution checks cover ASAR, Workers, native ABI, PE metadata, licenses, hashes of every ZIP file and physical restoration. Reusing native observations for another artifact requires source, configuration and binary correspondence. These checks do not establish coverage of every screen, DPI, external screen reader or authentication path.

[Limitations](Compatibility-and-Limitations-English) · [Building from Source](Building-from-Source-English) · [Following Upstream](Following-Upstream-English)
