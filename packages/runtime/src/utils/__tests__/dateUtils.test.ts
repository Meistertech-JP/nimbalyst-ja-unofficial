// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatTurnFinishedAt } from '../dateUtils';

describe('formatTurnFinishedAt', () => {
  it('formats Japanese completion times without an English preposition or meridiem', () => {
    const reference = new Date(2026, 4, 6, 23, 0);
    expect(formatTurnFinishedAt(new Date(2026, 4, 6, 22, 18), reference, 'ja')).toBe('22:18');
    expect(formatTurnFinishedAt(new Date(2026, 4, 6, 0, 5), reference, 'ja-JP')).toBe('0:05');
    expect(formatTurnFinishedAt(new Date(2026, 4, 5, 10, 33), reference, 'ja')).toBe('2026年5月5日 10:33');
    expect(formatTurnFinishedAt(new Date(2026, 4, 6, 22, 18), reference, 'en')).toBe('10:18 pm');
    expect(formatTurnFinishedAt(new Date(2026, 4, 5, 10, 33), reference, 'en-US')).toBe('10:33 am, Tue May 5th, 2026');
    expect(formatTurnFinishedAt('not a date', reference, 'ja')).toBe('');
  });
  it('shows only the time for turns that ended earlier today', () => {
    const turnEndedAt = new Date(2026, 4, 6, 10, 33, 0);
    const reference = new Date(2026, 4, 6, 16, 0, 0);

    expect(formatTurnFinishedAt(turnEndedAt, reference)).toBe('at 10:33 am');
  });

  it('still shows the time for a turn that just ended', () => {
    const turnEndedAt = new Date(2026, 4, 6, 10, 33, 0);
    const reference = new Date(2026, 4, 6, 10, 38, 0);

    expect(formatTurnFinishedAt(turnEndedAt, reference)).toBe('at 10:33 am');
  });

  it('returns nothing when the timestamp cannot be parsed', () => {
    expect(formatTurnFinishedAt(null, new Date(2026, 4, 6, 16, 0, 0))).toBe('');
    expect(formatTurnFinishedAt('not a date', new Date(2026, 4, 6, 16, 0, 0))).toBe('');
  });

  it('shows the full date for turns that ended on a prior day', () => {
    const turnEndedAt = new Date(2026, 4, 5, 10, 33, 0);
    const reference = new Date(2026, 4, 6, 16, 0, 0);

    expect(formatTurnFinishedAt(turnEndedAt, reference)).toBe('at 10:33 am, Tue May 5th, 2026');
  });

  it('formats ordinal suffixes correctly for teen dates', () => {
    const turnEndedAt = new Date(2026, 4, 13, 10, 33, 0);
    const reference = new Date(2026, 4, 14, 16, 0, 0);

    expect(formatTurnFinishedAt(turnEndedAt, reference)).toBe('at 10:33 am, Wed May 13th, 2026');
  });
});
