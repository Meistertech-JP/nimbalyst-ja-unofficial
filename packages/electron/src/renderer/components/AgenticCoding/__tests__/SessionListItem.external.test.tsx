// @vitest-environment jsdom
import React from 'react';
import { Provider, createStore } from 'jotai';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
vi.mock('../../../store', async () => {
  const { atom } = await import('jotai');
  const empty = atom(undefined);
  return Object.fromEntries(['sessionOrChildProcessingAtom', 'sessionUnreadAtom', 'sessionPendingPromptAtom', 'sessionHasPendingInteractivePromptAtom', 'reparentSessionAtom', 'refreshSessionListAtom', 'sessionShareAtom', 'sessionWakeupAtom', 'sessionLastActivityAtom'].map(key => [key, () => empty]));
});
vi.mock('../../../store/atoms/sessions', async () => {
  const { atom } = await import('jotai');
  return { sessionRegistryAtom: atom(new Map()), convertToWorkstreamAtom: atom(null, () => {}) };
});
vi.mock('../../../store/atoms/teamInbox', async () => {
  const { atom } = await import('jotai'); const value = atom(false);
  return { sessionAgentWakePendingAtom: () => value };
});
vi.mock('../SessionContextMenu', () => ({ SessionContextMenu: () => null }));
vi.mock('../SessionContextUsageBar', () => ({ SessionContextUsageBar: () => null }));
vi.mock('../SessionProviderIcon', () => ({ SessionProviderIcon: () => <span>Provider badge</span> }));
vi.mock('../FullTitleTooltip', () => ({ FullTitleTooltip: ({ children }: any) => <span>{children}</span> }));
import { SessionListItem } from '../SessionListItem';
import { sessionShareAtom } from '../../../store';
import { sessionRegistryAtom } from '../../../store/atoms/sessions';
import { settingAtom } from '../../../store/atoms/settingAtomFamily';
const base = 1_700_000_000_000;
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('reacts to its own metadata, expires following, and revokes it immediately when disabled', async () => {
  vi.useFakeTimers(); vi.setSystemTime(base);
  window.electronAPI = {} as any;
  const i18n = await createI18nInstance('ja');
  const store = createStore();
  const following = settingAtom('app.externalSessionFollowEnabled');
  store.set(sessionRegistryAtom, new Map([['s1', { id: 's1', externalSource: 'openai-codex', externalLastActivityAt: base } as any]]));
  const ownRender = vi.fn();
  const siblingRender = vi.fn();
  render(<UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
    <Provider store={store}>
      <React.Profiler id="own" onRender={ownRender}><SessionListItem id="s1" title="External task" createdAt={base} isActive={false} onClick={() => {}} /></React.Profiler>
      <React.Profiler id="sibling" onRender={siblingRender}><SessionListItem id="s2" title="Local task" createdAt={base} isActive={false} onClick={() => {}} /></React.Profiler>
    </Provider>
  </UiLanguageProvider>);
  screen.getByText('外部');
  screen.getByTitle('Codexからインポート');
  expect(screen.queryByText('追従中')).toBeNull();
  act(() => { store.set(following, true); });
  screen.getByText('追従中');
  screen.getByTitle('最近の外部セッションのアクティビティ');
  expect(screen.getAllByText('Provider badge')).toHaveLength(2);
  ownRender.mockClear(); siblingRender.mockClear();
  act(() => { vi.advanceTimersByTime(30_001); });
  expect(ownRender).toHaveBeenCalled();
  expect(siblingRender).not.toHaveBeenCalled();
  expect(screen.queryByText('追従中')).toBeNull();
  screen.getByText('外部');
  act(() => { store.set(sessionRegistryAtom, new Map([['s1', { id: 's1', externalSource: 'openai-codex', externalLastActivityAt: Date.now() } as any]])); });
  screen.getByText('追従中');
  act(() => { store.set(following, false); });
  expect(screen.queryByText('追従中')).toBeNull();
  screen.getByText('外部');
});

it('localizes the shared-session indicator title', async () => {
  window.electronAPI = {} as any;
  const i18n = await createI18nInstance('ja');
  const store = createStore();
  store.set(sessionShareAtom('s1') as any, { shared: true } as any);

  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
      <Provider store={store}>
        <SessionListItem id="s1" title="Shared task" createdAt={base} isActive={false} isLoaded isArchived onClick={() => {}} />
      </Provider>
    </UiLanguageProvider>,
  );

  expect(screen.getByTitle('共有済み')).toBeTruthy();
  const row = screen.getByRole('button', { name: /セッション: Shared task/ });
  expect(row.getAttribute('aria-label')).toContain('タブで開いています');
  expect(row.getAttribute('aria-label')).toContain('アーカイブ済み');
});

it('localizes default session titles for display without changing the stored title', async () => {
  window.electronAPI = {} as any;
  const i18n = await createI18nInstance('ja');
  const store = createStore();

  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
      <Provider store={store}>
        <SessionListItem id="s1" title="New conversation" createdAt={base} isActive={false} uncommittedCount={2} onClick={() => {}} />
      </Provider>
    </UiLanguageProvider>,
  );

  expect(screen.getByText('新しい会話')).toBeTruthy();
  expect(screen.getByTitle('未コミットの変更2件')).toBeTruthy();
});

it.each([
  { sortBy: 'updated' as const, jaLabel: '最終更新', enLabel: 'Last Updated', jaTime: 'たった今', enTime: 'Just now', jaTick: '1分前' },
  { sortBy: 'created' as const, jaLabel: '作成日時', enLabel: 'Created', jaTime: '1分前', enTime: '1 min ago', jaTick: '2分前' },
])('localizes $sortBy time, accessible label and tooltip across live language switches while keeping the idle tick', async ({ sortBy, jaLabel, enLabel, jaTime, enTime, jaTick }) => {
  vi.useFakeTimers();
  vi.setSystemTime(base);
  window.electronAPI = {} as any;
  const i18n = await createI18nInstance('ja');
  const store = createStore();
  const createdAt = base - 90_000;
  const updatedAt = base - 30_000;
  const timestamp = sortBy === 'updated' ? updatedAt : createdAt;
  const dateOptions = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' } as const;
  const { container } = render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
      <Provider store={store}>
        <SessionListItem id="localized-time" title="Time test" createdAt={createdAt} updatedAt={updatedAt} sortBy={sortBy} isActive={false} onClick={() => {}} />
      </Provider>
    </UiLanguageProvider>,
  );
  const date = () => container.querySelector('.session-list-item-datetime')!;
  expect(date().textContent).toBe(jaTime);
  expect(date().getAttribute('title')).toBe(new Date(timestamp).toLocaleString('ja', dateOptions));
  expect(screen.getByRole('button', { name: `セッション: Time test, ${jaLabel} ${jaTime}` }).getAttribute('aria-label')).not.toMatch(/updated|created|ago|Just now/);

  await act(async () => { await i18n.changeLanguage('en'); });
  expect(date().textContent).toBe(enTime);
  expect(date().getAttribute('title')).toBe(new Date(timestamp).toLocaleString('en', dateOptions));
  screen.getByRole('button', { name: `Session: Time test, ${enLabel} ${enTime}` });

  await act(async () => { await i18n.changeLanguage('ja'); });
  act(() => { vi.advanceTimersByTime(60_000); });
  expect(date().textContent).toBe(jaTick);
  screen.getByRole('button', { name: `セッション: Time test, ${jaLabel} ${jaTick}` });
});
