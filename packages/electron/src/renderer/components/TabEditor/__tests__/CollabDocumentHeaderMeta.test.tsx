// @vitest-environment jsdom
import React from 'react';
import { Provider, createStore } from 'jotai';
import { act, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { asTeamMemberId } from '@nimbalyst/runtime/auth/jwtScopes';
import {
  collabAwarenessAtom,
  collabDocumentStateAtom,
} from '../../../store/atoms/collabEditor';
import {
  CollabDocumentHeaderMeta,
  CollabRecoveryBanner,
} from '../CollabDocumentHeaderMeta';
import { collabPresenceIdentity } from '../../../utils/collabPresenceName';

const filePath = 'collab://org:org-a:doc:doc-a';
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('CollabDocumentHeaderMeta', () => {
  it('carries fallback provenance and preserves real names, including Teammate', () => {
    expect(collabPresenceIdentity({ userName: undefined, userEmail: undefined, teamMemberId: asTeamMemberId('member-default') }))
      .toEqual({ name: 'Teammate', nimbalystNameSource: 'system-default' });
    expect(collabPresenceIdentity({ userName: undefined, userEmail: 'rowan@example.test', teamMemberId: asTeamMemberId('member-email') }))
      .toEqual({ name: 'rowan@example.test' });
    expect(collabPresenceIdentity({ userName: 'Teammate', userEmail: undefined, teamMemberId: asTeamMemberId('member-real') }))
      .toEqual({ name: 'Teammate' });
    expect(collabPresenceIdentity({ userName: 'member-id', userEmail: undefined, teamMemberId: asTeamMemberId('member-id') }))
      .toEqual({ name: 'Teammate', nimbalystNameSource: 'system-default' });
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
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <Provider store={store}>
          <CollabDocumentHeaderMeta
            filePath={filePath}
            displayPath="Specs/Auth/Architecture Plan"
          />
        </Provider>
      </UiLanguageProvider>,
    );

    expect(Array.from(
      screen.getByTestId('shared-document-breadcrumb').querySelectorAll('.breadcrumb-segment'),
    ).map(segment => segment.textContent))
      .toEqual(['Specs', 'Auth', 'Architecture Plan']);
    expect(screen.getByTestId('collab-sync-dot').getAttribute('title')).toBe('同期済み');
    expect(screen.getByTestId('collab-sync-dot').getAttribute('aria-label')).toBe('同期状態: 同期済み');
    expect(screen.queryByText('同期済み')).toBeNull();
    expect(screen.getByTestId('collab-header-presence').textContent).toContain('AL');
    expect(Array.from(screen.getByTestId('shared-document-breadcrumb').children)
      .map(element => element.getAttribute('data-testid') ?? element.getAttribute('aria-label')))
      .toEqual([
        'パンくずリスト',
        'collab-sync-dot',
        'collab-header-presence',
      ]);
  });

  it('localizes marked fallback presence across language changes without rewriting legacy or real names', async () => {
    const i18n = await createI18nInstance('en');
    const store = createStore();
    store.set(collabDocumentStateAtom(filePath), {
      replica: 'ready',
      transport: 'connected',
      outbox: 'clean',
    });
    store.set(collabAwarenessAtom(filePath), new Map([
      ['generated-default', { name: 'Teammate', color: '#336699', nimbalystNameSource: 'system-default' }],
      ['real-name', { name: 'Teammate', color: '#663399' }],
      ['legacy-peer', { name: 'Teammate', color: '#996633' }],
      ['email-fallback', { name: 'rowan@example.test', color: '#339966' }],
    ]));

    render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <Provider store={store}>
          <CollabDocumentHeaderMeta filePath={filePath} displayPath="Specs/Auth/Plan" />
        </Provider>
      </UiLanguageProvider>,
    );

    const getTitles = () => Array.from(
      screen.getByTestId('collab-header-presence').querySelectorAll('[title]'),
    ).map((element) => element.getAttribute('title'));
    expect(getTitles()).toEqual(['Teammate', 'Teammate', 'Teammate', 'rowan@example.test']);

    await act(async () => {
      await i18n.changeLanguage('ja');
    });
    expect(getTitles()).toEqual(['チームメンバー', 'Teammate', 'Teammate', 'rowan@example.test']);
  });

  it('keeps rejected-update recovery actions in an exceptional banner', () => {
    const store = createStore();
    store.set(collabDocumentStateAtom(filePath), {
      replica: 'ready',
      transport: 'disconnected',
      outbox: 'rejected',
    });

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <Provider store={store}>
          <CollabRecoveryBanner
            filePath={filePath}
            onCopyCurrentDocument={vi.fn()}
            onDiscardLocalCopy={vi.fn()}
          />
        </Provider>
      </UiLanguageProvider>,
    );

    screen.getByRole('button', { name: '現在のドキュメントをコピー' });
    screen.getByRole('button', { name: 'ローカルコピーを破棄' });
  });
});
