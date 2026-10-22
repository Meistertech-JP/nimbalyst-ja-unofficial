// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

import { DownloadProgressToast } from '../DownloadProgressToast';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

afterEach(() => cleanup());

describe('DownloadProgressToast', () => {
  it('renders download progress and remaining-time labels in English', () => {
    const { rerender } = render(
      <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
        <DownloadProgressToast
          version="1.2.3"
          progress={{ bytesPerSecond: 1024, percent: 25, transferred: 256, total: 1024 }}
          onCancel={vi.fn()}
        />
      </UiLanguageProvider>,
    );

    screen.getByText('Downloading Nimbalyst 1.2.3…');
    screen.getByText('256.00 B of 1.00 KB');
    screen.getByText('Less than 1 minute remaining');
    screen.getByRole('button', { name: 'Cancel' });

    rerender(
      <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
        <DownloadProgressToast
          version="1.2.3"
          progress={{ bytesPerSecond: 1, percent: 25, transferred: 0, total: 120 }}
          onCancel={vi.fn()}
        />
      </UiLanguageProvider>,
    );
    screen.getByText('About 2 minutes remaining');
  });

  it('renders the initial and active download states in Japanese and cancels', () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="en-US">
        <DownloadProgressToast version="1.2.3" progress={null} onCancel={onCancel} />
      </UiLanguageProvider>,
    );

    screen.getByText('ダウンロードを開始中…');
    screen.getByText('準備中…');
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="en-US">
        <DownloadProgressToast
          version="1.2.3"
          progress={{ bytesPerSecond: 1024, percent: 25, transferred: 256, total: 1024 }}
          onCancel={onCancel}
        />
      </UiLanguageProvider>,
    );

    screen.getByText('Nimbalyst 1.2.3をダウンロード中…');
    screen.getByText('256.00 B / 1.00 KB');
    screen.getByText('残り1分未満');
  });
});
