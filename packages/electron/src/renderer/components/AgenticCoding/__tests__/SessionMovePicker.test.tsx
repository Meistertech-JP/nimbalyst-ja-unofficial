// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { sessionRegistryAtom } from '../../../store/atoms/sessions';
import { SessionMovePicker } from '../SessionMovePicker';

afterEach(cleanup);

it('shows the session move picker controls in Japanese', async () => {
  const store = createStore();
  store.set(sessionRegistryAtom, new Map());
  const i18n = await createI18nInstance('ja');

  render(
    <Provider store={store}>
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <SessionMovePicker sessionId="current" onMove={vi.fn()} onClose={vi.fn()} />
      </UiLanguageProvider>
    </Provider>
  );

  screen.getByRole('dialog', { name: 'セッションの移動先を選択' });
  screen.getByRole('textbox', { name: '親セッションを検索' });
  screen.getByRole('listbox', { name: '移動可能な親セッション' });
  screen.getByText('一致する親セッションがありません');
  screen.getByRole('button', { name: 'キャンセル' });
});
