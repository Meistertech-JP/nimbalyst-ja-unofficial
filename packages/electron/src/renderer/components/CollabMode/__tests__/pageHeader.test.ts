// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { atom, createStore, Provider } from 'jotai';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { CollabScope } from '@nimbalyst/collab-client/core';
import type { CollabDocsSession, SharedDocument } from '@nimbalyst/collab-client/docs';

const openArtifact = vi.fn();
vi.mock('../../../store/atoms/collabDocuments', () => ({
  getElectronCollabHost: () => ({ openArtifact }),
  getPersonalCollabHost: () => ({ openArtifact, scope: { scopeKey: 'personal', indexConfig: {} } }),
}));

const windowMode = vi.hoisted(() => ({ atom: null as unknown }));
vi.mock('../../../store/atoms/windowMode', async () => {
  const { atom: jotaiAtom } = await import('jotai');
  windowMode.atom = jotaiAtom('collab');
  return { windowModeAtom: windowMode.atom };
});

import { openPageAncestor } from '../pageHeaderNavigation';
import { usePageMenuItems, useTypedPageMenuItems, useTypePageMenuItems } from '../usePageMenuItems';
import { pageActionRequestAtom, pageMoveRequestAtom } from '../pageTypeRequest';
import { isTitleHeading } from '../useTitleHeading';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('page header', () => {
  it('opens each crumb as the artifact it names, in its own section', () => {
    const scope = { scopeKey: 'team', orgId: 'org', indexConfig: { teamProjectId: 'proj' } } as unknown as CollabScope;
    openPageAncestor({ id: 'doc-1', kind: 'page', name: 'Product' }, { personal: false, scope });
    openPageAncestor({ id: 'module', kind: 'type', name: 'Modules' }, { personal: false, scope });
    openPageAncestor({ id: 'item-1', kind: 'item', name: 'Sync engine', typeId: 'module' }, { personal: true, workspacePath: '/w' });
    expect(openArtifact.mock.calls.map(([ref]) => ref)).toEqual([
      { kind: 'document', scope, documentId: 'doc-1', teamProjectId: 'proj' },
      { kind: 'type', scope, typeId: 'module' },
      { kind: 'tracker', scope: { scopeKey: 'personal', indexConfig: {} }, trackerId: 'item-1' },
    ]);
  });

  it('treats a body heading as the title only when it repeats it', () => {
    expect(isTitleHeading('How we write  this wiki ', 'how we write this wiki')).toBe(true);
    expect(isTitleHeading('How we write this wiki, v2', 'How we write this wiki')).toBe(false);
    expect(isTitleHeading('', '')).toBe(false);
  });

  it('offers the row menu on a page header in Pages, and raises it for the sidebar to run', () => {
    const store = createStore();
    const page = { documentId: 'doc-1', title: 'Product', documentType: 'markdown' } as SharedDocument;
    const session = {
      atoms: { favorites: atom(['doc-1']) },
      uiCapabilities: { personalState: true },
      toggleFavorite: vi.fn(),
    } as unknown as CollabDocsSession;
    const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(
      UiLanguageProvider,
      {
        i18n: japaneseI18n,
        preference: 'ja',
        systemLocale: 'ja-JP',
        children: React.createElement(Provider, { store }, children),
      },
    );
    const { result, rerender } = renderHook(
      ({ canMoveAcross }) => usePageMenuItems({ lane: 'personal', session, page, canMoveAcross }),
      { wrapper, initialProps: { canMoveAcross: false } },
    );
    // No team yet: no Move to Team. A favorited page offers Unfavorite. Trash is its own group.
    expect(result.current.map((item) => item.id)).toEqual(['new-page-inside', 'add-from-files', 'set-type', 'rename', 'move-to', 'favorite', 'trash']);
    expect(result.current.filter((item) => item.dividerBefore).map((item) => item.id)).toEqual(['trash']);
    expect(result.current.map((item) => item.label)).toEqual([
      'この中に新しいページを作成', 'ファイルから追加...', 'タイプを設定', '名前を変更', '移動先...', 'お気に入りから削除', 'ゴミ箱に移動',
    ]);
    result.current.find((item) => item.id === 'trash')!.onSelect();
    expect(store.get(pageActionRequestAtom)).toEqual({ lane: 'personal', pageId: 'doc-1', action: 'trash' });

    rerender({ canMoveAcross: true });
    expect(result.current.find((item) => item.id === 'move-across')?.label).toBe('チームへ移動...');
    result.current.find((item) => item.id === 'move-across')!.onSelect();
    expect(store.get(pageMoveRequestAtom)).toEqual({ from: 'personal', pageId: 'doc-1' });

    // Outside Pages no sidebar is shown to answer, so the header offers none of it.
    act(() => store.set(windowMode.atom as ReturnType<typeof atom<string>>, 'files'));
    rerender({ canMoveAcross: true });
    expect(result.current).toEqual([]);
  });

  it('offers Back Under Its Type only for a placed typed page, and names a type page as a type', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(
      UiLanguageProvider,
      {
        i18n: japaneseI18n,
        preference: 'ja',
        systemLocale: 'ja-JP',
        children: React.createElement(Provider, { store }, children),
      },
    );
    const session = { atoms: { itemPlacements: atom([{ itemId: 'placed' }]) } } as unknown as CollabDocsSession;
    const ids = (items: { id: string }[]) => items.map((item) => item.id);
    const typed = renderHook(({ itemId }) => useTypedPageMenuItems('team', itemId, session), { wrapper, initialProps: { itemId: 'placed' } });
    expect(ids(typed.result.current)).toEqual(['new-page-inside', 'move-to', 'back-under-type']);
    expect(typed.result.current[2]?.label).toBe('タイプの配下に戻す');
    typed.rerender({ itemId: 'under-type' });
    expect(ids(typed.result.current)).toEqual(['new-page-inside', 'move-to']);

    const type = renderHook(({ placed }) => useTypePageMenuItems('personal', 'module', placed), { wrapper, initialProps: { placed: true } });
    expect(type.result.current.find((item) => item.id === 'remove-from-tree')?.label).toBe('ツリーから削除');
    type.result.current.find((item) => item.id === 'remove-from-tree')!.onSelect();
    expect(store.get(pageActionRequestAtom)).toEqual({ lane: 'personal', pageId: 'module', action: 'removeFromTree', kind: 'type' });
    type.rerender({ placed: false });
    expect(type.result.current).toEqual([]);
  });
});
