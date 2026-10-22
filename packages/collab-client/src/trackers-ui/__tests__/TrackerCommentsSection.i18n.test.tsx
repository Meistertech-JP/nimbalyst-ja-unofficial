// @vitest-environment jsdom

import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { TrackerCommentsSection } from '../TrackerCommentsSection';

afterEach(cleanup);

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('TrackerCommentsSection localization', () => {
  it('localizes a server rejection and restores the rejected draft with server detail intact', async () => {
    const mutate = vi.fn().mockResolvedValue({ clientMutationId: 'mutation-1' });
    const props = {
      identity: null,
      mutate,
      formatTimestamp: () => 'now',
      collapsedComposer: false,
    };
    const { rerender } = render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <TrackerCommentsSection {...props} />
      </UiLanguageProvider>,
    );

    fireEvent.change(screen.getByTestId('tracker-comment-input'), { target: { value: 'Needs approval' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '投稿' }));
    });
    await waitFor(() => expect(mutate).toHaveBeenCalledOnce());

    rerender(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <TrackerCommentsSection
          {...props}
          mutationRejection={{
            workspacePath: '/workspace',
            itemId: 'item-1',
            clientMutationId: 'mutation-1',
            code: 'forbidden',
            message: 'Request blocked by policy.',
          }}
        />
      </UiLanguageProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('変更を取り消しました。 この変更を行う権限がありません。 Request blocked by policy.');
    });
    expect((screen.getByTestId('tracker-comment-input') as HTMLInputElement).value).toBe('Needs approval');
  });
});
