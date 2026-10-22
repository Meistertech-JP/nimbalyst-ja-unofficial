// @vitest-environment jsdom
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { act, cleanup, renderHook } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/ErrorNotificationService', () => ({
  errorNotificationService: { showError: vi.fn() },
}));

import { errorNotificationService } from '../../services/ErrorNotificationService';
import { useArchiveWorktreeDialog } from '../useArchiveWorktreeDialog';

describe('useArchiveWorktreeDialog notifications', () => {
  let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

  beforeAll(async () => {
    japaneseI18n = await createI18nInstance('ja');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('localizes a fixed auto-archive rejection while preserving the fallback meaning', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        worktreeGetStatus: vi.fn().mockResolvedValue({
          success: true,
          status: {
            hasUncommittedChanges: false,
            modifiedFileCount: 0,
            isMerged: true,
            uniqueCommitsAhead: 0,
            commitsAhead: 0,
          },
        }),
        worktreeArchive: vi.fn().mockResolvedValue({ success: false }),
      },
    });

    const wrapper = ({ children }: React.PropsWithChildren) => (
      <I18nextProvider i18n={japaneseI18n}>{children}</I18nextProvider>
    );
    const { result } = renderHook(() => useArchiveWorktreeDialog(), { wrapper });

    await act(async () => {
      await result.current.showDialog({
        worktreeId: 'worktree-1',
        worktreeName: '日本語ワークツリー',
        worktreePath: '/workspace/.worktrees/feature',
        workspacePath: '/workspace',
      });
    });

    expect(errorNotificationService.showError).toHaveBeenCalledWith(
      '「日本語ワークツリー」のアーカイブに失敗しました',
      'バックエンドがアーカイブを拒否しました。',
    );
  });
});
