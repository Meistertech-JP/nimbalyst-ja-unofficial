// @vitest-environment jsdom
import React, { createRef } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSidebar, type ChatSidebarRef } from '../ChatSidebar';

vi.mock('../../../store', async () => {
  const { atom } = await import('jotai');
  return {
    sessionListChatAtom: atom([]),
    refreshSessionListAtom: atom(null, () => {}),
    initSessionList: vi.fn(),
  };
});

vi.mock('../../../store/atoms/appSettings', async () => {
  const { atom } = await import('jotai');
  return {
    defaultAgentModelAtom: atom('claude-code:sonnet'),
  };
});

vi.mock('../../UnifiedAI/SessionTranscript', () => ({
  SessionTranscript: ({ sessionId }: { sessionId: string }) => (
    <div data-testid="session-transcript" data-session-id={sessionId} />
  ),
}));

vi.mock('../../AIChat/SessionDropdown', () => ({
  SessionDropdown: () => null,
}));

describe('ChatSidebar createNewSession ref action', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: vi.fn(() => 'new-chat-session'),
    });
    (window as any).electronAPI = {
      invoke: vi.fn().mockResolvedValue({ success: true }),
    };
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('creates a chat session while the panel is hidden', async () => {
    const englishI18n = await createI18nInstance('en');
    const ref = createRef<ChatSidebarRef>();
    render(
      <I18nextProvider i18n={englishI18n}>
        <ChatSidebar
          ref={ref}
          workspacePath="/workspace"
          isActive={false}
        />
      </I18nextProvider>,
    );

    await act(async () => {
      await ref.current?.createNewSession();
    });

    expect(window.electronAPI.invoke).toHaveBeenCalledWith(
      'sessions:create',
      {
        session: {
          id: 'new-chat-session',
          provider: 'claude-code',
          model: 'claude-code:sonnet',
          title: 'Chat',
        },
        workspaceId: '/workspace',
      },
    );
  });

  it('uses localized defaults for new chat and auto-created session titles', async () => {
    const japaneseI18n = await createI18nInstance('ja');
    const ref = createRef<ChatSidebarRef>();
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <ChatSidebar ref={ref} workspacePath="/workspace" isActive={false} />
      </I18nextProvider>,
    );

    await act(async () => {
      await ref.current?.createNewSession();
    });

    expect(window.electronAPI.invoke).toHaveBeenCalledWith(
      'sessions:create',
      expect.objectContaining({
        session: expect.objectContaining({ title: 'チャット' }),
      }),
    );

    vi.mocked(window.electronAPI.invoke).mockClear();
    vi.mocked(window.electronAPI.invoke).mockImplementation(async (channel: string) => {
      if (channel === 'sessions:list') return { success: true, sessions: [] };
      return { success: true };
    });
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <ChatSidebar workspacePath="/workspace" />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(window.electronAPI.invoke).toHaveBeenCalledWith(
        'sessions:create',
        expect.objectContaining({
          session: expect.objectContaining({ title: '新しいセッション' }),
        }),
      );
    });
  });

  it('uses a controlled session without auto-selecting or creating another session', () => {
    const view = render(
      <ChatSidebar
        workspacePath="/workspace"
        sessionId="paired-chat"
        autoInitializeSession={false}
        linkedSession={{ id: 'source-session', title: 'Source session' }}
      />,
    );

    expect(view.getByTestId('chat-sidebar-panel').getAttribute('data-session-id')).toBe(
      'paired-chat',
    );
    expect(view.getByTestId('session-transcript').getAttribute('data-session-id')).toBe(
      'paired-chat',
    );
    expect(
      view.getByTestId('chat-sidebar-linked-session').getAttribute('data-linked-session-id'),
    ).toBe('source-session');
    expect(window.electronAPI.invoke).not.toHaveBeenCalled();
  });

  it('creates a normal linked chat and reports its controlled session id', async () => {
    const ref = createRef<ChatSidebarRef>();
    const onSessionIdChange = vi.fn();
    render(
      <ChatSidebar
        ref={ref}
        workspacePath="/workspace"
        sessionId={null}
        onSessionIdChange={onSessionIdChange}
        autoInitializeSession={false}
        newSessionTitle="Chat with Source"
        newSessionDraft="Regarding @@[Source](source-session): "
      />,
    );

    await act(async () => {
      await ref.current?.createNewSession();
    });

    expect(window.electronAPI.invoke).toHaveBeenNthCalledWith(
      1,
      'sessions:create',
      {
        session: {
          id: 'new-chat-session',
          provider: 'claude-code',
          model: 'claude-code:sonnet',
          title: 'Chat with Source',
        },
        workspaceId: '/workspace',
      },
    );
    expect(window.electronAPI.invoke).toHaveBeenNthCalledWith(
      2,
      'sessions:update-draft-input',
      'new-chat-session',
      'Regarding @@[Source](source-session): ',
    );
    expect(onSessionIdChange).toHaveBeenCalledWith('new-chat-session');
  });

  it('localizes fixed empty-state and accessibility labels while preserving linked session text', async () => {
    const englishI18n = await createI18nInstance('en');
    const japaneseI18n = await createI18nInstance('ja');
    const props = {
      workspacePath: '/workspace',
      autoInitializeSession: false,
      onWidthChange: () => {},
      onSwitchToAgentMode: () => {},
      linkedSession: { id: 'source-session', title: 'Design review' },
    };
    const view = render(
      <I18nextProvider i18n={englishI18n}>
        <ChatSidebar {...props} sessionId={null} />
      </I18nextProvider>,
    );

    expect(screen.getByText('Failed to load chat session')).toBeDefined();

    view.rerender(
      <I18nextProvider i18n={englishI18n}>
        <ChatSidebar {...props} sessionId="chat-session" />
      </I18nextProvider>,
    );
    expect(screen.getByRole('separator', { name: 'Resize AI chat sidebar' })).toBeDefined();
    expect(screen.getByTitle('Open in agent mode')).toBeDefined();
    expect(screen.getByText('Connected to')).toBeDefined();
    expect(screen.getByTitle('Design review')).toBeDefined();

    view.rerender(
      <I18nextProvider i18n={japaneseI18n}>
        <ChatSidebar {...props} sessionId={null} />
      </I18nextProvider>,
    );
    expect(screen.getByText('チャットセッションの読み込みに失敗しました')).toBeDefined();

    view.rerender(
      <I18nextProvider i18n={japaneseI18n}>
        <ChatSidebar {...props} sessionId="chat-session" />
      </I18nextProvider>,
    );
    expect(screen.getByRole('separator', { name: 'AIチャットサイドバーの幅を変更' })).toBeDefined();
    expect(screen.getByTitle('エージェントモードで開く')).toBeDefined();
    expect(screen.getByText('接続先')).toBeDefined();
    expect(screen.getByTitle('Design review')).toBeDefined();
  });
});
