// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
require_('app-builder-lib');
const { AppInfo } = require_('app-builder-lib/out/appInfo.js');
const { NsisTarget } = require_('app-builder-lib/out/targets/nsis/NsisTarget.js');
const { PlatformPackager } = require_('app-builder-lib/out/platformPackager.js');
const { getWindowsInstallationDirName, getWindowsInstallationAppPackageName } = require_('app-builder-lib/out/targets/targetUtil.js');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const electronDir = resolve(root, 'packages/electron');
const builderDir = dirname(require_.resolve('app-builder-lib/package.json'));
const nsisDir = resolve(builderDir, 'templates/nsis');
const pkg = JSON.parse(readFileSync(resolve(electronDir, 'package.json'), 'utf8'));
const metadata = { ...pkg, ...pkg.build.extraMetadata };
const info = new AppInfo({ metadata, config: pkg.build }, undefined, pkg.build.win);
const appId = pkg.build.appId;
const ownClass = `${appId}.Markdown`;
const installDir = 'C:\\isolated path\\日本語版';
const executable = `${installDir}\\${info.productFilename}.exe`;
const expectedCommand = `"${executable}" "%1"`;
const bindings: Record<string, string> = {
  APP_ID: appId, PRODUCT_NAME: info.productName, APP_EXECUTABLE_FILENAME: `${info.productFilename}.exe`,
};

// This deliberately supports only the audited registry-command subset. Unknown
// instructions fail rather than being silently treated as harmless.
function words(line: string): string[] {
  const out: string[] = [];
  let token = '', quote = '', started = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '$' && line[i + 1] === '\\' && ['"', "'", '`'].includes(line[i + 2])) {
      token += line[i + 2]; i += 2; started = true; continue;
    }
    if (quote) { if (c === quote) quote = ''; else token += c; started = true; continue; }
    if (['"', "'", '`'].includes(c)) { quote = c; started = true; continue; }
    if (/\s/.test(c)) { if (started) { out.push(token); token = ''; started = false; } }
    else { token += c; started = true; }
  }
  if (quote) throw new Error('Unclosed NSIS token');
  if (started) out.push(token);
  return out;
}

function expand(script: string, macroName: string, optional = false): string[] {
  const macros = new Map<string, { args: string[]; body: string[] }>();
  function collect(source: string) {
    const lines = source.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('!include ')) {
        const file = words(line)[1];
        collect(readFileSync(file === 'FileAssociation.nsh' ? resolve(nsisDir, 'include', file) : file, 'utf8'));
      } else if (line.startsWith('!macro ')) {
        const [, name, ...args] = words(line);
        const body: string[] = [];
        while (++i < lines.length && !/^\s*!macroend\b/i.test(lines[i])) body.push(lines[i]);
        macros.set(name, { args, body });
      }
    }
  }
  collect(script);
  function invoke(name: string, args: string[], inherited: Record<string, string>): string[] {
    const macro = macros.get(name);
    if (!macro) throw new Error(`Missing actual NSIS macro: ${name}`);
    const vars = { ...inherited, ...Object.fromEntries(macro.args.map((arg, i) => [arg, args[i]])) };
    return macro.body.flatMap(raw => {
      const line = raw.replace(/\$\{([^}]+)\}/g, (original, key) => vars[key] ?? original).trim();
      if (!line || line.startsWith(';') || line.startsWith('#')) return [];
      if (line.startsWith('!insertmacro ')) { const [, child, ...childArgs] = words(line); return invoke(child, childArgs, vars); }
      return [line];
    });
  }
  return optional && !macros.has(macroName) ? [] : invoke(macroName, [], bindings);
}

type Registry = Map<string, string>;
const key = (path: string, name = '') => `${path.toLowerCase()}|${name.toLowerCase()}`;
function apply(commands: string[], registry: Registry): void {
  const vars: Record<string, string> = { INSTDIR: installDir, appExe: executable };
  const labels = new Map(commands.map((line, index) => [line.endsWith(':') ? line.slice(0, -1) : '', index]));
  const value = (input: string) => input.replace(/\$(INSTDIR|appExe|R\d)/g, (_, name) => vars[name] ?? '');
  function jump(destination: string, current: number): number {
    if (destination === '0' || !destination) return current;
    if (/^[+-]\d+$/.test(destination)) return current + Number(destination) - 1;
    const target = labels.get(destination); if (target === undefined) throw new Error(`Unknown jump ${destination}`); return target;
  }
  for (let i = 0, steps = 0; i < commands.length; i++) {
    if (++steps > 200) throw new Error('NSIS projection loop');
    if (commands[i].endsWith(':')) continue;
    const [op, ...args] = words(commands[i]);
    if (op === 'StrCmp') { i = jump(value(args[0]) === value(args[1]) ? args[2] : args[3], i); continue; }
    if (op === 'ReadRegStr') { if (args[1] !== 'SHELL_CONTEXT') throw new Error('Unexpected registry scope'); vars[args[0].slice(1)] = registry.get(key(value(args[2]), value(args[3]))) ?? ''; continue; }
    if (args[0] !== 'SHELL_CONTEXT') throw new Error(`Unexpected registry scope/instruction: ${commands[i]}`);
    const path = value(args[1]), name = value(args[2] ?? '');
    if (op === 'WriteRegStr') registry.set(key(path, name), value(args[3]));
    else if (op === 'WriteRegNone') registry.set(key(path, name), '');
    else if (op === 'DeleteRegValue') registry.delete(key(path, name));
    else if (op === 'DeleteRegKey') {
      for (const entry of [...registry.keys()]) if (entry.startsWith(`${path.toLowerCase()}|`) || entry.startsWith(`${path.toLowerCase()}\\`)) registry.delete(entry);
    } else throw new Error(`Unsupported NSIS instruction: ${op}`);
  }
}

let installed: string[], uninstalled: string[], defines: Record<string, unknown>;
beforeAll(async () => {
  const associations = Object.getOwnPropertyDescriptor(PlatformPackager.prototype, 'fileAssociations')!.get!.call({
    config: pkg.build, platformSpecificBuildOptions: pkg.build.win,
  });
  const packager = {
    config: pkg.build, appInfo: info, projectDir: electronDir,
    platformSpecificBuildOptions: pkg.build.win,
    info: { metadata, buildResourcesDir: resolve(electronDir, 'build'), cancellationToken: { cancelled: false } },
    fileAssociations: associations, resourceList: Promise.resolve([]),
    getResource: async (requested?: string) => requested ? resolve(electronDir, requested) : null,
    expandMacro: (text: string) => text.replace('${productName}', info.productName).replace('${version}', info.version),
  };
  const target = new NsisTarget(packager, '/unused-output', 'nsis', { refCount: 0 });
  target.options.preCompressedFileExtensions = [];
  defines = { APP_FILENAME: getWindowsInstallationDirName(info, true), APP_PACKAGE_NAME: getWindowsInstallationAppPackageName(info.name) };
  target.configureDefinesForAllTypeOfInstaller(defines);
  await target.configureDefines(false, defines);
  const custom = `!include "${resolve(electronDir, pkg.build.nsis.include)}"\n`;
  const installScript = await target.computeFinalScript(custom, true, new Map());
  const uninstallScript = await target.computeFinalScript(custom, false, new Map());
  installed = [...expand(installScript, 'registerFileAssociations', true), ...expand(installScript, 'customInstall')];
  uninstalled = [...expand(uninstallScript, 'customUnInstall'), ...expand(uninstallScript, 'unregisterFileAssociations', true)];

  // Optional native preflight: the explicit pinned compiler is only asked to
  // preprocess (/PPO), never to produce/run an installer or modify the registry.
  // Portable unit execution always exercises the real builder and registry model.
  if (process.env.NIMBALYST_NSIS_PREPROCESSOR) {
    const evidence = process.env.NIMBALYST_NSIS_EVIDENCE_DIR;
    if (!evidence) throw new Error('Native preprocessing requires an explicit evidence directory');
    mkdirSync(evidence, { recursive: true });
    for (const [name, script, macro] of [['installer', installScript, 'customInstall'], ['uninstaller', uninstallScript, 'customUnInstall']] as const) {
      const fixture = [
        `!addincludedir "${resolve(nsisDir, 'include')}"`,
        ...Object.entries(bindings).map(([name, value]) => `!define ${name} \`${value}\``),
        script, 'Function Projection',
        ...(name === 'installer' ? ['!ifmacrodef registerFileAssociations', '!insertmacro registerFileAssociations', '!endif'] : []),
        `!insertmacro ${macro}`,
        ...(name === 'uninstaller' ? ['!ifmacrodef unregisterFileAssociations', '!insertmacro unregisterFileAssociations', '!endif'] : []),
        'FunctionEnd',
      ].join('\n');
      const file = resolve(evidence, `${name}.nsi`);
      writeFileSync(file, fixture, 'utf8');
      const output = execFileSync(process.env.NIMBALYST_NSIS_PREPROCESSOR, ['/PPO', '/INPUTCHARSET', 'UTF8', '/OUTPUTCHARSET', 'UTF8', file], { encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
      writeFileSync(resolve(evidence, `${name}.expanded.nsi`), output, 'utf8');
      const projected = output.split(/\r?\n/).filter(line => /^(?:WriteReg|DeleteReg|ReadReg|StrCmp|unofficial_)/.test(line.trim())).map(line => line.trim());
      expect(projected).toEqual(name === 'installer' ? installed : uninstalled);
    }
    writeFileSync(resolve(evidence, 'builder-defines.json'), JSON.stringify(defines, null, 2));
  }
});

function seededRegistry(): Registry {
  return new Map([
    [key('Software\\Classes\\.md'), 'official.md'],
    [key('Software\\Classes\\.markdown'), 'thirdparty.markdown'],
    [key('Software\\Classes\\.md\\OpenWithProgids', 'official.md'), ''],
    [key('Software\\Classes\\Nimbalyst.Markdown\\shell\\open\\command'), 'official executable'],
    [key('Software\\Classes\\nimbalyst\\shell\\open\\command'), 'official protocol executable'],
  ]);
}

describe('NSIS unofficial isolation executed command projection', () => {
  it('adds Open With entries without taking existing extension defaults', () => {
    const registry = seededRegistry(), before = new Map(registry);
    apply(installed, registry);
    for (const [entry, value] of before) expect(registry.get(entry), entry).toBe(value);
    for (const ext of ['md', 'markdown']) expect(registry.has(key(`Software\\Classes\\.${ext}\\OpenWithProgids`, ownClass))).toBe(true);
    expect(registry.get(key(`Software\\Classes\\${ownClass}\\shell\\open\\command`))).toBe(expectedCommand);
    expect(registry.get(key(`Software\\Classes\\${ownClass}\\shell\\open`))).toBe(`${info.productName}で開く`);
    expect(registry.get(key(`Software\\Classes\\${ownClass}`))).toBe('Markdown ドキュメント');
  });

  it('unregisters only this installation and restores the original shared-state population', () => {
    const registry = seededRegistry(), before = new Map(registry);
    apply(installed, registry); apply(uninstalled, registry);
    expect([...registry].sort()).toEqual([...before].sort());
  });

  it('does not remove another installation owning the same edition class', () => {
    const registry = seededRegistry();
    registry.set(key(`Software\\Classes\\${ownClass}\\shell\\open\\command`), '"C:\\other\\edition.exe" "%1"');
    registry.set(key('Software\\Classes\\.md\\OpenWithProgids', ownClass), '');
    const before = new Map(registry); apply(uninstalled, registry);
    expect([...registry].sort()).toEqual([...before].sort());
  });

  it('uses independently derived builder cache/metadata and disables finish auto-run/elevation offers', () => {
    expect(pkg.name).toBe('@nimbalyst/electron');
    expect(info.name).toBe('nimbalyst-ja-unofficial');
    expect(defines.APP_INSTALLER_STORE_FILE).toBe('nimbalyst-ja-unofficial-updater\\installer.exe');
    expect(defines.APP_PACKAGE_NAME).toBe('nimbalyst-ja-unofficial');
    expect(defines.HIDE_RUN_AFTER_FINISH).toBeNull();
    expect(defines.MULTIUSER_INSTALLMODE_ALLOW_ELEVATION).toBeUndefined();
    expect(defines.INSTALL_MODE_PER_ALL_USERS).toBeUndefined();
  });
});
