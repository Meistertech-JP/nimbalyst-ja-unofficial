// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { Provider, createStore } from 'jotai';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { selectedOrgIdAtom } from '../../../store/atoms/orgScope';
import { TeamMode } from '../TeamMode';

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));
vi.mock('../../Settings/panels/OrganizationMembersRolesPanel', () => ({
  OrganizationMembersRolesPanel: () => <div data-testid="members" />,
}));
vi.mock('../../Settings/panels/OrganizationProjectsPanel', () => ({ OrganizationProjectsPanel: () => <div /> }));
vi.mock('../../Settings/panels/OrganizationBillingPanel', () => ({ OrganizationBillingPanel: () => <div /> }));
vi.mock('../../Settings/panels/OrganizationDangerZone', () => ({ OrganizationDangerZone: () => <div /> }));
vi.mock('../../Settings/panels/ProjectSharingPanel', () => ({ ProjectSharingPanel: () => <div /> }));

const team = { orgId: 'org-1', name: 'Acme', boundPersonalOrgId: 'account-1', membershipType: 'active_member' };

function installApi(teams: unknown[]) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      team: { findForWorkspace: vi.fn().mockResolvedValue(null) },
      organization: { list: vi.fn().mockResolvedValue({ success: true, teams }) },
      stytch: { getAccounts: vi.fn().mockResolvedValue([{ personalOrgId: 'account-1', email: 'a@example.com' }]) },
      openExternal: vi.fn(),
    },
  });
}

// Nobody should set up an organization without being told Teams is alpha and
// will be paid after launch — on both the create surface and the admin surface.
describe('TeamMode alpha disclosure', () => {
  afterEach(async () => {
    cleanup();
    await i18next.changeLanguage('en');
  });

  it('localizes administration labels without translating organization or account data', async () => {
    await i18next.changeLanguage('ja');
    installApi([team]);
    const store = createStore();
    store.set(selectedOrgIdAtom, 'org-1');
    render(<Provider store={store}><TeamMode /></Provider>);

    expect(await screen.findByRole('heading', { name: 'Acme' })).toBeTruthy();
    expect(screen.getByText('組織を管理')).toBeTruthy();
    expect(screen.getByText('所有者: a@example.com')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Webコンソールを開く/ })).toBeTruthy();
    expect(screen.getByTestId('team-tab-members').textContent).toContain('メンバー');
  });

  it('discloses the alpha status on the unbound create-an-organization surface', async () => {
    installApi([]);
    const store = createStore();
    store.set(selectedOrgIdAtom, null);
    render(<Provider store={store}><TeamMode /></Provider>);

    await waitFor(() => expect(screen.getByText(/Create an organization to collaborate/)).toBeTruthy());
    expect(screen.getByTestId('team-alpha-notice').textContent).toMatch(/alpha/i);
    expect(screen.getByTestId('team-alpha-notice').textContent).toMatch(/subscription after launch/i);
    expect(screen.getAllByTestId('alpha-badge').length).toBeGreaterThan(0);
  });

  it('discloses the alpha status while administering an organization', async () => {
    installApi([team]);
    const store = createStore();
    store.set(selectedOrgIdAtom, 'org-1');
    render(<Provider store={store}><TeamMode /></Provider>);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Acme' })).toBeTruthy());
    expect(screen.getByTestId('team-alpha-notice').textContent).toMatch(/expect bugs/i);
    expect(screen.getAllByTestId('alpha-badge').length).toBeGreaterThan(0);
  });
});
