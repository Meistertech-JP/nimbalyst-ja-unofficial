// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { PageInfoToggleButton } from '../PageInfoToggleButton';

afterEach(cleanup);

test('the Page info toggle exposes its Japanese label', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
      <PageInfoToggleButton />
    </UiLanguageProvider>,
  );

  expect(screen.getByRole('button', { name: 'ページ情報' })).toBeTruthy();
});
