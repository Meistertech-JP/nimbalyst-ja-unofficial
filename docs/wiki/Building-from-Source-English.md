[日本語](Building-from-Source) | English

# Building from Source

These instructions apply to the source and scripts at v0.82.4-ja.1. Check `package.json` and the lockfile again for later upstream-following versions. The published npm CLI does not necessarily include every feature of this fork.

Use the `v0.82.4-ja.1` tag for the source corresponding to its Windows assets, rather than the continuously changing `main` branch. To reproduce an older release, use that version's tag and lockfile.

## Obtaining the source and dependencies

Use Node.js 24 or later and pnpm 12 or later. `packageManager` specifies `pnpm@12.9.1`, and Electron is 43.7.0. Rebuilding native Windows dependencies may require build tools appropriate for those dependencies.

```powershell
git clone https://github.com/Meistertech-JP/nimbalyst-ja-unofficial.git
Set-Location nimbalyst-ja-unofficial
git switch --detach v0.82.4-ja.1
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @nimbalyst/i18n run build
corepack pnpm run build:workspace-deps
corepack pnpm --filter @nimbalyst/memory-engine run build
corepack pnpm --filter @nimbalyst/tracker-builtins run build
corepack pnpm --filter @nimbalyst/collab-bundle run build
corepack pnpm --filter @nimbalyst/runtime run build
```

This example selects a fixed tag in a fresh clone; it is not an instruction to switch an existing worktree with changes. Dependencies use `pnpm-lock.yaml` and `pnpm-workspace.yaml`. Do not run `npm install` at the root and produce a different dependency resolution. `allowBuilds` lists dependencies permitted to run build scripts, and `minimumReleaseAge` restricts resolution of recently published dependencies. Do not remove these settings to bypass checks.

## Type checks and related tests

```powershell
corepack pnpm run typecheck
corepack pnpm exec vitest run packages/i18n/src/__tests__
corepack pnpm run test:prepush-gate
```

The first command checks workspace types, the second runs the i18n package tests, and the third checks scripts and the sandbox. The i18n tests alone do not replace all product-related tests. Add and run tests appropriate to the screens, settings, and Main-process behavior being changed. The normal full unit-test command is `corepack pnpm run test:prepush`. Record the result population and environment. See [known failures](Testing-and-Verification-English).

## Electron and Windows packages

```powershell
$env:ALLOW_UNSIGNED_WINDOWS_BUILD = 'true'
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
corepack pnpm --dir packages/electron run build:win --publish never
```

`build:win` builds Electron, Worker, Sandbox, and extensions, checks update settings and additional resources, and generates a Windows x64 NSIS installer. Output normally goes to `packages/electron/release`. Electron Main, Renderer, and Worker follow different execution paths. A successful Main build alone does not guarantee that the SQLite Worker works.

To generate a ZIP in addition to NSIS, use the completed `release/win-unpacked` directory from the build and checks above so that both formats contain the same payload.

```powershell
corepack pnpm --dir packages/electron exec electron-builder --prepackaged release/win-unpacked --win zip --x64 --publish never
```

`build:unpack` generates an unpacked application for verification. Do not distribute the unpacked EXE alone. A complete distribution, including `resources` and DLLs, is required.

A local build without signing credentials is unsigned. To explicitly allow an unsigned build in CI, set `$env:ALLOW_UNSIGNED_WINDOWS_BUILD = 'true'` in PowerShell. This does not create a signature or waive tests and publication gates. Do not store private keys or API keys in the source or Wiki.

## Checks before distribution

Check the ASAR file inventory, contents and integrity block, every file in the unpacked application and ZIP, and Worker placement. Native modules such as SQLite must match Electron's ABI. Verification for v0.82.4-ja.1 uses Electron 43.7.0 and ABI 148. Loading a module under the system Node.js alone does not establish Electron compatibility.

Preserve the correspondence between `patches/fd-slicer@1.1.0.patch` and the lockfile. Check the search executable `rg.exe` for size, hash and successful execution after dependency installation and packaging. An environment where a broken search binary was replaced by hand is not sufficient evidence of a reproducible build.

Check PE product names, versions and identifiers, the absence of an official update feed, and the LICENSE and third-party notices in `resources/legal`. Record the difference between the product-code commit and the publication-documentation commit, hashes and restoration results for every source ZIP file, and distribution SHA-256 values.

Finally, test startup and shutdown, language switching, persistence after restart, and the changed screens in a normal product build. Installation and authentication are separate verification items. Successful build commands do not guarantee these runtime behaviors.

[Testing and Verification](Testing-and-Verification-English), [Localization Architecture](Localization-Architecture-English), and [License and Attribution](License-and-Attribution-English).
