// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { store } from '@nimbalyst/runtime/store';
import { ImageViewer } from '../ImageViewer';
import { activeFileReconciliations, fileChangedOnDiskAtomFamily, fileReconciliationAtomFamily } from '../../store/atoms/fileWatch';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

vi.mock('@nimbalyst/runtime/ui/AgentTranscript/components/ZoomableImageSurface', () => ({
  ZoomableImageSurface: ({ src, alt, onImageError }: any) => <img src={src} alt={alt} onError={onImageError} />,
}));
vi.mock('../../services/ErrorNotificationService', () => ({
  errorNotificationService: { showWarning: vi.fn() },
}));

const invoke = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
  invoke.mockClear();
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke } });
});
afterEach(cleanup);

async function renderJapaneseViewer() {
  const i18n = await createI18nInstance('ja');
  return render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <ImageViewer filePath="/workspace/image.png" fileName="image.png" />
    </UiLanguageProvider>,
  );
}

it('refreshes the same image path on disk events and recovers a failed load', async () => {
  await renderJapaneseViewer();
  const original = screen.getByRole('img').getAttribute('src');
  await act(async () => store.set(fileChangedOnDiskAtomFamily('/workspace/image.png'), v => v + 1));
  const updated = screen.getByRole('img').getAttribute('src');
  expect(updated).not.toBe(original);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByText('画像の読み込みに失敗しました')).toBeDefined();
  await act(async () => store.set(fileChangedOnDiskAtomFamily('/workspace/image.png'), v => v + 1));
  expect(screen.getByRole('img').getAttribute('src')).not.toBe(updated);
});

it('refreshes after missed native events and releases registrations on path change and unmount', async () => {
  const i18n = await createI18nInstance('ja');
  const { rerender, unmount } = render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <ImageViewer filePath="/workspace/first.png" fileName="first.png" />
    </UiLanguageProvider>,
  );
  const registration = invoke.mock.calls.find(([channel]) => channel === 'file:register-open');
  expect(registration).toBeDefined();
  const token = registration![1];
  const original = screen.getByRole('img').getAttribute('src');
  await act(async () => store.set(fileReconciliationAtomFamily(token), { status: 'changed' }));
  expect(screen.getByRole('img').getAttribute('src')).not.toBe(original);
  rerender(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <ImageViewer filePath="/workspace/second.png" fileName="second.png" />
    </UiLanguageProvider>,
  );
  expect(invoke).toHaveBeenCalledWith('file:unregister-open', token);
  expect(activeFileReconciliations.has(token)).toBe(false);
  const second = screen.getByRole('img').getAttribute('src');
  await act(async () => store.set(fileChangedOnDiskAtomFamily('/workspace/first.png'), v => v + 1));
  expect(screen.getByRole('img').getAttribute('src')).toBe(second);
  const secondToken = invoke.mock.calls.filter(([channel]) => channel === 'file:register-open').at(-1)![1];
  unmount();
  expect(activeFileReconciliations.has(secondToken)).toBe(false);
  expect(invoke).toHaveBeenCalledWith('file:unregister-open', secondToken);
});
