// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appendFileSync } from 'fs';
import { app } from 'electron';
import { cancelForceQuit, setupForceQuit } from '../forceQuit';

const fixture = vi.hoisted(() => ({
  fileLogging: true, packaged: true, policyThrows: false,
  window: { isDestroyed: vi.fn(() => false), destroy: vi.fn(), getTitle: vi.fn(() => 'dummy window') },
  server: { constructor: { name: 'Server' }, address: vi.fn(() => 'dummy address'), close: vi.fn(), unref: vi.fn() },
}));
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/dummy-profile'), exit: vi.fn(), get isPackaged() { return fixture.packaged; } },
  BrowserWindow: { getAllWindows: vi.fn(() => [fixture.window]) },
}));
vi.mock('fs', () => ({ appendFileSync: vi.fn() }));
vi.mock('../logger', () => ({ getLoggerConfig: () => {
  if (fixture.policyThrows) throw new Error('dummy configuration failure');
  return { fileLogging: fixture.fileLogging };
} }));

describe('force quit respects the ordinary file logging policy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fixture.fileLogging = true; fixture.packaged = true; fixture.policyThrows = false;
    vi.clearAllMocks();
    // Never enumerate or close the test runner's real handles, exit it, or signal it.
    vi.spyOn(process as unknown as { _getActiveHandles: () => unknown[] }, '_getActiveHandles').mockReturnValue([fixture.server]);
    vi.spyOn(process as unknown as { _getActiveRequests: () => unknown[] }, '_getActiveRequests').mockReturnValue([]);
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.spyOn(process, 'kill').mockReturnValue(true);
  });
  afterEach(() => {
    cancelForceQuit(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers();
  });

  it('does not write or resolve the profile during disabled setup and cancellation', () => {
    fixture.fileLogging = false;
    setupForceQuit(10); cancelForceQuit(); vi.advanceTimersByTime(4000);
    expect(appendFileSync).not.toHaveBeenCalled();
    expect(app.getPath).not.toHaveBeenCalled();
    expect(app.exit).not.toHaveBeenCalled();
  });

  it('preserves packaged timing, cleanup and all exit attempts when logging is disabled', () => {
    fixture.fileLogging = false;
    setupForceQuit(10);
    vi.advanceTimersByTime(1999); expect(app.exit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fixture.window.destroy).toHaveBeenCalledOnce();
    expect(fixture.server.close).toHaveBeenCalledOnce();
    expect(fixture.server.unref).toHaveBeenCalledOnce();
    expect(app.exit).toHaveBeenCalledExactlyOnceWith(0);
    vi.advanceTimersByTime(499); expect(process.exit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(process.exit).toHaveBeenCalledExactlyOnceWith(0);
    vi.advanceTimersByTime(499); expect(process.kill).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(process.kill).toHaveBeenCalledExactlyOnceWith(process.pid, 'SIGKILL');
    expect(appendFileSync).not.toHaveBeenCalled();
    expect(app.getPath).not.toHaveBeenCalled();
  });

  it('retains enabled setup, timer and cancellation diagnostics', () => {
    setupForceQuit();
    expect(appendFileSync).toHaveBeenCalledWith(expect.stringContaining('nimbalyst-debug.log'), expect.stringContaining('Setting up force quit timer for 2000ms'));
    vi.advanceTimersByTime(2000);
    expect(appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('FORCE QUIT TIMER FIRED'));
    expect(app.exit).toHaveBeenCalledWith(0);
    cancelForceQuit();
    expect(appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('Force quit timer canceled'));
    vi.advanceTimersByTime(1000);
    expect(process.exit).not.toHaveBeenCalled();
    expect(process.kill).not.toHaveBeenCalled();
  });

  it('rechecks policy for delayed and cancellation writes without cancelling cleanup', () => {
    setupForceQuit();
    const writesBefore = vi.mocked(appendFileSync).mock.calls.length;
    fixture.fileLogging = false;
    vi.advanceTimersByTime(2000); cancelForceQuit();
    expect(app.exit).toHaveBeenCalledWith(0);
    expect(appendFileSync).toHaveBeenCalledTimes(writesBefore);
  });

  it('retains the requested development delay without logging', () => {
    fixture.packaged = false; fixture.fileLogging = false;
    setupForceQuit(25);
    vi.advanceTimersByTime(24); expect(app.exit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(app.exit).toHaveBeenCalledWith(0);
    expect(appendFileSync).not.toHaveBeenCalled();
  });

  it('does not let a logging configuration failure prevent cleanup', () => {
    fixture.policyThrows = true;
    expect(() => setupForceQuit()).not.toThrow();
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
    expect(fixture.window.destroy).toHaveBeenCalledOnce();
    expect(app.exit).toHaveBeenCalledWith(0);
    expect(appendFileSync).not.toHaveBeenCalled();
  });
});
