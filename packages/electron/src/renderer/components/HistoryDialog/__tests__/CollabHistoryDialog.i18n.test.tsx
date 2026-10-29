// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { CollabHistoryController } from '@nimbalyst/collab-client/docs-ui/history';
import type { DocRevisionMetadata } from '@nimbalyst/collab-protocol';

vi.mock('@nimbalyst/runtime/sync', () => ({ previewRevisionSnapshot: vi.fn() }));
vi.mock('@nimbalyst/runtime/store', async () => {
  const { atom } = await import('jotai');
  return { themeIdAtom: atom('dark') };
});
vi.mock('../../../store/atoms/collabHistoryControllers', async () => {
  const { atom } = await import('jotai');
  return { collabHistoryControllerAtom: atom(() => () => controller) };
});
vi.mock('../DiffPreviewEditor', () => ({ DiffPreviewEditor: () => null }));
vi.mock('../TextDiffViewer', () => ({ TextDiffViewer: () => null }));

import { CollabHistoryDialog } from '../CollabHistoryDialog';

const now = Date.UTC(2026, 9, 30, 12);
const revision = (revisionId: string, createdAt: number): DocRevisionMetadata => ({
  revisionId, revisionKind: 'manual', editorType: 'markdown', contentFormat: 'markdown',
  contentHash: `${revisionId}-hash`, payloadBytes: 10, createdAt, createdBy: 'member-1',
  basisSequence: 1, parentRevisionId: null, restoredFromRevisionId: null,
});
const controller: CollabHistoryController = {
  client: {
    listRevisions: vi.fn(async () => ({
      revisions: [revision('recent', now - 20_000), revision('earlier', now - 5 * 60_000)],
      cursor: null,
    })),
    loadRevision: vi.fn(),
    createRevision: vi.fn(),
  },
  editorType: 'markdown', contentFormat: 'markdown',
  getBasisSequence: () => 1, getStatus: () => 'connected',
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('keeps shared history relative times localized through the desktop host during language changes', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(now);
  const i18n = await createI18nInstance('ja');
  render(<I18nextProvider i18n={i18n}>
    <CollabHistoryDialog collabUri="collab://test/doc" onClose={vi.fn()} />
  </I18nextProvider>);
  expect((await screen.findByText('たった今')).textContent).toBe('たった今');
  expect(screen.getByText(new Intl.RelativeTimeFormat('ja', { numeric: 'auto' }).format(-5, 'minute')).textContent)
    .toBe(new Intl.RelativeTimeFormat('ja', { numeric: 'auto' }).format(-5, 'minute'));

  await act(async () => { await i18n.changeLanguage('en'); });
  expect(screen.getByText('Just now').textContent).toBe('Just now');
  expect(screen.getByText(new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-5, 'minute')).textContent)
    .toBe(new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-5, 'minute'));
  await act(async () => { await i18n.changeLanguage('ja'); });
  expect(screen.getByText('たった今').textContent).toBe('たった今');
  expect(screen.getByText(new Intl.RelativeTimeFormat('ja', { numeric: 'auto' }).format(-5, 'minute')).textContent)
    .toBe(new Intl.RelativeTimeFormat('ja', { numeric: 'auto' }).format(-5, 'minute'));
  expect(controller.client.listRevisions).toHaveBeenCalledTimes(1);
});
