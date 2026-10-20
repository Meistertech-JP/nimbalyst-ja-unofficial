import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRelativeTimeString, getTimeGroupKey, groupSessionsByTime } from '../dateFormatting';
import { formatRelative } from '../../components/PullRequestMode/prFormat';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('localized relative time', () => {
  const now = new Date('2026-09-18T12:00:00Z').getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  it('preserves all shared time boundaries and English pluralization while localizing Japanese', () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const cases: [number, string, string][] = [
      [-minute, 'Just now', 'たった今'],
      [minute - 1, 'Just now', 'たった今'],
      [minute, '1 min ago', '1分前'],
      [2 * minute, '2 mins ago', '2分前'],
      [hour - 1, '59 mins ago', '59分前'],
      [hour, '1 hr ago', '1時間前'],
      [day - 1, '23 hrs ago', '23時間前'],
      [day, '1 day ago', '1日前'],
      [7 * day - 1, '6 days ago', '6日前'],
      [7 * day, '1 week ago', '1週間前'],
      [30 * day - 1, '4 weeks ago', '4週間前'],
      [30 * day, '1 month ago', '1か月前'],
      [365 * day - 1, '12 months ago', '12か月前'],
      [365 * day, '1 year ago', '1年前'],
      [730 * day, '2 years ago', '2年前'],
    ];
    for (const [elapsed, en, ja] of cases) {
      expect(getRelativeTimeString(now - elapsed, i18next.getFixedT('en'))).toBe(en);
      expect(getRelativeTimeString(now - elapsed, i18next.getFixedT('ja'))).toBe(ja);
    }
  });

  it('keeps the PR compact formatter empty for zero and preserves its distinct month/year boundaries', () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    expect(formatRelative(0, i18next.getFixedT('ja'))).toBe('');
    const cases: [number, string, string][] = [
      [minute - 1, 'just now', 'たった今'],
      [minute, '1m ago', '1分前'],
      [hour, '1h ago', '1時間前'],
      [day, '1d ago', '1日前'],
      [29 * day, '29d ago', '29日前'],
      [30 * day, '1mo ago', '1か月前'],
      [360 * day, '1y ago', '1年前'],
    ];
    for (const [elapsed, en, ja] of cases) {
      expect(formatRelative(now - elapsed, i18next.getFixedT('en'))).toBe(en);
      expect(formatRelative(now - elapsed, i18next.getFixedT('ja'))).toBe(ja);
    }
  });

  it('retains the English grouping identifiers and descending session ordering', () => {
    vi.useFakeTimers();
    const noon = new Date(2026, 8, 18, 12).getTime();
    vi.setSystemTime(noon);
    expect(getTimeGroupKey(noon)).toBe('Today');
    expect(getTimeGroupKey(noon - day)).toBe('Yesterday');
    const sessions = [{ id: 'earlier', createdAt: noon, updatedAt: noon - hour }, { id: 'later', createdAt: noon - hour, updatedAt: noon }];
    expect(groupSessionsByTime(sessions, 'updatedAt')).toEqual({ Today: [sessions[1], sessions[0]] });
  });
});
