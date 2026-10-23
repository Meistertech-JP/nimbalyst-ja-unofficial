// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vm from 'node:vm';
import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import { buildSync, type BuildOptions } from 'esbuild';

const electronRoot = path.resolve(__dirname, '../../../../..');
const scriptPath = path.join(electronRoot, 'build/build-worker.js');
const requireBuild = createRequire(scriptPath);
const roots: string[] = [];
let sqliteBundle: { filename: string; contents: Uint8Array };
const bundles = new Map<string, { filename: string; contents: Uint8Array }>();

beforeAll(async () => {
  // Capture the production build's actual options without running its writes.
  // Compile that same entry/options, not an eval-only stand-in for the worker.
  const builds: BuildOptions[] = [];
  const context = {
    require: Object.assign((id: string) => id === 'esbuild'
      ? { build: async (options: BuildOptions) => { builds.push(options); } }
      : id === 'fs' ? { ...fs, copyFileSync: () => undefined, unlinkSync: () => undefined } : requireBuild(id),
    { resolve: requireBuild.resolve }),
    __dirname: path.dirname(scriptPath),
    console: { log: () => undefined, error: () => undefined },
    process: { env: process.env, exit: (code: number) => { throw new Error(`build exited ${code}`); } },
    module: { exports: {} as { buildWorker?: () => Promise<void> } },
  };
  vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });
  await context.module.exports.buildWorker!();
  for (const options of builds) {
    if (!options.outfile || !Array.isArray(options.entryPoints)) throw new Error('Worker build has no file entry');
    const entry = options.entryPoints[0];
    if (typeof entry !== 'string') throw new Error('Worker build entry is not a path');
    const result = buildSync({ ...options, write: false, sourcemap: false });
    bundles.set(path.basename(entry), {
      filename: path.basename(options.outfile), contents: result.outputFiles![0].contents,
    });
  }
  sqliteBundle = bundles.get('sqliteWorker.ts')!;
  if (!sqliteBundle) throw new Error('Production SQLite worker build was not registered');
});

afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function installBundles(resources: string): void {
  for (const bundle of bundles.values()) fs.writeFileSync(path.join(resources, bundle.filename), bundle.contents);
  const sqliteRoot = path.dirname(requireBuild.resolve('better-sqlite3/package.json'));
  fs.cpSync(sqliteRoot, path.join(resources, 'node_modules/better-sqlite3'), { recursive: true });
  const pgliteDir = path.dirname(requireBuild.resolve('@electric-sql/pglite'));
  for (const filename of ['pglite.wasm', 'pglite.data']) {
    fs.copyFileSync(path.join(pgliteDir, filename), path.join(resources, filename));
  }
}

function nextMessage(worker: Worker, timeoutMs = 15_000): Promise<unknown> {
  return once(worker, 'message', { signal: AbortSignal.timeout(timeoutMs) }).then(([message]) => message);
}

describe('production SQLite worker file module scope', () => {
  for (const scope of ['module', 'commonjs', 'none'] as const) {
    it(`opens, queries and closes a fresh database beneath ${scope} package scope`, async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nim-worker-scope-'));
      roots.push(root);
      if (scope !== 'none') fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ type: scope }));
      const resources = path.join(root, 'app/resources');
      fs.mkdirSync(resources, { recursive: true });
      const workerPath = path.join(resources, sqliteBundle.filename);
      // Copy the module's own scope too; never depend on repo node_modules or
      // replace/rebuild the Electron-owned native binary for this test.
      installBundles(resources);
      const worker = new Worker(workerPath);
      let sequence = 0;
      const request = (type: string, payload?: unknown) => new Promise<unknown>((resolve, reject) => {
        const id = String(++sequence);
        const timer = setTimeout(() => finish(new Error(`Worker ${type} timed out`)), 15_000);
        const onError = (error: Error) => finish(error);
        const onExit = (code: number) => finish(new Error(`Worker exited ${code} during ${type}`));
        const onMessage = (message: { id?: string; success?: boolean; data?: unknown; error?: { message: string } }) => {
          if (message.id === id) finish(message.success ? undefined : new Error(message.error?.message), message.data);
        };
        function finish(error?: Error, data?: unknown) {
          clearTimeout(timer);
          worker.off('message', onMessage); worker.off('error', onError); worker.off('exit', onExit);
          if (error) reject(error); else resolve(data);
        }
        worker.on('message', onMessage); worker.on('error', onError); worker.on('exit', onExit);
        worker.postMessage({ id, type, payload });
      });
      try {
        await request('init', {
          dbDir: path.join(root, 'profile/sqlite-db'),
          schemaDir: path.join(electronRoot, 'src/main/database/sqlite/schemas'),
          sampleRate: 0, backupCopiesKept: 0,
        });
        await expect(request('query', { sql: 'SELECT 42 AS answer', params: [] }))
          .resolves.toMatchObject({ rows: [{ answer: 42 }] });
        await expect(request('close')).resolves.toMatchObject({ closed: true });
        for (const [entry, workerData] of [
          ['sqliteVerifyWorker.ts', { backupPath: path.join(root, 'profile/sqlite-db/nimbalyst.sqlite') }],
          ['recoveryVerifyWorker.ts', { dbPath: path.join(root, 'profile/sqlite-db/nimbalyst.sqlite') }],
        ] as const) {
          const verifier = new Worker(path.join(resources, bundles.get(entry)!.filename), { workerData });
          try {
            await expect(nextMessage(verifier)).resolves.toMatchObject({ valid: true });
          } finally {
            await verifier.terminate();
          }
        }
      } finally {
        await worker.terminate();
      }
    }, 30_000);
  }

  for (const entry of ['worker.js', 'historyDiffWorker.ts', 'projectManifestWorker.ts', 'gifEncodeWorker.ts']) {
    it(`executes the production ${entry} file beneath module package scope`, async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nim-worker-scope-'));
      roots.push(root);
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ type: 'module' }));
      const resources = path.join(root, 'resources');
      fs.mkdirSync(resources);
      installBundles(resources);
      const worker = new Worker(path.join(resources, bundles.get(entry)!.filename), {
        workerData: { userDataPath: path.join(root, 'profile') },
      });
      try {
        // First-use WASM initialization plus the real schema can exceed 15s
        // on a loaded Windows host; this is a hang guard, not a UI deadline.
        let response = nextMessage(worker, entry === 'worker.js' ? 60_000 : 15_000);
        if (entry === 'worker.js') {
          worker.postMessage({ id: 'init', type: 'init' });
          await expect(response).resolves.toMatchObject({ id: 'init', success: true });
          response = nextMessage(worker);
          worker.postMessage({ id: 'query', type: 'query', payload: { sql: 'SELECT 42 AS answer', params: [] } });
          await expect(response).resolves.toMatchObject({ id: 'query', success: true, data: { rows: [{ answer: 42 }] } });
          response = nextMessage(worker);
          worker.postMessage({ id: 'close', type: 'close' });
          await expect(response).resolves.toMatchObject({ id: 'close', success: true });
        } else if (entry === 'historyDiffWorker.ts') {
          worker.postMessage({ id: 'diff', before: 'before\n', after: 'after\n' });
          await expect(response).resolves.toMatchObject({ id: 'diff', result: { status: 'ready', linesAdded: 1, linesRemoved: 1 } });
        } else if (entry === 'projectManifestWorker.ts') {
          const filePath = path.join(root, 'test.md');
          fs.writeFileSync(filePath, 'hello');
          worker.postMessage({ id: 'manifest', files: [filePath] });
          await expect(response).resolves.toMatchObject({ id: 'manifest', results: [{ filePath, contentHash: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824' }] });
        } else {
          const outputPath = path.join(root, 'test.gif');
          worker.postMessage({ type: 'frame', width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) });
          worker.postMessage({ type: 'encode', delays: [100], outputPath });
          await expect(response).resolves.toMatchObject({ ok: true });
          expect(fs.readFileSync(outputPath).subarray(0, 6).toString()).toBe('GIF89a');
        }
      } finally {
        await worker.terminate();
      }
    }, 90_000);
  }

  it('removes only obsolete generated worker files after a format migration', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nim-worker-cleanup-'));
    roots.push(root);
    const context = {
      require: requireBuild, __dirname: path.dirname(scriptPath), module: { exports: {} as {
        removeLegacyWorkerBundles?: (directory: string) => void;
      } }, process, console,
    };
    vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });
    for (const basename of ['worker', 'sqlite-worker', 'sqlite-verify-worker',
      'sqlite-recovery-verify-worker', 'history-diff-worker', 'gif-encode-worker', 'project-manifest-worker']) {
      fs.writeFileSync(path.join(root, `${basename}.bundle.js`), 'obsolete');
      fs.writeFileSync(path.join(root, `${basename}.bundle.js.map`), 'obsolete map');
      fs.writeFileSync(path.join(root, `${basename}.bundle.cjs`), 'replacement');
    }
    fs.mkdirSync(path.join(root, 'main'));
    fs.writeFileSync(path.join(root, 'main/index.js'), 'main output');
    fs.writeFileSync(path.join(root, 'unrelated.bundle.js'), 'unrelated');
    context.module.exports.removeLegacyWorkerBundles!(root);
    expect(fs.readdirSync(root).sort()).toEqual([
      ...[...bundles.values()].map((bundle) => bundle.filename), 'main', 'unrelated.bundle.js',
    ].sort());
    expect(fs.readFileSync(path.join(root, 'main/index.js'), 'utf8')).toBe('main output');
    expect(fs.readFileSync(path.join(root, 'unrelated.bundle.js'), 'utf8')).toBe('unrelated');
  });
});
