// @vitest-environment jsdom
import React from 'react';
import { Provider } from 'jotai';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { resources } from '@nimbalyst/i18n/resources';
import { store } from '@nimbalyst/runtime/store';

import { DIALOG_IDS } from '../../../../dialogs/registry';
import { dialogRef } from '../../../../contexts/DialogContext';
import { OrganizationMembersRolesPanel } from '../OrganizationMembersRolesPanel';
import { OrganizationSecurityPanel } from '../OrganizationSecurityPanel';

// Narrow mock: the runtime barrel drags the whole Lexical tree in for one icon.
vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

const MEMBERS = [
  { memberId: 'member-1', email: 'ada@test.com', name: 'Ada', status: 'active', role: 'member' },
];

let removeMember: ReturnType<typeof vi.fn>;
/** What the panel handed the confirm dialog, so a test can answer it. */
let confirmData: { title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void } | null;
const testI18n = createInstance();
const testI18nReady = testI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources,
  ns: Object.keys(resources.en),
  defaultNS: 'settings',
  interpolation: { escapeValue: false },
});

function renderPanel(callerRole: string) {
  (window as unknown as { electronAPI: unknown }).electronAPI = {
    organization: {
      list: vi.fn(async () => ({ success: true, teams: [{ orgId: 'org-acme', name: 'Acme', role: callerRole }] })),
      listMembers: vi.fn(async () => ({ success: true, members: MEMBERS, callerRole })),
      listProjects: vi.fn(async () => ({ success: true, projects: [] })),
      removeMember,
    },
  };
  return render(
    <Provider store={store}>
      <I18nextProvider i18n={testI18n}>
        <OrganizationMembersRolesPanel orgId="org-acme" allowOrganizationCreation={false} />
      </I18nextProvider>
    </Provider>,
  );
}

describe('OrganizationMembersRolesPanel removal', () => {
  beforeEach(() => {
    removeMember = vi.fn(async () => ({ success: true }));
    confirmData = null;
    dialogRef.current = {
      open: vi.fn((id: string, data: unknown) => {
        if (id === DIALOG_IDS.CONFIRM) confirmData = data as typeof confirmData;
      }),
    } as unknown as typeof dialogRef.current;
  });

  beforeEach(async () => {
    await testI18nReady;
    await testI18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    dialogRef.current = null;
    vi.restoreAllMocks();
  });

  it('removes a member only once the confirmation is accepted', async () => {
    renderPanel('admin');
    fireEvent.click(await screen.findByTestId('organization-member-remove'));

    // Confirmation is pending: nothing may have reached the server yet.
    await waitFor(() => expect(confirmData).not.toBeNull());
    expect(removeMember).not.toHaveBeenCalled();

    confirmData!.onConfirm();
    await waitFor(() => expect(removeMember).toHaveBeenCalledWith('org-acme', 'member-1'));
  });

  it('leaves the member in place when the confirmation is dismissed', async () => {
    renderPanel('admin');
    fireEvent.click(await screen.findByTestId('organization-member-remove'));
    await waitFor(() => expect(confirmData).not.toBeNull());

    confirmData!.onCancel();
    await waitFor(() => expect(screen.getByText('Ada')).toBeTruthy());
    expect(removeMember).not.toHaveBeenCalled();
  });

  it('offers no removal to a caller who cannot administer the org', async () => {
    renderPanel('member');
    await screen.findByTestId('organization-member-row');
    expect(screen.queryByTestId('organization-member-remove')).toBeNull();
  });

  it('shows translated member roles, presence, and security-panel copy in Japanese', async () => {
    await testI18n.changeLanguage('ja');
    renderPanel('admin');

    expect(await screen.findByText('メンバーとロール')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'メンバー' })).toBeTruthy();
    expect(screen.getByLabelText('オフライン')).toBeTruthy();
    expect(screen.getByTitle('組織から削除')).toBeTruthy();

    render(
      <I18nextProvider i18n={testI18n}>
        <OrganizationSecurityPanel />
      </I18nextProvider>,
    );
    expect(screen.getByRole('heading', { name: 'セキュリティ' })).toBeTruthy();
    expect(screen.getByText('組織の共同作業データの暗号化状態です。')).toBeTruthy();
    expect(screen.getByText('組織を選択してください。')).toBeTruthy();
  });

  it('localizes the member-removal confirmation while preserving the member name', async () => {
    await testI18n.changeLanguage('ja');
    renderPanel('admin');
    fireEvent.click(await screen.findByTestId('organization-member-remove'));

    await waitFor(() => expect(confirmData).not.toBeNull());
    expect(confirmData?.title).toBe('メンバーを削除');
    expect(confirmData?.message).toBe('Adaをこの組織から削除しますか？共有ドキュメントとトラッカーへのアクセスが失われ、再度招待する必要があります。');
    expect(confirmData?.confirmLabel).toBe('削除');
    confirmData!.onCancel();
  });
});
