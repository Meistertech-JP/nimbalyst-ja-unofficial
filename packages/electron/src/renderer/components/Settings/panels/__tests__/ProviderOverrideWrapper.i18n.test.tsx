// @vitest-environment jsdom
import React from 'react';
import { Provider } from 'jotai';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { ProviderOverrideWrapper } from '../ProviderOverrideWrapper';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => {
  cleanup();
  delete (window as unknown as { electronAPI?: unknown }).electronAPI;
});

describe('ProviderOverrideWrapper localization', () => {
  it('localizes the workspace override UI and preserves provider and workspace names', async () => {
    (window as unknown as { electronAPI: unknown }).electronAPI = {
      invoke: async () => ({ success: true, overrides: {} }),
    };

    render(
      <Provider>
        <I18nextProvider i18n={japaneseI18n}>
          <ProviderOverrideWrapper
            providerId="anthropic"
            providerName="Claude"
            workspacePath="C:/workspace/provider-override-i18n-test"
            workspaceName="Project Alpha"
            globalEnabled
          >
            <div>Provider panel</div>
          </ProviderOverrideWrapper>
        </I18nextProvider>
      </Provider>,
    );

    expect(await screen.findByText('Claudeのグローバル設定を使用中')).toBeDefined();
    expect(screen.getByText('上書き')).toBeDefined();
    expect(screen.getByText('上書きを有効にすると、このプロジェクトだけでClaudeの設定を変更できます。グローバル設定には影響しません。')).toBeDefined();
    expect(screen.getByText('Provider panel')).toBeDefined();

    fireEvent.click(screen.getByText('上書き'));
    expect(await screen.findByText((_, element) =>
      element?.tagName === 'SPAN' && element.textContent === 'Project Alphaのプロジェクト設定で上書き中',
    )).toBeDefined();
  });
});
