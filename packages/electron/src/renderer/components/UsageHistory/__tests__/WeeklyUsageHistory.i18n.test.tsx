import React from 'react';
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { WeeklyUsageHistory } from '../WeeklyUsageHistory';

describe('weekly usage language switching', () => {
  it('updates labels, chart description and partial-week tooltip without resetting the expanded view', async () => {
    const i18n = await createI18nInstance('ja');
    const reset = Date.now() - 86_400_000;
    render(<I18nextProvider i18n={i18n}><WeeklyUsageHistory history={[{
      meter: 'claude:weekly', label: 'Weekly', utilization: 42,
      resetsAt: new Date(reset).toISOString(), lastSeenAt: reset - 2 * 86_400_000,
    }]} /></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: /^週間履歴/ }));
    expect(screen.getByRole('img', { name: '週間の1週間の使用量' })).toBeVisible();
    expect(screen.getByTitle(/最終記録.*最終的な使用量はこれより多い可能性があります/)).toBeVisible();
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByRole('button', { name: /^Weekly history/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('img', { name: 'Weekly utilization over the week' })).toBeVisible();
    expect(screen.getByTitle(/Last reading.*the final value may be higher/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /^Weekly history/ }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
