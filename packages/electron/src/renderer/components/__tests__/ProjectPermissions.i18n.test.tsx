// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectPermissionsPanel } from '../Settings/panels/ProjectPermissionsPanel';
import { TrustIndicator } from '../TrustIndicator/TrustIndicator';
import { getProjectTrustChoiceLabel } from '../ProjectTrustToast/projectTrustChoices';

const mocks = vi.hoisted(() => ({
  state: {
    loading: false, error: null, permissionMode: 'bypass-all',
    allowAllUsesClassifier: true, trustedAt: 1,
    allowedPatterns: [], additionalDirectories: [], allowedUrlPatterns: [],
  },
  setState: vi.fn(),
}));
vi.mock('jotai', () => ({
  useAtom: () => [mocks.state, mocks.setState],
  useAtomValue: () => 0,
}));
vi.mock('../../store/atoms/appSettings', () => ({
  workspacePermissionsAtomFamily: () => ({}),
  loadWorkspacePermissions: async () => mocks.state,
}));
vi.mock('../../store/atoms/permissions', () => ({ permissionsChangedVersionAtom: {} }));
vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));
vi.mock('@nimbalyst/runtime', () => ({ MaterialSymbol: () => null }));
vi.mock('../../help', () => ({ HelpTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe('project permission UI localization', () => {
  let originalAPI: typeof window.electronAPI;
  const invoke = vi.fn(async () => undefined);

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.state.allowAllUsesClassifier = true;
    originalAPI = window.electronAPI;
    window.electronAPI = { invoke } as unknown as typeof window.electronAPI;
    await i18next.changeLanguage('en');
  });

  afterEach(async () => {
    cleanup();
    window.electronAPI = originalAPI;
    await i18next.changeLanguage('en');
  });

  it('translates current trust choices while preserving permission values and code samples', async () => {
    const { container } = render(<ProjectPermissionsPanel workspacePath="/workspace" workspaceName="Example" />);
    expect(screen.getByText('Agent-verified')).toBeTruthy();
    await act(async () => { await i18next.changeLanguage('ja'); });
    const t = i18next.getFixedT('ja');
    expect(screen.getByText(getProjectTrustChoiceLabel('agent-verified', t))).toBeTruthy();
    expect(screen.getByText(getProjectTrustChoiceLabel('ask-every-time', t))).toBeTruthy();
    expect(container.querySelector('code')?.textContent).toBe('.claude/settings.local.json');
    expect(screen.getByText('*.github.com').tagName).toBe('CODE');
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(getProjectTrustChoiceLabel('ask-every-time', t)) }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('permissions:setPermissionMode', '/workspace', 'ask'));
    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('permissions:setAllowAllUsesClassifier', '/workspace', false));
  });

  it('updates the indicator aria label and keeps agent-verified distinct from allow-everything', async () => {
    const props = { workspacePath: '/workspace', onOpenSettings: vi.fn() };
    const { rerender } = render(<TrustIndicator {...props} />);
    expect(screen.getByRole('button', { name: 'Agent-verified mode' })).toBeTruthy();
    await act(async () => { await i18next.changeLanguage('ja'); });
    const t = i18next.getFixedT('ja');
    expect(screen.getByRole('button', { name: `${getProjectTrustChoiceLabel('agent-verified', t)}モード` })).toBeTruthy();
    mocks.state.allowAllUsesClassifier = false;
    rerender(<TrustIndicator {...props} />);
    expect(screen.getByRole('button', { name: `${getProjectTrustChoiceLabel('allow-everything', t)}モード` })).toBeTruthy();
  });
});
