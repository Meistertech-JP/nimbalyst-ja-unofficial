[日本語](Home) | English

# Nimbalyst — Unofficial Japanese Edition Wiki

An unofficial fork providing Japanese desktop UI, not developed, certified or supported by Nimbalyst, Inc. The latest **v0.84.0-ja.1** is an unsigned Windows x64 edition based on upstream v0.84.0 at `dc5a0ef938cf495a0667d797f871d09d0c44246f`.

Upstream v0.84.0 is a GitHub prerelease. This unofficial edition is distributed as a regular GitHub Release and Latest; this is not upstream certification or a stability guarantee. `v0.84.0-ja.1` still contains a SemVer prerelease identifier; GitHub classification does not change that meaning.

- [Setup EXE, Portable ZIP, Source ZIP and checksums](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1)
- [Release notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.84.0-ja.1/RELEASE_NOTES_v0.84.0-ja.1.en.md)
- [Source and README](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial)
- [Previous v0.82.8-ja.1](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.8-ja.1)

The assessment is **GO WITH KNOWN LIMITATIONS**. Integrates upstream v0.83.0 and v0.84.0 changes since v0.82.8: Claude Fable 5.2 selection, batched queue delivery, Git-panel branch switching, Workstreams, folder-scoped commit proposals, nested Markdown list preservation, hidden-entry counts, Wiki publishing, SQLite backups and tool-output retention. Edition-specific changes add Japanese UI text and fix explicit profile boundaries and Windows file/path handling. Integration does not establish live verification of every feature.

Read [verification](Testing-and-Verification-English) and [limitations](Compatibility-and-Limitations-English). Official updates are disabled; update manually. Previous tags, releases and history are retained. This GitHub Wiki is separate from the application’s Local Wiki and Team Wiki.

## User Guide

- [Getting started](Getting-Started-English): first launch, files, and projects.
- [Windows installation and updates](Windows-Installation-English): installer and ZIP, verification, updates, and removal.
- [Display language](Display-Language-English): switching and saving Japanese or English, and content that is not translated.
- [Account and authentication](Account-and-Authentication-English): email authentication on the same PC, localhost callbacks, storage, and logout.
- [Troubleshooting](Troubleshooting-English): launch, login, display, and distribution issues.
- [Compatibility and limitations](Compatibility-and-Limitations-English): verified scope and unverified paths.

## Developer Guide

- [Localization architecture](Localization-Architecture-English): Main and Renderer, shared resources, independent React roots, and on-demand loading.
- [Building from source](Building-from-Source-English): pnpm and Windows packages.
- [Testing and verification](Testing-and-Verification-English): test populations and post-release CI.
- [Following upstream Nimbalyst](Following-Upstream-English): fixed baselines, change classification, and fork behavior to preserve.
- [Translation and contributing](Translation-and-Contributing-English): issues, translation keys, tests, and pull requests.

## Project

- [Development history](Development-History-English)
- [License and attribution](License-and-Attribution-English)
- [English overview entry](English-Overview)
