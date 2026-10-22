// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ShareAccountPicker } from '../ShareAccountPicker';

let testI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  testI18n = await createI18nInstance('en');
});

describe('ShareAccountPicker', () => {
  afterEach(() => cleanup());

  it('preselects the workspace-bound account and allows an explicit choice', () => {
    const onChange = vi.fn();
    render(
      <I18nextProvider i18n={testI18n}>
        <ShareAccountPicker
          accounts={[
            { personalOrgId: 'personal', email: 'me@example.com', isSyncAccount: true, sessionStatus: 'active' },
            { personalOrgId: 'work', email: 'work@example.com', isSyncAccount: false, sessionStatus: 'active' },
          ]}
          selectedPersonalOrgId="work"
          defaultSource="workspace-binding"
          onChange={onChange}
        />
      </I18nextProvider>,
    );

    expect((screen.getByRole('radio', { name: /work@example.com/ }) as HTMLInputElement).checked).toBe(true);
    screen.getByText(/bound to this workspace/i);
    fireEvent.click(screen.getByRole('radio', { name: /me@example.com/ }));
    expect(onChange).toHaveBeenCalledWith('personal');
  });
});
