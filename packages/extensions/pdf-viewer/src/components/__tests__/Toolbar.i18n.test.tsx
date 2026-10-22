// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { Toolbar } from '../Toolbar';

afterEach(cleanup);

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('PDF viewer toolbar localization', () => {
  it('localizes page count, zoom controls, and fit action', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <Toolbar
          totalPages={3}
          scale={1}
          fitToWidth={false}
          onScaleChange={() => {}}
          onFitToWidthToggle={() => {}}
        />
      </UiLanguageProvider>,
    );

    expect(screen.getByText('3ページ')).toBeTruthy();
    expect(screen.getByRole('button', { name: '合わせる' }).getAttribute('title')).toBe('幅に合わせる');
    expect(screen.getByRole('button', { name: '-' }).getAttribute('title')).toBe('縮小（Cmd+-）');
    expect(screen.getByText('100%').getAttribute('title')).toBe('クリックしてズームをリセット');
    expect(screen.getByRole('button', { name: '+' }).getAttribute('title')).toBe('拡大（Cmd++）');
  });
});
