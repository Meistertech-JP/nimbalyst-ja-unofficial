# Testing and verification

[日本語](Testing-and-Verification.md) · [Home](Home-English.md)

This covers the v0.82.3-ja.1 candidate. The following is bounded evidence, not a published-release claim or a comprehensive operational guarantee.

| Area | Evidence |
|---|---|
| Types and budgets | 38 workspace typechecks and all seven existing bundle budgets passed |
| Resources | 27 namespaces, 14,782 keys per language; zero key, empty-Japanese, or interpolation differences |
| SQLite | Synthetic populated-schema upgrade to 0055, row preservation, rollback/retry, and retention after PGLite conversion |
| Windows | Ordinary-product language switching, persistence after restart in both languages, and launch of the extracted ZIP |
| Distribution | All 1,913 ZIP files matched, CRC passed; 1,021 ASAR entries passed integrity checks, 341 build outputs and four legal files matched |
| Native runtime | Actual SQLite Worker and ONNX backend dlopen under Electron, SDK import and placement checks |
| iOS | Latest CI stopped after one performance-test failure among two preliminary tests; the Swift fix has not run on iOS |
| Linux | 19,264 passed, zero failed, 30 skipped across 2,344 files on Windows product commit 49e52c53f |

The initial Linux run recorded 19,250 passed, two failed, 30 skipped, plus one collection error. Tests conflated retention-path access with new capture, and logger initialization wrote to a synthetic path. Product retention was preserved; tests use narrow mocks and independent checks. Full CI passed after correction. The original failure record remains intact.

The Windows product commit is `49e52c53ffe1225ce7d411f53f7e20c7758c49a7`. [Linux](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40201861327) succeeded; [iOS](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40201861401) failed its preliminary performance test before the full suite ran. Comparing 1,000 and 10,000 history entries exceeded the existing six-times threshold. Queries locating affected groups scanned unrelated history; a fix uses the existing index to look up changed sessions. Query plans and results were checked using synthetic SQLite data, but the Swift fix has not run on iOS. Earlier full-suite success is not substituted for this failure.

Ordinary-product checks cover localized session times, bilingual attachment guides, and provider recommendation headings. The latest ZIP was checked for English completion times, persistence after restart in both languages, Japanese expanded help, and native document image paste with Undo/Redo. Japanese-menu access at 1,040 pixels and AI-input image paste preserving the draft were verified on the preceding display-fix candidate.

On Windows, one CLI symlink-fixture test and two sandbox fixture tests remain blocked by EPERM. The same failures reproduce against fixed upstream under the same conditions. Tests were not removed or skipped. Sandbox rejection itself is not verified when fixture creation fails.

Email sign-in, encrypted storage, restoration, logout, and fresh installation/removal were tested on an earlier ordinary candidate. The 3388c93c5 candidate matched all 63 Main/Preload files of the authenticated product and was tested upgrading from the previous stable release, applying migration 55, and retaining English and all ten documents. Uninstallation retained all 183 dedicated setting/document file hashes. This does not mean those native procedures were repeated for every later binary. Remaining feature-level checks and the final source ZIP are under validation. External screen readers, every DPI, all dynamic translation paths, complete native WSL paths, and server-backed organization recovery remain unverified.
