// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMainI18nController } from '../../i18n/mainI18n';

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: any[]) => unknown>(),
  access: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('electron', () => ({ BrowserWindow: { fromWebContents: vi.fn() } }));
vi.mock('fs/promises', () => ({ access: mocks.access, writeFile: mocks.writeFile }));
vi.mock('../../services/OffscreenEditorManager', () => ({ OffscreenEditorManager: class {} }));
vi.mock('../../utils/logger', () => ({
  logger: { main: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
}));
vi.mock('../../utils/ipcRegistry', () => ({
  safeHandle: (channel: string, handler: (...args: any[]) => unknown) => mocks.handlers.set(channel, handler),
  safeOn: vi.fn(),
}));
vi.mock('../../window/WindowManager', () => ({ getWindowId: vi.fn(), windowStates: new Map() }));

import { registerMockupHandlers } from '../MockupHandlers';

describe('new mockup template localization', () => {
  beforeEach(() => {
    mocks.handlers.clear();
    mocks.access.mockRejectedValue(new Error('ENOENT'));
    mocks.writeFile.mockResolvedValue(undefined);
    registerMockupHandlers();
  });

  afterEach(() => vi.clearAllMocks());

  it.each([
    { language: 'ja', htmlLanguage: 'ja', instruction: 'AIチャットを使うか、HTMLを直接編集してこのモックアップを作成します。' },
    { language: 'en', htmlLanguage: 'en', instruction: 'Edit this mockup using AI chat or edit the HTML directly.' },
  ])('creates new HTML in $language', async ({ language, htmlLanguage, instruction }) => {
    const controller = await createMainI18nController(
      { get: () => language, subscribe: () => () => undefined },
      'en-US',
      () => undefined,
    );

    try {
      const handler = mocks.handlers.get('mockup:create-mockup');
      expect(handler).toBeDefined();
      await handler?.(undefined, 'New design', 'C:/workspace');

      const [, html] = mocks.writeFile.mock.calls[0] as [string, string, string];
      expect(html).toContain(`<html lang="${htmlLanguage}">`);
      expect(html).toContain(`<p>${instruction}</p>`);
    } finally {
      controller.dispose();
    }
  });
});
