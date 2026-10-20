# Nimbalyst — Unofficial Japanese Edition

An unofficial Japanese-language build of Nimbalyst, based on version 0.71.2.

Japanese localization covers desktop menus, settings, file management, AI sessions, trackers, dialogs, and other parts of the user interface. The display language can be switched between Japanese and English.

This project is not affiliated with, endorsed by, or supported by Nimbalyst, Inc.

## Downloads

This preview release does not provide verified Windows binaries. Source code is available from GitHub Releases. Windows binary publication is on hold until the authentication URL protocol conflict is resolved and packaged Windows startup and sign-in are verified.

## Requirements

- Windows 10 or Windows 11, x64
- An internet connection for features that connect to AI providers or synchronization services

## Change the display language

Open Settings and choose “日本語” or “English” under Display language. The selected language is retained after restarting the app.

## Version and updates

This edition is based on official Nimbalyst v0.71.2 (commit `59ab7eaf8c995840a37766c65a09307506b87a2b`). It may not include features or fixes from newer official releases.

App auto-updates and the in-app update check for official Nimbalyst GitHub Releases are disabled. Download future versions from this repository’s GitHub Releases.

## Known limitations

- Running this build alongside the official Nimbalyst application is not supported. Both applications use the `nimbalyst://` URL protocol for authentication. Installing both on the same Windows system may cause authentication callbacks to open in the wrong application.
- Authentication callbacks may open in the wrong application. Authentication in a packaged Windows build has not been verified.
- Some technical terms, model names, and content supplied by external services are not localized.
- The Windows build is unsigned.
- This preview does not provide its own update mechanism.

## Build from source

Install Node.js and npm, then run the following commands from the repository root:

```powershell
npm install
npm run typecheck
npm run build
cd packages/electron
npm run build:win
```

The `build:win` script in `packages/electron/package.json` produces a Windows x64 NSIS installer and ZIP. Do not publish or distribute generated binaries while the authentication URL protocol conflict remains unresolved. Run the Runtime and Electron typechecks and i18n tests before building.

## Upstream project

Official Nimbalyst repository: [nimbalyst/nimbalyst](https://github.com/nimbalyst/nimbalyst)

## License

The upstream source is licensed under the MIT License. See [LICENSE](./LICENSE) for the copyright notice and license text. Licenses and notices for third-party libraries included in the app are available under `resources/legal` in the distribution.

This software is provided as-is. Review the license terms for the upstream software and each third-party library before use or redistribution.
