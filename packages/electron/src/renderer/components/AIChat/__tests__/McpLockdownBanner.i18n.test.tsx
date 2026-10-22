import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';

import { McpLockdownBanner } from '../McpLockdownBanner';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('McpLockdownBanner localization', () => {
  it('shows the enterprise MCP restriction and dismiss label in Japanese', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { invoke: vi.fn().mockResolvedValue({ active: true }) },
    });
    const i18n = await createI18nInstance('ja');

    render(
      <I18nextProvider i18n={i18n}>
        <McpLockdownBanner provider="claude-code" />
      </I18nextProvider>,
    );

    expect(await screen.findByText(/企業のClaude Code MCPポリシー/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '閉じる' })).toBeTruthy();
  });
});
