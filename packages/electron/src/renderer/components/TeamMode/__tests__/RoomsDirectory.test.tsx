// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConversationDirectoryEntry } from '../../../../shared/conversationDirectory';
import { RoomsDirectory } from '../RoomsDirectory';

let testI18n: Awaited<ReturnType<typeof createI18nInstance>>;
function render(ui: React.ReactElement) {
  return rtlRender(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);
}

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

const listConversationDirectory = vi.hoisted(() => vi.fn());
vi.mock('../../../services/conversationDirectoryClient', () => ({
  listConversationDirectory,
  setDirectoryConversationMembership: vi.fn(),
}));

const room: ConversationDirectoryEntry = {
  id: 'general',
  orgId: 'org-a',
  kind: 'orgRoom',
  visibility: 'public',
  title: 'General',
  agentPostingEnabled: false,
  createdByUserId: 'member-a',
  createdAt: 1,
  capabilities: ['read', 'comment'],
};

describe('RoomsDirectory', () => {
  beforeEach(async () => {
    listConversationDirectory.mockReset();
    testI18n = await createI18nInstance('en');
  });
  afterEach(() => cleanup());

  it('lists the rooms it can see', async () => {
    listConversationDirectory.mockResolvedValue([room]);
    render(
      <RoomsDirectory orgId="org-a" viewerUserId="member-a" onOpenConversation={vi.fn()} />,
    );

    await waitFor(() => screen.getByTestId('org-rooms-directory-row-general'));
    expect(screen.queryByTestId('org-rooms-directory-empty')).toBeNull();
  });

  it('offers the way out of an empty directory instead of stating emptiness', async () => {
    listConversationDirectory.mockResolvedValue([]);
    const onCreateRoom = vi.fn();
    render(
      <RoomsDirectory
        orgId="org-a"
        viewerUserId="member-a"
        onOpenConversation={vi.fn()}
        onCreateRoom={onCreateRoom}
      />,
    );

    await waitFor(() => screen.getByTestId('org-rooms-directory-empty'));
    fireEvent.click(screen.getByTestId('org-rooms-directory-empty-create'));
    expect(onCreateRoom).toHaveBeenCalledTimes(1);
  });

  it('omits the create action from the empty state for a member who may not create rooms', async () => {
    listConversationDirectory.mockResolvedValue([]);
    render(
      <RoomsDirectory orgId="org-a" viewerUserId="member-a" onOpenConversation={vi.fn()} />,
    );

    await waitFor(() => screen.getByTestId('org-rooms-directory-empty'));
    expect(screen.queryByTestId('org-rooms-directory-empty-create')).toBeNull();
    expect((screen.getByTestId('org-rooms-create') as HTMLButtonElement).title)
      .toBe('Only organization admins can create rooms');
  });

  it('says the archived rooms were included when the filter is on', async () => {
    listConversationDirectory.mockResolvedValue([]);
    render(
      <RoomsDirectory orgId="org-a" viewerUserId="member-a" onOpenConversation={vi.fn()} />,
    );

    await waitFor(() => screen.getByTestId('org-rooms-directory-empty'));
    fireEvent.click(screen.getByTestId('org-rooms-archived-filter'));

    await waitFor(() => expect(screen.getByTestId('org-rooms-directory-empty').textContent)
      .toContain('archived ones included'));
  });

  it('renders the directory controls in Japanese', async () => {
    listConversationDirectory.mockResolvedValue([]);
    await testI18n.changeLanguage('ja');
    render(
      <RoomsDirectory orgId="org-a" viewerUserId="member-a" onOpenConversation={vi.fn()} />,
    );
    expect(await screen.findByRole('heading', { name: 'ルームを閲覧' })).toBeDefined();
    expect(screen.getByText('公開ルームは組織の全員が利用できます。非公開ルームは参加している場合にのみ表示されます。')).toBeDefined();
  });
});
