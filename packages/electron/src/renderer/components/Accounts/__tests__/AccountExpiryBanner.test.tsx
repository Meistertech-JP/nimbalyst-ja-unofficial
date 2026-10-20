// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountExpiryBanner } from '../AccountExpiryBanner';

describe('AccountExpiryBanner', () => {
  afterEach(async () => {
    cleanup();
    await i18next.changeLanguage('en');
  });

  it('localizes the expired account notice and keeps the reconnect target intact', async () => {
    await i18next.changeLanguage('ja');
    const account = { personalOrgId: 'expired', personalUserId: 'u1', email: 'work@example.com', isSyncAccount: false, sessionStatus: 'expired' as const };
    const onReconnect = vi.fn();
    render(<AccountExpiryBanner accounts={[account]} organizations={[{ orgId: 'org-work', name: 'Work Team', role: 'admin', sourcePersonalOrgId: 'expired' }]} onReconnect={onReconnect} />);

    expect(screen.getByTestId('account-expiry-banner').textContent).toContain('work@example.comのセッションの有効期限が切れました');
    expect(screen.getByText('work@example.com').tagName).toBe('STRONG');
    expect(screen.getByText('再接続するまで、Work Teamでのチーム共同作業は一時停止されます。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'work@example.comを再接続' }));
    expect(onReconnect).toHaveBeenCalledWith(account);
  });

  it('persists expired account identity and opens account-scoped re-auth', () => {
    const onReconnect = vi.fn();
    render(
      <AccountExpiryBanner
        accounts={[
          { personalOrgId: 'expired', personalUserId: 'u1', email: 'work@example.com', isSyncAccount: false, sessionStatus: 'expired' },
          { personalOrgId: 'active', personalUserId: 'u2', email: 'me@example.com', isSyncAccount: true, sessionStatus: 'active' },
        ]}
        organizations={[
          { orgId: 'org-work', name: 'Work Team', role: 'admin', sourcePersonalOrgId: 'expired' },
        ]}
        onReconnect={onReconnect}
      />,
    );

    expect(screen.getByText(/work@example.com/)).toBeTruthy();
    expect(screen.getByText(/Work Team/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect work@example.com' }));
    expect(onReconnect).toHaveBeenCalledWith(expect.objectContaining({ personalOrgId: 'expired' }));
  });
});
