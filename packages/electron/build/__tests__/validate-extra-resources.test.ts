// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createRequire } from "module";

const require_ = createRequire(import.meta.url);
const asar = require_('@electron/asar');
const { getFileMatchers, copyFiles } = require_('app-builder-lib/out/fileMatcher.js');
const { getMainFileMatchers } = require_('app-builder-lib/out/fileMatcher.js');
const { doMergeConfigs } = require_('app-builder-lib/out/util/config/config.js');
const buildConfig = require_('../../package.json').build;
const { validatePackagedTutorialProject } = require_(
  "../validate-extra-resources.js"
);

const createdDirectories: string[] = [];

function createResourcesDirectory(): string {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "nim-tutorial-output-")
  );
  createdDirectories.push(directory);
  return directory;
}

afterEach(() => {
  while (createdDirectories.length > 0) {
    fs.rmSync(createdDirectories.pop()!, { recursive: true, force: true });
  }
});

describe("validatePackagedTutorialProject", () => {
  it("rejects packaged output that omitted the tutorial project", () => {
    const resourcesDirectory = createResourcesDirectory();

    expect(() => validatePackagedTutorialProject(resourcesDirectory)).toThrow(
      /packaged tutorial project is missing/i
    );
  });

  it("rejects output that contains only the English tutorial", () => {
    const resourcesDirectory = createResourcesDirectory();
    const tutorialDirectory = path.join(resourcesDirectory, "tutorial-project");
    fs.mkdirSync(tutorialDirectory);
    fs.writeFileSync(path.join(tutorialDirectory, "README.md"), "# Welcome");

    expect(() => validatePackagedTutorialProject(resourcesDirectory)).toThrow(
      /tutorial-project-ja/,
    );
  });

  it("accepts packaged output containing both tutorial languages", () => {
    const resourcesDirectory = createResourcesDirectory();
    const tutorialDirectory = path.join(resourcesDirectory, "tutorial-project");
    fs.mkdirSync(tutorialDirectory);
    fs.writeFileSync(path.join(tutorialDirectory, "README.md"), "# Welcome");
    const japaneseDirectory = path.join(resourcesDirectory, "tutorial-project-ja");
    fs.mkdirSync(japaneseDirectory);
    fs.writeFileSync(path.join(japaneseDirectory, "README.md"), "# Nimbalystへようこそ");

    expect(() =>
      validatePackagedTutorialProject(resourcesDirectory)
    ).not.toThrow();
  });
});

describe('ASAR-owned package inputs', () => {
  it('copies both real tutorial templates through the builder matchers', async () => {
    const directory = createResourcesDirectory();
    const electronDirectory = path.resolve(__dirname, '../..');
    const entries = buildConfig.extraResources.filter((item: any) =>
      ['tutorial-project', 'tutorial-project-ja'].includes(item.to),
    );
    expect(entries.map((item: any) => item.to).sort()).toEqual(['tutorial-project', 'tutorial-project-ja']);
    const matchers = getFileMatchers({ extraResources: entries }, 'extraResources', directory, {
      defaultSrc: electronDirectory, globalOutDir: directory, macroExpander: (value: string) => value, customBuildOptions: {},
    });
    await copyFiles(matchers, undefined, false);
    for (const name of ['tutorial-project', 'tutorial-project-ja']) {
      for (const file of ['README.md', 'trackers.json', 'sessions/01-draft-product-brief.json', 'sessions/02-triage-launch-bug.json']) {
        expect(fs.readFileSync(path.join(directory, name, file))).toEqual(
          fs.readFileSync(path.join(electronDirectory, 'resources', name, file)),
        );
      }
    }
    validatePackagedTutorialProject(directory);
  });

  it('copies the upstream MIT license without changing its copyright or bytes', async () => {
    const directory = createResourcesDirectory();
    const electronDirectory = path.resolve(__dirname, '../..');
    const sourceLicense = path.resolve(electronDirectory, '../../LICENSE');
    const entries = buildConfig.extraResources.filter((item: any) => item.to === 'legal/LICENSE');
    expect(entries).toHaveLength(1);
    const matchers = getFileMatchers({ extraResources: entries }, 'extraResources', directory, {
      defaultSrc: electronDirectory, globalOutDir: directory, macroExpander: (value: string) => value, customBuildOptions: {},
    });
    expect(matchers[0].from).toBe(sourceLicense);
    await copyFiles(matchers, undefined, false);
    const sourceBytes = fs.readFileSync(sourceLicense);
    expect(fs.readFileSync(path.join(directory, 'legal/LICENSE'))).toEqual(sourceBytes);
    expect(sourceBytes.toString('utf8')).toContain('Copyright (c) 2024-2026 Nimbalyst Inc.');
  });
  it('keeps the application allowlist after builder config normalization', () => {
    const directory = createResourcesDirectory();
    const app = path.join(directory, 'app');
    fs.mkdirSync(path.join(app, 'src/main'), { recursive: true });
    fs.mkdirSync(path.join(app, 'out/main'), { recursive: true });
    const excluded = path.join(app, 'src/main/private-build-fixture.ts');
    const included = path.join(app, 'out/main/index.js');
    fs.writeFileSync(excluded, 'not a runtime resource');
    fs.writeFileSync(included, 'compiled runtime fixture');
    const config = doMergeConfigs([JSON.parse(JSON.stringify(buildConfig))]);
    const debugLogger = { isEnabled: false };
    const packager = { info: { config, projectDir: app, buildResourcesDir: 'resources', isPrepackedAppAsar: false, debugLogger } };
    const matchers = getMainFileMatchers(app, path.join(directory, 'packed'), (value: string) => value.replaceAll('${arch}', 'x64'), config.win, packager, directory, false);
    expect(matchers.some((matcher: any) => matcher.createFilter()(excluded, fs.statSync(excluded)))).toBe(false);
    expect(matchers.some((matcher: any) => matcher.createFilter()(included, fs.statSync(included)))).toBe(true);
  });
  it('does not overwrite an ASAR-normalized ripgrep package manifest', async () => {
    const directory = createResourcesDirectory();
    const source = path.join(directory, 'source');
    const modulePath = 'node_modules/@vscode/ripgrep';
    fs.mkdirSync(path.join(source, modulePath), { recursive: true });
    const normalized = '{"name":"@vscode/ripgrep"}\n';
    fs.writeFileSync(path.join(source, modulePath, 'package.json'), normalized);
    const archive = path.join(directory, 'app.asar');
    await asar.createPackageWithOptions(source, archive, { unpack: '**/*' });
    const entry = buildConfig.extraResources.find((item: any) => item.to === 'app.asar.unpacked/node_modules/@vscode/ripgrep');
    const incoming = path.join(directory, 'incoming');
    fs.mkdirSync(path.join(incoming, 'bin'), { recursive: true });
    fs.writeFileSync(path.join(incoming, 'package.json'), '{"name":"@vscode/ripgrep","devDependencies":{"fixture":"1"}}');
    fs.writeFileSync(path.join(incoming, 'bin/rg.exe'), 'fixture binary');
    const matchers = getFileMatchers({ extraResources: [{ ...entry, from: incoming }] }, 'extraResources', directory, {
      defaultSrc: source, globalOutDir: directory, macroExpander: (value: string) => value, customBuildOptions: {},
    });
    await copyFiles(matchers, undefined, false);
    expect(fs.readFileSync(path.join(archive + '.unpacked', modulePath, 'package.json'), 'utf8')).toBe(normalized);
    expect(fs.readFileSync(path.join(archive + '.unpacked', modulePath, 'bin/rg.exe'), 'utf8')).toBe('fixture binary');
  });

  it.each(['x64', 'arm64'])('keeps the Windows %s Claude executable outside ASAR while retaining SDK metadata', (arch) => {
    const directory = createResourcesDirectory();
    const app = path.join(directory, 'app');
    const modulePath = `node_modules/@anthropic-ai/claude-agent-sdk-win32-${arch}`;
    fs.mkdirSync(path.join(app, modulePath), { recursive: true });
    const executable = path.join(app, modulePath, 'claude.exe');
    const manifest = path.join(app, modulePath, 'package.json');
    fs.writeFileSync(executable, 'fixture executable');
    fs.writeFileSync(manifest, '{}');
    const macroExpander = (value: string) => value.replaceAll('${arch}', arch);
    const matcher = getFileMatchers(buildConfig, 'files', path.join(directory, 'packed'), {
      defaultSrc: app, globalOutDir: directory, macroExpander, customBuildOptions: buildConfig.win,
    })[0];
    expect(matcher.createFilter()(executable, fs.statSync(executable))).toBe(false);
    expect(matcher.createFilter()(manifest, fs.statSync(manifest))).toBe(true);
    const runtimeCopies = getFileMatchers(buildConfig, 'extraResources', directory, {
      defaultSrc: app, globalOutDir: directory, macroExpander, customBuildOptions: buildConfig.win,
    }).filter((item: any) => item.to === path.join(directory, 'claude-runtime', `win32-${arch}`, 'claude.exe'));
    expect(runtimeCopies).toHaveLength(1);
    expect(path.basename(runtimeCopies[0].from)).toBe('claude.exe');
  });
});
