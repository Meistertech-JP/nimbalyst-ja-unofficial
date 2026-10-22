// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { BrowserToolbar } from '../BrowserToolbar';
import { BrowserEditor } from '../BrowserEditor';
import { BrowserSessionEditor } from '../BrowserSessionEditor';

const browserClient = vi.hoisted(() => ({
  attachBrowserSession: vi.fn(),
  buildPreviewUrl: vi.fn(),
  createBrowserSession: vi.fn(),
  destroyBrowserSession: vi.fn(),
  getOrCreateSessionIdForHost: vi.fn(() => 'browser-session'),
  goBackBrowserSession: vi.fn(),
  goForwardBrowserSession: vi.fn(),
  navigateBrowserSession: vi.fn(),
  parseVirtualBrowserPath: vi.fn(() => ({
    tabId: 'tab-1',
    sessionId: 'browser-session',
    url: 'about:blank',
    title: 'New Tab',
  })),
  reloadBrowserSession: vi.fn(),
  setBrowserSessionBounds: vi.fn(),
  subscribeToExternalNav: vi.fn(() => () => {}),
  subscribeToStateChanges: vi.fn(() => () => {}),
  detachBrowserSession: vi.fn(),
}));

vi.mock('../../browserClient', () => ({
  ...browserClient,
  BROWSER_VIRTUAL_PREFIX: 'virtual://com.nimbalyst.browser/',
}));

vi.mock('@nimbalyst/extension-sdk', () => ({
  useEditorLifecycle: () => ({ markDirty: vi.fn() }),
}));

vi.mock('../BrowserSurface', () => ({ BrowserSurface: () => null }));

afterEach(cleanup);

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

function renderJapanese(component: ReactNode) {
  return render(
    <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
      {component}
    </UiLanguageProvider>,
  );
}

describe('browser toolbar localization', () => {
  it('localizes accessible controls and preserves navigation actions', () => {
    const onNavigate = vi.fn();
    const onBack = vi.fn();
    const onForward = vi.fn();
    const onReload = vi.fn();
    const onToggleSourceMode = vi.fn();

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <BrowserToolbar
          state={{
            sessionId: 'session-1', url: 'about:blank', title: '', isLoading: true,
            canGoBack: true, canGoForward: false,
          }}
          onNavigate={onNavigate}
          onBack={onBack}
          onForward={onForward}
          onReload={onReload}
          onToggleSourceMode={onToggleSourceMode}
        />
      </UiLanguageProvider>,
    );

    expect(screen.getByRole('button', { name: '戻る' }).getAttribute('title')).toBe('戻る');
    expect(screen.getByRole('button', { name: '進む' }).getAttribute('title')).toBe('進む');
    expect(screen.getByRole('button', { name: '再読み込み' }).getAttribute('title')).toBe('再読み込み');
    expect(screen.getByPlaceholderText('URLを入力').getAttribute('placeholder')).toBe('URLを入力');
    expect(screen.getByText('読み込み中…').textContent).toBe('読み込み中…');
    expect(screen.getByRole('button', { name: 'ソース' }).getAttribute('title')).toBe('ソースモードを切り替え');

    fireEvent.click(screen.getByRole('button', { name: '戻る' }));
    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }));
    fireEvent.click(screen.getByRole('button', { name: 'ソース' }));
    const url = screen.getByPlaceholderText('URLを入力');
    fireEvent.change(url, { target: { value: 'example.com' } });
    fireEvent.keyDown(url, { key: 'Enter' });

    expect(onBack).toHaveBeenCalledOnce();
    expect(onReload).toHaveBeenCalledOnce();
    expect(onToggleSourceMode).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith('https://example.com');
    expect(onForward).not.toHaveBeenCalled();
  });

  it('localizes the browser preview error and fallback detail', async () => {
    browserClient.buildPreviewUrl.mockRejectedValueOnce(new Error('build-preview-url failed'));
    const host = {
      filePath: '/workspace/index.html',
      workspaceId: 'workspace-1',
      registerEditorAPI: vi.fn(),
    };

    renderJapanese(<BrowserEditor host={host as never} />);

    expect(await screen.findByText('このファイルをプレビューできません。')).toBeDefined();
    expect(screen.getByText('プレビューURLを作成できませんでした。')).toBeDefined();
  });

  it('localizes the browser session error and fallback detail', async () => {
    browserClient.createBrowserSession.mockRejectedValueOnce(new Error('Failed to create browser session'));
    const host = {
      filePath: 'virtual://com.nimbalyst.browser/tab-1?url=about%3Ablank',
      storage: { get: vi.fn(), set: vi.fn() },
      registerEditorAPI: vi.fn(),
    };

    renderJapanese(<BrowserSessionEditor host={host as never} />);

    expect(await screen.findByText('ブラウザーセッションエラー。')).toBeDefined();
    expect(screen.getByText('ブラウザーセッションを作成できませんでした。')).toBeDefined();
  });

  it('localizes the browser navigation fallback error', async () => {
    browserClient.createBrowserSession.mockResolvedValueOnce({
      sessionId: 'browser-session', url: 'about:blank', title: '', isLoading: false,
      canGoBack: false, canGoForward: false,
    });
    browserClient.navigateBrowserSession.mockRejectedValueOnce(new Error('navigate failed'));
    const host = {
      filePath: 'virtual://com.nimbalyst.browser/tab-1?url=about%3Ablank',
      storage: { get: vi.fn(), set: vi.fn() },
      registerEditorAPI: vi.fn(),
    };

    renderJapanese(<BrowserSessionEditor host={host as never} />);
    await act(async () => {
      await browserClient.createBrowserSession.mock.results[
        browserClient.createBrowserSession.mock.results.length - 1
      ]?.value;
    });

    const url = await screen.findByPlaceholderText('URLを入力');
    fireEvent.change(url, { target: { value: 'example.com' } });
    fireEvent.keyDown(url, { key: 'Enter' });

    expect(browserClient.navigateBrowserSession).toHaveBeenCalledOnce();
    expect(await screen.findByText('ページを開けませんでした。')).toBeDefined();
  });
});
