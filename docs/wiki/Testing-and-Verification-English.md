[日本語](Testing-and-Verification) | English

# Testing and Verification

## v0.84.0-ja.1

Upstream v0.84.0 is a GitHub prerelease. This unofficial edition is distributed as a regular GitHub Release and Latest; this is not upstream certification or a stability guarantee. `v0.84.0-ja.1` still contains a SemVer prerelease identifier; GitHub classification does not change that meaning.

### Verification target

The results below cover the v0.84.0-ja.1 distribution. Its source commit is **a2f2fbccdb10c3542222851e07f945dbb774ca91**, tree **b90b2ae82cd5b23e2a035189c02c0af48556a364**.

| Scope/environment | Run ID | PASS / FAIL / SKIP or result |
| --- | --- | --- |
| main, Linux CI | [43723712039](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43723712039) | 20,296 / 0 / 31; all five jobs SUCCESS |
| main, Android | [43723712088](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43723712088) | Unsigned APK/AAB and Gradle unit task SUCCESS; signed job SKIP; individual case count not emitted |
| main, iOS | [43723712100](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43723712100) | 528 executed: 522 PASS / 0 FAIL / 6 SKIP; Simulator and Transcript checks SUCCESS |
| final-a2 PR, Linux | [43718950152](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43718950152) | 20,296 / 0 / 31, SUCCESS |
| final-a2 PR, Android | [43718950189](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43718950189) | SUCCESS; signed job SKIP |
| final-a2 PR, iOS | [43718950130](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43718950130) | 528 executed: 522 PASS / 0 FAIL / 6 SKIP, SUCCESS |

### Published assets and post-publication checks

Release ID446131556 was published at 2026-11-15 23:51:17 JST with Draft=false, Prerelease=false and Latest=true. Annotated tag object d0a95c7ffb94ddb3539ba5f49c853da1a6282e59 points to a2.

| File | bytes | SHA-256 |
| --- | ---: | --- |
| nimbalyst-0.84.0-ja.1-windows-x64-setup.exe | 484,693,329 | `1df7a78d12e4ed1ba3cf17d85b22be2201a25bc5bf9922b2ced9d49dae3e9c66` |
| nimbalyst-0.84.0-ja.1-windows-x64-portable.zip | 628,480,194 | `2501d5337704bf5fb78a6eeada7860127627d4d69aec828223f6084b50ed4cb5` |
| nimbalyst-0.84.0-ja.1-source.zip | 56,381,300 | `f64950bd91b56808903156890cfcddc1e4ec88b162885957b811ce0e4b8788ba` |
| SHA256SUMS.txt | 322 | `22c036c133181791c27333b23d315517a8cd6a38e7c3d40c749bb8f3e3d3a587` |

All four files were downloaded without credentials and matched originals, API digests and computed hashes. All 9,971 Source ZIP paths/blobs/modes and CRCs were checked. Portable checks covered every one of its 1,915 files (2,331 entries including directories), CRC, content and path safety: no missing, extra, duplicate or unsafe paths. A separate auditor independently downloaded files and compared them with public Git/API/Wiki state. Independent NSIS payload extraction, GUI and authentication re-execution were NOT RUN. Previous tags and Release assets were retained.

Shared-resource audits recorded 27 namespaces and 15,557 keys per language, with zero key/interpolation differences. Retained static records found no missing references among 11,523 literals. The 489 dynamic candidates and 211 unresolved scopes are not defect counts or complete runtime coverage. One shared single-space formatting separator is intentional.

The product-verification baseline is `29fdcc216f354cd1031dc9ef36672a5399bd6775` (product input `a7f82db90`, differing by one unit-test file). The Windows full Vitest run completed with 20,182 PASS / 108 FAIL / 37 SKIP and exit 1. All 108 remain unresolved. R22 has failures with the same path and test name for 99 cases, but names do not establish identical causes or harmlessness; neither all-new major regressions nor all-environment-only failures are established. All 39 workspace typechecks and seven existing size limits passed. Linux’s 20,296 PASS / 0 FAIL / 31 SKIP, Android Build SUCCESS (signed job skipped) and iOS 522 PASS / 0 FAIL / 6 SKIP are separate from Windows full-suite success.

Fixed CI evidence for product baseline 29: [Linux43708311391](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43708311391), [Android43708311340](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43708311340), [iOS43708311334](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/43708311334). These are not Run IDs for the later documentation commit.

Startup, Japanese/English switching, normal shutdown and language retention after restart were observed with final Windows 07d win-unpacked, fully extracted Portable and NSIS products. Fresh NSIS installation and NSIS/Portable upgrades from v0.82.8-ja.1 retained settings, synthetic-document hashes and displayed Tracker data in dedicated environments. This does not guarantee migration of every real profile or database field. Normal NSIS uninstallation retained dedicated user data; Start Menu registration checks were limited to the isolated environment. Downgrades are unverified.

Production email sign-in, encrypted credential-file creation, normal shutdown and restoration after restart, normal sign-out, credential-file removal and unauthenticated state after another restart were observed with the regular final Windows 07d win-unpacked product and a dedicated profile. New sign-in with the dedicated NSIS profile or a separate Portable profile, Google sign-in, service-side session revocation and special recovery remain unverified. These are Electron account observations, separate from Node credential-file tests.

Shared resources contain 27 namespaces and 15,557 keys per language, with zero key or interpolation differences. One single-space value is an intentional shared formatting separator. The 489 dynamic-call candidates and 211 unresolved namespace scopes are not counts of missing translations or defects. This is not complete UI, dynamic-path or accessibility coverage; some dictation buttons still have English labels. User documents, AI answers and external responses are not automatically translated.

Final Windows artifacts reuse regular 07d (product input a7) after checking unchanged inputs. NSIS: 484,693,329 bytes/SHA-256 `1df7a78d12e4ed1ba3cf17d85b22be2201a25bc5bf9922b2ced9d49dae3e9c66`; Portable: 628,480,194 bytes/SHA-256 `2501d5337704bf5fb78a6eeada7860127627d4d69aec828223f6084b50ed4cb5`. All 1,915 Portable files/CRC, ASAR, workers, native ABI, SQLite, PTY, ripgrep and LICENSE/NOTICE were checked. The final Source ZIP is separately generated from the finalized publication tag and checked against Git blobs/modes/paths/CRC and physical restoration. This is not a Windows rebuild from the documentation commit.

High CPU use with long Markdown remains unresolved. Wiki context under load, general resolution of Windows terminal resource retention, all dynamic translations, DPI settings and external screen readers are not comprehensively verified. Windows symlink fixture EPERM leaves rejection behavior untested on that host. Real microphones, speech-recognition APIs, live sync/collaboration servers, real organizations and old/new server interoperability are unverified. Wiki publishing and team permissions require a compatible server. Unverified areas are not equivalent to confirmed defects or vulnerabilities.


## v0.82.8-ja.1

The fixed target is upstream release tag v0.82.8 at commit [`ab9da8f121e4e6fddebc523ced671863e8892ff6`](https://github.com/nimbalyst/nimbalyst/commit/ab9da8f121e4e6fddebc523ced671863e8892ff6). The Windows edition is unsigned.

- Typecheck: PASS across 39 workspaces.
- Translation resources: 27 namespaces and 15,401 keys per language; zero key, empty-Japanese-value or interpolation differences. Zero missing static references. The earlier classification of 484 dynamic references was not independently reconciled in full for this edition; this is not live verification of every external value or screen.
- Seven collab-bundle budgets: PASS (commenting-ui 40,177/44,000; canvas 151,352/160,000; editor 366,452/370,000; docs-ui 89,202/92,000; feedback-ui 35,089/35,500; trackers-ui 197,427/200,000; inbox 5,542/6,000 gzip bytes).
- Tests related to the latest localization changes: i18n 11 PASS, Settings routes 12 PASS, Windows shell-command installer 2 PASS / 4 SKIP. The four skipped cases exercise Unix shell/symlink conditions that do not apply on Windows; they are distinct from Linux/macOS results.
- A real-UI search in a 5,000-item Markdown document displayed the results and a match. No idle comparison with the document closed was performed, and the high-CPU issue remains unresolved.

[Linux CI](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/42800530294) on product-containing candidate commit `49eab4338e870e1f8b71c34662022f3cfbba2a8d` passed 19,896 tests, with 30 skipped and zero failures; [Android Build](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/42800530382) and [iOS Simulator](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/42802135881) also succeeded. These include voice and sync mocks but do not verify a real microphone, recognition API or external sync server. See [limitations](Compatibility-and-Limitations-English) for Windows authentication and update coverage, the incomplete Windows full suite, terminal resources and Wiki context under load.

## v0.82.7-ja.1

This section covers the [v0.82.7-ja.1 release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1), an unofficial Windows x64 edition based on fixed upstream v0.82.7 commit [`826adb4f93dbe86db35b76ce2502a3a33abe0489`](https://github.com/nimbalyst/nimbalyst/commit/826adb4f93dbe86db35b76ce2502a3a33abe0489). The quality decision is **GO WITH KNOWN LIMITATIONS**. The results below distinguish observed scope from unresolved issues; they do not mean that the Windows full suite passed.

### Translation resources and integrated changes

Resources contain 27 namespaces and 15,321 keys per language, with zero key differences, zero interpolation differences, and zero empty Japanese translations. This static consistency does not guarantee complete translation on every screen or dynamic path, nor does it translate external responses. Integrated upstream changes include colored text in Lexical 0.53, migration from PGLite to SQLite, Claude Code and Codex SDK updates, improvements to approval/question handling and long session-history loading, weekly usage history, Claude in Chrome support, Windows-specific Git/CLI fixes, Tracker local-number fixes, and changes originating in upstream issue #1889. Live paid-provider communication, an actual Claude in Chrome connection, and live collaboration-server or organization environments were not tested.

### Existing static and Linux verification

The [Linux comparison run `42008631197`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/42008631197) compared the fixed Japanese-edition source with fixed upstream: 19,754 PASS, 0 FAIL, 30 SKIP for the Japanese-edition candidate, and 18,533 PASS, 0 FAIL, 30 SKIP for upstream. This comparison covers Linux unit/static and related checks; it does not qualify Linux distributions or replace Windows testing.

Existing product-verification records show PASS for 39 workspace typechecks and all seven bundle-budget checks. These results apply to product verification, not documentation quality checks. Windows installation, upgrade, portable launch, immediate Japanese/English switching and persistence after restart, normal shutdown, uninstall, and PGLite-to-SQLite migration with synthetic data were checked. Migration of all real-user data is not guaranteed.

### Windows full suite and API paths

The Windows full suite did not complete successfully. On the validation host, same-process native loopback I/O stalled, and response HTML/CSP rewriting caused test failures. Separately, a locally instrumented run targeting the REST server spec evaluated 12 tests: 8 passed and 4 failed (exit 1). The failures included two HTML/CSP differences and two POSIX-style file-mode expectations on Windows; these 12 tests are not a Windows full-suite total. Major API tests using a real server in a separate process passed for both upstream and the Japanese edition. This confirms a limited communication path; it is not a Windows full-suite pass.

### Retained terminal resources

After a shell or CLI process exits naturally, terminal resources may remain until the app closes. This was observed in both upstream and the Japanese edition: after 20 natural exits, Main-process memory had increased by about 156 MiB, with MessagePort and ConPTY-related resources remaining. This is not an increase for every command run inside a persistent shell, and the 20-exit observation does not establish unbounded linear growth. Within the tested scope, no failure to create the next terminal, data loss, or inability to quit normally was observed; tracked resources were recovered after normal app shutdown. The underlying fix has not been made. Close a running terminal using the app's normal terminal control. If memory use increases, save your work, quit the app normally, and restart it. Closing a panel after its process has exited does not guarantee recovery.

### Long-document editing and Local Wiki

Large editable Markdown documents can cause elevated CPU usage. No Japanese-edition-specific worsening relative to upstream was observed in the comparison scope, but the root cause and behavior under all conditions remain unknown. Disabling accessibility features is not recommended.

Under heavy load, generation of additional context from the local Wiki at session startup may be delayed or omitted. A limited load comparison passed all three runs for each edition, but the direct cause of an earlier single timeout of about 4,450 ms remains unknown. This does not indicate data loss or corruption of ordinary Wiki editing.

Live Nimbalyst-account email and Google sign-in, special recovery, service-side session revocation, authentication or data recovery with a live collaboration server or organization, paid AI-provider communication, a Chrome connection, every dynamic translation path, every DPI and screen-reader condition, and migration of every real user's data remain unverified. Collaboration also requires a compatible sync server. Historical results and their target commits are documented separately below.

## v0.82.4-ja.1

Qualification covers the Windows x64 edition integrating fixed upstream v0.82.4 commit `031a6e6de0b7817bbdcd16e6e5e758e45dfdcdc7`. Native product observations, automated tests, static checks and source/package comparisons cover distinct scopes. Publication-documentation changes apply to a distribution only after checking correspondence of execution code, dependencies and build inputs.

### Fixed-source Linux validation

[Comparison run `40994285881`](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40994285881) executed candidate `68697952fac7b158201cf8ac56f4892b89d0e2f8` and unchanged fixed upstream using Node.js 24.16.0, pnpm 12.9.1 and each source's own frozen lockfile.

| Source | Test Files: PASS / FAIL / SKIP / total | Tests: PASS / FAIL / SKIP / total | Job |
| --- | --- | --- | --- |
| Japanese-edition candidate | 2374 / 0 / 7 / 2381 | 19585 / 0 / 30 / 19615 | SUCCESS |
| Fixed upstream v0.82.4 | 2143 / 1 / 7 / 2151 | 18373 / 1 / 30 / 18404 | FAILURE |

Upstream failed one test: `SecurityEncryptionSection.test.tsx > keeps an open recovery session when the custody status is checked again`. The same test passed in the candidate. Therefore the comparison workflow's overall result is **FAILURE**, while the candidate job is **SUCCESS**. Comparison results are not rewritten, and different test populations are not added together.

All 39 workspace typechecks, scripts/static checks, sandbox artifact/RPC tests (6), image/staging tests (17), publication-content checks and seven bundle budgets passed for the candidate. Linux sizes are commenting-ui 40,177 / 44,000; canvas 151,352 / 160,000; editor 361,344 / 370,000; docs-ui 89,202 / 92,000; feedback-ui 35,089 / 35,500; trackers-ui 196,249 / 200,000; inbox 5,542 / 6,000 gzip bytes. Windows measured trackers-ui at 196,386; the other six values match. Limits and measurement methods are unchanged.

### Translation, builds and packages

Resources contain 27 namespaces and 15,254 keys per language. Key/interpolation differences, unapproved empty translations and missing resolved static references were zero. The 735 dynamic candidates, 451 unresolved analysis scopes and 371 classified JSX English candidates are not missing-key or defect counts. They do not establish complete runtime or screen-reader coverage.

Builds passed for Runtime, Extension SDK, Electron Main/Renderer, Workers, extensions and tracker-builtins. Windows checks compared ASAR contents, all 1,911 ZIP files and physical restoration, 16 bundled guides and legal files. SQLite in-memory queries, PTY loading and Worker placement/ABI were checked using Electron 43.7.0 / Node 24.21.0 / ABI 148. PE FileVersion is 0.82.4.1 and ProductVersion is 0.82.4.0; the application is unsigned. The source ZIP must match every file in the formal tag's Git tree; an earlier candidate's file count or hash is not a fixed expectation for the final source archive.

### Ordinary Windows product observations

The final distribution payload was observed in Japanese, switched to English, normally closed/restarted with English retained, switched back to Japanese and restarted with Japanese retained. System also resolved to Japanese after restart on an unchanged ja-JP host. Native checks covered a 205-file list and file display; the same search implementation with 2,501 matches, navigation and maximize/restore highlight alignment; and transcript-image zoom 100→125→100 and Fit. These are not exhaustive DPI or quantified-performance tests.

Upgrade installation retained dedicated documents, language settings and Tracker metadata. Ordinary uninstall retained test settings and documents; the installed payload matched all 1,911 distribution files. ZIP startup and normal shutdown were also observed. The test data originated in an earlier official Japanese-edition release and passed through intermediate candidate updates; this is not a fresh direct upgrade from that release to the final payload. A sufficient retained Tracker-body fixture and every user-data compatibility path were not checked.

Production email authentication, encrypted storage, restart restoration, normal sign-out, credential-file removal and a signed-out restart were observed on an earlier normal product build with unchanged authentication/startup code. A new email sign-in was not repeated on the final payload. Google sign-in, special recovery, server-side revocation and effective NTFS access by another user remain unverified.

### NOT RUN and Windows limitations

Live collaboration with a real server/organization, interoperability with old/updated sync servers and production-organization recovery are **NOT RUN** because an isolated environment is unavailable. Live Bedrock requests, a new paid Claude session, actual OS sleep/resume, every nonforeground browser path and live retry after granting backend trust are also **NOT RUN**. Related automated code tests do not establish successful service execution. Complete dynamic-translation, screen-configuration and external screen-reader coverage is not claimed.

Windows retains unpassed or interrupted runs involving symlink-fixture EPERM, worktree path representation and large loopback writes on the host. The full Linux suite and all 17 sandbox staging/refusal tests passing do not turn unexecuted Windows assertions into successes. The failures and successes of earlier versions below remain historical for those versions.

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

## Historical observations collected from user guides

These records retain the version, test population and unverified scope previously recorded in user guides. They are not additional test counts to add to the sections above.

### Windows-Installation-English — v0.82.8-ja.1


Obtain the unsigned Windows x64 installer, portable ZIP, matching source ZIP and `SHA256SUMS.txt` from the [release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.8-ja.1). Compare each file with the checksums from that release. This unofficial edition is based on upstream v0.82.8. See [verification scope](Testing-and-Verification-English) and [limitations](Compatibility-and-Limitations-English).

### Windows-Installation-English — v0.82.7-ja.1


Obtain `nimbalyst-0.82.7-ja.1-windows-x64-setup.exe`, `nimbalyst-0.82.7-ja.1-windows-x64-portable.zip`, `nimbalyst-0.82.7-ja.1-source.zip`, and `SHA256SUMS.txt` from the [release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1). This is an unsigned Windows x64 edition based on upstream v0.82.7. Verify each filename and hash against the asset list and checksums from that same release. See the [release notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.7-ja.1/RELEASE_NOTES_v0.82.7-ja.1.md).

Windows installation, upgrade, portable launch, language switching and restart persistence, normal shutdown, uninstall, and migration from PGLite to SQLite with synthetic data were checked. Migration of every real user's data is not guaranteed. The Windows full suite also did not complete successfully. See [Testing and Verification](Testing-and-Verification-English) for the scope and [Compatibility and Limitations](Compatibility-and-Limitations-English) for limitations.

### Windows-Installation-English — v0.82.4-ja.1


Download `nimbalyst-0.82.4-ja.1-windows-x64-setup.exe`, `nimbalyst-0.82.4-ja.1-windows-x64-portable.zip`, `nimbalyst-0.82.4-ja.1-source.zip` and `SHA256SUMS.txt` from the [release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.4-ja.1). This is an unsigned Windows x64 regular stable release based on upstream v0.82.4. Automatic updates are disabled; follow the manual-update procedure below.

The ordinary product was checked for Japanese/English switching, persistence of explicit Japanese and English settings after restart, Japanese resolved from System, and file, search and image display. An earlier build with matching relevant product code was used for production email sign-in, sign-out and clean installation. The final distribution payload was checked for upgrade installation, retained settings/documents/Tracker items, ordinary uninstall and retained data. This does not establish every data-upgrade or authentication path. See [Testing and Verification](Testing-and-Verification-English) for the scope.

### Windows-Installation-English — v0.82.3-ja.2


Download `nimbalyst-0.82.3-ja.2-windows-x64-setup.exe`, `nimbalyst-0.82.3-ja.2-windows-x64-portable.zip`, the matching source ZIP and `SHA256SUMS.txt` from the [release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.2). This is an unsigned regular stable release. Its new packages include corrected bundled guides; they are not renamed older binaries. See [Testing and Verification](Testing-and-Verification-English) for native observations and unverified areas. Earlier results below remain historical.

### Windows-Installation-English — v0.82.3-ja.1


v0.82.3-ja.1 is an unsigned Windows x64 edition. The NSIS and portable ZIP packages were rebuilt from the product fix and their payloads checked. Installation, upgrade and removal have not been performed on this version; earlier product observations do not qualify these operations. Refer to the [release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.1) for distribution files. The procedures below describe general Windows installation and update operations.

### Windows-Installation-English — v0.82.1-ja.1


Obtain the Windows x64 NSIS installer, portable ZIP, source ZIP and SHA256SUMS.txt from the [stable release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1). Use the filenames listed in its assets. The application and installer are unsigned. The verification, installation, storage, manual-update and removal procedures below also apply.

Upgrade from v0.81.7-ja.3 retained the English setting, project, test document and SQLite backend. The document SHA-256 was unchanged. Ordinary uninstall retained test data after both fresh and upgraded installations; the 12 sampled association entries returned to their prior state. This was not a whole-registry comparison or a test of downgrade compatibility.

This distribution targets Windows x64. v0.82.1-ja.1 is an unsigned stable release. Running it alongside the official Nimbalyst application is not supported.

### Account-and-Authentication-English — v0.82.8-ja.1


Production email sign-in, encrypted credential-file creation, restart restoration and removal after normal logout were observed in an isolated profile using the unpacked Windows build. Restart and logout after the latest subsequent sign-in, and successful sign-in with the dedicated NSIS profile, were not reverified. Google sign-in, special recovery and service-side revocation remain unverified. See [details](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.8-ja.1/docs/KNOWN_LIMITATIONS_v0.82.8-ja.1.md#authentication).

### Account-and-Authentication-English — v0.82.7-ja.1


Live email authentication for a Nimbalyst account was not newly tested for v0.82.7-ja.1. Google sign-in, special recovery, and service-side session revocation also remained unverified. The procedures below and observations from earlier versions do not establish successful live authentication on that release. See [Testing and Verification](Testing-and-Verification-English).

### Account-and-Authentication-English — v0.82.4-ja.1


An earlier ordinary Windows product build with unchanged authentication/startup code was checked for production email sign-in, a same-PC localhost callback, encrypted storage, restart restoration, normal sign-out and a signed-out restart. A new email sign-in was not repeated on the final distribution itself. Regression tests cover nonce handling, fail-closed storage and prevention of state restoration from stale responses. Live callback modification/replay, Google sign-in, special recovery, server-side session revocation and effective NTFS access by another user remain unverified.

### Account-and-Authentication-English — v0.82.3-ja.2


Production authentication has not been repeated on this binary. Existing policies for nonce-protected localhost callbacks, encrypted storage and ordinary sign-out are retained, but source/contract-test checks differ from live sign-in in the ordinary product. Earlier authentication results remain historical results for those versions. Google sign-in, special recovery, server-side session revocation and cross-user NTFS effective access remain unverified.

### Account-and-Authentication-English — v0.82.3-ja.1


Authentication, NSIS installation, upgrade and removal were not repeated on the v0.82.3-ja.1 Windows build. The product changes did not alter authentication or installer inputs, but that is not a substitute for runtime checks. Authentication results from earlier products apply only to those versions. Google sign-in, special recovery, server-side session revocation and effective NTFS access by another user also remain unverified. The procedures and storage policies below describe the implementation.

### Account-and-Authentication-English — v0.82.1-ja.1


Production email sign-in was checked in the ordinary Windows product build, including a same-PC localhost callback, encrypted storage, authenticated restart, ordinary sign-out and a signed-out restart. Contract tests cover nonce mismatch and replay rejection; live account callbacks were not modified or replayed. Google sign-in, special recovery paths, server-side session revocation and effective NTFS access from other accounts remain unverified.

Nimbalyst accounts use the official Nimbalyst service. This fork does not provide a separate authentication server or account system. Signing in to Nimbalyst is separate from authenticating individual agents such as Claude, Codex, or Grok.

### Display-Language-English — v0.82.8-ja.1


Japanese/English switching and persistence after restart were checked in the Windows product. Resources contain 27 namespaces and 15,401 keys per language. This does not cover every screen, dynamic display path, DPI setting or external screen reader.

### Display-Language-English — v0.82.7-ja.1


Windows product checks observed immediate switching between Japanese and English and persistence of the selected language after restart. This does not cover every screen, dynamic display path, DPI configuration, or external screen reader. Translation resources contain 27 namespaces and 15,321 keys per language, with zero key differences, interpolation differences, or empty Japanese translations; resource consistency alone does not guarantee complete UI coverage.

The display-language choices are Japanese, English and System. v0.82.4-ja.1 was checked for switching both ways, persistence of explicit `en` and `ja` settings after restart, and Japanese resolved from System on a ja-JP host. This is not an exhaustive test of other OS languages or every screen configuration. [Testing and Verification](Testing-and-Verification-English) records verification scopes by version.

In v0.82.3-ja.1, English was observed in Settings, menus, Project Manager and Workspace and remained selected after restart. With System selected, Japanese appeared in the Renderer and native menus and remained after a normal Ctrl+Q shutdown and restart. Persistence of an explicit `ja` setting was not checked on that version. The auxiliary-error warning passed English and Japanese DOM tests, but was not observed in the ordinary product. These results and the v0.82.1-ja.1 observations below are historical.

Open application settings and select the display language under Advanced in the App section. In the English interface, the path is Application Settings → Advanced. The choices are Japanese, English, and the system setting.

### Compatibility-and-Limitations-English — v0.82.8-ja.1


This unsigned Windows x64 edition is based on fixed upstream v0.82.8 commit `ab9da8f121e4e6fddebc523ced671863e8892ff6`. Real voice-input behavior and recognition API use, as well as live collaboration-server and organization connections, remain unverified. The UI displayed 5,000 search results, but the large-Markdown CPU issue is not considered resolved. A same-condition comparison for Local Wiki context under load is incomplete. See the [known limitations](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.8-ja.1/docs/KNOWN_LIMITATIONS_v0.82.8-ja.1.md#english).

### Compatibility-and-Limitations-English — v0.82.7-ja.1


The [v0.82.7-ja.1 release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1) is an unsigned, unofficial Windows x64 edition based on fixed upstream v0.82.7 commit [`826adb4f93dbe86db35b76ce2502a3a33abe0489`](https://github.com/nimbalyst/nimbalyst/commit/826adb4f93dbe86db35b76ce2502a3a33abe0489). It is not an official Nimbalyst, Inc. product and is not endorsed or supported by the company. The quality decision is **GO WITH KNOWN LIMITATIONS**. This does not mean that the Windows full suite passed, every execution path was verified, or the retained PTY resources were fundamentally fixed. Updates are manual through this repository's Releases.

Translation resources contain 27 namespaces and 15,321 keys per language, with zero key differences, interpolation differences, or empty Japanese translations. This does not guarantee complete translation on every screen or dynamic path. Migration from PGLite to SQLite was checked with synthetic data, but migration of every real user's data is not guaranteed.

On Windows, terminal resources may remain while the app is running after a shell or CLI process exits naturally. This was observed in both upstream and the Japanese edition: after 20 natural exits, Main-process memory had increased by about 156 MiB in each edition, with MessagePort and ConPTY-related resources remaining. This is not an increase for every command run inside a persistent shell, and the bounded observation does not establish unbounded linear growth. Within the tested scope, no failure to create the next terminal, data loss, or inability to quit normally was observed; the tracked resources were recovered after normal app shutdown. The underlying fix has not been made. Close a running terminal using the app's normal terminal control. If memory use increases, save your work, quit the app normally, and restart it. Closing a panel after its process has already exited does not guarantee recovery.

Large editable documents can cause elevated CPU usage. No substantial worsening relative to upstream was observed in the comparison scope, but the cause and reproduction conditions are not fully known. Disabling accessibility features is not recommended as a workaround.

Under heavy system load, generation of additional local-wiki context at session startup may be delayed or omitted. A limited comparison passed all three runs for each edition, but the cause of an earlier single timeout of about 4,450 ms remains unknown. This does not establish data loss or corruption of ordinary Wiki editing.

The Windows full suite did not complete successfully. Same-process loopback communication stalled, and response HTML/CSP rewriting caused test failures, among other issues. Major API tests using a real server in a separate process passed for both upstream and the Japanese edition. These results do not constitute a blanket Windows test pass.

Live Nimbalyst-account authentication, collaboration-server and organization environments, some paid AI-provider communications, an actual Claude in Chrome connection, every dynamic translation path, every DPI/accessibility configuration, and migration of all real-user data remain unverified. See [Testing and Verification](Testing-and-Verification-English) for the detailed test scope.

### Compatibility-and-Limitations-English — v0.82.4-ja.1


This unsigned Windows x64 regular stable release is based on upstream v0.82.4 at `031a6e6de0b7817bbdcd16e6e5e758e45dfdcdc7`. Edition-specific identifiers and profiles, manual updates and nonce-protected localhost authentication are retained. Native checks in the ordinary Windows product covered Japanese/English switching, persistence of explicit Japanese and English settings after restart, Japanese resolved from System, principal file/search/image paths, upgrade and ordinary uninstall. These results are recorded separately from older versions in [Testing and Verification](Testing-and-Verification-English).

Live collaboration with a real server and organization, older-server interoperability and production-organization recovery are **NOT RUN**. A compatible sync server is required; local unit/integration tests do not prove successful service connections. Live Bedrock requests, a new paid Claude session, actual OS sleep/resume, every nonforeground browser-input path and live retry of backends after granting trust are also **NOT RUN**, distinct from related automated regression tests.

Resources contain 27 namespaces and 15,254 keys per language. The 735 dynamic candidates and 451 unresolved analysis scopes are not missing-key or defect counts and do not establish complete runtime coverage. Verification does not cover every screen, DPI setting, external screen reader, image interaction, OS language or existing Tracker-body upgrade path.

Production email sign-in, encrypted storage, restoration and ordinary sign-out were observed on an earlier normal product build with unchanged relevant authentication/startup code. Authentication was not newly repeated on the final distribution itself. Google sign-in, special recovery, server-side session revocation and effective NTFS access by another user remain unverified.

Windows retains unpassed or incomplete checks involving symlink-fixture EPERM, Git worktree path representation and large loopback writes on the host. The Linux candidate's full suite and symlink-refusal tests passed; this does not establish every Windows-specific behavior. Unverified areas are not confirmed defects or vulnerabilities.

Startup delays and guide-display limits observed in v0.82.3-ja.2 remain recorded below for that version. They neither guarantee absence in a newer version nor establish recurrence there. Downgrade behavior has not been verified.

### Compatibility-and-Limitations-English — v0.82.3-ja.2


This unsigned Windows x64 stable revision corrects and organizes distributed source documentation and updates 16 bundled guides. The upstream baseline, existing product features, data locations and manual-update policy are retained. Older tags, releases, assets and history remain available; this does not completely erase historical internal materials.

The first restart after upgrade on this Windows host recorded Main-process stalls of up to about 125 seconds and a temporarily unresponsive window. It recovered; a final-ZIP recheck of the same profile completed normal operations, shutdown and data retention, but still recorded one roughly 550ms delay. Four fresh-profile starts did not record the same long delay. The cause and recurrence conditions remain unknown. Connection prompts from a security product during that period are not established as the cause, and a permanent fix is not claimed.

Placement and SHA-256 hashes of all 16 bundled guides were checked, and a byte-identical copy of one SDK guide was displayed in the normal editor. A File → Open test without a workspace displayed “Open a workspace to get started” rather than the document, in English even when Japanese UI was selected. Direct display of all guides through the dedicated documentation entry remains unverified.

Production authentication has not been repeated on this binary. Google sign-in, special recovery, server-side session revocation, every upgrade path for authenticated profiles, cross-user NTFS effective access, external screen readers, every DPI/screen configuration and complete dynamic-translation coverage remain unverified. The complete team-recovery procedure using a real organization and independent real clients is also unverified and requires a compatible sync server. Unverified areas are not confirmed defects or vulnerabilities.

EPERM during creation of one CLI and two sandbox symlink fixtures leaves untested Windows behavior. Linux success is not proof of rejection assertions that could not run on Windows. [Testing and Verification](Testing-and-Verification-English) distinguishes native observations and CI results by version.

### Compatibility-and-Limitations-English — v0.82.3-ja.1


This unsigned Windows x64 edition is based on upstream v0.82.3 commit `84dcc00f3cd0abbb36eafc6bfad9389f960076db`. Each language contains 27 namespaces and 14,795 keys. The 672 dynamic candidates, 412 unresolved scopes and 378 JSX English candidates are not defect counts and do not establish complete runtime coverage.

The ordinary product displayed English in Settings, menus, Project Manager and Workspace, and retained English after restart. With the display-language setting set to System, Japanese appeared in the Renderer and native menus and remained after normal Ctrl+Q shutdown and restart. Persistence of an explicit `ja` value has not been checked. The changed auxiliary-error warning passed English and Japanese DOM tests but has not been observed in the ordinary product. Authentication, NSIS installation, upgrade and removal were not exercised on this build; related source inputs were unchanged, which is not a substitute for runtime checks. Google sign-in, special recovery, server revocation, upgrading an authenticated older profile, effective access by another Windows user, external screen readers, all DPI configurations and complete WSL coverage remain unverified.

Legacy-encryption team recovery requires the updated sync server and compatible editing clients. Existing mocks, DOM, unit and integration tests were evaluated; real-organization form display, recovery initiation, server state transitions, independent-client readback, production team-data integrity and resumed synchronization remain unverified. No real or dummy organization was created or registered, and no production recovery was performed for verification.

An earlier Codex request succeeded while its automatic session-metadata reminder reported a provider capacity error. Regression tests identified and fixed auxiliary-error propagation and RPC subscription cleanup. The tests preserve the main response/completion path and verify the warning in English and Japanese DOM tests; its display in the ordinary product has not been checked. Whether the earlier provider-reported capacity incident used the same path remains unknown, and provider capacity limits themselves are not changed. All seven bundle budgets passed after the fix. Three Windows fixture-creation EPERM failures remain unpassed; rejection behavior that could not run is still unverified. Older results below are historical and apply only to their stated versions.

### Compatibility-and-Limitations-English — v0.82.1-ja.1


This unsigned stable release targets Windows x64 and is based on upstream v0.82.1 commit `583ae0244dae266667be579733d6c571fd74e037`. Its identifiers, storage paths, manual-update policy and localhost authentication follow the table below.

The ordinary product build was checked for language persistence, production email sign-in, encrypted-state restoration, local sign-out, clean installation, upgrade from v0.81.7-ja.3 and ordinary uninstall. Resources contain 27 namespaces and 14,608 keys per language. Complete runtime coverage of 653 dynamic candidates, 382 unresolved scopes and every screen remains unverified, as do Google sign-in, special recovery paths, server-side revocation, effective NTFS access, external screen readers and all DPI/device configurations.

Verification does not cover every Windows version, DPI setting, security product or machine configuration.
