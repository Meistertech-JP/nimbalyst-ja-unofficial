// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'jotai';
import { store } from '@nimbalyst/runtime/store';
import { activeWorkspacePathAtom } from '../../../store/atoms/openProjects';
import { allSharedDocumentsAtom, type SharedDocument } from '../../../store/atoms/collabDocuments';
import { SharedDocsListView } from '../SharedDocsListView';
import { CollabSidebar } from '../CollabSidebar';

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));
vi.mock('@nimbalyst/runtime/plugins/TrackerPlugin/components/UserAvatar', () => ({
  UserAvatar: () => null,
}));
vi.mock('../../../services/CollaborativeDocumentTypeCatalog', () => {
  const catalog = { subscribe: () => () => {}, getSnapshot: () => 0, getDescriptors: () => [] };
  return { getCollaborativeDocumentTypeCatalog: () => catalog };
});
vi.mock('../../../utils/sharedDocumentTypeMetadata', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../utils/sharedDocumentTypeMetadata')>(),
  resolveSharedDocumentTypePresentation: () => ({
    state: 'ready', icon: 'description', typeLabel: 'Markdown',
    metadata: { metadataVersion: 2, fileExtension: '.md', editorId: 'builtin.lexical' },
  }),
}));
vi.mock('../../../hooks/useDocUnread', () => ({ useDocUnread: vi.fn(), markDocViewed: vi.fn() }));
vi.mock('../../../hooks/useCollabLocalOrigin', () => ({ useCollabLocalOrigin: () => ({}) }));
vi.mock('../../../utils/teamAnalytics', () => ({ trackTeamAnalyticsEvent: vi.fn() }));
vi.mock('../../../services/collaborativeDocumentCreationOrchestrator', () => ({
  createCollaborativeDocument: vi.fn(),
}));
vi.mock('../../InputModal', () => ({ InputModal: () => null }));
vi.mock('../../WorkspaceSummaryHeader', () => ({ WorkspaceSummaryHeader: () => null }));
vi.mock('../CollabCreateItemDialog', () => ({ CollabCreateItemDialog: () => null }));
vi.mock('../CollabNewDocumentMenu', () => ({
  buildSharedNewDocumentMenuItems: () => [], CollabNewDocumentMenu: () => null,
}));

const documentFixture = (id: string, updatedAt: number): SharedDocument => ({
  documentId: id, title: `User title ${id}`, documentType: 'markdown',
  createdBy: 'other-user', createdAt: 1, updatedAt,
});

beforeEach(() => {
  store.set(activeWorkspacePathAtom, '/collab-accessibility-i18n');
  vi.stubGlobal('electronAPI', undefined);
  window.electronAPI = {
    invoke: vi.fn(async (channel: string) => channel === 'workspace:get-state' ? {} : undefined),
  } as unknown as typeof window.electronAPI;
});

afterEach(async () => {
  cleanup();
  store.set(allSharedDocumentsAtom, []);
  store.set(activeWorkspacePathAtom, null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await i18next.changeLanguage('en');
});

describe('shared document accessible labels', () => {
  it.each([
    { language: 'ja', sortLabel: '未読で並べ替え' },
    { language: 'en', sortLabel: 'Sort by Unread' },
  ])('localizes sort attributes and retains sorting in $language', async ({ language, sortLabel }) => {
    await i18next.changeLanguage(language);
    store.set(allSharedDocumentsAtom, [documentFixture('first', 1), documentFixture('second', 2)]);
    const { container } = render(<Provider store={store}><SharedDocsListView workspacePath="/collab-accessibility-i18n" /></Provider>);
    const sortButton = screen.getByRole('button', { name: sortLabel });
    expect(sortButton.getAttribute('title')).toBe(sortLabel);
    expect(sortButton.getAttribute('aria-label')).toBe(sortLabel);
    const firstRow = () => container.querySelector('tbody tr')?.textContent;
    expect(firstRow()).toContain('User title second');
    fireEvent.click(sortButton);
    expect(firstRow()).toContain('User title first');
    await act(() => i18next.changeLanguage(language === 'ja' ? 'en' : 'ja'));
    const translatedLabel = language === 'ja' ? 'Sort by Unread' : '未読で並べ替え';
    expect(screen.getByRole('button', { name: translatedLabel }).getAttribute('title')).toBe(translatedLabel);
    expect(firstRow()).toContain('User title first');
  });

  it('translates the locked document explanation without enabling it or reloading the workspace', async () => {
    await i18next.changeLanguage('ja');
    store.set(allSharedDocumentsAtom, [{ ...documentFixture('locked', 1), decryptFailed: true }]);
    const onDocumentSelect = vi.fn();
    render(<Provider store={store}><CollabSidebar workspacePath="/collab-accessibility-i18n" onDocumentSelect={onDocumentSelect} /></Provider>);
    const locked = await screen.findByTestId('collab-sidebar-locked-doc') as HTMLButtonElement;
    expect(locked.title).toBe('このドキュメントのタイトルは、現在のアカウントが持っていない鍵で暗号化されています。チーム管理者にキーエンベロープの更新・再ラップを依頼してから、ワークスペースを開き直してください。');
    expect(locked.disabled).toBe(true);
    fireEvent.click(locked);
    expect(onDocumentSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(window.electronAPI.invoke).toHaveBeenCalledWith('workspace:update-state', '/collab-accessibility-i18n', expect.any(Object)));
    const callsBeforeLanguageChange = vi.mocked(window.electronAPI.invoke).mock.calls.length;
    await act(() => i18next.changeLanguage('en'));
    expect(locked.title).toBe("This document's title is encrypted with a key your account does not currently have. Ask a team admin to refresh / rewrap your key envelope, then reopen the workspace.");
    expect(locked.disabled).toBe(true);
    expect(window.electronAPI.invoke).toHaveBeenCalledTimes(callsBeforeLanguageChange);
  });
});
