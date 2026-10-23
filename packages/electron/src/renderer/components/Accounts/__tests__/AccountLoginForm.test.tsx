// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { resources } from '@nimbalyst/i18n/resources';

import { AccountLoginForm } from '../AccountLoginForm';
import type { PersonalAccountSummary } from '../../../store/atoms/settingsDomains';

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

const sendMagicLink = vi.fn(async (): Promise<{ success: boolean; error?: string }> => ({ success: true }));
const signInWithGoogle = vi.fn(async (): Promise<{ success: boolean; error?: string }> => ({ success: true }));
const getAccounts = vi.fn(async (): Promise<PersonalAccountSummary[]> => []);
const testI18n = createInstance();
const testI18nReady = testI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources,
  ns: Object.keys(resources.en),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

function render(ui: React.ReactElement) {
  return rtlRender(ui, {
    wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>,
  });
}

function storedAccount(overrides: Partial<PersonalAccountSummary> = {}): PersonalAccountSummary {
  return {
    personalOrgId: 'personal-sync',
    personalUserId: 'member-sync',
    email: 'sync@example.com',
    isSyncAccount: true,
    sessionStatus: 'active',
    ...overrides,
  };
}

beforeEach(async () => {
  await testI18nReady;
  await testI18n.changeLanguage('en');
  sendMagicLink.mockClear().mockResolvedValue({ success: true });
  signInWithGoogle.mockClear().mockResolvedValue({ success: true });
  getAccounts.mockClear().mockResolvedValue([]);
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: { stytch: { sendMagicLink, signInWithGoogle, getAccounts } },
  });
});

afterEach(() => cleanup());

function clickGoogle() {
  fireEvent.click(screen.getByRole('button', { name: /Continue (with Google|as )/ }));
}

function submitMagicLink(email?: string) {
  if (email !== undefined) {
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: email } });
  }
  fireEvent.click(screen.getByRole('button', { name: /^(Send magic link|マジックリンクを送信)/ }));
}

describe('AccountLoginForm encrypted-storage errors', () => {
  it.each(['en', 'ja'] as const)('localizes returned storage errors in %s without entering a waiting state', async language => {
    await testI18n.changeLanguage(language);
    signInWithGoogle.mockResolvedValue({ success: false, error: 'StytchCredentialStorageError: Credential storage: encryption-unavailable' });
    render(<AccountLoginForm mode="org-onboarding" />);
    fireEvent.click(screen.getByRole('button', { name: /Google/ }));
    const expected = language === 'ja'
      ? '認証情報を安全に保存できないため、サインインを完了できませんでした。'
      : 'Sign-in could not be completed because authentication information could not be stored securely.';
    expect(await screen.findByText(expected)).toBeTruthy();
    expect(screen.queryByText(/Credential storage:/)).toBeNull();
    expect(screen.queryByTestId('account-login-waiting')).toBeNull();
  });

  it.each(['en', 'ja'] as const)('does not show provider-auth diagnostics in %s', async language => {
    await testI18n.changeLanguage(language);
    signInWithGoogle.mockResolvedValue({
      success: false,
      error: 'OAuth callback failed: invalid_grant from identity.example',
    });
    render(<AccountLoginForm mode="org-onboarding" />);
    fireEvent.click(screen.getByRole('button', { name: /Google/ }));
    const expected = language === 'ja' ? 'サインインを開始できませんでした。' : 'Could not start sign-in.';
    expect(await screen.findByText(expected)).toBeTruthy();
    expect(screen.queryByText(/OAuth callback failed|invalid_grant/)).toBeNull();
  });

  it.each(['en', 'ja'] as const)('does not show provider errors when sending a magic link in %s', async language => {
    await testI18n.changeLanguage(language);
    sendMagicLink.mockResolvedValue({
      success: false,
      error: 'Rate limit exceeded; try again later.',
    });
    render(<AccountLoginForm mode="org-onboarding" />);
    submitMagicLink('user@example.com');
    const expected = language === 'ja' ? 'サインインリンクを送信できませんでした。' : 'Could not send the sign-in link.';
    expect(await screen.findByText(expected)).toBeTruthy();
    expect(screen.queryByText(/Rate limit exceeded/)).toBeNull();
  });

  it.each(['en', 'ja'] as const)('localizes rejected IPC storage errors in %s', async language => {
    await testI18n.changeLanguage(language);
    signInWithGoogle.mockRejectedValue(new Error("Error invoking remote method 'stytch:sign-in-google': StytchCredentialStorageError: Credential storage: write-failed"));
    render(<AccountLoginForm mode="first-sign-in" />);
    fireEvent.click(screen.getByRole('button', { name: /Google/ }));
    const expected = language === 'ja'
      ? '認証情報を安全に保存できないため、サインインを完了できませんでした。'
      : 'Sign-in could not be completed because authentication information could not be stored securely.';
    expect(await screen.findByText(expected)).toBeTruthy();
    expect(screen.queryByText(/Credential storage:/)).toBeNull();
  });
});

describe('AccountLoginForm intent', () => {
  it('signs in with no stored accounts', async () => {
    render(<AccountLoginForm mode="first-sign-in" />);

    clickGoogle();
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledWith({ intent: 'sign-in' }));

    submitMagicLink('new@example.com');
    await waitFor(() => expect(sendMagicLink)
      .toHaveBeenCalledWith('new@example.com', { intent: 'sign-in' }));
  });

  /**
   * The Share dialog and the Sync panel both show the primary form whenever the
   * singleton session is gone — which includes a sync account whose session
   * merely expired. Main rejects `sign-in` outright once any account is stored,
   * so the form has to read the live accounts list, not just its mode.
   */
  it('adds instead of signing in when an account is already stored', async () => {
    getAccounts.mockResolvedValue([storedAccount({ sessionStatus: 'expired' })]);
    render(<AccountLoginForm mode="first-sign-in" />);

    clickGoogle();
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledWith({ intent: 'add-account' }));

    submitMagicLink('sync@example.com');
    await waitFor(() => expect(sendMagicLink)
      .toHaveBeenCalledWith('sync@example.com', { intent: 'add-account' }));
  });

  it('picks the org-onboarding intent from the accounts that exist', async () => {
    const { unmount } = render(<AccountLoginForm mode="org-onboarding" />);
    clickGoogle();
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledWith({ intent: 'sign-in' }));
    unmount();

    getAccounts.mockResolvedValue([storedAccount()]);
    render(<AccountLoginForm mode="org-onboarding" />);
    clickGoogle();
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledWith({ intent: 'add-account' }));
  });

  // A magic link could not add an account at all before the intent argument.
  it('adds an account by magic link as well as by Google', async () => {
    getAccounts.mockResolvedValue([storedAccount()]);
    render(<AccountLoginForm mode="add-account" />);

    submitMagicLink('second@example.com');
    await waitFor(() => expect(sendMagicLink)
      .toHaveBeenCalledWith('second@example.com', { intent: 'add-account' }));

    // Never derived from the accounts list: the mode is already explicit.
    expect(getAccounts).not.toHaveBeenCalled();
  });

  it('reconnects the named account by both methods', async () => {
    const account = storedAccount({
      personalOrgId: 'personal-secondary',
      email: 'secondary@example.com',
      isSyncAccount: false,
      sessionStatus: 'expired',
    });
    render(<AccountLoginForm mode="reauth" account={account} />);

    clickGoogle();
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledWith({
      intent: 'reauth',
      targetPersonalOrgId: 'personal-secondary',
    }));

    // The address is fixed to the account being reconnected.
    submitMagicLink();
    await waitFor(() => expect(sendMagicLink).toHaveBeenCalledWith('secondary@example.com', {
      intent: 'reauth',
      targetPersonalOrgId: 'personal-secondary',
    }));
  });

  it('does not expose rejected intent diagnostics or pretend the flow started', async () => {
    signInWithGoogle.mockRejectedValue(new Error('Add-account requires an existing account'));
    render(<AccountLoginForm mode="add-account" />);

    clickGoogle();
    expect(await screen.findByText('Could not start sign-in.')).toBeTruthy();
    expect(screen.queryByText(/Add-account requires/)).toBeNull();
    expect(screen.queryByTestId('account-login-waiting')).toBeNull();
  });

  // Resending renews the same pending flow in main; the form must keep sending
  // the same intent rather than starting a differently-scoped one.
  it('resends the waiting magic link with the same intent', async () => {
    getAccounts.mockResolvedValue([storedAccount()]);
    render(<AccountLoginForm mode="org-onboarding" />);

    submitMagicLink('greg@acme.com');
    await screen.findByTestId('account-login-waiting');

    fireEvent.click(screen.getByTestId('account-login-resend'));
    await waitFor(() => expect(sendMagicLink).toHaveBeenCalledTimes(2));
    expect(sendMagicLink.mock.calls[1]).toEqual(['greg@acme.com', { intent: 'add-account' }]);
  });
});
