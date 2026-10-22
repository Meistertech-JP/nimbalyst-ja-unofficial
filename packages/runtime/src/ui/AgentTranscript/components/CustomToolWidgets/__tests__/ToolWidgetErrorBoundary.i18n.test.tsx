import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { ToolWidgetErrorBoundary } from '../ToolWidgetErrorBoundary';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ToolWidgetErrorBoundary localization', () => {
  it('renders Japanese fallback labels and recovers when retried', async () => {
    const i18n = await createI18nInstance('ja');
    function FailingWidget(): React.ReactElement {
      throw new Error('');
    }
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <I18nextProvider i18n={i18n}>
        <ToolWidgetErrorBoundary>
          <FailingWidget />
        </ToolWidgetErrorBoundary>
      </I18nextProvider>
    );

    expect(screen.getByRole('alert').textContent).toContain('ウィジェットを表示できませんでした');
    expect(screen.getByText('不明なツール')).toBeDefined();
    expect(screen.getByText('不明なエラー')).toBeDefined();
    expect(screen.getByRole('button', { name: '詳細を表示' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'コピー' })).toBeDefined();
    expect(screen.getByRole('button', { name: '再試行' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: '詳細を表示' }));
    expect(screen.getByRole('button', { name: '詳細を非表示' })).toBeDefined();
    expect(screen.getByRole('alert').querySelector('pre')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(await screen.findByRole('alert')).toBeDefined();
  });
});
