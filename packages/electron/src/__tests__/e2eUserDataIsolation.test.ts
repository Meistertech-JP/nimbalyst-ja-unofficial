// @vitest-environment node
/**
 * Guard: the E2E launcher must never point Electron at the developer's real
 * userData directory.
 *
 * `PLAYWRIGHT=1` only redirects the *database* (see `database/initialize.ts`)
 * and the extensions folder. Everything else `app.getPath('userData')` backs --
 * `app-settings.json`, `workspace-settings.json`, `ai-settings.json`,
 * `terminal-store.json`, `stytch-*.enc` -- resolves to the real directory
 * unless `NIMBALYST_USER_DATA_DIR` is set (see `main/bootstrap.ts`).
 *
 * Because `allowMultipleInstances` is also true under `PLAYWRIGHT`
 * (`main/index.ts`), a test run launches *alongside* the developer's running
 * dev instance and both electron-store instances read-modify-write the same
 * `app-settings.json`. That is how a test run can silently rewrite real
 * settings (sync config, signed-in accounts, open workspaces).
 */

import { describe, it, expect } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import { buildTestEnv } from '../../e2e/helpers';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';

const REAL_USER_DATA_FRAGMENT = path.join('@nimbalyst', 'electron');

describe('E2E launcher userData isolation', () => {
  it('pins Electron at an isolated temp userData directory', () => {
    const env = buildTestEnv('http://127.0.0.1:5273');

    expect(env.NIMBALYST_USER_DATA_DIR).toBeTruthy();
    expect(env.NIMBALYST_USER_DATA_DIR!.startsWith(os.tmpdir())).toBe(true);
    expect(env.NIMBALYST_USER_DATA_DIR).not.toContain(REAL_USER_DATA_FRAGMENT);
  });

  it('lets a spec opt into its own userData directory', () => {
    const mine = path.join(os.tmpdir(), 'nimbalyst-spec-scoped-user-data');
    const env = buildTestEnv('http://127.0.0.1:5273', {
      env: { NIMBALYST_USER_DATA_DIR: mine },
    });

    expect(env.NIMBALYST_USER_DATA_DIR).toBe(mine);
  });

  it('does not inherit a NIMBALYST_USER_DATA_DIR pointing at real user data', () => {
    // A worktree dev shell can export NIMBALYST_USER_DATA_DIR; `buildTestEnv`
    // spreads `process.env`, so the default must win over the inherited value
    // unless the spec asked for a specific directory.
    const previous = process.env.NIMBALYST_USER_DATA_DIR;
    process.env.NIMBALYST_USER_DATA_DIR = path.join(
      os.homedir(),
      'Library',
      'Application Support',
      '@nimbalyst',
      'electron',
    );
    try {
      const env = buildTestEnv('http://127.0.0.1:5273');
      expect(env.NIMBALYST_USER_DATA_DIR).not.toContain(REAL_USER_DATA_FRAGMENT);
    } finally {
      if (previous === undefined) delete process.env.NIMBALYST_USER_DATA_DIR;
      else process.env.NIMBALYST_USER_DATA_DIR = previous;
    }
  });
});

describe('bootstrap import-time profile isolation', () => {
  const requireBuiltin = createRequire(import.meta.url);

  async function observeIndexInitialization(env: Record<string, string>, argv: string[]) {
    const output = await build({
      entryPoints: [path.resolve(__dirname, '../main/bootstrap.ts')],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      write: false,
      external: ['electron'],
      plugins: [{
        name: 'observe-bootstrap-dependencies',
        setup(plugin) {
          plugin.onResolve({ filter: /^\.\/(index\.js|hostEnvironment|uncaughtException|utils\/privateSettingsStore)$/ }, args => ({ path: args.path, namespace: 'bootstrap-observer' }));
          plugin.onLoad({ filter: /.*/, namespace: 'bootstrap-observer' }, args => ({
            loader: 'js',
            contents: args.path === './index.js'
              ? `import { app } from 'electron'; globalThis.observedAtIndex = { userData: app.getPath('userData'), name: app.getName(), anthropic: process.env.ANTHROPIC_API_KEY, openai: process.env.OPENAI_API_KEY };`
              : args.path === './utils/privateSettingsStore'
                ? `export default class Store { get() { return 4096; } } export function hardenExistingSettings() {}`
                : args.path === './uncaughtException'
                  ? `export function createUncaughtExceptionHandler() { return () => {}; }`
                  : '',
          }));
        },
      }],
    });
    const paths: Record<string, string> = { userData: '/official-profile', appData: '/app-data' };
    let name = 'Official';
    const app = {
      setName(value: string) { name = value; },
      getName() { return name; },
      getPath(key: string) { return paths[key]; },
      setPath(key: string, value: string) { paths[key] = value; },
      commandLine: { appendSwitch() {} },
    };
    const context = {
      require: (specifier: string) => specifier === 'electron' ? { app } : requireBuiltin(specifier),
      exports: {},
      process: { env: { NODE_ENV: 'production', ...env }, argv, on() {} },
      observedAtIndex: undefined as undefined | { userData: string; name: string; anthropic?: string; openai?: string },
    };
    runInNewContext(output.outputFiles[0].text, context);
    return context.observedAtIndex!;
  }

  it('sets the explicit Main profile before index initialization and strips inherited provider keys', async () => {
    const profile = path.join(os.tmpdir(), 'bootstrap-scoped-profile');
    const observed = await observeIndexInitialization({ NIMBALYST_USER_DATA_DIR: profile, ANTHROPIC_API_KEY: 'fixture-anthropic', OPENAI_API_KEY: 'fixture-openai' }, ['app.exe', '--user-data-dir=/unused-argument']);
    expect(observed.userData).toBe(profile);
    expect(observed.name).toBe('Nimbalyst 日本語版（非公式）');
    expect(observed.anthropic).toBeUndefined();
    expect(observed.openai).toBeUndefined();
  });

  it('honors the command-line override before index initialization', async () => {
    const profile = path.join(os.tmpdir(), 'bootstrap-cli-profile');
    const observed = await observeIndexInitialization({}, ['app.exe', `--user-data-dir=${profile}`]);
    expect(observed.userData).toBe(profile);
  });

  it('chooses a distinct unofficial default before index initialization', async () => {
    const observed = await observeIndexInitialization({}, ['app.exe']);
    expect(observed.userData).toBe(path.join('/app-data', 'Nimbalyst 日本語版（非公式）'));
  });
});
