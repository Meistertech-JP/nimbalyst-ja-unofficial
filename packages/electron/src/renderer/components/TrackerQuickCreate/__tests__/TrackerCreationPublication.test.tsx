// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  creationPublicationAtom,
  creationPublicationKey,
  publishCreatedTrackerItem,
  TrackerCreationPublication,
} from '../TrackerCreationPublication';
afterEach(cleanup);
it('renders publication status and actions in Japanese', async () => {
  const i18n = await createI18nInstance('ja');
  const store = createStore();
  const target = creationPublicationAtom(
    creationPublicationKey('/test', 'item'),
  );
  store.set(target, {
    busy: false,
    value: { itemId: 'item', status: 'pending', savedContent: 'Saved body' },
  });
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: { documentService: { getTrackerCreationStatus: vi.fn().mockResolvedValue(null) } },
  });
  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <Provider store={store}>
        <TrackerCreationPublication workspacePath="/test" itemId="item" />
      </Provider>
    </UiLanguageProvider>,
  );
  expect(screen.getByText('ローカルに保存しました。チームへの公開は保留中です。')).toBeDefined();
  screen.getByRole('button', { name: '公開を再試行' });
  screen.getByRole('button', { name: '保存済みの内容をコピー' });
});

it('does not replace successful publication with an older pending-status response', async () => {
  let finishStatus!: (value: unknown) => void;
  const publish = vi
    .fn()
    .mockResolvedValue({ itemId: 'item', status: 'published' });
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      documentService: {
        getTrackerCreationStatus: () =>
          new Promise((resolve) => {
            finishStatus = resolve;
          }),
        publishTrackerCreation: publish,
      },
    },
  });
  const store = createStore();
  const target = creationPublicationAtom(
    creationPublicationKey('/test', 'item'),
  );
  render(
    <Provider store={store}>
      <TrackerCreationPublication workspacePath="/test" itemId="item" />
    </Provider>,
  );
  await act(async () => {
    await publishCreatedTrackerItem(store, '/test', 'item');
  });
  await act(async () =>
    finishStatus({
      itemId: 'item',
      status: 'pending',
      savedContent: 'Old snapshot',
    }),
  );
  expect(store.get(target)).toEqual({
    busy: false,
    value: { itemId: 'item', status: 'published' },
  });
});
