// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { MediaViewerEditor } from '../MediaViewerEditor';

afterEach(cleanup);

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

function renderJapanese(host: { getAssetUrl: () => string | null }) {
  return render(
    <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
      <MediaViewerEditor host={host as never} />
    </UiLanguageProvider>,
  );
}

describe('media viewer localization', () => {
  it('explains when a video is not backed by a disk file', () => {
    renderJapanese({ getAssetUrl: () => null });

    expect(screen.getByText('この動画はここでは再生できません。').textContent).toBe('この動画はここでは再生できません。');
    expect(screen.getByText('ディスク上のファイルに紐付いていません。').textContent).toBe('ディスク上のファイルに紐付いていません。');
  });

  it('shows the localized recovery explanation after video playback fails', () => {
    renderJapanese({ getAssetUrl: () => 'asset://recording' });
    const video = document.querySelector('video');
    if (!video) throw new Error('Expected the media viewer to render a video element.');

    fireEvent.error(video);

    expect(screen.getByText('この動画を再生できませんでした。').textContent).toBe('この動画を再生できませんでした。');
    expect(screen.getByText('ファイルが不完全か、このビルドでデコードできない形式の可能性があります。').textContent)
      .toBe('ファイルが不完全か、このビルドでデコードできない形式の可能性があります。');
  });
});
