// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { EditorBreadcrumb } from '../EditorHeaderBar';

afterEach(cleanup);

test('the editor breadcrumb exposes a Japanese accessible label', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja">
      <EditorBreadcrumb crumbs={[{ id: 'file', label: 'README.md', current: true }]} />
    </UiLanguageProvider>,
  );

  expect(screen.getByRole('navigation', { name: 'パンくずリスト' })).toBeDefined();
});
