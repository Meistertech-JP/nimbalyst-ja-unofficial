import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// Per-worker re-export of the Node-ABI better-sqlite3 binary that
// vitest.globalSetup.ts cached. Worker processes don't inherit globalSetup
// env mutations, so we read it from the disk cache the global setup wrote.
if (!process.env.NIMBALYST_BETTER_SQLITE3_NATIVE) {
  const cached = path.join(
    __dirname,
    'node_modules',
    '.cache',
    'nimbalyst-better-sqlite3-node',
    'binary-path.txt',
  );
  if (fs.existsSync(cached)) {
    // Only adopt the pointer when it names a binary matching the currently
    // installed better-sqlite3 version AND this Node's ABI -- a stale pointer
    // from a previous version would otherwise load a mismatched .node and
    // crash the worker. Resolution is best-effort: better-sqlite3 may be
    // hoisted to the repo root rather than sitting in packages/electron, and a
    // throw here would take down every test file with an opaque ENOENT.
    let expectedBinaryName: string | null = null;
    try {
      const req = createRequire(path.join(__dirname, 'package.json'));
      const version = JSON.parse(
        fs.readFileSync(req.resolve('better-sqlite3/package.json'), 'utf-8'),
      ).version;
      expectedBinaryName = `better_sqlite3-v${version}-modules${process.versions.modules}-${process.platform}-${process.arch}.node`;
    } catch {
      // better-sqlite3 not resolvable -- leave the env var unset and let the
      // package's own loader deal with it.
    }

    const p = fs.readFileSync(cached, 'utf-8').trim();
    if (expectedBinaryName && p && path.basename(p) === expectedBinaryName && fs.existsSync(p)) {
      process.env.NIMBALYST_BETTER_SQLITE3_NATIVE = p;
    }
  }
}

// Mock electron for tests that import it
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/path'),
    getName: vi.fn(() => 'test-app'),
    getVersion: vi.fn(() => '1.0.0'),
    // Lifecycle event registration: several main-process modules call
    // `app.on('before-quit', ...)` at import time (e.g. WindowManager via
    // WorkspaceWatcher). Stub the EventEmitter-style surface so importing them
    // under test doesn't throw "app.on is not a function".
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    removeListener: vi.fn(),
    whenReady: vi.fn(() => Promise.resolve()),
    quit: vi.fn(),
    isReady: vi.fn(() => true)
  },
  ipcRenderer: {
    send: vi.fn(),
    on: vi.fn(),
    invoke: vi.fn()
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  }
}));

// jsdom does not provide IntersectionObserver, while transcript views use it
// to track whether their scroll container is visible. The tests only need the
// observer lifecycle methods; visibility is not part of these assertions.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds: readonly number[] = [];
    disconnect() {}
    observe(_target: Element) {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
    unobserve(_target: Element) {}
  } as unknown as typeof IntersectionObserver;
}

// jsdom does not provide matchMedia, while the editor shell uses it to react
// to responsive layout changes. The i18n tests do not exercise media-query
// transitions, so a stable no-match implementation is sufficient here.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  })) as typeof window.matchMedia;
}

// jsdom does not provide ResizeObserver, while table hover actions use it to
// keep their controls aligned with resized editor cells.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    constructor(_callback: ResizeObserverCallback) {}
    disconnect() {}
    observe(_target: Element) {}
    unobserve(_target: Element) {}
  } as unknown as typeof ResizeObserver;
}

// Initialize react-i18next synchronously with English resources so component
// tests can assert on translated strings without each test wiring up i18n.
import { resources } from './src/shared/i18n/resources';
import { defaultNS, fallbackLng, supportedLngs } from './src/shared/i18n/types';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    lng: 'en',
    fallbackLng,
    ns: Object.keys(resources.en),
    defaultNS,
    resources,
    supportedLngs,
    returnEmptyString: false,
    returnNull: false,
    interpolation: { escapeValue: false },
  });
}
