// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiKeyDialog } from '../ApiKeyDialog/ApiKeyDialog';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderDialog(i18n: typeof englishI18n): void {
  render(
    <I18nextProvider i18n={i18n}>
      <ApiKeyDialog isOpen onClose={vi.fn()} onOpenPreferences={vi.fn()} />
    </I18nextProvider>
  );
}

describe('ApiKeyDialog localization', () => {
  it('localizes visible and accessibility labels in English and Japanese', () => {
    renderDialog(englishI18n);
    const englishDialog = screen.getByRole('dialog', { name: 'API Key Required' });
    expect(englishDialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
    expect(screen.getByText('Open AI Settings')).toBeDefined();

    cleanup();
    renderDialog(japaneseI18n);
    const japaneseDialog = screen.getByRole('dialog', { name: 'APIキーが必要です' });
    expect(japaneseDialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('button', { name: '閉じる' })).toBeDefined();
    expect(screen.getByText('AI設定を開く')).toBeDefined();
    expect(screen.getByText('Anthropic')).toBeDefined();
    expect(screen.getByText('LM Studio')).toBeDefined();
  });
});
