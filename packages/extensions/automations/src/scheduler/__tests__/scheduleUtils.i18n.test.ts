// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '../scheduleUtils';

describe('formatRelativeTime localization', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');

  it('requests the localized phrase and count from the translator', () => {
    const translate = (key: string, count?: number) => `ja:${key}:${count ?? ''}`;

    expect(formatRelativeTime(new Date(now.getTime() - 5 * 60_000), now, translate))
      .toBe('ja:minutes_ago:5');
    expect(formatRelativeTime(new Date(now.getTime() + 10 * 60_000), now, translate))
      .toBe('ja:in_minutes:10');
    expect(formatRelativeTime(new Date(now.getTime() + 86_400_000), now, translate))
      .toBe('ja:tomorrow:');
  });
});
