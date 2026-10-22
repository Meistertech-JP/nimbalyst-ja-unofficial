// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setShowContextUsageAtom } from '../../../store/atoms/agentMode';
import { SessionContextUsageBar } from '../SessionContextUsageBar';

vi.mock('../../../store/atoms/sessions', async () => {
  const { atom } = await import('jotai');
  const tokens = atom({ currentContext: { tokens: 150_000, contextWindow: 200_000 } });
  return {
    sessionRegistryAtom: atom(new Map([['s1', { provider: 'claude' }]])),
    sessionTokenUsageAtom: () => tokens,
  };
});
vi.mock('../../../store/atoms/agentMode', async () => {
  const { atom } = await import('jotai');
  const enabled = atom(true);
  return {
    showContextUsageAtom: enabled,
    setShowContextUsageAtom: atom(null, (_get, set, value: boolean) => set(enabled, value)),
  };
});
vi.mock('@nimbalyst/runtime/ai/server/agentCapabilities', () => ({
  agentCapabilitiesForProviderType: () => ({ contextReporting: 'context-window' }),
}));

afterEach(cleanup);

describe('SessionContextUsageBar localization', () => {
  it('updates the tooltip and accessible meter name when the language changes', async () => {
    const i18n = await createI18nInstance('en');
    render(
      <Provider store={createStore()}>
        <I18nextProvider i18n={i18n}>
          <SessionContextUsageBar sessionId="s1" />
        </I18nextProvider>
      </Provider>,
    );

    const meter = screen.getByRole('meter', { name: 'Context 150k / 200k (75%)' });
    expect(meter.getAttribute('title')).toBe('Context 150k / 200k (75%)');
    expect(meter.getAttribute('aria-valuenow')).toBe('75');
    expect((meter.firstElementChild as HTMLElement).style.width).toBe('75%');

    await act(async () => { await i18n.changeLanguage('ja'); });
    expect(screen.getByRole('meter', { name: 'コンテキスト 150k / 200k（75%）' })).toBe(meter);
    expect(meter.getAttribute('title')).toBe('コンテキスト 150k / 200k（75%）');

    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByRole('meter', { name: 'Context 150k / 200k (75%)' })).toBe(meter);
  });

  it('keeps the upstream visibility toggle functional in Japanese', async () => {
    const i18n = await createI18nInstance('ja');
    const store = createStore();
    render(
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <SessionContextUsageBar sessionId="s1" />
        </I18nextProvider>
      </Provider>,
    );

    expect(screen.getByRole('meter', { name: 'コンテキスト 150k / 200k（75%）' })).toBeDefined();
    act(() => store.set(setShowContextUsageAtom, false));
    expect(screen.queryByRole('meter')).toBeNull();
    act(() => store.set(setShowContextUsageAtom, true));
    expect(screen.getByRole('meter', { name: 'コンテキスト 150k / 200k（75%）' })).toBeDefined();
  });
});
