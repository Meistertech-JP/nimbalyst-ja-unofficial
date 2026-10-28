import { describe, expect, it, vi } from 'vitest';
import { createMainI18nController } from '../../i18n/mainI18n';
import { describeWorkspaceFileOpenError } from '../workspaceFileOpenError';

describe('workspace file open error details', () => {
  it.each(['ja', 'en'] as const)('localizes only the non-Error fallback in %s', async (language) => {
    const controller = await createMainI18nController({
      get: () => language,
      subscribe: () => vi.fn(),
    }, language, () => {});

    try {
      expect(describeWorkspaceFileOpenError(undefined)).toBe(
        language === 'ja' ? 'ファイルを開けません' : 'Cannot Open File',
      );
      expect(describeWorkspaceFileOpenError(new Error('EACCES: C:\\example.md')))
        .toBe('EACCES: C:\\example.md');
    } finally {
      controller.dispose();
    }
  });
});
