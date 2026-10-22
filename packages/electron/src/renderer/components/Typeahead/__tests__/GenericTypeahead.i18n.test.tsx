// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { GenericTypeahead } from '../GenericTypeahead';

afterEach(cleanup);

test('shows an untitled session option with the localized fallback', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
      <GenericTypeahead
        anchorElement={null}
        options={[{ id: 'session-1', label: '', data: { isUntitledSession: true } }]}
        selectedIndex={null}
        onSelectedIndexChange={vi.fn()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        cursorPosition={0}
      />
    </UiLanguageProvider>,
  );

  expect(screen.getByText('無題')).toBeDefined();
});
