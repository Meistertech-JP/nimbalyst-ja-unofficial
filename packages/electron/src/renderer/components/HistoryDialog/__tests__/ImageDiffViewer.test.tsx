// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { ImageDiffViewer } from '../ImageDiffViewer';

vi.mock('../../../utils/assetUrl', () => ({ nimAssetUrl: (path: string) => path }));

afterEach(cleanup);

describe('ImageDiffViewer localization', () => {
  it.each([
    {
      language: 'en' as const,
      sideBySide: 'Side by Side',
      swipe: 'Swipe',
      overlay: 'Overlay',
      position: 'Position',
      opacity: 'Opacity',
      oldVersion: 'Old Version',
      newVersion: 'New Version',
    },
    {
      language: 'ja' as const,
      sideBySide: '左右比較',
      swipe: 'スワイプ',
      overlay: 'オーバーレイ',
      position: '位置',
      opacity: '不透明度',
      oldVersion: '旧バージョン',
      newVersion: '新バージョン',
    },
  ])('renders translated controls and image labels in $language', async (copy) => {
    const i18n = await createI18nInstance(copy.language);

    render(
      <UiLanguageProvider i18n={i18n} preference={copy.language} systemLocale="en-US">
        <ImageDiffViewer oldImagePath="old.png" newImagePath="new.png" filePath="image.png" />
      </UiLanguageProvider>,
    );

    expect(screen.getByRole('button', { name: copy.sideBySide }).textContent).toBe(copy.sideBySide);
    expect(screen.getByRole('button', { name: copy.swipe }).textContent).toBe(copy.swipe);
    expect(screen.getByRole('button', { name: copy.overlay }).textContent).toBe(copy.overlay);
    expect(screen.getByText(copy.oldVersion).textContent).toBe(copy.oldVersion);
    expect(screen.getByText(copy.newVersion).textContent).toBe(copy.newVersion);
    expect(screen.getByRole('img', { name: copy.oldVersion }).getAttribute('alt')).toBe(copy.oldVersion);
    expect(screen.getByRole('img', { name: copy.newVersion }).getAttribute('alt')).toBe(copy.newVersion);

    fireEvent.click(screen.getByRole('button', { name: copy.swipe }));
    expect(screen.getByText(copy.position).textContent).toBe(copy.position);
    expect(screen.getByRole('img', { name: copy.oldVersion }).getAttribute('alt')).toBe(copy.oldVersion);

    fireEvent.click(screen.getByRole('button', { name: copy.overlay }));
    expect(screen.getByText(copy.opacity).textContent).toBe(copy.opacity);
    expect(screen.getByRole('img', { name: copy.oldVersion }).getAttribute('alt')).toBe(copy.oldVersion);
  });
});
