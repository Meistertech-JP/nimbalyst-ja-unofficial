// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'fs';
import { app } from 'electron';
import path from 'node:path';
import { pruneCpuProfiles } from '../cpuProfileRetention';

const fixture = vi.hoisted(() => ({
  enabled: true, policyThrows: false, cpu: 0,
  constructed: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), post: vi.fn(),
}));
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/dummy-profile') },
  BrowserWindow: { fromWebContents: vi.fn() },
}));
vi.mock('../ipcRegistry', () => ({ safeOn: vi.fn() }));
vi.mock('../cpuProfileRetention', () => ({ pruneCpuProfiles: vi.fn(async () => ({ deletedCount: 0, deletedBytes: 0 })) }));
vi.mock('../logger', () => ({ getLoggerConfig: () => {
  if (fixture.policyThrows) throw new Error('dummy policy failure');
  return { fileLogging: fixture.enabled };
} }));
vi.mock('fs', () => ({ promises: { mkdir: vi.fn(), writeFile: vi.fn() } }));
vi.mock('inspector', () => ({ default: { Session: class {
  constructor() { fixture.constructed(); }
  connect = fixture.connect;
  disconnect = fixture.disconnect;
  post = fixture.post;
} } }));

describe('CPU profile respects ordinary fileLogging policy', () => {
  let monitor: typeof import('../performanceMonitor');
  beforeEach(async () => {
    vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    vi.clearAllMocks(); fixture.enabled = true; fixture.policyThrows = false; fixture.cpu = 0;
    vi.spyOn(process, 'cpuUsage').mockImplementation(() => {
      const sample = { user: fixture.cpu, system: 0 }; fixture.cpu += 10_000_000; return sample;
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    fixture.post.mockImplementation((_method: string, _params: unknown, callback: (error: null, result: object) => void) => {
      callback(null, { profile: { nodes: [], samples: [1] } });
    });
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    monitor = await import('../performanceMonitor');
  });
  afterEach(() => {
    monitor.stopPerformanceMonitoring(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers();
  });

  it('keeps CPU sampling and shutdown timers without constructing an inspector when disabled', async () => {
    fixture.enabled = false; monitor.startPerformanceMonitoring();
    // Retention still owns old profiles even when new capture is disabled.
    expect(pruneCpuProfiles).toHaveBeenCalledExactlyOnceWith(path.join('/dummy-profile', 'logs'));
    vi.mocked(app.getPath).mockClear();
    await vi.advanceTimersByTimeAsync(25_000);
    expect(process.cpuUsage).toHaveBeenCalledTimes(3);
    expect(console.log).toHaveBeenCalledWith('[PERF] High CPU usage:', expect.any(String));
    expect(fixture.constructed).not.toHaveBeenCalled();
    expect(app.getPath).not.toHaveBeenCalled();
    expect(fs.mkdir).not.toHaveBeenCalled(); expect(fs.writeFile).not.toHaveBeenCalled();
    monitor.stopPerformanceMonitoring(); expect(vi.getTimerCount()).toBe(0);
  });

  it('suppresses lag-triggered profiles under the same disabled policy', async () => {
    fixture.enabled = false; monitor.startPerformanceMonitoring();
    vi.setSystemTime(new Date('2026-01-01T00:00:03.000Z'));
    await vi.advanceTimersByTimeAsync(250);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Event loop lag: 3000ms'));
    expect(fixture.constructed).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('preserves enabled capture duration, timestamp, profile bytes and cooldown', async () => {
    monitor.startPerformanceMonitoring(); await vi.advanceTimersByTimeAsync(20_000);
    expect(fixture.constructed).toHaveBeenCalledOnce();
    expect(fixture.post.mock.calls.map(call => call[0])).toEqual(['Profiler.enable', 'Profiler.start']);
    await vi.advanceTimersByTimeAsync(4_999); expect(fs.writeFile).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fixture.post.mock.calls.map(call => call[0])).toEqual(['Profiler.enable', 'Profiler.start', 'Profiler.stop']);
    expect(fs.writeFile).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/cpu-2026-01-01T00-00-25-000Z\.cpuprofile$/), '{"nodes":[],"samples":[1]}');
    expect(fixture.disconnect).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(35_000);
    expect(fixture.constructed).toHaveBeenCalledOnce();
    monitor.stopPerformanceMonitoring(); expect(vi.getTimerCount()).toBe(0);
  });

  it('discards a profile if disabled during capture and still disconnects', async () => {
    monitor.startPerformanceMonitoring(); await vi.advanceTimersByTimeAsync(20_000);
    expect(pruneCpuProfiles).toHaveBeenCalledOnce();
    vi.mocked(app.getPath).mockClear();
    fixture.enabled = false; await vi.advanceTimersByTimeAsync(5_000);
    expect(fixture.constructed).toHaveBeenCalledOnce(); expect(fixture.disconnect).toHaveBeenCalledOnce();
    expect(app.getPath).not.toHaveBeenCalled();
    expect(fs.mkdir).not.toHaveBeenCalled(); expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('rechecks after asynchronous directory creation before persisting profile bytes', async () => {
    vi.mocked(fs.mkdir).mockImplementation(async () => { fixture.enabled = false; return undefined; });
    monitor.startPerformanceMonitoring(); await vi.advanceTimersByTimeAsync(25_000);
    expect(fs.mkdir).toHaveBeenCalledOnce(); expect(fs.writeFile).not.toHaveBeenCalled();
    expect(fixture.disconnect).toHaveBeenCalledOnce();
  });

  it('fails closed on configuration errors before capture without interrupting monitoring shutdown', async () => {
    fixture.policyThrows = true; monitor.startPerformanceMonitoring();
    await vi.advanceTimersByTimeAsync(25_000);
    expect(fixture.constructed).not.toHaveBeenCalled(); expect(fs.writeFile).not.toHaveBeenCalled();
    expect(() => monitor.stopPerformanceMonitoring()).not.toThrow(); expect(vi.getTimerCount()).toBe(0);
  });

  it('discards an in-flight profile on configuration failure and releases the inspector', async () => {
    monitor.startPerformanceMonitoring(); await vi.advanceTimersByTimeAsync(20_000);
    fixture.policyThrows = true; await vi.advanceTimersByTimeAsync(5_000);
    expect(fixture.disconnect).toHaveBeenCalledOnce();
    expect(fs.mkdir).not.toHaveBeenCalled(); expect(fs.writeFile).not.toHaveBeenCalled();
    monitor.stopPerformanceMonitoring(); expect(vi.getTimerCount()).toBe(0);
  });
});
