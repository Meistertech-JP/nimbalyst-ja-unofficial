// @vitest-environment jsdom
import React from 'react';
import { Provider } from 'jotai';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';

const mocks = vi.hoisted(() => ({
  acquire: vi.fn(), release: vi.fn(), discard: vi.fn(), connect: vi.fn(async () => {}),
  createHost: vi.fn(() => ({})), registerHistory: vi.fn(() => vi.fn()),
  showError: vi.fn(), showInfo: vi.fn(), confirm: vi.fn(),
  mounts: vi.fn(), unmounts: vi.fn(),
}));
vi.mock('@nimbalyst/runtime/store', async () => {
  const { atom, createStore } = await import('jotai');
  return { store: createStore(), editorDirtyAtom: () => atom(false), makeEditorKey: (key: string) => key, themeIdAtom: atom('light') };
});
vi.mock('@nimbalyst/runtime', () => ({
  MarkdownEditor: () => null,
  MonacoEditor: ({ host }: { host: unknown }) => {
    React.useEffect(() => { mocks.mounts(host); return () => { mocks.unmounts(host); }; }, [host]);
    return <div>Fixture code editor</div>;
  },
  DocumentPathProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@nimbalyst/runtime/editor', () => ({ $convertFromEnhancedMarkdownString: vi.fn(), getEditorTransformers: vi.fn() }));
vi.mock('@nimbalyst/runtime/plugins/shared/fixedTabHeader', () => ({ FixedTabHeaderContainer: () => null, FixedTabHeaderRegistry: { getInstance: () => ({ notifyChange: vi.fn() }) } }));
vi.mock('@nimbalyst/runtime/plugins/SearchReplace', () => ({ SearchReplaceStateManager: {}, isLexicalSearchEditor: () => false }));
vi.mock('@nimbalyst/runtime/sync', () => ({
  DocumentSyncProvider: class {}, LocalDocumentReplica: class {},
  CollabHistoryClient: class {}, createRevisionAdapterFromCollabContent: () => null,
}));
vi.mock('@nimbalyst/runtime/collab-lexical', () => ({ CollabLexicalProvider: class { handleStatusChange() {} destroy() {} } }));
vi.mock('@nimbalyst/collab-adapters', () => ({
  getCollabContentAdapter: () => ({ fileExtensions: ['.ts'], exportToFile: () => 'const userContent = 1;' }),
  exportCollabRecoveryPlaintext: () => 'Unsent user content',
}));
vi.mock('../../../store/atoms/collabDocuments', async () => {
  const { atom } = await import('jotai');
  return { sharedDocumentsAtom: atom([]), sharedFoldersAtom: atom([]), getTeamSyncProvider: () => null };
});
vi.mock('../../../store/atoms/collabHistoryControllers', async () => {
  const { atom } = await import('jotai');
  return { collabHistoryControllerBumpAtom: atom(0), registerCollabHistoryController: mocks.registerHistory };
});
vi.mock('../../../store/atoms/appCommands', async () => ({ closeActiveTabRequestAtom: (await import('jotai')).atom(0) }));
vi.mock('../../../store/atoms/documentSyncRegistry', () => ({ documentSyncRegistry: { register: vi.fn(), unregister: vi.fn() } }));
vi.mock('../../../store/atoms/collabDiscovery', () => ({ recordDocOpened: vi.fn() }));
vi.mock('../../../services/CollabAssetService', () => ({ CollabAssetService: class {} }));
vi.mock('../../../services/ElectronLocalReplicaStore', () => ({ ElectronLocalReplicaStore: class {} }));
vi.mock('../../../services/DocumentReplicaCache', () => ({ buildDocumentReplicaCacheKey: () => 'fixture-key', getDocumentReplicaCache: () => ({ acquire: mocks.acquire }) }));
vi.mock('../../../services/ErrorNotificationService', () => ({ errorNotificationService: { showError: mocks.showError, showInfo: mocks.showInfo } }));
vi.mock('../../../services/CollaborativeDocumentTypeCatalog', () => ({ getCollaborativeDocumentTypeCatalog: () => ({ inferFileExtension: () => '.ts' }) }));
vi.mock('../../../contexts/DialogContext', () => ({ dialogRef: { current: { confirm: mocks.confirm } } }));
vi.mock('../../../hooks/useCollabLocalOrigin', () => ({ useCollabLocalOrigin: () => ({ binding: null, busyAction: null, hasResolvedBinding: false }) }));
vi.mock('../../../hooks/useLexicalSelectionContext', () => ({ useLexicalSelectionContext: vi.fn() }));
vi.mock('../../../hooks/useDocUnread', () => ({ markDocViewed: vi.fn() }));
vi.mock('../../../store/listeners/collabReplicaListeners', () => ({ hasCollabReplicaPreloadSupport: () => true }));
vi.mock('../../../utils/collabDocumentOpener', () => ({ resolveCollabConfigForUri: vi.fn() }));
vi.mock('../../../utils/CodeCollabContentAdapter', () => ({ getCodeCollabExportFileName: () => 'User file.ts' }));
vi.mock('../../../utils/teamAnalytics', () => ({ trackTeamAnalyticsEvent: vi.fn() }));
vi.mock('../../UnifiedDiffHeader', () => ({ LexicalDiffHeaderAdapter: () => null }));
vi.mock('../../CustomEditors', () => ({ customEditorRegistry: { findRegistrationForFile: () => null } }));
vi.mock('../collabExtensionHost', () => ({
  createCollaborationContext: () => ({}), createCollabExtensionHost: mocks.createHost,
  createExtensionAwarenessBridge: () => ({ awareness: {}, destroy: vi.fn() }), notifyCollabStatus: vi.fn(),
}));
vi.mock('../UnifiedEditorHeaderBar', () => ({ UnifiedEditorHeaderBar: ({ extraActionItems }: { extraActionItems: Array<{ label: string; disabled: boolean; onClick: () => void }> }) => (
  <div>{extraActionItems.map(item => <button key={item.label} disabled={item.disabled} onClick={item.onClick}>{item.label}</button>)}</div>
) }));

import { store } from '@nimbalyst/runtime/store';
import { collabDocumentStateAtom } from '../../../store/atoms/collabEditor';
import { closeActiveTabRequestAtom } from '../../../store/atoms/appCommands';
import { CollaborativeTabEditor } from '../CollaborativeTabEditor';

const filePath = 'collab://org:team-a:doc:document-a';
const config = {
  workspacePath: '/fixture', orgId: 'team-a', documentId: 'document-a', title: 'User file.ts',
  accountId: 'account-a', userId: 'user-a', serverUrl: 'ws://unused', getJwt: async () => 'fixture',
  documentType: 'code', fileExtension: '.ts',
};

describe('collaborative tab localization', () => {
  beforeEach(() => {
    mocks.acquire.mockResolvedValue({
      release: mocks.release, discardLocalCopy: mocks.discard,
      replica: { wasHydratedFromStore: () => true, getState: () => 'ready', getOutboxState: () => 'clean', getYDoc: () => ({}) },
      syncProvider: { getStatus: () => 'connected', getYDoc: () => ({}), onAwarenessChange: () => () => {}, connect: mocks.connect },
    });
    vi.stubGlobal('electronAPI', { copyToClipboard: vi.fn(async () => {}), invoke: vi.fn(async () => ({ success: true })), documentSync: { closeDoc: vi.fn(async () => {}) } });
    store.set(closeActiveTabRequestAtom, 0);
  });
  afterEach(async () => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); await i18next.changeLanguage('en'); });

  const open = async () => {
    render(<Provider store={store}><CollaborativeTabEditor filePath={filePath} fileName="User file.ts" isActive collabConfig={config} /></Provider>);
    await screen.findByText('Fixture code editor');
  };

  it('changes menu language without recreating the provider, host, history registration or editor', async () => {
    await open();
    expect(mocks.acquire).toHaveBeenCalledOnce();
    expect(mocks.createHost).toHaveBeenCalledOnce();
    await waitFor(() => expect(mocks.registerHistory).toHaveBeenCalledOnce());
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByRole('button', { name: 'コピーを保存' }).hasAttribute('disabled')).toBe(false);
    expect(mocks.acquire).toHaveBeenCalledOnce();
    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(mocks.createHost).toHaveBeenCalledOnce();
    expect(mocks.registerHistory).toHaveBeenCalledOnce();
    expect(mocks.mounts).toHaveBeenCalledOnce();
    expect(mocks.unmounts).not.toHaveBeenCalled();
    expect(mocks.release).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'コピーを保存' }));
    await waitFor(() => expect(window.electronAPI.invoke).toHaveBeenCalledWith('document-sync:export-to-file', {
      documentType: 'code', defaultFileName: 'User file.ts', fileExtensions: ['.ts'], bytes: new TextEncoder().encode('const userContent = 1;'),
    }));
  });

  it('keeps discard confirmation authoritative and copies unsent content unchanged', async () => {
    await open();
    await act(async () => { await i18next.changeLanguage('ja'); });
    act(() => { store.set(collabDocumentStateAtom(filePath), { replica: 'ready', transport: 'disconnected', outbox: 'rejected' }); });
    fireEvent.click(screen.getByRole('button', { name: '現在のドキュメントをコピー' }));
    await waitFor(() => expect(window.electronAPI.copyToClipboard).toHaveBeenCalledWith('Unsent user content'));
    expect(mocks.showInfo).toHaveBeenCalledWith('現在のドキュメントをコピーしました', expect.any(String), { duration: 4000 });
    mocks.confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'ローカルコピーを破棄' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith({
      title: 'ローカルコピーを破棄しますか？', message: expect.stringContaining('元に戻せません'),
      confirmLabel: '破棄して閉じる', cancelLabel: 'ローカルコピーを保持', destructive: true,
    }));
    expect(mocks.discard).not.toHaveBeenCalled();
    expect(store.get(closeActiveTabRequestAtom)).toBe(0);
    mocks.confirm.mockResolvedValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'ローカルコピーを破棄' }));
    await waitFor(() => expect(mocks.discard).toHaveBeenCalledOnce());
    expect(store.get(closeActiveTabRequestAtom)).toBe(1);
  });
});
