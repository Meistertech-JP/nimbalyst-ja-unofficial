// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';

const state = vi.hoisted(() => ({
  documents: [{ documentId: 'doc-1', title: 'Page', documentType: 'markdown' }],
}));

vi.mock('jotai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jotai')>();
  return {
    ...actual,
    useAtomValue: () => state.documents,
    useSetAtom: () => vi.fn(),
  };
});
vi.mock('@nimbalyst/collab-client/trackers-ui/page', () => ({
  PageHeaderBar: ({ section }: { section: string }) => <div data-testid="page-header-section">{section}</div>,
}));
vi.mock('../../../store/atoms/collabDocuments', () => ({
  getPersonalCollabDocsSession: () => ({}),
  getPersonalCollabHost: () => ({ scope: {} }),
  personalPagesDocumentsAtomFamily: () => ({}),
  resolveDesktopCollabScope: async () => ({ scope: null }),
}));
vi.mock('../../../store/atoms/historyDialog', () => ({ historyDialogFileAtom: {} }));
vi.mock('../../TabEditor/editorExport', () => ({ editorExportMenuItems: () => [] }));
vi.mock('../PersonalPageBodyEditor', () => ({ PersonalPageBodyEditor: () => null, personalPageDocumentPath: () => '' }));
vi.mock('../PersonalExtensionPageBody', () => ({ PersonalExtensionPageBody: () => null }));
vi.mock('../CollabPlainPageHeader', () => ({ CollabPlainPageHeader: () => null }));
vi.mock('../../TabEditor/HeaderTableOfContents', () => ({ HeaderTableOfContents: () => null }));
vi.mock('../pageHeaderNavigation', () => ({ openPageAncestor: vi.fn() }));
vi.mock('../useSharedPagePath', () => ({ useSharedPagePath: () => ({ path: [], title: 'Page' }) }));
vi.mock('../usePageMenuItems', () => ({ usePageMenuItems: () => [] }));

import { PersonalPageTab } from '../PersonalPageTab';

afterEach(cleanup);

it('localizes the personal-page header section', async () => {
  const i18n = await createI18nInstance('ja');

  render(
    <I18nextProvider i18n={i18n}>
      <PersonalPageTab documentId="doc-1" workspacePath="/workspace" fallbackTitle="Page" />
    </I18nextProvider>,
  );

  expect(screen.getByTestId('page-header-section').textContent).toBe('個人');
});
