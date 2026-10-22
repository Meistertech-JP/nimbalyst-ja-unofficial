// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { ExtensionConfigPanel } from '../panels/ExtensionConfigPanel';

afterEach(cleanup);

describe('ExtensionConfigPanel localization', () => {
  it('renders the empty configuration state in Japanese', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { extensions: { getConfig: vi.fn().mockResolvedValue({}) } },
    });
    const i18n = await createI18nInstance('ja');

    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <ExtensionConfigPanel
          extensionId="com.example.test"
          manifest={{} as never}
          scope="user"
        />
      </UiLanguageProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('この拡張機能に設定可能な項目はありません。').textContent)
        .toBe('この拡張機能に設定可能な項目はありません。');
    });
  });
});
