[日本語](Development-History) | English

# Development History

Each release and tag identifies its source and available distributions.

## v0.82.4-ja.1

This [Windows x64 stable release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.4-ja.1) uses fixed upstream v0.82.4 commit `031a6e6de0b7817bbdcd16e6e5e758e45dfdcdc7`. It incorporates changes to file operations, long-document search, transcript images, AI-session questions, Tracker and shared pages, with corresponding Japanese display. Resources contain 27 namespaces and 15,254 keys per language. Japanese/English/System settings, edition-specific Windows identifiers, separate profiles, manual updates and localhost authentication are retained.

All 39 workspace typechecks and seven size budgets passed. The fixed-source Linux candidate passed with 2,374 test files passed, zero failed and seven skipped; 19,585 tests passed, zero failed and 30 skipped. The unchanged upstream comparison failed one recovery-screen test which passed in the candidate. The comparison workflow's overall FAILURE is distinct from the candidate job's SUCCESS. Unsigned Windows NSIS and portable ZIP packages, matching source and checksums are provided. See [Testing and Verification](Testing-and-Verification-English) for native observations and NOT RUN areas.

## v0.82.3-ja.2

This [Windows x64 stable revision](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.2) excludes pre-publication working materials from distributed source and corrects user/developer documentation and 16 bundled guides. Unsigned NSIS and portable ZIP packages are newly generated from the corrected source. The fixed upstream baseline and existing product features are unchanged. Publication-content checks distinguish internal materials from product source and technical documentation.

Older tags, releases, distributions and Git/Wiki history are retained; these corrections do not completely erase earlier materials from history. See [Testing and Verification](Testing-and-Verification-English) for version-specific verification scope.

## v0.82.3-ja.1

Integrated 17 upstream commits affecting 144 files through fixed v0.82.3 commit `84dcc00f3cd0abbb36eafc6bfad9389f960076db`. Changes include legacy-encryption team recovery, SQLite migration 0055's recovery revision, Codex file attribution, CPU-profile retention, Wiki and transcript updates. Recovery has not been tested against a real organization and requires the updated sync server.

Resources increased from 14,608 to 14,795 keys per language, covering recovery, Tracker, time, attachment guidance and accessibility text. Windows image-copy handling was updated to register custom schemes together. Linux passed with 2,340 test files passed, seven skipped, zero failed, and 19,296 tests passed, 30 skipped, zero failed. iOS completed with 522 passed, six skipped and zero failed (528 total). Unsigned Windows x64 NSIS and portable ZIP packages were rebuilt from the product fix; ASAR, ABI, Workers and all 1,913 ZIP files were checked. In the ordinary product, English Settings, menus, Project Manager and Workspace views and English restart persistence were observed. With the language setting set to System, Japanese appeared in the Renderer and native menus and remained after Ctrl+Q shutdown and restart. Persistence of an explicit `ja` value, authentication, and NSIS installation, upgrade and removal have not been verified. The auxiliary-error warning passed English and Japanese DOM tests but has not been observed in the ordinary product.

## v0.82.1-ja.1

This [Windows stable release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1) uses the [fixed upstream v0.82.1 commit](https://github.com/nimbalyst/nimbalyst/commit/583ae0244dae266667be579733d6c571fd74e037). Changes include Japanese text for new features, language-aware completion-menu and session-reference accessibility labels, and suppression of the development debugging port in packaged startup. Production email sign-in, language persistence, upgrade, clean installation and ordinary uninstall were checked in the ordinary product build.

## v0.81.7-ja.3

The [Windows x64 stable release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.81.7-ja.3) was published on October 24, 2026. It provides unsigned NSIS and portable ZIP distributions, matching source and SHA256SUMS. The tag points to `0871b7872bb9d043ff07acfaf62a3deb0eb6aef2`.

Changes include Japanese text in About, settings, tutorials and authentication notices; Windows Worker placement and resource checks; encrypted credential storage; and protection against logout races. Create and rename forms load on demand, and import failures remain inside the dialog. Independent editor roots follow display-language changes.

The [release notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.81.7-ja.3/RELEASE_NOTES_v0.81.7-ja.3.md) distinguish authentication and installation checks on an earlier product build from checks on the rebuilt final distribution. See [Testing and Verification](Testing-and-Verification-English) for post-release CI failures and development-branch corrections.

## v0.81.7-ja.2

The next [source-only prerelease](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.81.7-ja.2) incorporated changes through upstream commit `e14ddf383a8dbb40e511fc2c2ea50273d08e3579`. It included Local Wiki static export and language selection, plus protection against backup collisions.

## v0.81.7-ja.1

The first [source-only prerelease](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.81.7-ja.1) included Japanese desktop UI, display-language settings, distinct Windows identifiers, disabled official updates and localhost authentication. No Windows binaries were provided.
