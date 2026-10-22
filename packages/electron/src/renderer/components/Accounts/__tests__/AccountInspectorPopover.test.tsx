// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

import { AccountInspectorPopover } from '../AccountInspectorPopover';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

function renderEnglish(node: React.ReactNode) {
  return render(
    <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
      {node}
    </UiLanguageProvider>,
  );
}

function anchor(): HTMLElement {
  const el = document.createElement('button');
  document.body.appendChild(el);
  return el;
}

describe('AccountInspectorPopover', () => {
  afterEach(() => cleanup());

  it('shows one Account row (email → account screen) and one Organization row (project org → org screen)', () => {
    const onOpenAccount = vi.fn();
    const onManageOrganization = vi.fn();
    renderEnglish(
      <AccountInspectorPopover
        accounts={[
          { personalOrgId: 'sync', personalUserId: 'u1', email: 'me@example.com', isSyncAccount: true, sessionStatus: 'active' },
          { personalOrgId: 'other', personalUserId: 'u2', email: 'other@example.com', isSyncAccount: false, sessionStatus: 'active' },
        ]}
        projectOrg={{ orgId: 'org-work', name: 'Work Team' }}
        anchorEl={anchor()}
        onClose={vi.fn()}
        onOpenAccount={onOpenAccount}
        onManageOrganization={onManageOrganization}
        onOpenApplicationSettings={vi.fn()}
        onOpenProjectSettings={vi.fn()}
      />,
    );

    // The active (sync) account's email appears, not a list of every account/project.
    screen.getByText('me@example.com');
    expect(screen.queryByText('other@example.com')).toBeNull();
    screen.getByText('Work Team');

    fireEvent.click(screen.getByTestId('account-inspector-account-row'));
    expect(onOpenAccount).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('account-inspector-organization-row'));
    expect(onManageOrganization).toHaveBeenCalledWith('org-work');
  });

  it('links to Application and Project settings', () => {
    const onOpenApplicationSettings = vi.fn();
    const onOpenProjectSettings = vi.fn();
    renderEnglish(
      <AccountInspectorPopover
        accounts={[]}
        projectOrg={null}
        anchorEl={anchor()}
        onClose={vi.fn()}
        onOpenAccount={vi.fn()}
        onManageOrganization={vi.fn()}
        onOpenApplicationSettings={onOpenApplicationSettings}
        onOpenProjectSettings={onOpenProjectSettings}
      />,
    );

    fireEvent.click(screen.getByTestId('account-inspector-application-settings-row'));
    expect(onOpenApplicationSettings).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('account-inspector-project-settings-row'));
    expect(onOpenProjectSettings).toHaveBeenCalledTimes(1);
  });

  // The reported bug: when the project had no org the row named one of the
  // account's organizations at random and offered only that one's project walk
  // — a flow that leads *away* from the open project. There was no way to pick
  // a different organization, and no way to create one. It now leads to the
  // sharing flow, which asks which, and must do so for a member of several orgs
  // just as much as for an account with none.
  it('routes an org-less project to the sharing flow rather than naming an arbitrary org', () => {
    const onManageOrganization = vi.fn();
    const onAddProjectToOrganization = vi.fn();
    renderEnglish(
      <AccountInspectorPopover
        accounts={[]}
        projectOrg={null}
        anchorEl={anchor()}
        onClose={vi.fn()}
        onOpenAccount={vi.fn()}
        onManageOrganization={onManageOrganization}
        onAddProjectToOrganization={onAddProjectToOrganization}
        onOpenApplicationSettings={vi.fn()}
        onOpenProjectSettings={vi.fn()}
      />,
    );

    screen.getByText('Sign in');
    fireEvent.click(screen.getByTestId('account-inspector-add-to-organization-row'));
    expect(onAddProjectToOrganization).toHaveBeenCalledTimes(1);
    expect(onManageOrganization).not.toHaveBeenCalled();
  });

  // An unresolved lookup used to render as "No organization -- Set up", which
  // offered org creation to a user who had just finished it.
  it('does not offer org setup while the organization lookup is still running', () => {
    renderEnglish(
      <AccountInspectorPopover
        accounts={[]}
        projectOrg={null}
        projectOrgLoading
        anchorEl={anchor()}
        onClose={vi.fn()}
        onOpenAccount={vi.fn()}
        onManageOrganization={vi.fn()}
        onOpenApplicationSettings={vi.fn()}
        onOpenProjectSettings={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('account-inspector-organization-row')).toBeNull();
    screen.getByTestId('account-inspector-organization-loading');
  });

  // Sync gave up its gutter slot to this row, so the row has to be the thing
  // that appears — and it must stay away entirely for a user with no sync,
  // who is exactly who the old gutter icon hid itself from.
  it('shows the sync row only when there is sync state, and links it to settings', () => {
    const onOpenSyncSettings = vi.fn();
    const { rerender } = renderEnglish(
      <AccountInspectorPopover
        accounts={[]}
        projectOrg={null}
        anchorEl={anchor()}
        onClose={vi.fn()}
        onOpenAccount={vi.fn()}
        onManageOrganization={vi.fn()}
        onOpenApplicationSettings={vi.fn()}
        onOpenProjectSettings={vi.fn()}
        sync={null}
      />,
    );
    expect(screen.queryByTestId('account-inspector-sync-row')).toBeNull();

    rerender(
      <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
        <AccountInspectorPopover
        accounts={[]}
        projectOrg={null}
        anchorEl={anchor()}
        onClose={vi.fn()}
        onOpenAccount={vi.fn()}
        onManageOrganization={vi.fn()}
        onOpenApplicationSettings={vi.fn()}
        onOpenProjectSettings={vi.fn()}
        sync={{ tone: 'warning', detail: 'Disconnected', needsAttention: true }}
        onOpenSyncSettings={onOpenSyncSettings}
        />
      </UiLanguageProvider>,
    );

    const row = screen.getByTestId('account-inspector-sync-row');
    expect(row.getAttribute('data-sync-tone')).toBe('warning');
    screen.getByText('Disconnected');
    fireEvent.click(row);
    expect(onOpenSyncSettings).toHaveBeenCalledTimes(1);
  });

  it('renders account shortcuts and accessibility labels in Japanese', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="en-US">
        <AccountInspectorPopover
          accounts={[
            { personalOrgId: 'sync', personalUserId: 'u1', email: 'me@example.com', isSyncAccount: true, sessionStatus: 'active' },
          ]}
          projectOrg={{ orgId: 'org-work', name: 'Work Team' }}
          anchorEl={anchor()}
          onClose={vi.fn()}
          onOpenAccount={vi.fn()}
          onManageOrganization={vi.fn()}
          onOpenApplicationSettings={vi.fn()}
          onOpenProjectSettings={vi.fn()}
          messagesUnreadCount={3}
          onOpenMessages={vi.fn()}
          sync={{ tone: 'warning', detail: 'Disconnected', needsAttention: true }}
        />
      </UiLanguageProvider>,
    );

    screen.getByText('アプリ設定');
    screen.getByText('プロジェクト設定');
    screen.getByTestId('account-inspector-messages-row');
    expect(screen.getByTestId('account-inspector-messages-row').getAttribute('aria-label')).toBe('未読メッセージ3件');
    screen.getByText('メッセージ');
    screen.getByText('モバイル同期');
    screen.getByText('未接続');
    screen.getByText('アカウント');
    screen.getByText('アカウントとサインインを管理');
  });

  it('renders structured sync ages in Japanese', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="en-US">
        <AccountInspectorPopover
          accounts={[]}
          projectOrg={null}
          anchorEl={anchor()}
          onClose={vi.fn()}
          onOpenAccount={vi.fn()}
          onManageOrganization={vi.fn()}
          onOpenApplicationSettings={vi.fn()}
          onOpenProjectSettings={vi.fn()}
          sync={{
            tone: 'ok',
            detail: 'Synced 5m ago',
            localizedDetail: { kind: 'synced-minutes-ago', count: 5 },
            needsAttention: false,
          }}
        />
      </UiLanguageProvider>,
    );

    screen.getByText('5分前に同期済み');
  });

  it('localizes the fixed update-required sync message', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="en-US">
        <AccountInspectorPopover
          accounts={[]}
          projectOrg={null}
          anchorEl={anchor()}
          onClose={vi.fn()}
          onOpenAccount={vi.fn()}
          onManageOrganization={vi.fn()}
          onOpenApplicationSettings={vi.fn()}
          onOpenProjectSettings={vi.fn()}
          sync={{
            tone: 'error',
            detail: 'Update Nimbalyst to resume session sync. Old client',
            localizedDetail: { kind: 'update-required', detail: 'Old client' },
            needsAttention: true,
          }}
        />
      </UiLanguageProvider>,
    );

    screen.getByText('セッション同期を再開するには、Nimbalystを更新してください。Old client');
  });

  it('renders the organization loading status in Japanese', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="en-US">
        <AccountInspectorPopover
          accounts={[]}
          projectOrg={null}
          projectOrgLoading
          anchorEl={anchor()}
          onClose={vi.fn()}
          onOpenAccount={vi.fn()}
          onManageOrganization={vi.fn()}
          onOpenApplicationSettings={vi.fn()}
          onOpenProjectSettings={vi.fn()}
        />
      </UiLanguageProvider>,
    );

    screen.getByText('組織を読み込み中…');
  });

  it('renders the organization setup action in Japanese', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="en-US">
        <AccountInspectorPopover
          accounts={[]}
          projectOrg={null}
          anchorEl={anchor()}
          onClose={vi.fn()}
          onOpenAccount={vi.fn()}
          onManageOrganization={vi.fn()}
          onOpenApplicationSettings={vi.fn()}
          onOpenProjectSettings={vi.fn()}
        />
      </UiLanguageProvider>,
    );

    screen.getByText('このプロジェクトを組織に追加');
  });
});
