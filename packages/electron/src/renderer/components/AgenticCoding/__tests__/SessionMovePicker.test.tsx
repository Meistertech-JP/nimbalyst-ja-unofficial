// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { sessionRegistryAtom } from '../../../store/atoms/sessions';
import { SessionMovePicker } from '../SessionMovePicker';

afterEach(cleanup);

const session = (id: string, title: string, sessionType: 'session' | 'workstream' = 'session') => ({
  id,
  title,
  provider: 'claude-code',
  worktreeId: null,
  uncommittedCount: 0,
  createdAt: 1,
  updatedAt: 1,
  workspaceId: '/project',
  sessionType,
  messageCount: 0,
  childCount: 0,
  isArchived: false,
}) as any;

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

it('shows the Japanese fallback for an untitled session', async () => {
  const store = createStore();
  store.set(sessionRegistryAtom, new Map([
    ['current', session('current', 'Current')],
    ['parent', session('parent', '')],
  ]));
  const i18n = await createI18nInstance('ja');

  render(
    <Provider store={store}>
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <SessionMovePicker sessionId="current" onMove={vi.fn()} onClose={vi.fn()} />
      </UiLanguageProvider>
    </Provider>
  );

  screen.getByRole('option', { name: '無題のセッション' });
});

it('shows the Japanese fallback for an untitled workstream', async () => {
  const store = createStore();
  store.set(sessionRegistryAtom, new Map([
    ['current', session('current', 'Current')],
    ['workstream', session('workstream', '', 'workstream')],
  ]));
  const i18n = await createI18nInstance('ja');

  render(
    <Provider store={store}>
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <SessionMovePicker
          sessionId="current"
          mode="workstreams"
          onCreateWorkstream={vi.fn()}
          onMove={vi.fn()}
          onClose={vi.fn()}
        />
      </UiLanguageProvider>
    </Provider>
  );

  screen.getByRole('option', { name: '無題のワークストリーム' });
});
