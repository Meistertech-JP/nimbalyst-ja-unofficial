// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountLoginForm } from '../AccountLoginForm';

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

const signInWithGoogle = vi.fn();
const addAccount = vi.fn();
const sendMagicLink = vi.fn();

describe('AccountLoginForm Japanese UI', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('ja');
    signInWithGoogle.mockReset().mockResolvedValue({ success: true });
    addAccount.mockReset().mockResolvedValue({ success: true });
    sendMagicLink.mockReset().mockResolvedValue({ success: true });
    (window as any).electronAPI = { stytch: { signInWithGoogle, addAccount, sendMagicLink } };
  });

  afterEach(async () => {
    cleanup();
    await i18next.changeLanguage('en');
  });

  it('localizes first sign-in without changing the Google sign-in action', async () => {
    render(<AccountLoginForm mode="first-sign-in" />);
    expect(screen.getByRole('heading', { name: 'サインインして始めましょう' })).toBeTruthy();
    expect(screen.getByLabelText('メールアドレス').getAttribute('placeholder')).toBe('you@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Googleで続行' }));
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledTimes(1));
    expect(addAccount).not.toHaveBeenCalled();
  });

  it('localizes fallback failures but preserves service error messages when adding an account', async () => {
    addAccount.mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: false, error: 'Provider-specific E_AUTH_42' });
    render(<AccountLoginForm mode="add-account" />);
    expect(screen.getByRole('heading', { name: '別のアカウントを追加' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Googleで続行' }));
    expect(await screen.findByText('サインインを開始できませんでした。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Googleで続行' }));
    expect(await screen.findByText('Provider-specific E_AUTH_42')).toBeTruthy();
    expect(signInWithGoogle).not.toHaveBeenCalled();
  });

  it('keeps reauthentication locked to the original email and sends its magic link', async () => {
    render(<AccountLoginForm mode="reauth" account={{ personalOrgId: 'expired-id', personalUserId: 'user-id', email: 'work@example.com', isSyncAccount: false, sessionStatus: 'expired' }} />);
    expect(screen.getByRole('heading', { name: 'このアカウントを再接続' })).toBeTruthy();
    const email = screen.getByLabelText('メールアドレス') as HTMLInputElement;
    expect(email.value).toBe('work@example.com');
    expect(email.disabled).toBe(true);
    expect(screen.getByText('work@example.com').tagName).toBe('STRONG');
    fireEvent.click(screen.getByRole('button', { name: 'work@example.comにマジックリンクを送信' }));
    expect(await screen.findByText('work@example.comに届いたサインインリンクを確認してください。')).toBeTruthy();
    expect(sendMagicLink).toHaveBeenCalledWith('work@example.com');
  });
});
