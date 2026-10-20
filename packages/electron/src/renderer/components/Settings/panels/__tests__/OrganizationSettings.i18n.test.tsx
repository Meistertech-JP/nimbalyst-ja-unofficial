// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectAccessEditor } from '../ProjectAccessEditor';
import { OrganizationProjectsPanel } from '../OrganizationProjectsPanel';
import { OrganizationMembersRolesPanel } from '../OrganizationMembersRolesPanel';
import { MoveProjectWizard } from '../MoveProjectWizard';
import { MergeOrgWizard } from '../MergeOrgWizard';

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));
vi.mock('../../../../utils/teamAnalytics', () => ({ trackTeamAnalyticsEvent: vi.fn() }));
vi.mock('../../../common/AlphaBadge', () => ({ AlphaBadge: () => null }));
vi.mock('../../../common/TeamAlphaNotice', () => ({ TEAM_ALPHA_TOOLTIP: '', TeamAlphaNotice: () => null }));

describe('organization settings in Japanese', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('ja');
    window.electronAPI = {
      invoke: vi.fn().mockResolvedValue({ success: true, grants: [] }),
      organization: {
        list: vi.fn().mockResolvedValue({ success: true, teams: [{ orgId: 'org-1', name: 'Acme', role: 'admin' }] }),
        listMembers: vi.fn().mockResolvedValue({ success: true, callerRole: 'admin', members: [{ memberId: 'member-1', email: 'person@example.com', name: 'Person', role: 'member', status: 'active' }] }),
        listProjects: vi.fn().mockResolvedValue({ success: true, projects: [{ projectId: 'project-1', teamProjectId: 'team-project-1', name: null, slug: null, gitRemoteHash: 'hash' }] }),
        updateMemberRole: vi.fn().mockResolvedValue({ success: true }),
        acceptInvitation: vi.fn().mockResolvedValue({ success: true }),
      },
      stytch: { getAccounts: vi.fn().mockResolvedValue([]) },
      team: {
        moveProjectPreview: vi.fn().mockResolvedValue({ success: true, preview: { projectId: 'project-1', slug: null, slugCollision: false, custodyBlocked: false, members: [], seatDelta: 0 } }),
        moveProject: vi.fn().mockResolvedValue({ success: true, result: { destTeamProjectId: 'dest-project', movedDocuments: 2, grantsTransferred: 1, grantsPending: 0, grantsDropped: 0, grantsSkipped: 0 } }),
        mergeOrg: vi.fn().mockResolvedValue({ success: true, result: { movedProjects: [], rosterElevated: 0, rosterToInvite: 0, drainedDeleted: false, partial: false } }),
      },
    } as unknown as typeof window.electronAPI;
  });

  afterEach(async () => {
    cleanup();
    await i18next.changeLanguage('en');
  });

  it('translates access labels while sending the original project role and identifiers', async () => {
    render(<ProjectAccessEditor orgId="org-1" projectId="project-1" />);
    const select = await screen.findByTestId('project-access-role');
    expect((screen.getByRole('option', { name: 'プロジェクトへのアクセス権なし' }) as HTMLOptionElement).value).toBe('');
    expect((screen.getByRole('option', { name: 'プロジェクト管理者' }) as HTMLOptionElement).value).toBe('project-admin');
    fireEvent.change(select, { target: { value: 'project-admin' } });
    await waitFor(() => expect(window.electronAPI.invoke).toHaveBeenCalledWith('org:grant-project-access', 'org-1', 'project-1', 'member-1', 'project-admin'));
  });

  it('translates missing project names and retains the manage-access target', async () => {
    const onManageAccess = vi.fn();
    render(<OrganizationProjectsPanel orgId="org-1" onManageAccess={onManageAccess} />);
    expect(await screen.findByText('無題のプロジェクト')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'アクセス権を管理' }));
    expect(onManageAccess).toHaveBeenCalledWith('org-1', 'project-1');
  });

  it('keeps organization role option values unchanged', async () => {
    render(<OrganizationMembersRolesPanel orgId="org-1" allowOrganizationCreation={false} />);
    const select = await screen.findByTestId('member-role-select');
    expect((screen.getByRole('option', { name: 'オーナー' }) as HTMLOptionElement).value).toBe('owner');
    fireEvent.change(select, { target: { value: 'owner' } });
    await waitFor(() => expect(window.electronAPI.organization.updateMemberRole).toHaveBeenCalledWith('org-1', 'member-1', 'owner'));
  });

  it('localizes an invitation while keeping its organization identifier', async () => {
    vi.mocked(window.electronAPI.organization.list).mockResolvedValue({
      success: true,
      teams: [{ orgId: 'org-1', name: 'Acme', role: 'member', membershipType: 'invited_member', sourceEmail: 'person@example.com' }],
    });
    render(<OrganizationMembersRolesPanel allowOrganizationCreation={false} />);
    fireEvent.click(await screen.findByRole('button', { name: '承認' }));
    await waitFor(() => expect(window.electronAPI.organization.acceptInvitation).toHaveBeenCalledWith('org-1'));
    expect(screen.getByText('招待されたアカウント：person@example.com')).toBeTruthy();
  });

  it('requires the unchanged destination name before moving a project', async () => {
    const onMoved = vi.fn();
    render(<MoveProjectWizard srcOrgId="org-1" project={{ projectId: 'project-1', name: 'Application' }} destCandidates={[{ orgId: 'org-2', name: 'Destination' }]} onClose={vi.fn()} onMoved={onMoved} />);
    fireEvent.click(screen.getByTestId('move-project-dest-org-2'));
    const input = await screen.findByTestId('move-project-confirm-input');
    expect(screen.getByTestId('move-project-run').hasAttribute('disabled')).toBe(true);
    fireEvent.change(input, { target: { value: 'Destination' } });
    fireEvent.click(screen.getByTestId('move-project-run'));
    await waitFor(() => expect(window.electronAPI.team.moveProject).toHaveBeenCalledWith('org-1', 'project-1', 'org-2', undefined));
    expect(await screen.findByText('Destinationへプロジェクトを移動しました')).toBeTruthy();
  });

  it('requires the original organization name for a merge in Japanese', async () => {
    render(<MergeOrgWizard drainedOrg={{ orgId: 'org-1', name: 'Acme' }} survivorCandidates={[{ orgId: 'org-2', name: 'Destination' }]} projectCount={1} memberCount={2} onClose={vi.fn()} onMerged={vi.fn()} />);
    fireEvent.click(screen.getByTestId('merge-org-survivor-org-2'));
    expect(screen.getByTestId('merge-org-run').hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByTestId('merge-org-confirm-input'), { target: { value: 'Acme' } });
    fireEvent.click(screen.getByTestId('merge-org-run'));
    await waitFor(() => expect(window.electronAPI.team.mergeOrg).toHaveBeenCalledWith('org-1', 'org-2', false));
  });
});
