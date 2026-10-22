// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { SummaryBar } from '../components/SummaryBar';

afterEach(cleanup);

test('the Playwright summary bar localizes result counts in Japanese', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja">
      <SummaryBar passed={2} failed={1} skipped={3} flaky={4} durationMs={1250} />
    </UiLanguageProvider>,
  );

  expect(screen.getByText('2件成功')).toBeDefined();
  expect(screen.getByText('1件失敗')).toBeDefined();
  expect(screen.getByText('4件不安定')).toBeDefined();
  expect(screen.getByText('3件スキップ')).toBeDefined();
  expect(screen.getByText('10件のテスト')).toBeDefined();
  expect(screen.getByText('1.3s')).toBeDefined();
});
