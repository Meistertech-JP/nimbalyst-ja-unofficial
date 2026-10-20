import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';

const showErrorBox = vi.fn();
vi.mock('electron', () => ({
  dialog: { showErrorBox: (...args: unknown[]) => showErrorBox(...args) },
}));

import { createUncaughtExceptionHandler } from '../uncaughtException';

describe('createUncaughtExceptionHandler', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    showErrorBox.mockReset();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    await i18next.changeLanguage('en');
  });

  it('drops EPIPE errors without touching the console (breaks the #502 feedback loop)', () => {
    const handle = createUncaughtExceptionHandler();
    const epipe = Object.assign(new Error('write EPIPE'), { name: 'Error', code: 'EPIPE' });

    handle(epipe);

    // The loop only starts if the handler writes to the (broken) console. For
    // an EPIPE it must not call console.error / console.warn or show a dialog.
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(showErrorBox).not.toHaveBeenCalled();
  });

  it('logs and shows a dialog for a normal uncaught error', () => {
    const handle = createUncaughtExceptionHandler();
    const err = Object.assign(new Error('boom'), { name: 'TypeError' });

    handle(err);

    expect(errorSpy).toHaveBeenCalledWith('[Bootstrap] Uncaught exception:', err);
    expect(showErrorBox).toHaveBeenCalledTimes(1);
  });

  it('suppresses a duplicate error dialog within the throttle window', () => {
    const handle = createUncaughtExceptionHandler();
    const err = Object.assign(new Error('dup'), { name: 'Error' });

    handle(err);
    handle(err);

    expect(showErrorBox).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('[Bootstrap] Suppressed duplicate error dialog:', 'Error:dup');
  });

  it('translates the title while keeping error names, messages, and stacks exact', async () => {
    await i18next.changeLanguage('ja');
    const err = Object.assign(new Error('External error text'), { name: 'TypeError', stack: 'Original stack at C:\\source.ts:1' });
    createUncaughtExceptionHandler()(err);
    expect(showErrorBox).toHaveBeenCalledWith('Nimbalyst - 未捕捉の例外', 'TypeError: External error text\n\nOriginal stack at C:\\source.ts:1');
  });

  it('keeps the bootstrap fallback usable before i18n has initialized', () => {
    const initialized = i18next.isInitialized;
    try {
      i18next.isInitialized = false;
      createUncaughtExceptionHandler()(new Error('early startup error'));
      expect(showErrorBox).toHaveBeenCalledWith('Nimbalyst - Uncaught Exception', expect.stringContaining('early startup error'));
    } finally {
      i18next.isInitialized = initialized;
    }
  });
});
