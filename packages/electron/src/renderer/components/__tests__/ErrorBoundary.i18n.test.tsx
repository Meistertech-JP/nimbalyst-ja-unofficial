// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

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

function BrokenChild({ message }: { message: string }): React.ReactElement {
  throw new Error(message);
}

function renderErrorBoundary(
  i18n: typeof englishI18n,
  message: string
): void {
  render(
    <I18nextProvider i18n={i18n}>
      <ErrorBoundary>
        <BrokenChild message={message} />
      </ErrorBoundary>
    </I18nextProvider>
  );
}

describe('ErrorBoundary localization', () => {
  it('localizes recovery labels while preserving dynamic error details', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderErrorBoundary(englishI18n, 'Renderer invariant: panel 42');
    expect(screen.getByText('An error occurred')).toBeDefined();
    expect(screen.getByText('Renderer invariant: panel 42')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();

    cleanup();
    renderErrorBoundary(japaneseI18n, 'Renderer invariant: panel 42');
    expect(screen.getByText('エラーが発生しました')).toBeDefined();
    expect(screen.getByText('Renderer invariant: panel 42')).toBeDefined();
    expect(screen.getByRole('button', { name: '再試行' })).toBeDefined();
  });

  it('localizes the fallback when the error has no message', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderErrorBoundary(japaneseI18n, '');
    expect(screen.getByText('不明なエラーが発生しました')).toBeDefined();
  });
});
