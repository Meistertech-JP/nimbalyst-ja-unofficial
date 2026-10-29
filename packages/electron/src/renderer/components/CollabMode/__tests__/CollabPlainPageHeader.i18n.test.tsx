// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, expect, it, vi } from 'vitest';
import { atom } from 'jotai';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { CollabScope } from '@nimbalyst/collab-client/core';

vi.mock('../../../store/atoms/collabDocuments', () => ({
  getElectronCollabDocsSession: () => session,
}));
vi.mock('../../../services/ErrorNotificationService', () => ({
  errorNotificationService: { showError: vi.fn() },
}));
vi.mock('../useTitleHeading', () => ({ useHideTitleHeading: vi.fn() }));
vi.mock('@nimbalyst/collab-client/trackers-ui/page', async () => {
  const actual = await import('../../../../../../collab-client/src/trackers-ui/page/PageFacts');
  return {
    pageTimeFacts: actual.pageTimeFacts,
    PlainPageHeader: ({ facts }: { facts: Parameters<typeof actual.PageFacts>[0]['facts'] }) => (
      <actual.PageFacts facts={facts} />
    ),
  };
});

import { CollabPlainPageHeader } from '../CollabPlainPageHeader';

const now = Date.UTC(2026, 9, 30, 12);
const session = {
  atoms: {
    allSharedDocuments: atom([{
      documentId: 'doc-1', title: 'User page', documentType: 'markdown',
      createdAt: now - 60 * 60_000, updatedAt: now - 2 * 60_000,
    }]),
    pageFields: atom(false),
  },
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('localizes page facts at the desktop host and updates them when the language changes', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(now);
  const i18n = await createI18nInstance('ja');
  render(<I18nextProvider i18n={i18n}>
    <CollabPlainPageHeader scope={{} as CollabScope} documentId="doc-1" />
  </I18nextProvider>);

  expect(screen.getByText('更新日時').textContent).toBe('更新日時');
  expect(screen.getByText('作成日時').textContent).toBe('作成日時');
  expect(screen.getByText('2分前').textContent).toBe('2分前');
  const createdDate = new Date(now - 60 * 60_000);
  expect(screen.getByText(createdDate.toLocaleDateString('ja')).textContent)
    .toBe(createdDate.toLocaleDateString('ja'));

  await act(async () => { await i18n.changeLanguage('en'); });
  expect(screen.getByText('Updated').textContent).toBe('Updated');
  expect(screen.getByText('Created').textContent).toBe('Created');
  expect(screen.getByText('2m ago').textContent).toBe('2m ago');
  expect(screen.getByText(createdDate.toLocaleDateString('en')).textContent)
    .toBe(createdDate.toLocaleDateString('en'));
  await act(async () => { await i18n.changeLanguage('ja'); });
  expect(screen.getByText('更新日時').textContent).toBe('更新日時');
  expect(screen.getByText('作成日時').textContent).toBe('作成日時');
  expect(screen.getByText('2分前').textContent).toBe('2分前');
});
