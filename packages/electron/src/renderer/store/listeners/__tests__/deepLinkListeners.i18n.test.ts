import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '@nimbalyst/runtime/store';
import { activeWorkspacePathAtom } from '../../atoms/openProjects';
import { errorNotificationService } from '../../../services/ErrorNotificationService';
import { initDeepLinkListeners } from '../deepLinkListeners';

vi.mock('../../../services/ErrorNotificationService', () => ({
  errorNotificationService: { showWarning: vi.fn() },
}));

let cleanupListeners: (() => void) | undefined;
const handlers = new Map<string, (payload: any) => void>();
const unsubscribe = vi.fn();
const on = vi.fn((channel: string, handler: (payload: any) => void) => {
  handlers.set(channel, handler);
  return unsubscribe;
});

beforeEach(async () => {
  vi.clearAllMocks();
  handlers.clear();
  store.set(activeWorkspacePathAtom, null);
  vi.stubGlobal('window', { electronAPI: { on, invoke: vi.fn().mockResolvedValue(null) } });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  await i18next.changeLanguage('en');
  cleanupListeners = initDeepLinkListeners();
});

afterEach(async () => {
  cleanupListeners?.();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await i18next.changeLanguage('en');
});

describe('deep-link notifications at event time', () => {
  it.each([
    ['shared-folder', 'not-authenticated', 'サインインが必要です', 'この共有フォルダーを開くには、Nimbalystのチームアカウントにサインインしてください。'],
    ['shared-folder', 'no-workspace', '該当するワークスペースがありません', 'このフォルダーを所有するチームのワークスペースが開かれていません。'],
    ['shared-document', 'not-authenticated', 'サインインが必要です', 'この共有ドキュメントを開くには、Nimbalystのチームアカウントにサインインしてください。'],
    ['shared-document', 'no-workspace', '該当するワークスペースがありません', 'このドキュメントを所有するチームのワークスペースが開かれていません。'],
    ['tracker', 'not-authenticated', 'サインインが必要です', 'このトラッカーを開くには、Nimbalystのチームアカウントにサインインしてください。'],
    ['tracker', 'no-workspace', '該当するワークスペースがありません', 'このトラッカーを所有するチームのワークスペースが開かれていません。'],
  ])('translates %s / %s without registering more listeners', async (type, reason, title, message) => {
    const registeredCount = on.mock.calls.length;
    await i18next.changeLanguage('ja');
    handlers.get(`deep-link:${type}-not-available`)!({ reason, orgId: 'org-id' });
    expect(errorNotificationService.showWarning).toHaveBeenCalledWith(title, message, { duration: 6000 });
    expect(on).toHaveBeenCalledTimes(registeredCount);
    expect(window.electronAPI.invoke).not.toHaveBeenCalled();
    cleanupListeners?.();
    cleanupListeners = undefined;
    expect(unsubscribe).toHaveBeenCalledTimes(registeredCount);
  });
});
