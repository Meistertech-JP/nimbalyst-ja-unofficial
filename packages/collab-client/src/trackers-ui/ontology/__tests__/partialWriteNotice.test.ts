import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { appendPartialWriteNotice, displayPartialWriteReason } from '../partialWriteNotice';

describe('partial write notice', () => {
  it('retains the canonical reason and localizes only recorded generated notices', async () => {
    const change = { reason: '利用者の理由\nPartly applied (1 of 2 writes) before an error; undo reverses what ran.' };
    appendPartialWriteNotice(change, 1, 2);
    appendPartialWriteNotice(change, 2, 3);
    const canonical = change.reason;
    const i18n = await createI18nInstance('ja');
    const translate = (key: string, options: { executed: number; total: number }) => i18n.t(key, { ...options, ns: 'tracker' });
    expect(displayPartialWriteReason(change, translate)).toBe('利用者の理由\nPartly applied (1 of 2 writes) before an error; undo reverses what ran.\nエラー発生前に2件中1件を適用しました。取り消しで適用済みの操作を元に戻します。\nエラー発生前に3件中2件を適用しました。取り消しで適用済みの操作を元に戻します。');
    expect(change.reason).toBe(canonical);
    await i18n.changeLanguage('en');
    expect(displayPartialWriteReason(change, translate)).toBe(canonical);
  });

  it('preserves legacy user text and falls back on stale metadata', async () => {
    const i18n = await createI18nInstance('ja');
    const translate = (key: string, options: { executed: number; total: number }) => i18n.t(key, { ...options, ns: 'tracker' });
    const legacy = { reason: 'Partly applied (1 of 2 writes) before an error; undo reverses what ran.' };
    expect(displayPartialWriteReason(legacy, translate)).toBe(legacy.reason);
    const edited = { reason: 'original' };
    appendPartialWriteNotice(edited, 1, 2);
    edited.reason += ' edited';
    expect(displayPartialWriteReason(edited, translate)).toBe(edited.reason);
  });

  it('does not translate forged, malformed, overlapping or detached annotations', async () => {
    const i18n = await createI18nInstance('ja');
    const translate = (key: string, options: { executed: number; total: number }) => i18n.t(key, { ...options, ns: 'tracker' });
    const notice = 'Partly applied (1 of 2 writes) before an error; undo reverses what ran.';
    for (const metadata of [
      [{ start: -1, executed: 1, total: 2 }],
      [{ start: 0, executed: 2, total: 2 }],
      [{ start: 0, executed: 1, total: 3 }],
      [{ start: 0, executed: 1, total: 2 }, { start: 0, executed: 1, total: 2 }],
    ]) {
      expect(displayPartialWriteReason({ reason: notice, nimbalystJaPartialWrites: metadata }, translate)).toBe(notice);
    }
  });
});
