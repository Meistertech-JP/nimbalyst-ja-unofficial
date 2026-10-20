// @vitest-environment jsdom
import React, { createRef } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';
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
  beforeEach(async () => {
    await i18next.changeLanguage('en');
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: vi.fn(() => 'new-chat-session'),
    });
    (window as any).electronAPI = {
      invoke: vi.fn().mockResolvedValue({ success: true }),
    };
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    await i18next.changeLanguage('en');
  });

  it('creates a chat session while the panel is hidden', async () => {
    const ref = createRef<ChatSidebarRef>();
    render(
      <ChatSidebar
        ref={ref}
        workspacePath="/workspace"
        isActive={false}
      />,
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

  it('uses the active UI language for the default chat title', async () => {
    await i18next.changeLanguage('ja');
    const ref = createRef<ChatSidebarRef>();
    render(
      <ChatSidebar
        ref={ref}
        workspacePath="/workspace"
        isActive={false}
      />,
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
          title: 'チャット',
        },
        workspaceId: '/workspace',
      },
    );
  });

  it('uses the active UI language when auto-initializing the first session', async () => {
    await i18next.changeLanguage('ja');
    render(<ChatSidebar workspacePath="/workspace" />);

    await waitFor(() => {
      expect(window.electronAPI.invoke).toHaveBeenCalledWith(
        'sessions:create',
        {
          session: {
            id: 'new-chat-session',
            provider: 'claude-code',
            model: 'claude-code:sonnet',
            title: '新しいセッション',
          },
          workspaceId: '/workspace',
        },
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
    expect(view.getByText('Connected to')).toBeTruthy();
    expect(window.electronAPI.invoke).not.toHaveBeenCalled();
  });

  it('updates the linked-session label when the UI language changes', async () => {
    const view = render(
      <ChatSidebar
        workspacePath="/workspace"
        sessionId="paired-chat"
        autoInitializeSession={false}
        linkedSession={{ id: 'source-session', title: 'Source session' }}
        onWidthChange={() => {}}
        onSwitchToAgentMode={() => {}}
      />,
    );

    expect(view.getByText('Connected to')).toBeTruthy();
    expect(view.getByRole('separator').getAttribute('aria-label')).toBe(
      'Resize AI chat sidebar',
    );
    expect(view.getByTitle('Open in agent mode')).toBeTruthy();

    await act(async () => {
      await i18next.changeLanguage('ja');
    });

    expect(view.getByText('接続先')).toBeTruthy();
    expect(view.getByText('Source session')).toBeTruthy();
    expect(view.getByRole('separator').getAttribute('aria-label')).toBe(
      'AIチャットサイドバーの幅を変更',
    );
    expect(view.getByTitle('エージェントモードで開く')).toBeTruthy();
  });

  it('updates the load failure message when the UI language changes', async () => {
    const view = render(
      <ChatSidebar
        workspacePath="/workspace"
        autoInitializeSession={false}
      />,
    );

    expect(view.getByText('Failed to load chat session')).toBeTruthy();

    await act(async () => {
      await i18next.changeLanguage('ja');
    });

    expect(view.getByText('チャットセッションの読み込みに失敗しました')).toBeTruthy();
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
});
