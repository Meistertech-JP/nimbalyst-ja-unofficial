import { describe, it, expect } from 'vitest';
import { errorNotificationService, notificationDedupKey } from '../ErrorNotificationService';

describe('notificationDedupKey', () => {
  it('collapses a SQLite worker stall onto one key regardless of title or request', () => {
    // A stalled worker fails every queued request at once, each under whatever
    // title its caller used. Keying on title+message let a handful of those
    // through as separate toasts for what is one incident.
    const a = notificationDedupKey(
      'error',
      'Unhandled Promise Rejection',
      "Error invoking remote method 'collab-backup:content-changed': SQLite worker request 'query' timed out after 60000ms",
    );
    const b = notificationDedupKey(
      'error',
      'Failed to record document open',
      "SQLite worker request 'query' timed out after 60000ms",
    );
    expect(a).toBe(b);
  });

  it('keeps unrelated failures on distinct keys', () => {
    expect(notificationDedupKey('error', 'Save failed', 'disk full')).not.toBe(
      notificationDedupKey('error', 'Save failed', 'permission denied'),
    );
  });
});

describe('error notification titles', () => {
  it('uses the active UI translator for default error titles', () => {
    const notifications: Array<{ title: string; message: string; details?: string }> = [];
    const removeListener = errorNotificationService.addListener((notification) => {
      notifications.push(notification);
    });
    errorNotificationService.setTitleTranslator((key) => ({
      generic_title: 'エラーが発生しました',
      uncaught_title: '未捕捉のエラー',
      unhandled_rejection_title: '未処理のPromise拒否',
    })[key]);
    errorNotificationService.setTextTranslator((namespace, key, fallback) =>
      namespace === 'dialogs' && key === 'error.generic_message' ? '予期しないエラーが発生しました。' : fallback,
    );

    errorNotificationService.showFromError(new Error('details'));
    expect(notifications.at(-1)?.title).toBe('エラーが発生しました');
    expect(notifications.at(-1)?.message).toBe('予期しないエラーが発生しました。');
    expect(notifications.at(-1)?.details).toBe('details');

    removeListener();
    errorNotificationService.setTitleTranslator(null);
    errorNotificationService.setTextTranslator(null);
  });

  it('translates fixed notification copy and interpolates dynamic values', () => {
    errorNotificationService.setTextTranslator((namespace, key, fallback, options) => {
      if (namespace === 'sessions' && key === 'notifications.delete_failed') {
        return `削除失敗: ${options?.session ?? ''}`;
      }
      return fallback;
    });

    expect(errorNotificationService.getLocalizedText(
      'sessions',
      'notifications.delete_failed',
      'Failed to delete session',
      { session: 'session-1' },
    )).toBe('削除失敗: session-1');
    expect(errorNotificationService.getLocalizedText(
      'sessions',
      'notifications.missing_key',
      'Fallback copy',
    )).toBe('Fallback copy');

    errorNotificationService.setTextTranslator(null);
  });
});
