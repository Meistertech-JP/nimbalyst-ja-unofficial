// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

const require_ = createRequire(import.meta.url);
const { loadInstalledPackages, walkDependencyTree } = require_('../generate-third-party-licenses.js');

function collect(includeOptionalDependencies: boolean): string[] {
  const packages = {
    'packages/example': {
      dependencies: { required: '1.0.0' },
      optionalDependencies: { optional: '1.0.0' },
    },
    'node_modules/required': {
      version: '1.0.0',
      dependencies: { transitive: '1.0.0' },
      optionalDependencies: { platformOnly: '1.0.0' },
    },
    'node_modules/optional': {
      version: '1.0.0',
      dependencies: { optionalTransitive: '1.0.0' },
    },
    'node_modules/transitive': { version: '1.0.0' },
    'node_modules/platformOnly': { version: '1.0.0' },
    'node_modules/optionalTransitive': { version: '1.0.0' },
  };
  const collected = new Map();

  walkDependencyTree(
    'packages/example',
    packages,
    new Set(),
    collected,
    includeOptionalDependencies,
  );

  return [...collected.values()]
    .map((record) => record.name)
    .sort();
}

describe('third-party license dependency traversal', () => {
  it('includes direct optional dependencies of a packaged workspace', () => {
    expect(collect(true)).toEqual([
      'optional',
      'optionalTransitive',
      'required',
      'transitive',
    ]);
  });

  it('does not include optional platform packages from transitive dependencies', () => {
    expect(collect(true)).not.toContain('platformOnly');
  });

  it('resolves nested dependencies through a workspace package symlink before hoisted versions', () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nimbalyst-license-fixture-'));
    const writeManifest = (relativePath: string, manifest: Record<string, unknown>) => {
      const packageDir = path.join(fixtureRoot, relativePath);
      fs.mkdirSync(packageDir, { recursive: true });
      fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify(manifest));
      return packageDir;
    };

    try {
      writeManifest('packages/electron', {
        name: '@nimbalyst/electron',
        version: '1.0.0',
        dependencies: { 'better-sqlite3': '13.0.3' },
      });
      const betterSqliteDir = writeManifest('node_modules/better-sqlite3', {
        name: 'better-sqlite3',
        version: '13.0.3',
        dependencies: { 'node-addon-api': '^8.0.0' },
      });
      writeManifest('node_modules/better-sqlite3/node_modules/node-addon-api', {
        name: 'node-addon-api',
        version: '8.9.0',
      });
      writeManifest('node_modules/node-addon-api', {
        name: 'node-addon-api',
        version: '7.1.1',
      });

      const nestedNodeModules = path.join(betterSqliteDir, 'node_modules');
      fs.symlinkSync(
        betterSqliteDir,
        path.join(nestedNodeModules, 'better-sqlite3-cycle'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      const workspaceNodeModules = path.join(fixtureRoot, 'packages/electron/node_modules');
      fs.mkdirSync(workspaceNodeModules, { recursive: true });
      fs.symlinkSync(
        betterSqliteDir,
        path.join(workspaceNodeModules, 'better-sqlite3'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );

      const packages = loadInstalledPackages(['packages/electron'], fixtureRoot);
      expect(packages['packages/electron/node_modules/better-sqlite3'].linkTargetKey)
        .toBe('node_modules/better-sqlite3');
      expect(packages['node_modules/better-sqlite3/node_modules/better-sqlite3-cycle'].linkTargetKey)
        .toBe('node_modules/better-sqlite3');
      const collected = new Map();
      walkDependencyTree('packages/electron', packages, new Set(), collected, true);

      const addonVersions = [...collected.values()]
        .filter((record) => record.name === 'node-addon-api')
        .map((record) => record.version);
      expect(addonVersions).toEqual(['8.9.0']);
    } finally {
      const resolvedTempRoot = path.resolve(os.tmpdir());
      const resolvedFixtureRoot = path.resolve(fixtureRoot);
      const relativeFixturePath = path.relative(resolvedTempRoot, resolvedFixtureRoot);
      const remainsInsideTemp = relativeFixturePath !== ''
        && relativeFixturePath !== '..'
        && !relativeFixturePath.startsWith(`..${path.sep}`)
        && !path.isAbsolute(relativeFixturePath);
      if (!path.basename(resolvedFixtureRoot).startsWith('nimbalyst-license-fixture-') || !remainsInsideTemp) {
        throw new Error(`Refusing to remove unexpected license fixture path: ${resolvedFixtureRoot}`);
      }
      fs.rmSync(resolvedFixtureRoot, { recursive: true, force: true });
    }
  });
});

const outputNames = ['THIRD_PARTY_NOTICES.txt', 'THIRD_PARTY_LICENSES.json', 'THIRD_PARTY_LICENSE_AUDIT.md'] as const;

function withLicenseCliFixture(run: (fixture: {
  root: string;
  output: string;
  cli: (check?: boolean) => ReturnType<typeof spawnSync>;
}) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nimbalyst-license-check-'));
  const script = path.join(root, 'packages/electron/build/generate-third-party-licenses.js');
  const write = (relative: string, contents: string) => {
    const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, contents);
  };
  write('packages/electron/package.json', JSON.stringify({ name: '@nimbalyst/electron', dependencies: { example: '1.0.0' } }));
  write('packages/runtime/package.json', JSON.stringify({ name: '@nimbalyst/runtime' }));
  write('node_modules/example/package.json', JSON.stringify({ name: 'example', version: '1.0.0', license: 'MIT' }));
  write('node_modules/example/LICENSE', 'The MIT License\nPermission is hereby granted.\nFixture copyright.\n');
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.copyFileSync(require_.resolve('../generate-third-party-licenses.js'), script);
  try {
    run({ root, output: path.join(root, 'packages/electron/resources/generated'), cli: (check = false) =>
      spawnSync(process.execPath, [script, ...(check ? ['--check'] : [])], { cwd: root, encoding: 'utf8', windowsHide: true }) });
  } finally {
    const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(root));
    if (!path.basename(root).startsWith('nimbalyst-license-check-') || !relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error('Refusing to remove unexpected license-check fixture');
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function snapshotLicenseOutputs(output: string) {
  return outputNames.filter(name => fs.existsSync(path.join(output, name))).map(name => ({
    name, bytes: fs.readFileSync(path.join(output, name)), mtime: fs.statSync(path.join(output, name)).mtimeMs,
  }));
}

describe('third-party license CLI read-only check', () => {
  it('accepts current contents with an older generation timestamp without writing any output', () => {
    withLicenseCliFixture(({ output, cli }) => {
      expect(cli().status).toBe(0);
      const file = path.join(output, 'THIRD_PARTY_LICENSES.json');
      const inventory = JSON.parse(fs.readFileSync(file, 'utf8'));
      expect(inventory.packages.map((item: { id: string }) => item.id)).toEqual(['example@1.0.0']);
      inventory.generatedAt = '2000-01-01T00:00:00.000Z';
      fs.writeFileSync(file, JSON.stringify(inventory));
      const before = snapshotLicenseOutputs(output);
      expect(cli(true).status).toBe(0);
      expect(snapshotLicenseOutputs(output)).toEqual(before);
    });
  });

  it('fails on absent output directory without creating it', () => {
    withLicenseCliFixture(({ output, cli }) => {
      const checked = cli(true);
      expect(checked.status).toBe(1);
      expect(fs.existsSync(output)).toBe(false);
    });
  });

  it.each(outputNames)('fails for missing %s without regenerating it', name => {
    withLicenseCliFixture(({ output, cli }) => {
      expect(cli().status).toBe(0); fs.unlinkSync(path.join(output, name));
      const before = snapshotLicenseOutputs(output);
      const checked = cli(true);
      expect(checked.status).toBe(1); expect(String(checked.stderr)).toContain(name);
      expect(snapshotLicenseOutputs(output)).toEqual(before);
      expect(fs.existsSync(path.join(output, name))).toBe(false);
    });
  });

  it.each(outputNames)('fails for stale %s without repairing it', name => {
    withLicenseCliFixture(({ output, cli }) => {
      expect(cli().status).toBe(0);
      const file = path.join(output, name);
      if (name.endsWith('.json')) {
        const inventory = JSON.parse(fs.readFileSync(file, 'utf8')); inventory.packages[0].version = 'stale';
        fs.writeFileSync(file, JSON.stringify(inventory));
      } else fs.appendFileSync(file, '\nStale fixture attribution\n');
      const before = snapshotLicenseOutputs(output);
      const checked = cli(true);
      expect(checked.status).toBe(1); expect(String(checked.stderr)).toContain(name);
      expect(snapshotLicenseOutputs(output)).toEqual(before);
    });
  });

  it('detects installed legal-file changes while normal generation still updates outputs', () => {
    withLicenseCliFixture(({ root, output, cli }) => {
      expect(cli().status).toBe(0);
      fs.appendFileSync(path.join(root, 'node_modules/example/LICENSE'), 'Additional fixture copyright.\n');
      const before = snapshotLicenseOutputs(output);
      expect(cli(true).status).toBe(1); expect(snapshotLicenseOutputs(output)).toEqual(before);
      expect(cli().status).toBe(0);
      expect(fs.readFileSync(path.join(output, 'THIRD_PARTY_NOTICES.txt'), 'utf8')).toContain('Additional fixture copyright.');
      expect(cli(true).status).toBe(0);
    });
  });

  it('rejects malformed inventory JSON without replacing it', () => {
    withLicenseCliFixture(({ output, cli }) => {
      expect(cli().status).toBe(0);
      fs.writeFileSync(path.join(output, 'THIRD_PARTY_LICENSES.json'), '{invalid fixture');
      const before = snapshotLicenseOutputs(output);
      expect(cli(true).status).toBe(1); expect(snapshotLicenseOutputs(output)).toEqual(before);
    });
  });

  it.each([undefined, null, 123, 'not-a-date', '2026-02-30T00:00:00.000Z'])(
    'rejects missing or invalid generatedAt %s without writing output', generatedAt => {
      withLicenseCliFixture(({ output, cli }) => {
        expect(cli().status).toBe(0);
        const file = path.join(output, 'THIRD_PARTY_LICENSES.json');
        const inventory = JSON.parse(fs.readFileSync(file, 'utf8'));
        inventory.generatedAt = generatedAt; fs.writeFileSync(file, JSON.stringify(inventory));
        const before = snapshotLicenseOutputs(output);
        expect(cli(true).status).toBe(1); expect(snapshotLicenseOutputs(output)).toEqual(before);
      });
    },
  );

  it.each(['root', 'package'])('rejects extra inventory fields at %s scope', scope => {
    withLicenseCliFixture(({ output, cli }) => {
      expect(cli().status).toBe(0);
      const file = path.join(output, 'THIRD_PARTY_LICENSES.json');
      const inventory = JSON.parse(fs.readFileSync(file, 'utf8'));
      (scope === 'root' ? inventory : inventory.packages[0]).unexpectedField = 'must not be ignored';
      fs.writeFileSync(file, JSON.stringify(inventory));
      const before = snapshotLicenseOutputs(output);
      expect(cli(true).status).toBe(1); expect(snapshotLicenseOutputs(output)).toEqual(before);
    });
  });

  it('retains manual-review failures even when generated output matches', () => {
    withLicenseCliFixture(({ root, output, cli }) => {
      fs.writeFileSync(path.join(root, 'node_modules/example/package.json'), JSON.stringify({ name: 'example', version: '1.0.0', license: 'GPL-3.0' }));
      fs.writeFileSync(path.join(root, 'node_modules/example/LICENSE'), 'GNU GENERAL PUBLIC LICENSE\nFixture GPL text.\n');
      expect(cli().status).toBe(0);
      const before = snapshotLicenseOutputs(output);
      const checked = cli(true);
      expect(checked.status).toBe(1); expect(String(checked.stderr)).toContain('Review-required packages detected');
      expect(snapshotLicenseOutputs(output)).toEqual(before);
    });
  });
});
