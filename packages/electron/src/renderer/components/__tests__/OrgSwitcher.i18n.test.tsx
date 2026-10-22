// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { resources } from '@nimbalyst/i18n/resources';

import { activeWorkspacePathAtom } from '../../store/atoms/openProjects';
import { orgProjectWalkAtom } from '../../store/atoms/orgProjectWalk';
import { EMPTY_TEAM_INBOX_SNAPSHOT, teamInboxSnapshotAtom } from '../../store/atoms/teamInbox';

const projectOrg = vi.hoisted(() => ({ current: { orgId: 'org-a', name: 'Acme' } }));

vi.mock('../hooks/useProjectOrg', () => ({
  useProjectOrg: () => ({ org: projectOrg.current, loading: false }),
}));

import { OrgSwitcher } from '../OrgSwitcher';

const testI18n = createInstance();
const testI18nReady = testI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources,
  ns: Object.keys(resources.en),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

const listOrganizations = vi.fn(async () => ({
  teams: [
    { orgId: 'org-a', name: 'Acme', role: 'owner', membershipType: 'active_member' },
    { orgId: 'org-pending', name: 'Invited Org', membershipType: 'pending_invite' },
  ],
}));

function renderSwitcher() {
  const store = createStore();
  store.set(activeWorkspacePathAtom, '/workspace');
  store.set(orgProjectWalkAtom, {
    enterableOrgs: [{ orgId: 'org-b', name: 'Other Org' }],
    autoPresentOrg: null,
  });
  store.set(teamInboxSnapshotAtom, {
    ...EMPTY_TEAM_INBOX_SNAPSHOT,
    status: 'ready',
    organizations: [{ orgId: 'org-a', orgName: 'Acme', status: 'ready' }],
    deliveries: [{
      id: 'unread-1',
      teamMemberId: 'member-1' as never,
      orgId: 'org-a',
      orgName: 'Acme',
      createdAt: 1,
      hasUnreadActivity: true,
    }],
  });
  return rtlRender(
    <Provider store={store}><OrgSwitcher /></Provider>,
    { wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider> },
  );
}

afterEach(() => {
  cleanup();
  delete (window as any).electronAPI;
});

describe('OrgSwitcher localization', () => {
  it('renders the translated organization controls and dynamic labels in English and Japanese', async () => {
    await testI18nReady;
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { organization: { list: listOrganizations } },
    });

    for (const [language, expected] of [
      ['en', {
        switch: 'Switch organization',
        title: 'Organization: Acme',
        heading: 'Unread messages',
        rowUnread: '1 unread',
        pending: '1 pending invitation',
        join: 'Join Other Org project',
        manage: 'Manage organization…',
        create: 'New organization',
      }],
      ['ja', {
        switch: '組織を切り替え',
        title: '組織: Acme',
        heading: '未読メッセージ',
        rowUnread: '未読1件',
        pending: '保留中の招待1件',
        join: 'Other Orgプロジェクトに参加',
        manage: '組織を管理…',
        create: '新しい組織',
      }],
    ] as const) {
      await testI18n.changeLanguage(language);
      const { unmount } = renderSwitcher();

      const trigger = await screen.findByTestId('org-switcher');
      expect(trigger.getAttribute('aria-label')).toBe(expected.switch);
      expect(trigger.getAttribute('title')).toBe(expected.title);
      expect(screen.getByTestId('org-switcher-unread-badge').getAttribute('aria-label'))
        .toBe(language === 'en' ? '1 unread across organizations' : '組織全体で未読1件');

      fireEvent.click(trigger);
      expect(await screen.findByText(expected.heading)).toBeTruthy();
      expect(screen.getByTestId('org-switcher-org-row-org-a').textContent).toContain(expected.rowUnread);
      await waitFor(() => expect(screen.getByTestId('org-switcher-pending-invites').textContent).toBe(expected.pending));
      expect(screen.getByTestId('org-switcher-join-project').textContent).toContain(expected.join);
      expect(screen.getByTestId('org-switcher-manage-organization').textContent).toContain(expected.manage);
      expect(screen.getByTestId('org-switcher-new-organization').textContent).toContain(expected.create);

      unmount();
    }
  });
});
