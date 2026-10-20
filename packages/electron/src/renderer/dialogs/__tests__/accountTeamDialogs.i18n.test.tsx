// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { registerDialog } = vi.hoisted(() => ({ registerDialog: vi.fn() }));
vi.mock('../../contexts/DialogContext', () => ({ registerDialog }));
vi.mock('../../components/ShareToTeamDialog', () => ({ ShareToTeamDialog: () => null }));
vi.mock('@nimbalyst/runtime', () => ({ MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} /> }));

import { registerAccountDialogs, type AccountLoginData } from '../accountDialogs';
import { registerTeamDialogs, type CreateTeamData } from '../teamDialogs';
import type { DialogConfig } from '../../contexts/DialogContext.types';
import { DIALOG_IDS } from '../registry';

function registered<T>(id: string) {
  return (registerDialog.mock.calls.find(([config]) => config.id === id)![0] as DialogConfig<T>).component;
}

describe('account and organization dialogs in Japanese', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('ja');
    registerDialog.mockClear();
  });

  afterEach(async () => {
    cleanup();
    await i18next.changeLanguage('en');
  });

  it('localizes the sign-in close label without changing dismissal', () => {
    registerAccountDialogs();
    const Dialog = registered<AccountLoginData>(DIALOG_IDS.ACCOUNT_LOGIN);
    const onClose = vi.fn();
    render(<Dialog isOpen onClose={onClose} data={{ mode: 'add-account' }} />);
    expect(screen.getByRole('heading', { name: '別のアカウントを追加' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'サインインを閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('describes current service-managed encryption and preserves chosen account, name, and remote', () => {
    registerTeamDialogs();
    const Dialog = registered<CreateTeamData>(DIALOG_IDS.CREATE_TEAM);
    const onCreateTeam = vi.fn();
    const onClose = vi.fn();
    render(<Dialog isOpen onClose={onClose} data={{ gitRemote: 'git@github.com:acme/private.git', suggestedName: 'Acme', accounts: [{ personalOrgId: 'work-id', email: 'work@example.com', isSyncAccount: false }, { personalOrgId: 'sync-id', email: 'me@example.com', isSyncAccount: true }], onCreateTeam }} />);
    expect(screen.getByRole('heading', { name: /組織を作成/ })).toBeTruthy();
    expect(screen.getByText('保存時に暗号化')).toBeTruthy();
    expect(screen.getByText(/暗号鍵はサービスによって管理されます/)).toBeTruthy();
    expect(screen.getByText('git@github.com:acme/private.git')).toBeTruthy();
    expect((screen.getByLabelText(/me@example.com/) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText(/work@example.com/));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  My Team  ' } });
    fireEvent.click(screen.getByRole('button', { name: '組織を作成' }));
    expect(onCreateTeam).toHaveBeenCalledWith('My Team', 'work-id');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
