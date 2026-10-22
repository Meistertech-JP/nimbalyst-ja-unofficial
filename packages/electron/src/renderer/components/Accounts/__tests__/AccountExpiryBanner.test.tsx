// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountExpiryBanner } from '../AccountExpiryBanner';

vi.mock('@nimbalyst/i18n/react', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      const labels: Record<string, string> = {
        'account_ui.expired': '{{email}}のセッションの有効期限が切れました',
        'account_ui.organizations_paused': '{{organizations}}でのチーム共同作業は一時停止されます。',
        'account_ui.access_paused': 'アカウントへのアクセスは一時停止されます。',
        'account_ui.reconnect_email': '{{email}}を再接続',
        'account_ui.reconnect': '再接続',
      };
      return (labels[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, name: string) => options?.[name] ?? '');
    },
  }),
}));

describe('AccountExpiryBanner', () => {
  afterEach(() => cleanup());

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

    screen.getByText('work@example.comのセッションの有効期限が切れました');
    screen.getByText(/Work Team/);
    screen.getByText('再接続');
    fireEvent.click(screen.getByRole('button', { name: 'work@example.comを再接続' }));
    expect(onReconnect).toHaveBeenCalledWith(expect.objectContaining({ personalOrgId: 'expired' }));
  });
});
