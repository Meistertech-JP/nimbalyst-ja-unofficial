// @vitest-environment jsdom

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageDiffViewer } from '../HistoryDialog/ImageDiffViewer';

vi.mock('../../utils/assetUrl', () => ({
  nimAssetUrl: (path: string) => path,
}));

describe('ImageDiffViewer localization', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('en');
  });

  afterEach(async () => {
    cleanup();
    await i18next.changeLanguage('en');
  });

  it('updates controls and image alternatives when the UI language changes', async () => {
    render(
      <ImageDiffViewer
        oldImagePath="/workspace/old.png"
        newImagePath="/workspace/new.png"
        filePath="/workspace/image.png"
      />,
    );

    expect(screen.getByRole('button', { name: 'Side by Side' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Swipe' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Overlay' })).toBeTruthy();
    expect(screen.getByAltText('Old Version')).toBeTruthy();
    expect(screen.getByAltText('New Version')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Swipe' }));
    expect(screen.getByText('Position')).toBeTruthy();

    await act(async () => {
      await i18next.changeLanguage('ja');
    });

    expect(screen.getByRole('button', { name: '左右比較' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'スワイプ' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'オーバーレイ' })).toBeTruthy();
    expect(screen.getByText('位置')).toBeTruthy();
    expect(screen.getByAltText('旧バージョン')).toBeTruthy();
    expect(screen.getByAltText('新バージョン')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'オーバーレイ' }));
    expect(screen.getByText('不透明度')).toBeTruthy();
  });
});
