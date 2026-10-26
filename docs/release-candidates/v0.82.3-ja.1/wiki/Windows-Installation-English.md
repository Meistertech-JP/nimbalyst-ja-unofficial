# Windows installation and updates

[日本語](Windows-Installation.md) · [Home](Home-English.md)

This guide covers unsigned Windows x64 NSIS and portable ZIP packages. v0.82.3-ja.1 is an unpublished candidate. Check [this repository's Releases](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases) for available files.

## Download and verify

Download the desired version and SHA256SUMS.txt. In PowerShell, use `Get-FileHash -LiteralPath <file> -Algorithm SHA256` and compare the entry for the same filename. Do not execute mismatching files. The application and installer are unsigned. This guide does not provide steps to disable Windows or antivirus protections.

## Installer

Save documents and close the existing edition. Check the product name, “Nimbalyst 日本語版（非公式）”, and install for the current user in a location separate from the official application. The installer does not offer elevation. Start from this edition's shortcut after completion; automatic launch at completion is disabled.

The application ID is `jp.meistertech.nimbalyst.ja.unofficial`. An edition-specific Markdown “Open with” entry is added, without changing extension defaults, Explorer UserChoice, or the default `nimbalyst://` handler. Running alongside the official application is unsupported.

## ZIP

Extract the complete archive into a new writable directory and run `Nimbalyst 日本語版（非公式）.exe`. Do not copy only the EXE or launch inside the archive. Keep all DLLs, resources, and accompanying files.

Portable means installation is unnecessary, not that the profile resides beside the EXE. The default profile is the same as the installer build: `%APPDATA%\Nimbalyst 日本語版（非公式）`. Do not concurrently run different versions against one profile.

## Updates and data

Official automatic updates and manual update checks are disabled. Update manually through this repository's Releases. Save work, close the application, back up project documents, and review target-version changes and limitations. Extract ZIP updates into a new directory rather than overwriting the old one. Downgrade compatibility is not guaranteed.

SQLite schema 0055 in v0.82.3 adds the base synchronization revision to queued Tracker edits. Synthetic-data migration, retention and rollback tests passed. The latest ordinary installer upgraded v0.82.1-ja.1, applied 55, retained English and the complete Japanese/English test document with its hash, and displayed the existing Tracker item. This does not guarantee compatibility for every profile, upgrading an authenticated old profile, or downgrading.

## Authentication and language

Select System, English, or Japanese in display-language settings. Open authentication email on the same PC running the application. Localhost `127.0.0.1` refers to the device opening the link; a smartphone cannot return authentication to the PC this way. URL rewriting and exposing callback ports externally are unnecessary. Do not share authentication URLs or tokens.

## Uninstall

Select this edition in Windows' application list. Uninstallation is configured to remove registrations and shortcuts still owned by the installation and retain user data. A ZIP build can be removed by deleting its extraction directory after exit. Deleting documents or profiles is a separate operation.
