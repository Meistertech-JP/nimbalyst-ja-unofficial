// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { activeTipIdAtom } from '../atoms';
import { AllTipsDialog } from '../AllTipsDialog';
import { mobileKeepAwakeTip } from '../definitions/mobile-keep-awake';
import { InlineTipDisplay } from '../InlineTipDisplay';
import { TipCard } from '../TipCard';
import type { TipDefinition } from '../types';

vi.mock('posthog-js/react', () => ({
  usePostHog: () => ({ capture: vi.fn() }),
}));

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

const tip: TipDefinition = {
  id: 'test-tip',
  name: 'Test tip',
  trigger: { condition: () => true },
  content: { title: 'Tip title', body: 'Tip body' },
};

describe('tip controls localization', () => {
  it('localizes catalog tip content in inline cards and the All Tips dialog', () => {
    const japaneseTitle = 'モバイルプロンプト中にスリープを防止';
    const japaneseBody = 'コンピューターがスリープするとモバイル同期が切断されます。電源接続中にスリープ防止を有効にしてください。';

    const { unmount } = render(
      <I18nextProvider i18n={japaneseI18n}>
        <TipCard tip={mobileKeepAwakeTip} onAction={vi.fn()} variant="inline" />
      </I18nextProvider>
    );
    expect(screen.getByText(japaneseTitle)).toBeDefined();
    expect(screen.getByText(japaneseBody)).toBeDefined();
    expect(screen.getByRole('button', { name: 'スリープ防止を有効化' })).toBeDefined();
    unmount();

    render(
      <I18nextProvider i18n={japaneseI18n}>
        <JotaiProvider>
          <AllTipsDialog
            isOpen
            onClose={vi.fn()}
            tipDefinitions={[mobileKeepAwakeTip]}
          />
        </JotaiProvider>
      </I18nextProvider>
    );
    expect(screen.getByText(japaneseTitle)).toBeDefined();
    expect(screen.getByText(japaneseBody)).toBeDefined();
    expect(screen.getByRole('button', { name: '表示' })).toBeDefined();
  });

  it('localizes inline and floating controls while keeping their actions available', () => {
    (window as any).electronAPI = { invoke: vi.fn(async () => undefined) };
    const store = createStore();
    const activeId = 'tip-mobile-keep-awake';
    store.set(activeTipIdAtom, activeId);
    const renderInline = (i18n: typeof englishI18n) =>
      render(
        <I18nextProvider i18n={i18n}>
          <JotaiProvider store={store}>
            <InlineTipDisplay />
          </JotaiProvider>
        </I18nextProvider>
      );

    renderInline(englishI18n);
    fireEvent.click(screen.getByRole('button', { name: 'Next tip' }));
    expect(store.get(activeTipIdAtom)).not.toBe(activeId);
    expect(screen.getByRole('button', { name: 'Show all tips' })).toBeDefined();

    cleanup();
    renderInline(japaneseI18n);
    expect(screen.getByRole('button', { name: '次のヒント' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'すべてのヒントを表示' })).toBeDefined();
    expect(screen.getByText('すべてのヒント')).toBeDefined();

    cleanup();
    const onDismiss = vi.fn();
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <TipCard tip={tip} onAction={vi.fn()} variant="inline" />
      </I18nextProvider>
    );
    expect(screen.getByText('ヒント')).toBeDefined();

    cleanup();
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <TipCard tip={tip} onAction={vi.fn()} onDismiss={onDismiss} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'ヒントを閉じる' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
