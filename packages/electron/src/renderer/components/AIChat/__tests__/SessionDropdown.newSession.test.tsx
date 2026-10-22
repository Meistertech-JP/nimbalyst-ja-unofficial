// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { SessionDropdown } from '../SessionDropdown';
import { requestConfirmation } from '../../../dialogs/requestConfirmation';

vi.mock('../../../dialogs/requestConfirmation', () => ({ requestConfirmation: vi.fn() }));

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} />,
  ProviderIcon: () => null,
  formatDate: (v: unknown) => String(v),
}));

vi.mock('../../../utils/modelUtils', () => ({
  parseModelInfo: () => null,
  getProviderLabel: (p: string) => p,
}));

vi.mock('../../../store', async () => {
  const { atom } = await import('jotai');
  const off = atom(false);
  const unread = atom(true);
  return {
    sessionProcessingAtom: () => off,
    sessionUnreadAtom: () => unread,
  };
});

// Controllable, jsdom-friendly stand-in for the floating menu hook.
vi.mock('../../../hooks/useFloatingMenu', async () => {
  const React = await import('react');
  return {
    FloatingPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useFloatingMenu: () => {
      const [isOpen, setIsOpen] = React.useState(false);
      return {
        isOpen,
        setIsOpen,
        refs: { setReference: () => {}, setFloating: () => {} },
        floatingStyles: {},
        getReferenceProps: () => ({}),
        getFloatingProps: () => ({}),
      };
    },
  };
});

const baseProps = {
  currentSessionId: 's1',
  sessions: [
    { id: 's1', createdAt: 1, title: 'Agent trust popup review', provider: 'claude-code', messageCount: 3 },
    { id: 's2', createdAt: 2, title: 'Draft release notes', provider: 'claude-code' },
  ],
  onSessionSelect: vi.fn(),
  onDeleteSession: vi.fn(),
};

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

function renderWithLanguage(node: React.ReactNode, language: 'en' | 'ja') {
  const i18n = language === 'ja' ? japaneseI18n : englishI18n;
  return render(
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale={language === 'ja' ? 'ja-JP' : 'en-US'}>
      {node}
    </UiLanguageProvider>,
  );
}

afterEach(cleanup);

describe('SessionDropdown new-session affordance', () => {
  it('shows the current session name in the trigger', () => {
    renderWithLanguage(<SessionDropdown {...baseProps} onNewSession={vi.fn()} />, 'en');
    screen.getByText('Agent trust popup review');
  });

  it('creates a new session from the menu row and closes the menu', () => {
    const onNewSession = vi.fn();
    renderWithLanguage(<SessionDropdown {...baseProps} onNewSession={onNewSession} />, 'en');

    // Open the dropdown.
    fireEvent.click(screen.getByTitle('Session History'));

    const newRow = screen.getByText('New session');
    fireEvent.click(newRow);

    expect(onNewSession).toHaveBeenCalledTimes(1);
    // Menu closed → row is gone.
    expect(screen.queryByText('New session')).toBeNull();
  });
});

describe('SessionDropdown delete', () => {
  it('deletes only after the in-app confirmation is accepted', async () => {
    const onDeleteSession = vi.fn();
    const confirmMock = vi.mocked(requestConfirmation);
    renderWithLanguage(<SessionDropdown {...baseProps} onNewSession={vi.fn()} onDeleteSession={onDeleteSession} />, 'en');
    fireEvent.click(screen.getByTitle('Session History'));

    confirmMock.mockResolvedValueOnce(false);
    fireEvent.click(screen.getAllByTitle('Delete')[0]);
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(onDeleteSession).not.toHaveBeenCalled();

    confirmMock.mockResolvedValueOnce(true);
    fireEvent.click(screen.getAllByTitle('Delete')[0]);
    await waitFor(() => expect(onDeleteSession).toHaveBeenCalledTimes(1));
  });
});

describe('SessionDropdown localization', () => {
  it('localizes menu labels while preserving user-provided session data', () => {
    renderWithLanguage(
      <SessionDropdown {...baseProps} onNewSession={vi.fn()} onOpenSessionManager={vi.fn()} />,
      'ja',
    );

    fireEvent.click(screen.getByTitle('セッション履歴'));
    expect(screen.getAllByTitle('未読の応答')).toHaveLength(3);
    screen.getByText('新しいセッション');
    screen.getByText('すべてのセッション');
    expect(screen.getAllByText('Agent trust popup review')).toHaveLength(2);
    screen.getByText('3ターン');
  });

  it('shows the English labels and empty state when English is selected', () => {
    renderWithLanguage(
      <SessionDropdown
        currentSessionId={null}
        sessions={[]}
        onSessionSelect={vi.fn()}
        onNewSession={vi.fn()}
        onDeleteSession={vi.fn()}
      />,
      'en',
    );

    screen.getByText('New Session');
    fireEvent.click(screen.getByTitle('Session History'));
    screen.getByText('New session');
    screen.getByText('No sessions yet');
  });
});
