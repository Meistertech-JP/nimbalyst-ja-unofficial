# Development history

[日本語](Development-History.md) · [Home](Home-English.md)

## Published versions

v0.81.7-ja.1 and ja.2 were source-only prereleases. v0.81.7-ja.3 introduced unsigned Windows x64 NSIS and portable ZIP distributions, with About, tutorial and authentication-notification localization, encrypted credential storage, logout-race protection, and on-demand dialogs.

v0.82.1-ja.1 is the current stable version, incorporating upstream v0.82.1. Its published commit is `b0432ce85977040461bf026aff063059bf6ffd1e`, with upstream pinned to `583ae0244dae266667be579733d6c571fd74e037`. Earlier tags, Releases, and verification records remain available.

## v0.82.3-ja.1 candidate

The full history of 17 upstream commits affecting 144 files was integrated through `84dcc00f3cd0abbb36eafc6bfad9389f960076db`. Changes include legacy-encryption team recovery, Tracker recovery revisions, Codex file attribution, CPU-profile retention limits, image paste, Wiki, and transcript behavior.

New views and notifications use the existing i18n resources, increasing each language from 14,608 to 14,782 keys. The numeric Windows build version is 0.82.3.1. Team recovery requires the updated sync server; the complete procedure for a production organization remains unverified.

This candidate has not been published. See [testing and verification](Testing-and-Verification-English.md) for coverage and limits.
