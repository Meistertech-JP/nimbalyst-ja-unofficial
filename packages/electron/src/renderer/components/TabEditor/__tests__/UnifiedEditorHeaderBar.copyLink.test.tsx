// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';
import { getDefaultFrontmatterForType } from '@nimbalyst/runtime';
import { UnifiedEditorHeaderBar } from '../UnifiedEditorHeaderBar';

const { buildSharedDocumentDeepLink, copyToClipboard } = vi.hoisted(() => ({
  buildSharedDocumentDeepLink: vi.fn((documentId: string, orgId: string) =>
    `nimbalyst://doc/${encodeURIComponent(documentId)}?orgId=${encodeURIComponent(orgId)}`),
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@nimbalyst/runtime', () => ({
  $convertToEnhancedMarkdownString: vi.fn(),
  $convertFromEnhancedMarkdownString: vi.fn(),
  getEditorTransformers: vi.fn(() => []),
  wrapWithPrintStyles: vi.fn(),
  applyTrackerTypeToMarkdown: vi.fn(),
  getDefaultFrontmatterForType: vi.fn(),
  getModelDefaults: vi.fn(() => ({})),
  getCurrentTrackerTypeFromMarkdown: vi.fn(() => null),
  removeTrackerTypeFromMarkdown: vi.fn(),
  copyToClipboard,
  ProviderIcon: () => null,
}));

vi.mock('../../../store', async () => {
  const { atom } = await import('jotai');
  return { historyDialogFileAtom: atom<string | null>(null) };
});

vi.mock('../../../store/atoms/collabDocuments', async () => {
  const { atom } = await import('jotai');
  return {
    sharedDocumentsAtom: atom([]),
    pendingCollabDocumentAtom: atom(null),
    activeTeamOrgIdAtom: atom(null),
    buildSharedDocumentDeepLink,
  };
});

vi.mock('../../../store/atoms/windowMode', async () => {
  const { atom } = await import('jotai');
  return { setWindowModeAtom: atom(null, () => undefined) };
});

vi.mock('../../../services/RendererDocumentService', () => ({
  getDocumentService: vi.fn(() => ({ notifyFrontmatterChanged: vi.fn() })),
}));

vi.mock('../../CommonFileActions', () => ({ CommonFileActions: () => null }));
vi.mock('../../common/FilePathBreadcrumb', () => ({ FilePathBreadcrumb: () => null }));
vi.mock('../../../dialogs', () => ({
  dialogRef: { current: null },
  DIALOG_IDS: {},
}));
vi.mock('../../CollabMode/collabTree', () => ({
  getCollabNodeName: vi.fn(),
  getCollabParentPath: vi.fn(),
  normalizeCollabPath: vi.fn(),
}));

vi.mock('../../../hooks/useFloatingMenu', async () => {
  const ReactModule = await import('react');
  return {
    FloatingPortal: ({ children }: { children: React.ReactNode }) => children,
    useFloatingMenu: () => {
      const [isOpen, setIsOpen] = ReactModule.useState(false);
      return {
        isOpen,
        setIsOpen,
        refs: { setReference: () => undefined, setFloating: () => undefined },
        floatingStyles: {},
        getReferenceProps: () => ({}),
        getFloatingProps: () => ({}),
      };
    },
  };
});

vi.mock('../../../hooks/useCollabLocalOrigin', () => ({
  useLocalFileSharedDocLink: () => ({
    binding: null,
    busyAction: null,
    loading: false,
    refresh: vi.fn(),
    reuploadToSharedDoc: vi.fn(),
  }),
}));

afterEach(async () => {
  cleanup();
  buildSharedDocumentDeepLink.mockClear();
  copyToClipboard.mockClear();
  vi.unstubAllGlobals();
  await i18next.changeLanguage('en');
});

const lexicalEditor = {
  getEditorState: () => ({ read: vi.fn() }),
  registerUpdateListener: () => vi.fn(),
  getElementByKey: () => null,
  update: vi.fn(),
};

describe('UnifiedEditorHeaderBar shared document link', () => {
  it('translates PDF failure guidance but preserves the diagnostic and export options', async () => {
    const api = {
      showSaveDialogPdf: vi.fn(async () => '/fixture/User doc.pdf'),
      exportHtmlToPdf: vi.fn(async () => ({ success: false, error: 'E_EXPORT_DENIED' })),
      showErrorDialog: vi.fn(),
    };
    vi.stubGlobal('electronAPI', api);
    render(<UnifiedEditorHeaderBar filePath="/fixture/User doc.md" fileName="User doc.md" isMarkdown lexicalEditor={lexicalEditor} />);
    await act(async () => { await i18next.changeLanguage('ja'); });
    fireEvent.click(screen.getByTitle('その他の操作'));
    fireEvent.click(screen.getByRole('button', { name: 'PDFにエクスポート…' }));
    await waitFor(() => expect(api.showErrorDialog).toHaveBeenCalledWith('エクスポートに失敗しました', 'PDFをエクスポートできませんでした: E_EXPORT_DENIED'));
    expect(api.showSaveDialogPdf).toHaveBeenCalledWith({ defaultPath: 'User doc.pdf' });
    expect(api.exportHtmlToPdf).toHaveBeenCalledWith({ html: '', outputPath: '/fixture/User doc.pdf', pageSize: 'Letter', generateDocumentOutline: true, generateTaggedPDF: true });
  });

  it('translates built-in document types without changing their stored identifiers', async () => {
    render(<UnifiedEditorHeaderBar filePath="/fixture/User doc.md" fileName="User doc.md" isMarkdown lexicalEditor={lexicalEditor} />);
    await act(async () => { await i18next.changeLanguage('ja'); });
    fireEvent.click(screen.getByTitle('その他の操作'));
    fireEvent.mouseEnter(screen.getByText('ドキュメント種別を設定').parentElement!);
    expect(screen.getByText('決定事項')).toBeTruthy();
    fireEvent.click(screen.getByText('計画'));
    expect(getDefaultFrontmatterForType).toHaveBeenCalledWith('plan');
  });

  it('shows and copies the canonical deep link for an open collaborative document', async () => {
    render(
      <UnifiedEditorHeaderBar
        filePath="collab://org:team%20one:doc:doc/one"
        fileName="Shared doc"
        workspaceId="/workspace"
        isMarkdown
        lexicalEditor={lexicalEditor}
        showShareLinkButton={false}
        showSharedDocButton={false}
        showCommonFileActions={false}
        sharedDocumentLinkTarget={{ documentId: 'doc/one', orgId: 'team one' }}
      />,
    );

    fireEvent.click(screen.getByTitle('More actions'));

    const copyLink = screen.getByRole('button', { name: 'Copy link' });
    const copyMarkdown = screen.getByRole('button', { name: 'Copy as Markdown' });
    expect(copyLink.nextElementSibling).toBe(copyMarkdown);
    expect(buildSharedDocumentDeepLink).toHaveBeenCalledWith('doc/one', 'team one');

    fireEvent.click(copyLink);

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith(
        'nimbalyst://doc/doc%2Fone?orgId=team%20one',
      );
    });
  });

  it('hides Copy link when no shared-document link is available', () => {
    render(
      <UnifiedEditorHeaderBar
        filePath="/workspace/local.md"
        fileName="local.md"
        workspaceId="/workspace"
        isMarkdown
        lexicalEditor={lexicalEditor}
        showShareLinkButton={false}
        showSharedDocButton={false}
        showCommonFileActions={false}
      />,
    );

    fireEvent.click(screen.getByTitle('More actions'));

    expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy as Markdown' })).toBeTruthy();
  });
});
