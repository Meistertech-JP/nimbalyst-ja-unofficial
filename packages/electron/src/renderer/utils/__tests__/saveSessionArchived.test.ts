// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorNotificationService } from '../../services/ErrorNotificationService';
import { saveSessionArchived } from '../saveSessionArchived';

vi.mock('../../services/ErrorNotificationService', () => ({
  errorNotificationService: {
    showError: vi.fn(),
    getLocalizedText: vi.fn((_namespace: string, _key: string, fallback: string) => fallback),
  },
}));

describe('saveSessionArchived', () => {
  beforeEach(() => {
    vi.mocked(errorNotificationService.showError).mockClear();
  });

  it('returns true and stays quiet when the backend saves the change', async () => {
    const invoke = vi.fn().mockResolvedValue({ success: true });
    vi.stubGlobal('window', { electronAPI: { invoke } });

    expect(await saveSessionArchived('s1', true)).toBe(true);
    expect(invoke).toHaveBeenCalledWith('sessions:update-metadata', 's1', { isArchived: true });
    expect(errorNotificationService.showError).not.toHaveBeenCalled();
  });

  it('shows the backend error and returns false when the backend rejects the change', async () => {
    const invoke = vi.fn().mockResolvedValue({ success: false, error: 'Session not found' });
    vi.stubGlobal('window', { electronAPI: { invoke } });

    expect(await saveSessionArchived('s1', true)).toBe(false);
    expect(errorNotificationService.showError).toHaveBeenCalledWith('Failed to archive session', 'Session not found');
    expect(errorNotificationService.getLocalizedText).toHaveBeenCalledWith(
      'notifications',
      'session.archive_failed',
      'Failed to archive session',
    );
  });

  it('shows an error and returns false when the call throws', async () => {
    const invoke = vi.fn().mockRejectedValue(new Error('boom'));
    vi.stubGlobal('window', { electronAPI: { invoke } });

    expect(await saveSessionArchived('s1', false)).toBe(false);
    expect(errorNotificationService.showError).toHaveBeenCalledWith('Failed to unarchive session', 'boom');
    expect(errorNotificationService.getLocalizedText).toHaveBeenCalledWith(
      'notifications',
      'session.unarchive_failed',
      'Failed to unarchive session',
    );
  });

  it('uses localized fallback copy when the backend rejects without a message', async () => {
    const invoke = vi.fn().mockResolvedValue({ success: false });
    vi.mocked(errorNotificationService.getLocalizedText).mockImplementation((_namespace, key, fallback) => {
      if (key === 'session.archive_failed') return 'アーカイブ失敗';
      if (key === 'session.archive_rejected') return '要求が拒否されました';
      return fallback;
    });
    vi.stubGlobal('window', { electronAPI: { invoke } });

    expect(await saveSessionArchived('s1', true)).toBe(false);
    expect(errorNotificationService.showError).toHaveBeenCalledWith('アーカイブ失敗', '要求が拒否されました');
  });
});
