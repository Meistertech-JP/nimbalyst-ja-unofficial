// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require_ = createRequire(import.meta.url);
const packageJson = require_("../../package.json");
const { shouldSign } = require_("../sign-windows.js");
const { validateWindowsUpdaterConfig } = require_("../validate-windows-updater-config.js");
// Initialize builder exports first, matching its CLI and avoiding a cold circular require.
require_("app-builder-lib");
const { PlatformPackager } = require_("app-builder-lib/out/platformPackager.js");
const productName = packageJson.build.productName;

function effectiveAssociations(platform: string) {
  const getter = Object.getOwnPropertyDescriptor(PlatformPackager.prototype, 'fileAssociations')!.get!;
  return getter.call({ config: packageJson.build, platformSpecificBuildOptions: packageJson.build[platform] ?? {} }) as Array<{ ext: string; name: string }>;
}

describe('Unofficial Windows file-class isolation', () => {
  it('leaves Windows registration to the tested Open With policy while preserving other platforms', () => {
    const windows = effectiveAssociations('win');
    // nsis-isolation.test.ts executes the custom registration/unregistration
    // commands. Standard associations here would take over extension defaults.
    expect(windows).toEqual([]);
    for (const platform of ['mac', 'linux']) {
      expect(new Set(effectiveAssociations(platform).map(item => item.ext))).toEqual(new Set(['md', 'markdown']));
    }
    expect(() => validateWindowsUpdaterConfig()).not.toThrow();
  });

  it.each(['global', 'win'])('refuses standard default-taking associations inherited from the %s scope, including a private ProgID', (scope) => {
    const container = scope === 'global' ? packageJson.build : packageJson.build.win;
    const original = container.fileAssociations;
    try {
      for (const name of ['Markdown Document', `${packageJson.build.appId}.Markdown`]) {
        container.fileAssociations = [{ ext: 'md', name }];
        expect(() => validateWindowsUpdaterConfig()).toThrow(/file associations.*preserve shared extension defaults/i);
      }
    } finally {
      if (original === undefined) delete container.fileAssociations;
      else container.fileAssociations = original;
    }
  });

  it('refuses a shared packaged name that would collide in the installer cache', () => {
    const original = packageJson.build.extraMetadata.name;
    try {
      packageJson.build.extraMetadata.name = packageJson.name;
      expect(() => validateWindowsUpdaterConfig()).toThrow(/installer cache.*independent packaged name/i);
    } finally {
      packageJson.build.extraMetadata.name = original;
    }
  });

  it.each(['perMachine', 'allowElevation', 'runAfterFinish', 'deleteAppDataOnUninstall'])('refuses unsafe NSIS %s policy', (setting) => {
    const original = packageJson.build.nsis[setting];
    try {
      packageJson.build.nsis[setting] = true;
      expect(() => validateWindowsUpdaterConfig()).toThrow(/current-user, no-elevation-offer, no-auto-run and app-data-retention/i);
    } finally {
      packageJson.build.nsis[setting] = original;
    }
  });
});

// PR #854 added build.win.signExts, which makes electron-builder run the
// DigiCert signer once per matching file in the staged payload: 59 KeyLocker
// calls per x64 build instead of 3. Nine release runs consumed 2,159 signings
// against a 1,000-call yearly allocation. Nothing in the build surfaces that
// cost, so guard the config shape here.
describe("Windows signing scope", () => {
  it("signs only our own binaries, not the whole payload", () => {
    expect(packageJson.build.win.signExts).toBeUndefined();
  });

  it("routes signing through the DigiCert KeyLocker signer", () => {
    expect(packageJson.build.win.signtoolOptions.sign).toBe(
      "build/sign-windows.js"
    );
    expect(packageJson.build.win.signtoolOptions.signingHashAlgorithms).toEqual(
      ["sha256"]
    );
  });
});

// Paths taken verbatim from Windows build logs. electron-builder hands the
// signer every .exe it walks -- across app.asar.unpacked, extraResources and
// swiftshader -- so this allowlist is the only thing keeping bundled vendor
// binaries from being re-signed with our certificate at DigiCert's per-call
// cost. A denylist was tried first and leaked 7 node-pty binaries in v0.72.7.
const RELEASE_DIR =
  "D:\\a\\nimbalyst\\nimbalyst\\packages\\electron\\release";

describe("shouldSign", () => {
  it.each([
    `${RELEASE_DIR}\\win-unpacked\\${productName}.exe`,
    `${RELEASE_DIR}\\${productName}-Windows-x64.exe`,
    `${RELEASE_DIR}\\${productName}-Windows-arm64.exe`,
    `${RELEASE_DIR}\\${productName}-Windows-x64.__uninstaller.exe`,
  ])("signs our own binary %s", (filePath) => {
    expect(shouldSign(filePath)).toBe(true);
  });

  it.each([
    `${RELEASE_DIR}\\win-unpacked\\Nimbalyst.exe`,
    `${RELEASE_DIR}\\Nimbalyst-Windows-x64.exe`,
    `${RELEASE_DIR}\\Nimbalyst-Windows-arm64.exe`,
  ])("does not sign official Nimbalyst binary %s in the unofficial build", (filePath) => {
    expect(shouldSign(filePath)).toBe(false);
  });

  it.each([
    `${RELEASE_DIR}\\win-unpacked\\resources\\node-pty\\third_party\\conpty\\1.23.251008001\\win10-x64\\OpenConsole.exe`,
    `${RELEASE_DIR}\\win-unpacked\\resources\\node-pty\\prebuilds\\win32-x64\\winpty-agent.exe`,
    `${RELEASE_DIR}\\win-unpacked\\resources\\app.asar.unpacked\\node_modules\\@openai\\codex-win32-x64\\vendor\\x86_64-pc-windows-msvc\\codex-path\\rg.exe`,
    `${RELEASE_DIR}\\win-unpacked\\resources\\app.asar.unpacked\\node_modules\\@anthropic-ai\\claude-agent-sdk-win32-x64\\claude.exe`,
    `${RELEASE_DIR}\\win-unpacked\\swiftshader\\vk_swiftshader.dll`,
    `${RELEASE_DIR}\\win-unpacked\\resources\\app.asar.unpacked\\node_modules\\@img\\sharp-win32-x64\\lib\\libvips-42.dll`,
  ])("skips bundled binary %s", (filePath) => {
    expect(shouldSign(filePath)).toBe(false);
  });

  it("skips a vendor binary that merely sits beside ours", () => {
    expect(shouldSign(`${RELEASE_DIR}\\win-unpacked\\NimbalystHelper.exe`)).toBe(
      false
    );
  });
});
