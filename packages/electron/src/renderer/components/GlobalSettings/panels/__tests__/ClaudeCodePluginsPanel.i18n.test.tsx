import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { requestConfirmation } from '../../../../dialogs/requestConfirmation';
import { ClaudeCodePluginsPanel } from '../ClaudeCodePluginsPanel';

vi.mock('posthog-js/react', () => ({ usePostHog: () => undefined }));
vi.mock('../../../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('../../../../dialogs/requestConfirmation', () => ({
  requestConfirmation: vi.fn().mockResolvedValue(true),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('keeps marketplace diagnostics out of the Japanese primary error copy', async () => {
  const i18n = await createI18nInstance('ja');
  const backendError = 'Marketplace request failed: HTTP 503';
  const invoke = vi.fn(async (channel: string) => {
    if (channel === 'claude-plugin:fetch-marketplace') {
      return { success: false, error: backendError };
    }
    return { success: true, data: [] };
  });
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke } });

  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <ClaudeCodePluginsPanel />
    </I18nextProvider>,
  );

  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toContain('マーケットプレイスを読み込めませんでした');
  expect(screen.getByText('技術的な詳細を表示').closest('details')?.open).toBe(false);
  expect(container.textContent).toContain(backendError);
});

it('keeps install diagnostics out of the Japanese status message', async () => {
  const i18n = await createI18nInstance('ja');
  const backendError = 'Failed to install plugin: npm exited with code 1';
  const plugin = {
    name: 'sample-plugin',
    description: 'A sample plugin',
    author: 'Example',
    source: 'https://github.com/example/plugins',
    category: 'development',
  };
  const invoke = vi.fn(async (channel: string) => {
    if (channel === 'claude-plugin:fetch-marketplace') {
      return { success: true, data: { plugins: [plugin], categories: ['development'] } };
    }
    if (channel === 'claude-plugin:install') {
      return { success: false, error: backendError };
    }
    return { success: true, data: [] };
  });
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke } });

  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <ClaudeCodePluginsPanel />
    </I18nextProvider>,
  );

  fireEvent.click(await screen.findByRole('button', { name: i18n.t('claude_code_plugins_panel.install', { ns: 'extensions' }) }));

  const status = await screen.findByRole('status', { name: '' });
  await waitFor(() => expect(status.textContent).toContain(i18n.t('claude_code_plugins_panel.install_failed', { ns: 'extensions' })));
  expect(status.querySelector('details')?.open).toBe(false);
  expect(status.textContent).toContain(backendError);
  expect(invoke).toHaveBeenCalledWith('claude-plugin:install', plugin.name, plugin.source);
  expect(container.textContent).toContain(backendError);
});

it('keeps uninstall diagnostics out of the Japanese status message', async () => {
  const i18n = await createI18nInstance('ja');
  const backendError = 'Failed to uninstall plugin: permission denied';
  const installedPlugin = {
    name: 'sample-plugin',
    source: 'example-plugins',
    path: 'C:/isolated/claude/plugins/sample-plugin',
    scope: 'user' as const,
    projectPath: undefined,
    enabled: true,
  };
  const invoke = vi.fn(async (channel: string) => {
    if (channel === 'claude-plugin:list-installed') {
      return { success: true, data: [installedPlugin] };
    }
    if (channel === 'claude-plugin:uninstall') {
      return { success: false, error: backendError };
    }
    return { success: true, data: { plugins: [], categories: [] } };
  });
  vi.mocked(requestConfirmation).mockResolvedValue(true);
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke } });

  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <ClaudeCodePluginsPanel />
    </I18nextProvider>,
  );

  fireEvent.click(await screen.findByRole('button', { name: i18n.t('claude_code_plugins_panel.installed_count', { ns: 'extensions', count: 1 }) }));
  fireEvent.click(await screen.findByRole('button', { name: i18n.t('claude_code_plugins_panel.uninstall_aria', { ns: 'extensions', name: installedPlugin.name }) }));

  const status = await screen.findByRole('status', { name: '' });
  await waitFor(() => expect(status.textContent).toContain(i18n.t('claude_code_plugins_panel.uninstall_failed', { ns: 'extensions' })));
  expect(status.querySelector('details')?.open).toBe(false);
  expect(status.textContent).toContain(backendError);
  expect(requestConfirmation).toHaveBeenCalledOnce();
  expect(invoke).toHaveBeenCalledWith('claude-plugin:uninstall', {
    name: installedPlugin.name,
    source: installedPlugin.source,
    scope: installedPlugin.scope,
    projectPath: installedPlugin.projectPath,
  });
  expect(container.textContent).toContain(backendError);
});
