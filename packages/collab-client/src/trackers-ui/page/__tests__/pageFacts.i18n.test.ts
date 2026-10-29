import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { pageTimeFacts, relativePageTime } from '../PageFacts';

describe('page fact localization', () => {
  const now = Date.parse('2026-10-29T12:00:00.000Z');

  it('resolves tracker keys in Japanese and English instead of showing key text', async () => {
    const ja = await createI18nInstance('ja');
    const en = await createI18nInstance('en');
    const jaOptions = { locale: 'ja', t: ja.getFixedT('ja', 'tracker') };
    const enOptions = { locale: 'en', t: en.getFixedT('en', 'tracker') };

    expect(relativePageTime(now - 30_000, now, jaOptions)).toBe('たった今');
    expect(relativePageTime(now - 3 * 60_000, now, jaOptions)).toBe('3分前');
    expect(relativePageTime(now - 3 * 3_600_000, now, enOptions)).toBe('3h ago');
    expect(pageTimeFacts({ updatedAt: now - 30_000, createdAt: now }, now, jaOptions).map((fact) => fact.label))
      .toEqual(['更新日時', '作成日時']);
    expect(pageTimeFacts({ updatedAt: now - 30_000, createdAt: now }, now, enOptions).map((fact) => fact.label))
      .toEqual(['Updated', 'Created']);
  });
});
