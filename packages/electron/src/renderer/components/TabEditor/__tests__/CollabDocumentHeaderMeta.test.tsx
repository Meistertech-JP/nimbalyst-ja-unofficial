// @vitest-environment jsdom
import React from 'react';
import { Provider, createStore } from 'jotai';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';
import {
  collabAwarenessAtom,
  collabDocumentStateAtom,
  type CollabDocumentState,
} from '../../../store/atoms/collabEditor';
import {
  CollabDocumentHeaderMeta,
  CollabRecoveryBanner,
} from '../CollabDocumentHeaderMeta';

const filePath = 'collab://org:org-a:doc:doc-a';

describe('CollabDocumentHeaderMeta', () => {
  afterEach(async () => { cleanup(); await i18next.changeLanguage('en'); });

  it.each<[CollabDocumentState, string, string]>([
    [{ replica: 'loading', transport: 'disconnected', outbox: 'clean' }, 'opening-local-copy', 'ローカルコピーを開いています…'],
    [{ replica: 'ready', transport: 'connecting', outbox: 'clean' }, 'connecting', '接続中…'],
    [{ replica: 'ready', transport: 'connected', outbox: 'pending' }, 'synced', '同期済み'],
    [{ replica: 'ready', transport: 'disconnected', outbox: 'pending' }, 'offline-safe', 'オフライン — 変更はこのデバイスに保存されています'],
    [{ replica: 'ready', transport: 'connected', outbox: 'replaying' }, 'replaying', 'オフラインでの変更を同期中…'],
    [{ replica: 'ready', transport: 'connected', outbox: 'rejected' }, 'access-changed', 'アクセス権が変更されました — ローカルの編集は未アップロードです'],
    [{ replica: 'corrupt', transport: 'disconnected', outbox: 'clean' }, 'local-copy-damaged', 'ローカルコピーが破損しています — 正常なコピーをダウンロード中'],
    [{ replica: 'unavailable', transport: 'connected', outbox: 'clean' }, 'local-saving-unavailable', '変更はローカルに保存されていません'],
  ])('translates status without mutating the document state (%s)', async (state, kind, label) => {
    const store = createStore();
    store.set(collabDocumentStateAtom(filePath), state);
    render(<Provider store={store}><CollabDocumentHeaderMeta filePath={filePath} displayPath="Specs/User title" /></Provider>);
    await act(async () => { await i18next.changeLanguage('ja'); });
    const dot = screen.getByTestId('collab-sync-dot');
    expect(dot.getAttribute('title')).toContain(label);
    expect(dot.getAttribute('aria-label')).toContain(`同期状態: ${label}`);
    expect(dot.getAttribute('data-status-kind')).toBe(kind);
    expect(store.get(collabDocumentStateAtom(filePath))).toBe(state);
    expect(screen.getByText('User title')).toBeTruthy();
  });

  it('keeps recovery actions gated and preserves callbacks after a locale change', async () => {
    const store = createStore();
    const copy = vi.fn();
    const discard = vi.fn();
    store.set(collabDocumentStateAtom(filePath), { replica: 'ready', transport: 'connected', outbox: 'clean' });
    render(<Provider store={store}><CollabRecoveryBanner filePath={filePath} onCopyCurrentDocument={copy} onDiscardLocalCopy={discard} /></Provider>);
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.queryByTestId('collab-recovery-banner')).toBeNull();
    act(() => { store.set(collabDocumentStateAtom(filePath), { replica: 'ready', transport: 'disconnected', outbox: 'rejected' }); });
    expect(copy).not.toHaveBeenCalled();
    expect(discard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '現在のドキュメントをコピー' }));
    fireEvent.click(screen.getByRole('button', { name: 'ローカルコピーを破棄' }));
    expect(copy).toHaveBeenCalledOnce();
    expect(discard).toHaveBeenCalledOnce();
  });

  it('renders path, sync dot, and collaborators in one row without status prose', () => {
    const store = createStore();
    store.set(collabDocumentStateAtom(filePath), {
      replica: 'ready',
      transport: 'connected',
      outbox: 'clean',
    });
    store.set(collabAwarenessAtom(filePath), new Map([
      ['user-a', { name: 'Ada Lovelace', color: '#336699' }],
    ]));

    render(
      <Provider store={store}>
        <CollabDocumentHeaderMeta
          filePath={filePath}
          displayPath="Specs/Auth/Architecture Plan"
        />
      </Provider>,
    );

    expect(Array.from(
      screen.getByTestId('shared-document-breadcrumb').querySelectorAll('.breadcrumb-segment'),
    ).map(segment => segment.textContent?.replace(/^(folder|description)/, '')))
      .toEqual(['Specs', 'Auth', 'Architecture Plan']);
    expect(screen.getByTestId('collab-sync-dot').getAttribute('title')).toBe('Synced');
    expect(screen.queryByText('Synced')).toBeNull();
    expect(screen.getByTestId('collab-header-presence').textContent).toContain('AL');
    expect(Array.from(screen.getByTestId('shared-document-breadcrumb').parentElement!.children)
      .map(element => element.getAttribute('data-testid')))
      .toEqual([
        'shared-document-breadcrumb',
        'collab-sync-dot',
        'collab-header-presence',
      ]);
  });

  it('keeps rejected-update recovery actions in an exceptional banner', () => {
    const store = createStore();
    store.set(collabDocumentStateAtom(filePath), {
      replica: 'ready',
      transport: 'disconnected',
      outbox: 'rejected',
    });

    render(
      <Provider store={store}>
        <CollabRecoveryBanner
          filePath={filePath}
          onCopyCurrentDocument={vi.fn()}
          onDiscardLocalCopy={vi.fn()}
        />
      </Provider>,
    );

    expect(screen.getByRole('button', { name: 'Copy current document' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Discard local copy' })).toBeTruthy();
  });
});
