import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { getDefaultStore } from 'jotai';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { MenuBarIslandState } from '../../../../shared/menuBarIsland';
import { MENU_BAR_ISLAND_CHANNELS } from '../../../../shared/menuBarIsland';
import { emptyTrayPanelFeed } from '../../../../shared/traySessions';
import type { TrayPanelSession, TrayPanelSectionState } from '../../../../shared/traySessions';
import {
  TrayMarkAllReadButton,
  TraySessionSectionHeader,
  TrayStatusIndicator,
} from '../../TrayPanel/traySessionSections';

/**
 * The strip's title is a click target inside the pin/drag handle.
 *
 * That nesting is the whole risk: the handle decides pin-vs-drag by watching a
 * complete press, so a title press that reached it would open the session *and*
 * toggle the pin on one click. Nothing about that is visible on screen -- both
 * outcomes look like "the session opened" -- which is why it is tested here.
 */

const atoms = vi.hoisted(() => ({ state: null as never, glyph: null as never }));

// The real listener module imports the renderer store barrel, which drags in
// the whole atom graph for a component that reads two atoms.
vi.mock('../../../store/listeners/menuBarIslandListeners', async () => {
  const { atom } = await import('jotai');
  atoms.state = atom(null) as never;
  atoms.glyph = atom<string | null>(null) as never;
  return {
    menuBarIslandStateAtom: atoms.state,
    menuBarIslandGlyphAtom: atoms.glyph,
    initMenuBarIslandListener: () => () => {},
  };
});
vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({ MaterialSymbol: () => null }));
vi.mock('@nimbalyst/runtime/ui/icons/ProviderIcons', () => ({ ProviderIcon: () => null }));

import { MenuBarIslandApp } from '../MenuBarIslandApp';
import { MenuBarIslandSettingsPanel } from '../MenuBarIslandSettings';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

const send = vi.fn();

function namedFrame(): MenuBarIslandState {
  return {
    strip: {
      mode: 'named',
      sessionId: 'session-1',
      workspacePath: '/work/project',
      title: 'Daily GitHub issue triage',
      state: 'completed',
      age: { label: '2m', hot: false },
    },
    feed: emptyTrayPanelFeed(),
    snippets: {},
    expanded: true,
    anchor: 'center',
    settings: { style: 'island', showFleetStatus: true, osNotifications: true, preventSleep: null },
  };
}

function renderApp(locale: 'en' | 'ja' = 'en') {
  const i18n = locale === 'ja' ? japaneseI18n : englishI18n;
  return render(
    <I18nextProvider i18n={i18n}>
      <MenuBarIslandApp />
    </I18nextProvider>
  );
}

beforeEach(() => {
  send.mockClear();
  (window as unknown as { electronAPI: unknown }).electronAPI = {
    send,
    on: () => () => {},
    invoke: async () => null,
  };
  // jsdom has neither, and the island uses both to publish its rect and to
  // hold a drag that leaves the window.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
  getDefaultStore().set(atoms.state, namedFrame() as never);
});

describe('MenuBarIslandApp', () => {
  it('localizes menu bar settings in Japanese', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <MenuBarIslandSettingsPanel
          settings={{ style: 'island', showFleetStatus: true, osNotifications: true, preventSleep: 'pluggedIn' }}
        />
      </I18nextProvider>,
    );

    expect(screen.getByText('メニューバーの表示形式')).toBeDefined();
    expect(screen.getByText('アイランド')).toBeDefined();
    expect(screen.getByRole('switch', { name: 'Fleetの状態を表示' })).toBeDefined();
    expect(screen.getByRole('switch', { name: 'システム通知' })).toBeDefined();
    expect(screen.getByText('スリープを防止')).toBeDefined();
    expect(screen.getByText('電源接続時')).toBeDefined();
  });

  it('opens the named session from the strip without also toggling the pin', () => {
    renderApp();

    const title = screen.getByTestId('menu-bar-island-strip-title');
    expect(title.getAttribute('title')).toBe('Open Daily GitHub issue triage');
    fireEvent.pointerDown(title);
    fireEvent.pointerUp(title);
    fireEvent.click(title);

    expect(send).toHaveBeenCalledWith(MENU_BAR_ISLAND_CHANNELS.selectSession, {
      sessionId: 'session-1',
      workspacePath: '/work/project',
    });
    const channels = send.mock.calls.map(([channel]) => channel);
    expect(channels).not.toContain(MENU_BAR_ISLAND_CHANNELS.dragStart);
    expect(channels).not.toContain(MENU_BAR_ISLAND_CHANNELS.dragEnd);
  });

  it('still reports a press on the rest of the pill as a press', () => {
    renderApp();

    const pill = screen.getByTestId('menu-bar-island-strip');
    fireEvent.pointerDown(pill);
    fireEvent.pointerUp(pill);

    const channels = send.mock.calls.map(([channel]) => channel);
    expect(channels).toContain(MENU_BAR_ISLAND_CHANNELS.dragStart);
    expect(channels).toContain(MENU_BAR_ISLAND_CHANNELS.dragEnd);
    expect(channels).not.toContain(MENU_BAR_ISLAND_CHANNELS.selectSession);
  });

  it('localizes the idle state and footer controls', () => {
    const frame = namedFrame();
    frame.strip = {
      mode: 'counts',
      needsApproval: 0,
      needsDecision: 0,
      running: 0,
      failed: 0,
      stalled: 0,
      unread: 0,
      age: null,
    };
    frame.idle = { lastActivityAt: Date.now() - 2 * 60_000, recent: [] };
    getDefaultStore().set(atoms.state, frame as never);

    renderApp('ja');

    const relative = new Intl.RelativeTimeFormat('ja', { numeric: 'auto', style: 'short' }).format(-2, 'minute');
    const idleText = screen.getByTestId('menu-bar-island-idle').textContent ?? '';
    expect(idleText).toContain('実行中のセッションはありません。');
    expect(idleText).toContain(`前回のセッション: ${relative}。`);
    expect(screen.getByText('セッションはまだありません')).toBeDefined();
    expect(screen.getByRole('button', { name: 'メニューバーの設定' })).toBeDefined();
    expect(screen.getByRole('button', { name: '新しいセッション' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Nimbalystを開く' })).toBeDefined();
  });

  it.each([
    {
      locale: 'en' as const,
      sections: ['Needs attention', 'Running', 'Not responding', 'Unread'],
      titles: ['Session error', 'Waiting for your response', 'Running, but silent', 'Running', 'Unread response'],
      markRead: 'Mark all as read',
    },
    {
      locale: 'ja' as const,
      sections: ['要対応', '実行中', '応答なし', '未読'],
      titles: ['セッションエラー', '応答を待っています', '実行中ですが応答がありません', '実行中', '未読の応答'],
      markRead: 'すべて既読にする',
    },
  ])('localizes shared tray section labels and status tooltips in $locale', ({ locale, sections, titles, markRead }) => {
    const onMarkAllRead = vi.fn();
    const session = {
      sessionId: 'session-1',
      title: 'Test session',
      workspacePath: '/work/project',
      workspaceName: 'project',
      provider: 'claude-code',
      updatedAt: 0,
      isStreaming: false,
      hasPendingPrompt: false,
      hasError: false,
    } satisfies TrayPanelSession;
    const states: TrayPanelSectionState[] = ['attention', 'running', 'stalled', 'unread'];
    const i18n = locale === 'ja' ? japaneseI18n : englishI18n;

    render(
      <I18nextProvider i18n={i18n}>
        <>
          {states.map((state) => (
            <TraySessionSectionHeader key={state} state={state} count={1} />
          ))}
          <TrayMarkAllReadButton onClick={onMarkAllRead} className="test-button" testId="mark-all-read" />
          <TrayStatusIndicator session={{ ...session, hasError: true }} state="attention" />
          <TrayStatusIndicator session={{ ...session, hasPendingPrompt: true }} state="attention" />
          <TrayStatusIndicator session={session} state="stalled" />
          <TrayStatusIndicator session={session} state="running" />
          <TrayStatusIndicator session={session} state="unread" />
        </>
      </I18nextProvider>,
    );

    for (const section of sections) expect(screen.getByText(section)).toBeDefined();
    for (const title of titles) expect(screen.getByTitle(title)).toBeDefined();
    const markReadButton = screen.getByRole('button', { name: markRead });
    fireEvent.click(markReadButton);
    expect(onMarkAllRead).toHaveBeenCalledOnce();
  });
});
