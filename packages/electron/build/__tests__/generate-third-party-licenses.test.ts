// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createRequire } from 'module';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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
