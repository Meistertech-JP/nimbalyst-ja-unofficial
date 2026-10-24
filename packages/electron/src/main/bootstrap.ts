/**
 * Bootstrap file - Entry point for electron-vite.
 *
 * This file handles custom user-data-dir configuration, which must be set
 * before any electron-store usage.
 *
 * bootstrapProfile runs as the first static dependency, before settings and
 * Main initialization. A path-setting statement in this file's body would run
 * after index and could not protect import-time profile reads.
 *
 * Native modules (node-pty) are handled via explicit path resolution in
 * TerminalSessionManager.ts using createRequire, which eliminates the need
 * for NODE_PATH manipulation and dynamic imports.
 *
 * V8 Memory Configuration:
 *   The heap memory limit can be configured via app-settings.json (maxHeapSizeMB).
 *   This must be applied before app.whenReady() via app.commandLine.appendSwitch().
 *
 * Usage:
 *   NIMBALYST_USER_DATA_DIR=/path/to/dir npm run dev
 *   or
 *   npm run dev -- --user-data-dir=/path/to/dir
 */

import './bootstrapProfile';
import { app } from 'electron';
import Store, { hardenExistingSettings } from './utils/privateSettingsStore';
import { createUncaughtExceptionHandler } from './uncaughtException';
// Tells the runtime package which host it is running in, before any of its
// modules resolve a binary path. Registration is a side effect of this import
// rather than a call in this file's body: ESM evaluates all static imports
// first, so a body statement here would lose the race to `./index.js` below.
// This import must stay above that one.
import './hostEnvironment';

// Global uncaught exception handler - must be registered early. This catches
// errors that bubble up from async SDK operations. The throttling and the
// EPIPE feedback-loop guard (#502) live in ./uncaughtException, extracted so
// they can be unit tested.
process.on('uncaughtException', createUncaughtExceptionHandler());

hardenExistingSettings(app.getPath('userData'));

// Configure V8 heap memory limit from app settings
// This must happen before app.whenReady() for the flag to take effect
// Default to 4096MB (4GB) if not configured
try {
  const appSettings = new Store<{ maxHeapSizeMB?: number }>({ name: 'app-settings' });
  const maxHeapSizeMB = appSettings.get('maxHeapSizeMB', 4096);
  if (maxHeapSizeMB && maxHeapSizeMB > 0) {
    app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${maxHeapSizeMB}`);
    // console.log(`[Bootstrap] V8 heap limit set to ${maxHeapSizeMB}MB`);
  }
} catch (error) {
  // If we can't read settings, use default
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
  // console.log('[Bootstrap] V8 heap limit set to 4096MB (default)');
}

// Enable CDP remote debugging in dev mode for Playwright extension testing.
// This allows `playwright connectOverCDP("http://localhost:9222")` to drive
// the running Nimbalyst instance without launching a separate Electron process.
// A packaged executable may have no NODE_ENV, or inherit a development value.
// Neither case authorizes opening a debugging endpoint in a product build.
if (!app.isPackaged && process.env.NODE_ENV !== 'production') {
  const cdpPort = process.env.NIMBALYST_CDP_PORT || '9222';
  app.commandLine.appendSwitch('remote-debugging-port', cdpPort);
  // console.log(`[Bootstrap] CDP remote debugging enabled on port ${cdpPort}`);
}

// Static import - no chunk boundary, no module duplication issues.
// Profile selection is a prior static dependency, not this module's body.
// node-pty uses explicit path resolution (TerminalSessionManager.ts).
import './index.js';
