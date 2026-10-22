// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorNotificationService } from '../../../services/ErrorNotificationService';
import { navigateToNotificationSession } from '../sessionNotificationNavigation';

vi.mock('../../../services/ErrorNotificationService', () => ({
  errorNotificationService: {
    getLocalizedText: vi.fn((_namespace: string, _key: string, fallback: string) => fallback),
    showWarning: vi.fn(() => 'warning-1'),
    dismiss: vi.fn(),
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('navigateToNotificationSession notifications', () => {
  it('localizes the unavailable title, missing-session reason, and retry action', async () => {
    vi.stubGlobal('window', {
      electronAPI: {
        invoke: vi.fn().mockResolvedValue({ success: true, sessions: [] }),
      },
    });
    const target = {
      sessionId: '12345678-session',
      workspacePath: '/workspace',
      sourceLabel: '   ',
    };

    await expect(navigateToNotificationSession(target)).resolves.toBe(false);

    expect(errorNotificationService.getLocalizedText).toHaveBeenCalledWith(
      'notifications',
      'session.navigation_source_fallback',
      'Session 12345678',
      { id: '12345678' },
    );
    expect(errorNotificationService.getLocalizedText).toHaveBeenCalledWith(
      'notifications',
      'session.navigation_unavailable_title',
      'Session 12345678 unavailable',
      { label: 'Session 12345678' },
    );
    expect(errorNotificationService.getLocalizedText).toHaveBeenCalledWith(
      'notifications',
      'session.navigation_missing',
      'Session 12345678 could not be found in its originating project.',
      { id: '12345678' },
    );
    expect(errorNotificationService.getLocalizedText).toHaveBeenCalledWith('common', 'retry', 'Retry');
    expect(errorNotificationService.showWarning).toHaveBeenCalledWith(
      'Session 12345678 unavailable',
      'Session 12345678 could not be found in its originating project.',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Retry' }),
      }),
    );
  });
});
