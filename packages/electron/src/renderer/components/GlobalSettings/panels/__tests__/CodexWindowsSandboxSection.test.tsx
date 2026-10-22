import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'jotai';
import { createInstance } from 'i18next';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import settingsEn from '../../../../../../../i18n/src/resources/en/settings.json';
import settingsJa from '../../../../../../../i18n/src/resources/ja/settings.json';
vi.mock('../../../../store/atoms/openProjects', async () => ({
  activeWorkspacePathAtom: (await import('jotai')).atom('C:\\project'),
}));
import { CodexWindowsSandboxSection } from '../CodexWindowsSandboxSection';

afterEach(cleanup);

async function createSettingsI18n(locale: 'en' | 'ja') {
  const i18n = createInstance();
  await i18n.init({
    lng: locale,
    fallbackLng: 'en',
    ns: ['settings'],
    defaultNS: 'settings',
    resources: { en: { settings: settingsEn }, ja: { settings: settingsJa } },
    interpolation: { escapeValue: false },
  });
  return i18n;
}

it('starts only the user-selected setup for the active project and surfaces its failure', async () => {
  const i18n = await createSettingsI18n('en');
  const invoke = vi.fn().mockResolvedValueOnce({ phase: 'idle', readiness: 'notConfigured', allowedModes: ['elevated'] })
    .mockRejectedValueOnce(new Error('Windows setup was cancelled'));
  window.electronAPI = { ...window.electronAPI, invoke };
  render(<UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US"><Provider><CodexWindowsSandboxSection /></Provider></UiLanguageProvider>);
  const setup = await screen.findByRole('button', { name: 'Set up sandbox (recommended)' });
  expect(screen.queryByRole('button', { name: 'Set up without administrator access' })).toBeNull();
  expect(invoke).toHaveBeenCalledTimes(1);
  fireEvent.click(setup);
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('openai-codex:sandbox-setup', 'elevated', 'C:\\project'));
  expect((await screen.findByRole('alert')).textContent).toContain('Windows setup was cancelled');
});

it('renders sandbox setup and administrator approval copy in Japanese', async () => {
  const i18n = await createSettingsI18n('ja');
  window.electronAPI = {
    ...window.electronAPI,
    invoke: vi.fn().mockResolvedValue({ phase: 'idle', readiness: 'notConfigured', allowedModes: ['elevated', 'unelevated'] }),
  };
  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <Provider><CodexWindowsSandboxSection /></Provider>
    </UiLanguageProvider>,
  );

  screen.getByRole('heading', { name: 'Windowsサンドボックス' });
  screen.getByText(/Windows管理者の承認を求められることがあります/);
  await screen.findByRole('button', { name: 'サンドボックスをセットアップ（推奨）' });
  await screen.findByRole('button', { name: '管理者権限なしでセットアップ' });
  screen.getByRole('button', { name: '状態を確認' });
});
