// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

import type { OpenCodeAgentCatalogSnapshot } from '../../../../shared/openCodeAgentCatalog';

const mockedMenuState = vi.hoisted(() => ({ isOpen: false }));

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: () => null,
}));

vi.mock('../../../hooks/useFloatingMenu', () => ({
  FloatingPortal: ({ children }: { children: React.ReactNode }) => children,
  useFloatingMenu: () => ({
    isOpen: mockedMenuState.isOpen,
    setIsOpen: vi.fn(),
    refs: { setReference: vi.fn(), setFloating: vi.fn() },
    floatingStyles: {},
    getReferenceProps: () => ({}),
    getFloatingProps: () => ({}),
  }),
}));

import { OpenCodeRoleSelector } from '../OpenCodeRoleSelector';

const UNDISCOVERED: OpenCodeAgentCatalogSnapshot = { agents: [], discovered: false };
const ONE_ROLE: OpenCodeAgentCatalogSnapshot = {
  discovered: true,
  agents: [
    {
      name: 'plan',
      mode: 'primary',
      builtIn: true,
      model: { providerID: 'anthropic', modelID: 'claude-opus-4-1' },
      permission: { edit: 'deny', bash: {} },
    },
    {
      name: 'review',
      mode: 'primary',
      builtIn: false,
      description: 'Review changes carefully',
      permission: { edit: 'ask', bash: {} },
    },
  ],
};

async function renderWithLanguage(language: 'en' | 'ja', element: React.ReactNode) {
  const i18n = await createI18nInstance(language);
  const wrap = (child: React.ReactNode) => (
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
      {child}
    </UiLanguageProvider>
  );
  const view = render(wrap(element));
  return { ...view, rerender: (child: React.ReactNode) => view.rerender(wrap(child)) };
}

describe('OpenCodeRoleSelector', () => {
  afterEach(() => {
    cleanup();
    mockedMenuState.isOpen = false;
    delete (window as any).electronAPI;
    vi.clearAllMocks();
  });

  it('appears when the first turn discovers roles, with no remount', async () => {
    // Roles only exist once a server is running, and the first turn is what
    // starts one. Fetching only on mount left the control hidden for the whole
    // ordinary path -- open a session, send a prompt -- because nothing it
    // depended on changed when the roles arrived.
    const openCodeAgentCatalogGet = vi
      .fn()
      .mockResolvedValueOnce({ success: true, catalog: UNDISCOVERED })
      .mockResolvedValue({ success: true, catalog: ONE_ROLE });
    (window as any).electronAPI = { openCodeAgentCatalogGet };

    const view = await renderWithLanguage('en',
      <OpenCodeRoleSelector
        workspacePath="/tmp/project"
        role={null}
        onRoleChange={vi.fn()}
        turnActive={false}
      />
    );

    await waitFor(() => expect(openCodeAgentCatalogGet).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('opencode-role-selector')).toBeNull();

    view.rerender(
      <OpenCodeRoleSelector
        workspacePath="/tmp/project"
        role={null}
        onRoleChange={vi.fn()}
        turnActive
      />
    );

    await waitFor(() => expect(screen.getByTestId('opencode-role-selector')).toBeTruthy());
  });

  it('keeps a discovered role listed when a later read finds no running server', async () => {
    const openCodeAgentCatalogGet = vi
      .fn()
      .mockResolvedValueOnce({ success: true, catalog: ONE_ROLE })
      .mockResolvedValue({ success: true, catalog: UNDISCOVERED });
    (window as any).electronAPI = { openCodeAgentCatalogGet };

    const view = await renderWithLanguage('en',
      <OpenCodeRoleSelector
        workspacePath="/tmp/project"
        role={null}
        onRoleChange={vi.fn()}
        turnActive={false}
      />
    );

    await waitFor(() => expect(screen.getByTestId('opencode-role-selector')).toBeTruthy());

    view.rerender(
      <OpenCodeRoleSelector
        workspacePath="/tmp/project"
        role={null}
        onRoleChange={vi.fn()}
        turnActive
      />
    );

    await waitFor(() => expect(openCodeAgentCatalogGet).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('opencode-role-selector')).toBeTruthy();
  });

  it('renders role controls, origin, conflict and permissions in Japanese', async () => {
    mockedMenuState.isOpen = true;
    (window as any).electronAPI = {
      openCodeAgentCatalogGet: vi.fn().mockResolvedValue({ success: true, catalog: ONE_ROLE }),
    };

    await renderWithLanguage('ja',
      <OpenCodeRoleSelector
        workspacePath="/tmp/project"
        role="plan"
        currentModel="opencode:anthropic/claude-sonnet-4-5"
        onModelChange={vi.fn()}
        onRoleChange={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByTestId('opencode-role-selector')).toBeTruthy());
    expect(screen.getByTestId('opencode-role-selector').getAttribute('aria-label'))
      .toBe('セッションのロール: plan');
    expect(screen.getByText('デフォルト')).toBeTruthy();
    expect(screen.getByText('組み込み')).toBeTruthy();
    expect(screen.getByText('カスタム')).toBeTruthy();
    expect(screen.getByText('Review changes carefully')).toBeTruthy();
    expect(screen.getByText('編集不可')).toBeTruthy();
    expect(screen.getByText(/このロールにはanthropic\/claude-opus-4-1が設定されています。/)).toBeTruthy();
    expect(screen.getByText(/セッション側のモデルは各プロンプトとともに送信され、優先して実行されます。/)).toBeTruthy();
    expect(screen.getByText('セッションのモデルをanthropic/claude-opus-4-1に切り替える')).toBeTruthy();
  });
});
