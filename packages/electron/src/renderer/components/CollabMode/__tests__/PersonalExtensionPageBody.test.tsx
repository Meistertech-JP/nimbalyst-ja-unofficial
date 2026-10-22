// @vitest-environment jsdom
/**
 * A Personal page of an extension type (a drawing copied in from a project with
 * no team) opens in that extension's editor, not as raw text, and the editor's
 * saves go to the page's body in the local database.
 */
import React, { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { EditorHost } from '@nimbalyst/runtime';

const onEdit = vi.fn();
const personalPageBodyMock = vi.hoisted(() => ({ notice: null as string | null }));

function StubDrawing({ host }: { host: EditorHost }) {
  const [loaded, setLoaded] = React.useState<string | null>(null);
  useEffect(() => {
    void host.loadContent().then(setLoaded);
    const offChange = host.onFileChanged((content) => setLoaded(String(content)));
    // Saves the way a file-backed extension editor does: on the host's request.
    const offSave = host.onSaveRequested(() => host.saveContent('{"elements":[1,2]}'));
    return () => {
      offChange();
      offSave();
    };
  }, [host]);
  useEffect(() => {
    if (loaded === null) return;
    host.setDirty(true);
    // A second save of the same content, as an editor settling after load makes.
    const again = setTimeout(() => host.setDirty(true), 400);
    return () => clearTimeout(again);
  }, [host, loaded]);
  return <div data-testid="stub-drawing">{loaded}</div>;
}

vi.mock('@nimbalyst/runtime', () => ({
  createEditorAPIOwnerToken: (id: string) => ({ id }),
  createExtensionStorage: () => ({}),
  registerEditorAPI: () => undefined,
  unregisterEditorAPI: () => undefined,
}));
vi.mock('../usePersonalPageBody', () => ({
  usePersonalPageBody: () => ({
    status: 'ready',
    retryLoad: () => undefined,
    initialContent: '{"elements":[1]}',
    editorEpoch: 0,
    notice: personalPageBodyMock.notice,
    dismissNotice: () => undefined,
    onEdit,
  }),
}));
vi.mock('../../CustomEditors', () => ({
  customEditorRegistry: {
    findRegistrationForFile: (name: string) => (name.endsWith('.excalidraw')
      ? { extensionId: 'com.nimbalyst.excalidraw', component: StubDrawing }
      : undefined),
  },
}));

import { PersonalExtensionPageBody, PersonalExtensionPageView } from '../PersonalExtensionPageBody';

afterEach(cleanup);

describe('PersonalExtensionPageBody', () => {
  it('translates a save conflict notice in Japanese', async () => {
    personalPageBodyMock.notice = 'This page changed elsewhere; your edits were kept in local history.';
    const i18n = await createI18nInstance('ja');
    const view = render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <PersonalExtensionPageBody
          documentId="doc-notice"
          workspacePath="/ws"
          page={{ title: 'Architecture', documentType: 'excalidraw', fileExtension: '.excalidraw' }}
        />
      </UiLanguageProvider>,
    );
    await screen.findByTestId('stub-drawing');
    expect(screen.getByRole('status').textContent).toContain('別の場所で変更されたため、編集内容をローカル履歴に保存しました');
    view.unmount();
    personalPageBodyMock.notice = null;
  });

  it('opens a Personal drawing in its editor and saves the editor\'s content to the page body', async () => {
    onEdit.mockClear();
    const i18n = await createI18nInstance('en');
    render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <PersonalExtensionPageBody
          documentId="doc-1"
          workspacePath="/ws"
          page={{ title: 'Architecture', documentType: 'excalidraw', fileExtension: '.excalidraw' }}
        />
      </UiLanguageProvider>,
    );
    expect((await screen.findByTestId('stub-drawing')).textContent).toBe('{"elements":[1]}');
    await vi.waitFor(() => expect(onEdit).toHaveBeenCalledWith('{"elements":[1,2]}'));
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('embedded in another page, follows the stored body and never writes it', async () => {
    const i18n = await createI18nInstance('en');
    onEdit.mockClear();
    let stored = '{"elements":[1]}';
    const invoke = vi.fn(async () => ({ content: stored, version: 1 }));
    vi.stubGlobal('electronAPI', { invoke });
    const page = { title: 'Architecture', documentType: 'excalidraw', fileExtension: '.excalidraw' };
    const view = render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <PersonalExtensionPageView documentId="doc-3" workspacePath="/ws" page={page} revision={1} />
      </UiLanguageProvider>,
    );
    // The editor mounts once the body arrives, then fills in from its own async loadContent.
    await vi.waitFor(() => expect(screen.getByTestId('stub-drawing').textContent).toBe('{"elements":[1]}'));

    // The page was edited in its tab: a new revision reaches the open editor without a write from here.
    stored = '{"elements":[1,3]}';
    view.rerender(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <PersonalExtensionPageView documentId="doc-3" workspacePath="/ws" page={page} revision={2} />
      </UiLanguageProvider>,
    );
    await vi.waitFor(() => expect(screen.getByTestId('stub-drawing').textContent).toBe('{"elements":[1,3]}'));
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(onEdit).not.toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith('personal-pages:get-body', '/ws', 'doc-3');
    vi.unstubAllGlobals();
  });

  it('says which type has no editor in Japanese instead of showing raw text', async () => {
    const i18n = await createI18nInstance('ja');
    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <PersonalExtensionPageBody documentId="doc-2" workspacePath="/ws" page={{ title: 'Board', documentType: 'tldraw', fileExtension: '.tldraw' }} />
      </UiLanguageProvider>,
    );
    expect(screen.getByText('tldraw形式のページを開ける拡張機能がインストールされていません。編集するには、このページを作成した拡張機能をインストールしてください。').textContent)
      .toBe('tldraw形式のページを開ける拡張機能がインストールされていません。編集するには、このページを作成した拡張機能をインストールしてください。');
  });
});
