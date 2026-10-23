// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import { createRendererDiagnosticLog } from '../rendererDiagnosticLog';

const fixture = vi.hoisted(() => ({ files: new Map<string, string>() }));
vi.mock('node:fs', () => {
  const key = (file: string) => file.replaceAll('\\', '/');
  return {
    existsSync: vi.fn((file: string) => fixture.files.has(key(file))),
    unlinkSync: vi.fn((file: string) => fixture.files.delete(key(file))),
    renameSync: vi.fn((from: string, to: string) => {
      fixture.files.set(key(to), fixture.files.get(key(from))!); fixture.files.delete(key(from));
    }),
    writeFileSync: vi.fn((file: string, text: string) => fixture.files.set(key(file), text)),
    appendFileSync: vi.fn((file: string, text: string) => fixture.files.set(key(file), (fixture.files.get(key(file)) ?? '') + text)),
  };
});

describe('normal fileLogging policy for direct diagnostic files', () => {
  beforeEach(() => { fixture.files.clear(); vi.clearAllMocks(); });
  const data = { timestamp: 'dummy-time', level: 'warn', source: 'renderer', message: 'dummy-private-content' };
  const options = (production: boolean) => ({ userDataPath: () => '/dummy-profile', production,
    now: () => 'dummy-start', onError: vi.fn() });

  it.each([true, false])('disabled logging leaves existing files untouched on production=%s startup', production => {
    fixture.files.set('/dummy-profile/logs/main.log', 'previous main');
    fixture.files.set('/dummy-profile/nimbalyst-debug.log', 'previous renderer');
    const before = new Map(fixture.files);
    const resolvePath = vi.fn(() => '/dummy-profile');
    createRendererDiagnosticLog({ ...options(production), userDataPath: resolvePath, enabled: () => false }).initialize();
    expect(fixture.files).toEqual(before);
    expect(resolvePath).not.toHaveBeenCalled();
    expect(fs.existsSync).not.toHaveBeenCalled();
    expect(fs.renameSync).not.toHaveBeenCalled();
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it('disabled renderer capture does not inspect payload or create a file', () => {
    const inspect = vi.fn(() => { throw new Error('must not inspect'); });
    const payload = { ...data, get level() { return inspect(); } };
    expect(() => createRendererDiagnosticLog({ ...options(true), enabled: () => false }).renderer(payload)).not.toThrow();
    expect(inspect).not.toHaveBeenCalled();
    expect(fixture.files.size).toBe(0);
  });

  it('retains default enabled production rotation and warning/error behavior', () => {
    fixture.files.set('/dummy-profile/logs/main.log', 'main current');
    fixture.files.set('/dummy-profile/logs/main.1.log', 'main previous');
    fixture.files.set('/dummy-profile/logs/main.2.log', 'main oldest');
    fixture.files.set('/dummy-profile/nimbalyst-debug.log', 'renderer previous');
    const diagnostics = createRendererDiagnosticLog(options(true));
    diagnostics.initialize();
    diagnostics.renderer({ ...data, level: 'info' });
    diagnostics.renderer(data);
    diagnostics.renderer({ ...data, level: 'error', message: 'dummy error' });
    expect(fixture.files.get('/dummy-profile/logs/main.1.log')).toBe('main current');
    expect(fixture.files.get('/dummy-profile/logs/main.2.log')).toBe('main previous');
    expect(fixture.files.has('/dummy-profile/logs/main.log')).toBe(false);
    expect(fixture.files.get('/dummy-profile/nimbalyst-debug.log')).toBe('renderer previous\n=== App Started dummy-start ===\n[dummy-time] [WARN] [renderer] dummy-private-content\n[dummy-time] [ERROR] [renderer] dummy error\n');
  });

  it('retains development rotation and captures informational messages when enabled', () => {
    fixture.files.set('/dummy-profile/nimbalyst-debug.log', 'current');
    fixture.files.set('/dummy-profile/nimbalyst-debug.3.log', 'third');
    fixture.files.set('/dummy-profile/nimbalyst-debug.4.log', 'oldest');
    const diagnostics = createRendererDiagnosticLog(options(false));
    diagnostics.initialize(); diagnostics.renderer({ ...data, level: 'info' });
    expect(fixture.files.get('/dummy-profile/nimbalyst-debug.1.log')).toBe('current');
    expect(fixture.files.get('/dummy-profile/nimbalyst-debug.4.log')).toBe('third');
    expect(fixture.files.get('/dummy-profile/nimbalyst-debug.log')).toBe('=== Debug Log Started dummy-start ===\n[dummy-time] [INFO] [renderer] dummy-private-content\n');
  });

  it('rechecks live normal configuration before renderer and quit writes', () => {
    let enabled = true;
    const diagnostics = createRendererDiagnosticLog({ ...options(true), enabled: () => enabled });
    diagnostics.initialize();
    diagnostics.append('/dummy-profile/preditor-debug.log', 'enabled quit diagnostic\n');
    const before = new Map(fixture.files);
    enabled = false;
    diagnostics.renderer(data);
    diagnostics.append('/dummy-profile/preditor-debug.log', 'disabled private error\n');
    expect(fixture.files).toEqual(before);
    enabled = true;
    diagnostics.renderer(data);
    expect(fixture.files.get('/dummy-profile/nimbalyst-debug.log')).toContain('dummy-private-content');
  });

  it('disabled quit diagnostics never create their file', () => {
    createRendererDiagnosticLog({ ...options(true), enabled: () => false }).append('/dummy-profile/preditor-debug.log', 'dummy-private-error');
    expect(fs.appendFileSync).not.toHaveBeenCalled();
    expect(fixture.files.size).toBe(0);
  });
});
