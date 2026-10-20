import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'jotai';
import { store } from '@nimbalyst/runtime/store';
import { activeWorkspacePathAtom } from '../../../store/atoms/openProjects';
import { allSharedDocumentsAtom, type SharedDocument } from '../../../store/atoms/collabDocuments';
import { SharedDocsListView } from '../SharedDocsListView';

vi.mock('@nimbalyst/runtime', () => ({ MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} /> }));
vi.mock('@nimbalyst/runtime/plugins/TrackerPlugin/components/UserAvatar', () => ({ UserAvatar: () => null }));
vi.mock('../../../hooks/useDocUnread', () => ({ useDocUnread: vi.fn() }));
vi.mock('../../../utils/teamAnalytics', () => ({ trackTeamAnalyticsEvent: vi.fn() }));
vi.mock('../../../services/CollaborativeDocumentTypeCatalog', () => {
  const catalog = {
    subscribe: () => () => {}, getSnapshot: () => 0,
    resolveMetadata: (documentType: string) => documentType === 'missing'
      ? { state: 'unsupported', reason: 'Extension com.example.missing is unavailable.' }
      : { state: 'ready', descriptor: { displayName: documentType === 'alpha' ? 'Alpha Format' : 'Zebra Format', icon: 'description' } },
  };
  return { getCollaborativeDocumentTypeCatalog: () => catalog };
});

function documentFixture(documentId: string, documentType: string): SharedDocument {
  return { documentId, documentType, title: `User ${documentId}`, createdAt: 1, updatedAt: 1, createdBy: 'user-raw', metadataVersion: 2, fileExtension: '.custom', editorId: 'com.example.custom' };
}

beforeEach(async () => {
  await i18next.changeLanguage('ja');
  store.set(activeWorkspacePathAtom, '/shared-type-i18n');
  store.set(allSharedDocumentsAtom, [documentFixture('unsupported', 'missing'), documentFixture('zebra', 'zebra'), documentFixture('alpha', 'alpha')]);
  window.electronAPI = { invoke: vi.fn(async () => undefined) } as unknown as typeof window.electronAPI;
});

afterEach(async () => {
  cleanup();
  store.set(allSharedDocumentsAtom, []);
  store.set(activeWorkspacePathAtom, null);
  vi.restoreAllMocks();
  await i18next.changeLanguage('en');
});

describe('shared document type display localization', () => {
  it('preserves type filter identity, order and color across language changes', async () => {
    const { container } = render(<Provider store={store}><SharedDocsListView workspacePath="/shared-type-i18n" /></Provider>);
    await waitFor(() => expect(container.querySelectorAll('tbody tr')).toHaveLength(3));
    expect(screen.getByText('未対応のドキュメント')).toBeTruthy();
    const rowIds = () => Array.from(container.querySelectorAll('tbody tr')).map(row => row.getAttribute('data-document-id'));
    const unsupportedChip = () => container.querySelector('[data-document-id="unsupported"] .shared-docs-type-chip') as HTMLElement;
    const originalColor = unsupportedChip().style.color;
    fireEvent.click(screen.getByRole('button', { name: '種類' }));
    expect(rowIds()).toEqual(['alpha', 'unsupported', 'zebra']);
    fireEvent.click(screen.getByRole('button', { name: '種類でフィルター' }));
    expect((await screen.findAllByRole('menuitemcheckbox')).map(option => option.textContent)).toEqual(['Alpha Format', '未対応のドキュメント', 'Zebra Format']);
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: '未対応のドキュメント' }));
    expect(rowIds()).toEqual(['unsupported']);
    await act(() => i18next.changeLanguage('en'));
    expect(rowIds()).toEqual(['unsupported']);
    expect(unsupportedChip().textContent).toBe('Unsupported document');
    expect(unsupportedChip().style.color).toBe(originalColor);
    expect(screen.getByRole('menuitemcheckbox', { name: 'Unsupported document' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Unsupported document' }));
    expect(rowIds()).toEqual(['alpha', 'unsupported', 'zebra']);
    expect(store.get(allSharedDocumentsAtom).map(doc => doc.documentType)).toEqual(['missing', 'zebra', 'alpha']);
    expect(vi.mocked(window.electronAPI.invoke).mock.calls.some(([channel]) => String(channel).includes('update') || String(channel).includes('set'))).toBe(false);
  });
});
