// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { QuickOpenFileNameCache } from '../QuickOpenFileNameCache';
import { mkdtemp, mkdir, writeFile, rename, rm } from 'fs/promises';
import * as path from 'node:path';
import { join } from 'path';
import { tmpdir } from 'os';

const file = (filePath: string) => ({ path: filePath, name: path.basename(filePath), type: 'file' as const });
const root = path.parse(process.cwd()).root;
const otherRoot = path.join(root, 'other');
const projectRoot = path.join(root, 'project');
afterEach(() => vi.useRealTimers());

it('rescans real disk files while preserving ignored-file, binary and local-plan filtering', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nimbalyst-1596-'));
  const cache = new QuickOpenFileNameCache();
  try {
    await mkdir(join(root, '.git'));
    await writeFile(join(root, '.gitignore'), 'ignored/\nnimbalyst-local/\n');
    await mkdir(join(root, 'ignored'));
    await writeFile(join(root, 'ignored', 'hidden.md'), 'hidden');
    await mkdir(join(root, 'nimbalyst-local'));
    await writeFile(join(root, 'nimbalyst-local', 'plan.md'), 'plan');
    await writeFile(join(root, 'archive.zip'), 'binary');
    const initial = (await cache.get(root)).map(item => item.path);
    expect(initial).toContain(join(root, 'nimbalyst-local', 'plan.md'));
    expect(initial).not.toContain(join(root, 'ignored', 'hidden.md'));
    expect(initial).not.toContain(join(root, 'archive.zip'));

    await mkdir(join(root, 'created'));
    await writeFile(join(root, 'created', 'new.md'), 'new');
    cache.invalidate(root);
    const created = (await cache.get(root)).map(item => item.path);
    expect(created).toContain(join(root, 'created', 'new.md'));
    expect(created).toContain(join(root, 'created'));
    await rename(join(root, 'created'), join(root, 'renamed'));
    cache.invalidate(root);
    const renamed = (await cache.get(root)).map(item => item.path);
    expect(renamed).not.toContain(join(root, 'created', 'new.md'));
    expect(renamed).toContain(join(root, 'renamed', 'new.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('coalesces scans and retries when a creation arrives during the scan, isolating other roots', async () => {
  let finish!: (items: ReturnType<typeof file>[]) => void;
  const scan = vi.fn(async (scanRoot: string) => [file(join(scanRoot, 'old.md'))]);
  const cache = new QuickOpenFileNameCache(scan);
  await cache.get(otherRoot);
  scan.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const first = cache.get(projectRoot);
  const second = cache.get(projectRoot, true);
  await Promise.resolve();
  cache.invalidate(projectRoot);
  scan.mockResolvedValue([file(join(projectRoot, 'new.md'))]);
  finish([file(join(projectRoot, 'old.md'))]);
  expect(await first).toEqual([file(join(projectRoot, 'new.md'))]);
  expect(await second).toEqual([file(join(projectRoot, 'new.md'))]);
  expect(scan).toHaveBeenCalledTimes(3);
  expect(await cache.get(otherRoot)).toEqual([file(join(otherRoot, 'old.md'))]);
  expect(scan).toHaveBeenCalledTimes(3);
});

it('retries failed scans, including refresh failures, without treating a failure as a fresh snapshot', async () => {
  const scan = vi.fn().mockRejectedValueOnce(new Error('scan failed')).mockResolvedValue([file(join(projectRoot, 'old.md'))]);
  const cache = new QuickOpenFileNameCache(scan);
  await expect(cache.get(projectRoot)).rejects.toThrow('scan failed');
  expect(await cache.get(projectRoot)).toEqual([file(join(projectRoot, 'old.md'))]);
  scan.mockRejectedValueOnce(new Error('refresh failed'));
  cache.invalidate(projectRoot);
  await expect(cache.get(projectRoot)).rejects.toThrow('refresh failed');
  scan.mockResolvedValue([file(join(projectRoot, 'new.md'))]);
  expect(await cache.get(projectRoot)).toEqual([file(join(projectRoot, 'new.md'))]);
});

it('expires unwatched snapshots and caches empty roots without scanning on every query', async () => {
  vi.useFakeTimers();
  const scan = vi.fn().mockResolvedValue([]);
  const cache = new QuickOpenFileNameCache(scan);
  expect(await cache.get(projectRoot)).toEqual([]);
  expect(await cache.get(projectRoot)).toEqual([]);
  expect(scan).toHaveBeenCalledTimes(1);
  scan.mockResolvedValue([file(join(projectRoot, 'new.md'))]);
  vi.advanceTimersByTime(30_000);
  expect(await cache.get(projectRoot)).toEqual([file(join(projectRoot, 'new.md'))]);
  expect(scan).toHaveBeenCalledTimes(2);
});

it('bounds rescans during continuous changes and keeps the snapshot dirty for the next search', async () => {
  const scan = vi.fn(async () => {
    cache.invalidate(projectRoot);
    return [file(join(projectRoot, `file-${scan.mock.calls.length}.md`))];
  });
  const cache = new QuickOpenFileNameCache(scan);
  expect(await cache.get(projectRoot)).toEqual([file(join(projectRoot, 'file-2.md'))]);
  expect(scan).toHaveBeenCalledTimes(2);
  scan.mockImplementation(async () => [file(join(projectRoot, 'settled.md'))]);
  expect(await cache.get(projectRoot)).toEqual([file(join(projectRoot, 'settled.md'))]);
  expect(scan).toHaveBeenCalledTimes(3);
});
