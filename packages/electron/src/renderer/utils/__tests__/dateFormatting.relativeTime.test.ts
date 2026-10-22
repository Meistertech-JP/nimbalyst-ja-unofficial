// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRelativeTimeString } from '../dateFormatting';

describe('getRelativeTimeString', () => {
  afterEach(() => vi.useRealTimers());

  it('uses the optional locale translator while preserving the default English output', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T12:00:00.000Z'));
    const now = Date.now();
    const translate = vi.fn((key: string, options?: { count: number }) => {
      if (key === 'relative_time.just_now') return 'たった今';
      if (key === 'relative_time.minutes_ago') return `${options?.count}分前`;
      return key;
    });

    expect(getRelativeTimeString(now - 30_000, translate)).toBe('たった今');
    expect(getRelativeTimeString(now - 2 * 60_000, translate)).toBe('2分前');
    expect(translate).toHaveBeenNthCalledWith(1, 'relative_time.just_now', undefined);
    expect(translate).toHaveBeenNthCalledWith(2, 'relative_time.minutes_ago', { count: 2 });
    expect(getRelativeTimeString(now - 2 * 60_000)).toBe('2 mins ago');
  });
});
