import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionWakeupScheduler } from '../SessionWakeupScheduler';
import type { SessionWakeup, SessionWakeupsStore } from '../PGLiteSessionWakeupsStore';

const mocks = vi.hoisted(() => ({ notification: vi.fn(), show: vi.fn(), on: vi.fn() }));
vi.mock('electron', () => ({
  Notification: class {
    static isSupported = () => true;
    constructor(options: unknown) { mocks.notification(options); }
    on = mocks.on;
    show = mocks.show;
  }, BrowserWindow: { getAllWindows: () => [] }, app: {},
}));
vi.mock('../../window/WindowManager', () => ({ findWindowByWorkspace: vi.fn() }));
vi.mock('../../utils/store', () => ({ getAppSetting: vi.fn() }));
vi.mock('../../utils/logger', () => ({ logger: { main: { info: vi.fn(), error: vi.fn() } } }));

let scheduler: SessionWakeupScheduler;
beforeEach(() => { vi.clearAllMocks(); scheduler = new SessionWakeupScheduler(); });
afterEach(async () => { scheduler.stop(); await i18next.changeLanguage('en'); });

describe('scheduled wakeup notification in Japanese', () => {
  it.each([null, 'User-authored reason'])('preserves reason %s and the original execution prompt', async (reason) => {
    const row: SessionWakeup = { id: 'wakeup-id', sessionId: 'session-id', workspaceId: '/workspace', prompt: 'Original AI prompt', reason, fireAt: 1, status: 'waiting_for_workspace', createdAt: 1, firedAt: null, error: null };
    const executor = vi.fn().mockResolvedValue({ triggered: true });
    const wakeupStore = {
      listPending: vi.fn().mockResolvedValue([]), listWaitingForWorkspace: vi.fn().mockResolvedValue([row]),
      markFiring: vi.fn().mockResolvedValue({ ...row, status: 'firing' }),
      markFired: vi.fn().mockResolvedValue({ ...row, status: 'fired' }),
    } as unknown as SessionWakeupsStore;
    scheduler.configure({ store: wakeupStore, executor, broadcastChanged: vi.fn(), hasWorkspaceWindow: () => true });
    await scheduler.start();
    await i18next.changeLanguage('ja');
    await scheduler.onWorkspaceOpened('/workspace');
    expect(executor).toHaveBeenCalledWith({ sessionId: 'session-id', workspacePath: '/workspace', prompt: 'Original AI prompt' });
    expect(mocks.notification).toHaveBeenCalledWith({ title: 'セッションが再開されました', body: reason ?? '予約された再開が実行されました。', silent: false });
    expect(mocks.show).toHaveBeenCalledTimes(1);
  });
});
