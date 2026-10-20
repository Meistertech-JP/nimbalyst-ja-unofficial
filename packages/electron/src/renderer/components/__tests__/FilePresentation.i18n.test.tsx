// @vitest-environment jsdom
import React from 'react';
import { Provider, createStore } from 'jotai';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';
import { FilePathBreadcrumb } from '../common/FilePathBreadcrumb';
import { ImageViewer } from '../ImageViewer';
import { openFileRequestAtom, revealFileAtom, revealFolderAtom, setWindowModeAtom } from '../../store';

const assetUrl = vi.hoisted(() => vi.fn((path: string) => `fixture://${path}`));
vi.mock('../../utils/assetUrl', () => ({ nimAssetUrl: assetUrl }));
vi.mock('../../store', async () => {
  const { atom } = await import('jotai');
  return { openFileRequestAtom: atom(null), revealFileAtom: atom(null), revealFolderAtom: atom(null), setWindowModeAtom: atom(null) };
});
vi.mock('@nimbalyst/runtime/ui/AgentTranscript/components/ZoomableImageSurface', () => ({
  ZoomableImageSurface: ({ src, alt, onImageError }: { src: string; alt: string; onImageError: () => void }) => <img src={src} alt={alt} onError={onImageError} />,
}));

describe('file presentation localization', () => {
  afterEach(async () => { cleanup(); assetUrl.mockClear(); await i18next.changeLanguage('en'); });

  it('translates breadcrumb tooltips without changing folder or file navigation targets', async () => {
    const store = createStore();
    render(<Provider store={store}><FilePathBreadcrumb filePath={'F:\\work\\User folder\\User file.ts'} workspacePath={'F:\\work'} /></Provider>);
    await act(async () => { await i18next.changeLanguage('ja'); });
    fireEvent.click(screen.getByTitle('ファイルツリーで「User folder」へ移動'));
    expect(store.get(revealFolderAtom)).toBe('F:/work/User folder');
    expect(store.get(setWindowModeAtom)).toBe('files');
    fireEvent.click(screen.getByTitle('ファイルツリーで「User file.ts」へ移動'));
    expect(store.get(openFileRequestAtom)).toEqual({ path: 'F:\\work\\User folder\\User file.ts', ts: expect.any(Number) });
    expect(store.get(revealFileAtom)).toBe('F:\\work\\User folder\\User file.ts');
  });

  it('translates an existing image error without reloading the image or altering its name', async () => {
    render(<ImageViewer filePath="file:///workspace/User image.png" fileName="User image.png" />);
    fireEvent.error(screen.getByAltText('User image.png'));
    expect(screen.getByText('Failed to load image')).toBeTruthy();
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText(i18next.t('common:image_viewer.load_failed'))).toBeTruthy();
    expect(screen.queryByText('Failed to load image')).toBeNull();
    expect(screen.getByText('User image.png')).toBeTruthy();
    expect(assetUrl).toHaveBeenCalledExactlyOnceWith('/workspace/User image.png');
  });
});
