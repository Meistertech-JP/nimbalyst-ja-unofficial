// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { GitHubAccountPanel } from '../GitHubAccountPanel';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listAccounts: vi.fn(),
    getAccountConfig: vi.fn(),
    setDefaultAccount: vi.fn(),
    setAccountOverride: vi.fn(),
  },
}));

vi.mock('../../../../services/RendererPullRequestService', () => ({
  getPullRequestService: () => mockService,
}));

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderJapanese(scope: 'application' | 'project', workspacePath?: string) {
  return render(
    <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
      <GitHubAccountPanel scope={scope} workspacePath={workspacePath} />
    </UiLanguageProvider>,
  );
}

describe('GitHubAccountPanel localization', () => {
  it('renders the empty state and retry action in Japanese', async () => {
    mockService.listAccounts.mockResolvedValue([]);
    mockService.getAccountConfig.mockResolvedValue({ defaultAccount: null, override: null, effective: null });

    renderJapanese('application');

    expect((await screen.findByRole('heading', { name: 'GitHubアカウント' })).textContent).toBe('GitHubアカウント');
    expect(screen.getByText(/GitHub CLIアカウントが見つかりません/).textContent).toContain('gh auth login');
  });

  it('localizes the project override selector while preserving account identifiers', async () => {
    mockService.listAccounts.mockResolvedValue([
      { login: 'work-user', host: 'github.com', active: true },
    ]);
    mockService.getAccountConfig.mockResolvedValue({ defaultAccount: 'personal-user', override: null, effective: 'personal-user' });

    renderJapanese('project', '/workspace');

    expect((await screen.findByText('このプロジェクトのアカウント')).textContent).toBe('このプロジェクトのアカウント');
    expect(screen.getByRole('option', { name: '既定を使用 (personal-user)' }).textContent).toBe('既定を使用 (personal-user)');
    expect(screen.getByRole('option', { name: 'work-user (アクティブ)' }).textContent).toBe('work-user (アクティブ)');
    expect(screen.getByText(/^有効アカウント：/).textContent).toBe('有効アカウント： personal-user');
  });
});
