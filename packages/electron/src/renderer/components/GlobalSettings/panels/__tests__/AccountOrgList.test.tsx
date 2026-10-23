// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

import { getDefaultStore } from 'jotai';
const store = getDefaultStore();
import { organizationDirectoryAtom } from '../../../../store/atoms/settingsDomains';
import { AccountOrgList } from '../AccountOrgList';
import type { AccountOrganizationGroup } from '../accountOrganizations';
import { dialogRef } from '../../../../contexts/DialogContext';
import { DIALOG_IDS } from '../../../../dialogs/registry';
import {
  ORG_WELCOME_DISMISSED_SETTING_KEY,
  ORG_WINDOW_PENDING_ROUTE_SETTING_KEY,
  pendingGeneralRoute,
} from '../../../TeamMode/onboarding/orgWelcomeModel';

const openManagementWindow = vi.fn();
const acceptInvite = vi.fn();
const openDialog = vi.fn();
const invoke = vi.fn();
let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
});

function renderWithI18n(ui: ReactNode) {
  return render(<I18nextProvider i18n={englishI18n}>{ui}</I18nextProvider>);
}

function group(overrides: Partial<AccountOrganizationGroup> = {}): AccountOrganizationGroup {
  return {
    personalOrgId: 'personal-a',
    email: 'a@example.com',
    organizations: [],
    ...overrides,
  };
}

describe('AccountOrgList', () => {
  beforeEach(() => {
    store.set(organizationDirectoryAtom, []);
    openManagementWindow.mockReset().mockResolvedValue({ success: true });
    acceptInvite.mockReset().mockResolvedValue({ success: true });
    openDialog.mockReset();
    invoke.mockReset().mockResolvedValue(undefined);
    dialogRef.current = { open: openDialog } as unknown as typeof dialogRef.current;
    (window as any).electronAPI = { team: { openManagementWindow, acceptInvite }, invoke };
  });

  afterEach(() => cleanup());

  it('administers a newly discovered membership here, queuing the #general hand-off for its messages', async () => {
    renderWithI18n(
      <AccountOrgList
        group={group({
          organizations: [
            { orgId: 'org-1', name: 'Acme', role: 'owner', isPending: false, projectCount: 3, alsoReachableBy: [] },
          ],
        })}
      />,
    );

    screen.getByText('3 projects');
    screen.getByTestId('account-org-manage').click();
    await waitFor(() => expect(invoke).toHaveBeenCalledWith(
      'app-settings:get',
      ORG_WELCOME_DISMISSED_SETTING_KEY,
    ));
    expect(invoke).toHaveBeenCalledWith(
      'app-settings:set',
      ORG_WINDOW_PENDING_ROUTE_SETTING_KEY,
      pendingGeneralRoute('org-1'),
    );
    // NIM-2322: Manage administers in place. The queued destination is still
    // written, so opening the organization's messages later lands on #general.
    await waitFor(() => expect(openDialog).toHaveBeenCalledWith(
      DIALOG_IDS.ORG_MANAGEMENT,
      { orgId: 'org-1' },
    ));
    expect(openManagementWindow).not.toHaveBeenCalled();
  });

  it('does not recreate onboarding after the organization welcome was dismissed', async () => {
    invoke.mockImplementation(async (channel: string, key: string) => (
      channel === 'app-settings:get' && key === ORG_WELCOME_DISMISSED_SETTING_KEY
        ? ['org-1']
        : undefined
    ));

    renderWithI18n(
      <AccountOrgList
        group={group({
          organizations: [
            { orgId: 'org-1', name: 'Acme', role: 'member', isPending: false, projectCount: 0, alsoReachableBy: [] },
          ],
        })}
      />,
    );

    screen.getByTestId('account-org-manage').click();

    await waitFor(() => expect(openDialog).toHaveBeenCalledWith(
      DIALOG_IDS.ORG_MANAGEMENT,
      { orgId: 'org-1' },
    ));
    expect(invoke).not.toHaveBeenCalledWith(
      'app-settings:set',
      ORG_WINDOW_PENDING_ROUTE_SETTING_KEY,
      expect.anything(),
    );
  });

  it('still administers when the durable hand-off cannot be saved', async () => {
    invoke.mockImplementation(async (channel: string) => {
      if (channel === 'app-settings:set') {
        throw new Error('settings directory unavailable');
      }
      return undefined;
    });

    renderWithI18n(
      <AccountOrgList
        group={group({
          organizations: [
            { orgId: 'org-1', name: 'Acme', role: 'member', isPending: false, projectCount: 0, alsoReachableBy: [] },
          ],
        })}
      />,
    );

    screen.getByTestId('account-org-manage').click();

    // The failed write only costs the #general landing in the messages window;
    // administration does not depend on it, so it opens anyway and says so.
    await waitFor(() => expect(screen.getByText(
      'Could not save where to open this organization\u2019s messages.',
    )).toBeTruthy());
    await waitFor(() => expect(openDialog).toHaveBeenCalledWith(
      DIALOG_IDS.ORG_MANAGEMENT,
      { orgId: 'org-1' },
    ));
    expect(openManagementWindow).not.toHaveBeenCalled();
  });

  it('accepts a pending invite in place and announces the directory change', async () => {
    const changed = vi.fn();
    window.addEventListener('nimbalyst:organizations-changed', changed);

    renderWithI18n(
      <AccountOrgList
        group={group({
          organizations: [
            { orgId: 'org-invite', name: 'Invited Org', role: 'member', isPending: true, alsoReachableBy: [] },
          ],
        })}
      />,
    );

    screen.getByTestId('account-org-pending-badge');
    // The org window resolves its target against active memberships only, so a
    // Manage button on a pending row would land on the generic unbound surface.
    expect(screen.queryByTestId('account-org-manage')).toBeNull();
    screen.getByTestId('account-org-accept-invite').click();

    await waitFor(() => expect(acceptInvite).toHaveBeenCalledWith('org-invite'));
    await waitFor(() => expect(changed).toHaveBeenCalled());
    // Accepting used to end in this list; the new member is still taken into the
    // organization's messages (landing on #general via the queued hand-off) —
    // a conversation destination, so this one keeps opening that window.
    await waitFor(() => expect(openManagementWindow).toHaveBeenCalledWith({ orgId: 'org-invite' }));
    expect(openDialog).not.toHaveBeenCalled();
    window.removeEventListener('nimbalyst:organizations-changed', changed);
  });

  it('offers a per-account empty state that launches the creation wizard', () => {
    renderWithI18n(<AccountOrgList group={group()} />);

    expect(screen.getByTestId('account-org-empty').textContent).toContain('No organizations');
    screen.getByTestId('account-org-new').click();
    expect(openDialog).toHaveBeenCalledWith(
      DIALOG_IDS.ORG_CREATION_WIZARD,
      expect.objectContaining({ onOrganizationCreated: expect.any(Function) }),
    );
    expect(openManagementWindow).not.toHaveBeenCalled();
  });

  it('shows the localized failure when the server rejects an invitation', async () => {
    acceptInvite.mockResolvedValue({ success: false, error: 'Backend invite rejection' });

    renderWithI18n(
      <AccountOrgList
        group={group({
          organizations: [
            { orgId: 'org-invite', name: 'Invited Org', role: 'member', isPending: true, alsoReachableBy: [] },
          ],
        })}
      />,
    );

    screen.getByTestId('account-org-accept-invite').click();

    await waitFor(() => expect(screen.getByText('Could not accept the invitation')).toBeTruthy());
    expect(screen.queryByText('Backend invite rejection')).toBeNull();
    expect(openManagementWindow).not.toHaveBeenCalled();
  });

  it('shows the localized failure when accepting throws instead of leaking IPC text', async () => {
    acceptInvite.mockRejectedValue(new Error('IPC channel down'));

    renderWithI18n(
      <AccountOrgList
        group={group({
          organizations: [
            { orgId: 'org-invite', name: 'Invited Org', role: 'member', isPending: true, alsoReachableBy: [] },
          ],
        })}
      />,
    );

    screen.getByTestId('account-org-accept-invite').click();

    await waitFor(() => expect(screen.getByText('Could not accept the invitation')).toBeTruthy());
    expect(screen.queryByText('IPC channel down')).toBeNull();
    expect(openManagementWindow).not.toHaveBeenCalled();
  });

  it('credits the other signed-in login for a merged organization', () => {
    renderWithI18n(
      <AccountOrgList
        group={group({
          organizations: [
            { orgId: 'org-shared', name: 'Shared', role: 'admin', isPending: false, projectCount: 1, alsoReachableBy: ['b@example.com'] },
          ],
        })}
      />,
    );

    expect(screen.getAllByTestId('account-org-row')).toHaveLength(1);
    screen.getByText(/also signed in as b@example.com/);
  });
});
