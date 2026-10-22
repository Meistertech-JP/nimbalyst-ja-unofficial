// @vitest-environment jsdom
import React from 'react';
import { Provider, createStore } from 'jotai';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { projectStateAtom } from '../../../store/atoms/projectState';
import { FileGutter } from '../FileGutter';

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: ({ icon, title }: { icon: string; title?: string }) => <span data-icon={icon} title={title} />,
  buildFileDirectoryTree: vi.fn(),
  getFileDirectoryPaths: vi.fn(),
  getWorkspaceRelativeFilePath: (filePath: string) => filePath,
}));

vi.mock('../../../utils/pathUtils', () => ({ getFileName: (filePath: string) => filePath.split('/').pop() }));
vi.mock('../../../services/sessionFilesLoader', () => ({
  loadSessionFilesResult: async () => ({
    success: true,
    files: [{ filePath: '/workspace/example.ts', metadata: { operation: 'edit' } }],
  }),
}));

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(cleanup);

describe('FileGutter localization', () => {
  it('localizes section, review status, and directory controls with accessible names', async () => {
    const store = createStore();
    store.set(projectStateAtom, {
      ...store.get(projectStateAtom),
      diffTree: { groupByDirectory: false },
    });

    render(
      <Provider store={store}>
        <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
          <FileGutter
            sessionId="session-1"
            workspacePath="/workspace"
            type="edited"
            pendingReviewFiles={new Set(['/workspace/example.ts'])}
          />
        </UiLanguageProvider>
      </Provider>,
    );

    await waitFor(() => screen.getByText('example.ts'));
    screen.getByText('編集済み');
    expect(screen.getByTitle('レビュー待ち')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ディレクトリでグループ化' }).getAttribute('aria-pressed')).toBe('false');
    expect((screen.getByRole('button', { name: 'すべて展開' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'すべて折りたたむ' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
