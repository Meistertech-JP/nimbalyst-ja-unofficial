import { describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { getRelativeTimeString } from '../time';

describe('shared document relative time', () => {
  it('uses the selected language for recent and older timestamps', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
      const i18n = await createI18nInstance('ja');
      const translate = (key: string, options?: { count: number }) => i18n.t(key, { ns: 'common', ...options });
      expect(getRelativeTimeString(Date.now(), translate, 'ja')).toBe('たった今');
      expect(getRelativeTimeString(Date.now() - 3_600_000, translate, 'ja')).toBe('1時間前');
      expect(getRelativeTimeString(Date.now() - 120_000, translate, 'ja')).toBe('2分前');
      expect(getRelativeTimeString(Date.now() - 2 * 86_400_000, translate, 'ja')).toBe('2日前');
      const older = Date.now() - 8 * 86_400_000;
      expect(getRelativeTimeString(older, translate, 'ja')).toBe(new Date(older).toLocaleDateString('ja'));
      await i18n.changeLanguage('en');
      expect(getRelativeTimeString(Date.now() - 3_600_000, translate, 'en')).toBe('1h ago');
      expect(getRelativeTimeString(older, translate, 'en')).toBe(new Date(older).toLocaleDateString('en'));
    } finally { vi.useRealTimers(); }
  });
});
