// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { TabEditorErrorBoundary } from '../TabEditorErrorBoundary/TabEditorErrorBoundary';

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

function BrokenEditor(): React.ReactElement {
  throw new Error('renderer failed');
}

function renderBoundary(i18n: typeof englishI18n, onRetry = vi.fn(), onClose = vi.fn()) {
  render(
    <I18nextProvider i18n={i18n}>
      <TabEditorErrorBoundary
        filePath="C:/projects/app/notes.md"
        fileName="notes.md"
        onRetry={onRetry}
        onClose={onClose}
      >
        <BrokenEditor />
      </TabEditorErrorBoundary>
    </I18nextProvider>
  );
  return { onRetry, onClose };
}

describe('TabEditorErrorBoundary localization', () => {
  it('shows localized recovery copy and keeps retry and close actions available', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const english = renderBoundary(englishI18n);
    expect(screen.getByRole('heading', { name: 'Unable to Load Editor' })).toBeDefined();
    expect(screen.getByText('An error occurred while loading "notes.md".')).toBeDefined();
    expect(screen.getByText('Other tabs should continue to work normally.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close tab' }));
    expect(english.onRetry).toHaveBeenCalledOnce();
    expect(english.onClose).toHaveBeenCalledOnce();

    cleanup();
    renderBoundary(japaneseI18n);
    expect(screen.getByRole('heading', { name: 'エディターを読み込めません' })).toBeDefined();
    expect(screen.getByText('「notes.md」の読み込み中にエラーが発生しました。')).toBeDefined();
    expect(screen.getByText('他のタブは引き続き通常どおり使用できます。')).toBeDefined();
    expect(screen.getByRole('button', { name: '再試行' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'タブを閉じる' })).toBeDefined();
  });
});
