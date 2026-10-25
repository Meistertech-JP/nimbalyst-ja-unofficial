// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import path from 'node:path';

const fixture = vi.hoisted(() => ({ fileLogging: true }));
vi.mock('electron', () => ({ app: { getPath: () => '/test-user-data' }, BrowserWindow: {} }));
vi.mock('../ipcRegistry', () => ({ safeOn: vi.fn() }));
vi.mock('../cpuProfileRetention', () => ({ pruneCpuProfiles: vi.fn() }));
// The retention test must not initialize real settings at its synthetic path.
vi.mock('../logger', () => ({ getLoggerConfig: () => ({ fileLogging: fixture.fileLogging }) }));

import { pruneCpuProfiles } from '../cpuProfileRetention';
import { startPerformanceMonitoring, stopPerformanceMonitoring } from '../performanceMonitor';

afterEach(() => {
  stopPerformanceMonitoring();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  fixture.fileLogging = true;
});

it('continues bounded cleanup when new profile capture is disabled', async () => {
  fixture.fileLogging = false;
  vi.useFakeTimers();
  vi.spyOn(process, 'cpuUsage').mockReturnValue({ user: 0, system: 0 });
  vi.mocked(pruneCpuProfiles).mockResolvedValue({ deletedCount: 0, deletedBytes: 0 });
  startPerformanceMonitoring();
  expect(pruneCpuProfiles).toHaveBeenCalledExactlyOnceWith(path.join('/test-user-data', 'logs'));
  await vi.advanceTimersByTimeAsync(60_000);
  expect(pruneCpuProfiles).toHaveBeenCalledTimes(2);
  stopPerformanceMonitoring();
  expect(vi.getTimerCount()).toBe(0);
});

it('prunes at startup and periodically, coalesces slow passes, and stops scheduling on shutdown', async () => {
  vi.useFakeTimers();
  vi.spyOn(process, 'cpuUsage').mockReturnValue({ user: 0, system: 0 });
  let finish!: (value: { deletedCount: number; deletedBytes: number }) => void;
  vi.mocked(pruneCpuProfiles).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValue({ deletedCount: 0, deletedBytes: 0 });
  startPerformanceMonitoring();
  expect(pruneCpuProfiles).toHaveBeenCalledWith(path.join('/test-user-data', 'logs'));
  await vi.advanceTimersByTimeAsync(120_000);
  expect(pruneCpuProfiles).toHaveBeenCalledTimes(1);
  finish({ deletedCount: 0, deletedBytes: 0 });
  await vi.advanceTimersByTimeAsync(60_000);
  expect(pruneCpuProfiles).toHaveBeenCalledTimes(2);
  stopPerformanceMonitoring();
  await vi.advanceTimersByTimeAsync(120_000);
  expect(pruneCpuProfiles).toHaveBeenCalledTimes(2);
  startPerformanceMonitoring();
  expect(pruneCpuProfiles).toHaveBeenCalledTimes(3);
});

it('reports a cleanup failure and retries on the next maintenance interval', async () => {
  vi.useFakeTimers();
  vi.spyOn(process, 'cpuUsage').mockReturnValue({ user: 0, system: 0 });
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const error = new Error('permission denied');
  vi.mocked(pruneCpuProfiles).mockRejectedValueOnce(error).mockResolvedValue({ deletedCount: 0, deletedBytes: 0 });
  startPerformanceMonitoring();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(warning).toHaveBeenCalledWith('[PERF] CPU profile retention failed:', error);
  expect(pruneCpuProfiles).toHaveBeenCalledTimes(2);
});
