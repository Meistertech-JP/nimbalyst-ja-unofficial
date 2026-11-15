# Nimbalyst — Unofficial Japanese Edition v0.84.0-ja.1

An unpublished Windows x64 candidate based on upstream v0.84.0, which is a prerelease. It incorporates v0.83.0 and v0.84.0 changes since v0.82.8. A formal release of this edition has not been decided.

## Upstream changes

- Claude Fable 5.2 selection, batched queued-message delivery, usage charts, question cards and session search updates.
- Git-panel branch switching, Workstreams session grouping and folder-scoped commit proposals.
- Hidden-entry counts in the file tree, nested Markdown list preservation and local Wiki frontmatter fixes.
- `nim wiki publish`, comment/edit consistency, tool-output and image retention, and SQLite backup rotation updates.

These describe integrated source changes, not complete live verification of every path. Wiki publishing and some team permission features require a compatible sync server.

## Japanese edition

Adds Japanese text for new Workstreams, Git operations, settings and confirmation screens. Retains Japanese/English/System selection, independent application settings and data, nonce-protected localhost authentication, disabled official updates and manual updating.

On Windows, fixes duplicate attached-folder roots and detach failures caused by trailing separators or path-case differences.

Windows distributions are unsigned. This is not an official Nimbalyst, Inc. product. Final-candidate authentication and NSIS new-install/upgrade verification are not yet complete. See the [limitations](docs/KNOWN_LIMITATIONS_v0.84.0-ja.1.md#english).

## Verification status

Linux CI, Android Build and iOS Simulator/Native Tests succeeded for the final candidate. Windows x64 NSIS and Portable candidates and a Source ZIP were generated from the final commit; ZIP and Git-tree correspondence was checked. Candidate03's Japanese initial screen was observed. A post-fix Windows full-suite run, production authentication, candidate03 NSIS new-install/upgrade, and English switching/restart retention were not run. The local assessment is GO WITH KNOWN LIMITATIONS; upstream v0.84.0 is a prerelease, and formal publication requires a separate decision. See the [verification record](docs/wiki/Testing-and-Verification-English.md) and [limitations](docs/KNOWN_LIMITATIONS_v0.84.0-ja.1.md#english) for verified scope and NOT RUN items.

[日本語](RELEASE_NOTES_v0.84.0-ja.1.md)
