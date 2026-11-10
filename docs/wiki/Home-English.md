[日本語](Home) | English

# Nimbalyst — Unofficial Japanese Edition Wiki

User and developer documentation for an unofficial fork that adds Japanese display to the Nimbalyst desktop UI. This is not an official product of Nimbalyst, Inc. and is not endorsed or supported by the company.

## Next candidate (not released)

The `v0.82.8-ja.1` candidate follows upstream v0.82.8 (`ab9da8f121e4e6fddebc523ced671863e8892ff6`). Localization, compatibility and Windows distributions are still being verified; the Release and candidate assets are not published. The latest version currently available remains [v0.82.7-ja.1](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1). Dictation behavior and live server connections have not been tested. Candidate results will be added to [Testing and Verification](Testing-and-Verification-English).

This edition is **v0.82.7-ja.1**, based on fixed upstream v0.82.7 commit [`826adb4f93dbe86db35b76ce2502a3a33abe0489`](https://github.com/nimbalyst/nimbalyst/commit/826adb4f93dbe86db35b76ce2502a3a33abe0489). It is an unsigned Windows x64 edition. Upstream updates include colored text in Lexical 0.53, migration to SQLite, AI-session changes, Tracker updates, and Windows-specific Git/CLI fixes, with corresponding Japanese display. Matching translation resources do not guarantee every screen or dynamic path is translated. See the [release notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.7-ja.1/RELEASE_NOTES_v0.82.7-ja.1.md), [Testing and Verification](Testing-and-Verification-English), and [Compatibility and Limitations](Compatibility-and-Limitations-English) for changes, observed scope, and limitations. It does not automatically translate user documents or responses from external services.

- [Downloads and changes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1)
- [Release notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.7-ja.1/RELEASE_NOTES_v0.82.7-ja.1.md)
- [Source code and README](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial)
- [MIT License](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.7-ja.1/LICENSE)

Official automatic updates and manual update checks are disabled. Update manually through this repository's Releases. This edition includes migration from PGLite to SQLite, but does not guarantee migration of every real user's data. Earlier releases remain available as previous versions.

This Wiki is documentation hosted on GitHub. It is separate from the application's Local Wiki and Team Wiki features.

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
