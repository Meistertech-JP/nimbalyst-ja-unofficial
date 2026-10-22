// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DialogProvider, dialogRef } from '../../../contexts/DialogContext';
import { DIALOG_IDS } from '../../../dialogs/registry';
import { registerAccountDialogs } from '../../../dialogs/accountDialogs';

vi.mock('../AccountLoginForm', () => ({
  AccountLoginForm: () => <div data-testid="account-login-form" />,
}));

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
  registerAccountDialogs();
});

afterEach(() => {
  cleanup();
  dialogRef.current = null;
});

describe('AccountLoginDialog localization', () => {
  it('exposes a Japanese accessible name for closing sign-in', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <DialogProvider>
          <button
            type="button"
            onClick={() => dialogRef.current?.open(DIALOG_IDS.ACCOUNT_LOGIN, { mode: 'first-sign-in' })}
          >
            Open sign-in
          </button>
        </DialogProvider>
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open sign-in' }));

    expect(screen.getByRole('button', { name: 'サインインを閉じる' })).toBeDefined();
    expect(screen.getByTestId('account-login-form')).toBeDefined();
  });
});
