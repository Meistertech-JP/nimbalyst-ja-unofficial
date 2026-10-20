// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '@nimbalyst/runtime/store';
import { marketplaceInstallProgressAtom, sessionLaunchPopupRequestAtom } from '../../atoms/appCommands';
import { initAppCommandListeners } from '../appCommandListeners';

describe('session launch popup app command', () => {
  let cleanup: (() => void) | undefined;
  let handlers: Record<string, (...args: unknown[]) => void>;

  beforeEach(() => {
    handlers = {};
    store.set(sessionLaunchPopupRequestAtom, 0);
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
          handlers[event] = handler;
          return () => delete handlers[event];
        }),
      },
    });
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    store.set(marketplaceInstallProgressAtom, null);
  });

  it('increments the command atom when main opens the popup', () => {
    cleanup = initAppCommandListeners();
    handlers['session-launch-popup-open']();
    expect(store.get(sessionLaunchPopupRequestAtom)).toBe(1);
  });

  it('forwards install progress localization metadata without changing stage or message', () => {
    cleanup = initAppCommandListeners();
    const event = {
      stage: 'downloading-release', message: 'Downloading plugin.nimext (v1.2.3)...',
      messageKey: 'downloading_release', messageParams: { assetName: 'plugin.nimext', releaseTag: 'v1.2.3' },
    };
    handlers['extension-marketplace:install-progress'](event);
    expect(store.get(marketplaceInstallProgressAtom)).toEqual({ ...event, version: expect.any(Number) });
  });
});
