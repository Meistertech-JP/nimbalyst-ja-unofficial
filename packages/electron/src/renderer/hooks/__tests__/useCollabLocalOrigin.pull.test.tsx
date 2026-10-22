// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type React from 'react';

const { documentModelRegistry, errorNotificationService, requestConfirmation } = vi.hoisted(() => ({
  documentModelRegistry: { get: vi.fn() },
  requestConfirmation: vi.fn(),
  errorNotificationService: {
    showError: vi.fn(),
    showInfo: vi.fn(),
  },
}));

vi.mock('../../services/document-model/DocumentModelRegistry', () => ({
  DocumentModelRegistry: documentModelRegistry,
}));

vi.mock('../../services/ErrorNotificationService', () => ({
  errorNotificationService,
}));

vi.mock('../../dialogs/requestConfirmation', () => ({
  requestConfirmation,
}));

vi.mock('../../store/atoms/collabDocuments', () => ({
  getTeamSyncProviderForScopeKey: vi.fn(() => null),
}));

import { useLocalFileSharedDocLink } from '../useCollabLocalOrigin';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

function renderLocalizedHook<T>(callback: () => T, locale: 'en' | 'ja' = 'en') {
  const i18n = locale === 'ja' ? japaneseI18n : englishI18n;
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <UiLanguageProvider i18n={i18n} preference={locale} systemLocale="en-US">
      {children}
    </UiLanguageProvider>
  );
  return renderHook(callback, { wrapper: Wrapper });
}

const binding = {
  orgId: 'org-1',
  documentId: 'doc-1',
  gitRemoteHash: null,
  workspacePathHash: null,
  relativePath: 'local.md',
  documentType: 'markdown',
  sourceBasename: 'local.md',
  lastLocalContentHash: 'local-hash',
  lastCollabContentHash: 'shared-hash',
  lastSyncedAt: null,
  lastSeenMtimeMs: null,
  lastSeenSizeBytes: null,
  resolutionStatus: 'resolved' as const,
  resolutionError: null,
  createdAt: '2026-08-07T12:00:00.000Z',
  updatedAt: '2026-08-07T12:00:00.000Z',
  resolvedPath: '/workspace/local.md',
};

describe('useLocalFileSharedDocLink pull', () => {
  const findLocalOriginLink = vi.fn();
  const pullLocalOrigin = vi.fn();

  beforeEach(() => {
    findLocalOriginLink.mockResolvedValue({ success: true, binding });
    pullLocalOrigin.mockResolvedValue({ success: true, status: 'pulled', binding });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        documentSync: { findLocalOriginLink, pullLocalOrigin },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('flushes a dirty editor before contacting the pull service', async () => {
    const flushDirtyEditors = vi.fn().mockResolvedValue(undefined);
    const isDirty = vi.fn()
      .mockReturnValueOnce(true)
      .mockReturnValue(false);
    documentModelRegistry.get.mockReturnValue({ isDirty, flushDirtyEditors });

    const { result } = renderLocalizedHook(() => (
      useLocalFileSharedDocLink('/workspace', '/workspace/local.md')
    ));
    await waitFor(() => expect(result.current.binding?.documentId).toBe('doc-1'));

    let pulled = false;
    await act(async () => {
      pulled = await result.current.pullFromSharedDoc();
    });

    expect(pulled).toBe(true);
    expect(flushDirtyEditors).toHaveBeenCalledTimes(1);
    expect(pullLocalOrigin).toHaveBeenCalledWith({
      workspacePath: '/workspace',
      documentId: 'doc-1',
    });
    expect(flushDirtyEditors.mock.invocationCallOrder[0]).toBeLessThan(
      pullLocalOrigin.mock.invocationCallOrder[0],
    );
  });

  it('aborts without IPC when the editor remains dirty after flushing', async () => {
    const flushDirtyEditors = vi.fn().mockResolvedValue(undefined);
    documentModelRegistry.get.mockReturnValue({
      isDirty: vi.fn(() => true),
      flushDirtyEditors,
    });

    const { result } = renderLocalizedHook(() => (
      useLocalFileSharedDocLink('/workspace', '/workspace/local.md')
    ));
    await waitFor(() => expect(result.current.binding?.documentId).toBe('doc-1'));

    let pulled = true;
    await act(async () => {
      pulled = await result.current.pullFromSharedDoc();
    });

    expect(pulled).toBe(false);
    expect(flushDirtyEditors).toHaveBeenCalledTimes(1);
    expect(pullLocalOrigin).not.toHaveBeenCalled();
    expect(errorNotificationService.showError).toHaveBeenCalledWith(
      'Pull failed',
      'Save the local file before pulling from the shared document.',
    );
  });

  it('overwrites the local file on a pull conflict only after the user confirms', async () => {
    documentModelRegistry.get.mockReturnValue(null);
    const conflict = { success: false, status: 'conflict', conflictKind: 'diverged', conflictToken: 'tok-1' };

    const { result } = renderLocalizedHook(() => (
      useLocalFileSharedDocLink('/workspace', '/workspace/local.md')
    ));
    await waitFor(() => expect(result.current.binding?.documentId).toBe('doc-1'));

    pullLocalOrigin.mockResolvedValueOnce(conflict);
    requestConfirmation.mockResolvedValueOnce(false);
    let pulled = true;
    await act(async () => {
      pulled = await result.current.pullFromSharedDoc();
    });
    expect(pulled).toBe(false);
    expect(pullLocalOrigin).toHaveBeenCalledTimes(1);

    pullLocalOrigin.mockClear();
    pullLocalOrigin.mockResolvedValueOnce(conflict);
    requestConfirmation.mockResolvedValueOnce(true);
    await act(async () => {
      pulled = await result.current.pullFromSharedDoc();
    });
    expect(pulled).toBe(true);
    expect(pullLocalOrigin).toHaveBeenLastCalledWith({
      workspacePath: '/workspace',
      documentId: 'doc-1',
      forceOverwriteLocal: true,
      conflictToken: 'tok-1',
    });
  });

  it('localizes the pull conflict confirmation while preserving dynamic file data', async () => {
    documentModelRegistry.get.mockReturnValue(null);
    const conflict = { success: false, status: 'conflict', conflictKind: 'diverged', conflictToken: 'tok-ja' };
    pullLocalOrigin.mockResolvedValueOnce(conflict);
    requestConfirmation.mockResolvedValueOnce(false);

    const { result } = renderLocalizedHook(() => (
      useLocalFileSharedDocLink('/workspace', '/workspace/local.md')
    ), 'ja');
    await waitFor(() => expect(result.current.binding?.documentId).toBe('doc-1'));

    await act(async () => {
      await result.current.pullFromSharedDoc();
    });

    expect(requestConfirmation).toHaveBeenCalledWith({
      title: 'ローカルファイルを上書きしますか？',
      message: 'ローカルファイルと共有ドキュメントの両方が変更されています。 共有ドキュメントでローカルファイル全体を置き換えます。続行しますか？',
      confirmLabel: '上書き',
      destructive: true,
    });
  });
});
