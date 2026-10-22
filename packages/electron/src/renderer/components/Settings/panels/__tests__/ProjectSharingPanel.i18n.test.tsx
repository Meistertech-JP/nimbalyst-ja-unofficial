// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));
vi.mock('../WorkspaceProjectSharingPanel', () => ({
  WorkspaceProjectSharingPanel: () => <div data-testid="workspace-sharing-panel" />,
}));
vi.mock('../../../../utils/teamAnalytics', () => ({ trackTeamAnalyticsEvent: vi.fn() }));

import { ProjectSharingPanel } from '../ProjectSharingPanel';
import { ProjectAccessEditor } from '../ProjectAccessEditor';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

beforeEach(() => {
  (window as unknown as { electronAPI: unknown }).electronAPI = {
    organization: {
      listMembers: vi.fn(async () => ({
        callerRole: 'admin',
        members: [
          { memberId: 'member-1', name: 'Aiko', email: 'aiko@example.com', role: 'member' },
          { memberId: 'member-2', name: 'Ken', email: 'ken@example.com', role: 'owner' },
        ],
      })),
    },
    invoke: vi.fn(async () => ({ grants: [] })),
  };
});

afterEach(cleanup);

function renderWithLanguage(tree: React.ReactElement, language: 'en' | 'ja') {
  const i18n = language === 'ja' ? japaneseI18n : englishI18n;
  return render(
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale={language === 'ja' ? 'ja-JP' : 'en-US'}>
      {tree}
    </UiLanguageProvider>,
  );
}

describe('Project sharing localization', () => {
  it('localizes the sharing panel and its empty selection guidance', () => {
    renderWithLanguage(<ProjectSharingPanel />, 'ja');

    expect(screen.getByRole('heading', { name: '共有' })).toBeDefined();
    expect(screen.getByText('選択したプロジェクトの組織への関連付けとアクセス権を管理します。')).toBeDefined();
    expect(screen.getByText('共有を管理するにはプロジェクトを開くか選択してください。')).toBeDefined();
  });

  it('localizes remote project access labels while preserving dynamic identifiers', async () => {
    renderWithLanguage(
      <ProjectSharingPanel target={{ kind: 'organizationProject', orgId: 'org-123', projectId: 'project-456' }} />,
      'ja',
    );

    expect(screen.getByText('組織のリモートプロジェクト')).toBeDefined();
    expect(screen.getByText('組織 org-123 · プロジェクト project-456')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'アクセスできるユーザー' })).toBeDefined();
    expect(await screen.findByLabelText('Aikoのプロジェクトアクセス権')).toBeDefined();
    expect(screen.getAllByRole('option', { name: '編集者' })).toHaveLength(2);
    expect(screen.getByText('オーナー · プロジェクト管理者権限を継承')).toBeDefined();
  });
});
