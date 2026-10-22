// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { OrganizationProjectsPanel } from '../OrganizationProjectsPanel';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
const listProjects = vi.fn();

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

beforeEach(() => {
  listProjects.mockReset().mockResolvedValue({ success: true, projects: [] });
  (window as unknown as { electronAPI: unknown }).electronAPI = {
    organization: { listProjects },
  };
});

afterEach(cleanup);

function renderPanel(onManageAccess = vi.fn()) {
  return render(
    <I18nextProvider i18n={japaneseI18n}>
      <OrganizationProjectsPanel orgId="org-1" onManageAccess={onManageAccess} />
    </I18nextProvider>,
  );
}

describe('OrganizationProjectsPanel localization', () => {
  it('shows localized organization-space and empty-state guidance', async () => {
    renderPanel();

    expect(await screen.findByRole('heading', { name: 'プロジェクト' })).toBeDefined();
    expect(screen.getByText('組織スペース')).toBeDefined();
    expect(screen.getByText(/共有するドキュメントとトラッカー用のスペース/)).toBeDefined();
    expect(screen.getByText('今後追加予定')).toBeDefined();
    expect(screen.getByTestId('organization-projects-empty').textContent).toContain('プロジェクトはまだありません。');
    expect(screen.getByText(/プロジェクトを追加するには/)).toBeDefined();
    await waitFor(() => expect(listProjects).toHaveBeenCalledWith('org-1'));
  });

  it('localizes project metadata and preserves the access-management action', async () => {
    listProjects.mockResolvedValueOnce({
      success: true,
      projects: [{
        projectId: 'project-1',
        teamProjectId: 'team-project-1',
        name: null,
        slug: null,
        gitRemoteHash: null,
      }],
    });
    const onManageAccess = vi.fn();
    renderPanel(onManageAccess);

    expect(await screen.findByText('無題のプロジェクト')).toBeDefined();
    expect(screen.getByText('ローカルワークスペース未連携')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'アクセス権を管理' }));
    expect(onManageAccess).toHaveBeenCalledWith('org-1', 'project-1');
  });
});
