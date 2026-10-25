# Testing and verification

[日本語](Testing-and-Verification.md) · [Home](Home-English.md)

This covers the v0.82.3-ja.1 candidate. The following is bounded evidence, not a published-release claim or a comprehensive operational guarantee.

| Area | Evidence |
|---|---|
| Types and budgets | 38 workspace typechecks and all seven existing bundle budgets passed |
| Resources | 27 namespaces, 14,794 keys per language; zero key, empty-Japanese, or interpolation differences |
| SQLite | Synthetic populated-schema upgrade to 0055, row preservation, rollback/retry, and retention after PGLite conversion |
| Windows | Ordinary-product language switching, persistence after restart in both languages, and launch of the extracted ZIP |
| Distribution | All 1,913 ZIP files matched, CRC passed; 1,021 ASAR entries passed integrity checks, 341 build outputs and four legal files matched |
| Native runtime | Actual SQLite Worker and ONNX backend dlopen under Electron, SDK import and placement checks |
| iOS | 528 executed: 522 passed, six skipped, zero failed; the added SQL-plan regression and existing performance threshold passed |
| Linux | 19,284 passed, zero failed, 30 skipped; Test Files: 2,339 passed, seven skipped, zero failed, 2,346 total |

The initial Linux run recorded 19,250 passed, two failed, 30 skipped, plus one collection error. Tests conflated retention-path access with new capture, and logger initialization wrote to a synthetic path. Product retention was preserved; tests use narrow mocks and independent checks. Full CI passed after correction. The original failure record remains intact.

The CI checkpoint is `eabb8c5d6e0d951c77c79f2d5ab4439e056512ef`. [Linux](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40243528521) and [iOS](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40243528554) passed, including Windows product source `057883f8bd230280dfeaa298a5c5e45f8252b508`. The preceding [iOS run](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/actions/runs/40201861401) exceeded the existing six-times performance threshold. Queries locating affected groups scanned unrelated history; the fix restricts lookups to changed sessions through the existing index. A regression inspecting the actual refresh SQL plan and the full suite passed without relaxing the threshold. The original failure evidence is retained. The two preliminary tests are not added again to the full 528 executions.

The latest ordinary ZIP product, 057883f8b, was checked for Japanese/English tracker column names, action and filter labels, sync state, live switching, persistence after restart in each language, opening item details, and normal quit. Its related regression batch passed 135 tests across ten files. Earlier 49e52c53f checks cover English completion times, Japanese expanded help, Wiki/Tracker retention, and native document image paste with Undo/Redo. Japanese-menu access at 1,040 pixels and AI-input image paste preserving the draft were verified on the preceding display-fix candidate. These are separate product checkpoints, not repetitions of all procedures on the latest binary.

On Windows, one CLI symlink-fixture test and two sandbox fixture tests remain blocked by EPERM. The same failures reproduce against fixed upstream under the same conditions. Tests were not removed or skipped. Sandbox rejection itself is not verified when fixture creation fails.

Email sign-in, encrypted storage, restoration, logout, and fresh installation/removal were tested on an earlier ordinary candidate. The 3388c93c5 candidate matched all 63 Main/Preload files of the authenticated product and was tested upgrading from the previous stable release, applying migration 55, and retaining English and all ten documents. Uninstallation retained all 183 dedicated setting/document file hashes. This does not mean those native procedures were repeated for every later binary. Remaining feature-level checks and the final source ZIP are under validation. External screen readers, every DPI, all dynamic translation paths, complete native WSL paths, and server-backed organization recovery remain unverified.
