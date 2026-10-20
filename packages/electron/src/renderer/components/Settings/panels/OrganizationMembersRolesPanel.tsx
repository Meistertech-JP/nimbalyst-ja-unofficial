import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialSymbol } from '@nimbalyst/runtime';
import { ActionGuard } from './ActionGuard';
import { AlphaBadge } from '../../common/AlphaBadge';
import { TEAM_ALPHA_TOOLTIP, TeamAlphaNotice } from '../../common/TeamAlphaNotice';
import {
  bucketMemberCount,
  categorizeTeamAnalyticsError,
} from '../../../../shared/analytics/teamAnalytics';
import { trackTeamAnalyticsEvent } from '../../../utils/teamAnalytics';

interface Member {
  memberId: string;
  email: string;
  name: string;
  status: string;
  role: string;
}

interface OrganizationSummary {
  orgId: string;
  name: string;
  role: string;
  membershipType?: string;
  sourceEmail?: string | null;
}

interface PersonalAccount {
  personalOrgId: string;
  email: string | null;
}

export function OrganizationMembersRolesPanel({
  orgId,
  readOnlyRoles = false,
  allowOrganizationCreation = true,
}: {
  orgId?: string;
  readOnlyRoles?: boolean;
  allowOrganizationCreation?: boolean;
}) {
  const { t } = useTranslation(['settings', 'project', 'common']);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [callerRole, setCallerRole] = useState('member');
  const [inviteEmail, setInviteEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [newOrganizationName, setNewOrganizationName] = useState('');
  const [sourcePersonalOrgId, setSourcePersonalOrgId] = useState('');

  const refresh = useCallback(async () => {
    const directory = await window.electronAPI.organization.list();
    const teams = directory?.success && Array.isArray(directory.teams) ? directory.teams : [];
    setOrganizations(teams);
    const accountResult = await window.electronAPI.stytch.getAccounts();
    const accountRows = Array.isArray(accountResult) ? accountResult : [];
    setAccounts(accountRows);
    setSourcePersonalOrgId((current) => current || accountRows[0]?.personalOrgId || '');
    if (!orgId) return;
    const roster = await window.electronAPI.organization.listMembers(orgId);
    if (roster?.success) {
      setMembers(roster.members ?? []);
      setCallerRole(roster.callerRole ?? teams.find((team: OrganizationSummary) => team.orgId === orgId)?.role ?? 'member');
    }
  }, [orgId]);

  useEffect(() => { void refresh().catch((reason) => setError(String(reason))); }, [refresh]);
  const canAdminister = callerRole === 'owner' || callerRole === 'admin';
  const analyticsCallerRole = callerRole === 'owner' || callerRole === 'admin' || callerRole === 'member'
    ? callerRole
    : 'unknown';
  const selected = organizations.find((organization) => organization.orgId === orgId);
  const pending = organizations.filter((organization) => organization.membershipType && organization.membershipType !== 'active_member');

  return (
    <section className="organization-members-roles-panel" data-testid="organization-members-roles-panel" data-component="OrganizationMembersRolesPanel">
      <header className="mb-5 border-b border-[var(--nim-border)] pb-4">
        <h2 className="m-0 flex items-center gap-2 text-xl font-semibold">
          {t('settings:organization_ui.members_roles')}
          <AlphaBadge size="sm" tooltip={t('settings:organization_ui.alpha_tooltip', { defaultValue: TEAM_ALPHA_TOOLTIP })} />
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--nim-text-muted)]">
          {selected ? `${selected.name} · ${t(`project:org.role_${callerRole}`, { defaultValue: callerRole })}${selected.sourceEmail ? ` · ${selected.sourceEmail}` : ''}` : t('settings:organization_ui.choose')}
        </p>
      </header>

      {pending.length > 0 && (
        <div className="organization-invitation-inbox mb-5" data-testid="organization-invitation-inbox">
          <h3 className="m-0 mb-2 text-sm font-semibold">{t('settings:organization_ui.pending_invitations')}</h3>
          <div className="flex flex-col gap-2">
            {pending.map((invitation) => (
              <article key={`${invitation.orgId}:${invitation.sourceEmail ?? ''}`} className="pending-invitation-card flex items-center gap-3 rounded-lg border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-3" data-testid="pending-invitation-card">
                <MaterialSymbol icon="mail" size={18} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{invitation.name}</div>
                  <div className="text-xs text-[var(--nim-text-muted)]">{t('settings:organization_ui.invited_account', { account: invitation.sourceEmail ?? t('settings:organization_ui.signed_in_account') })}</div>
                </div>
                <button
                  type="button"
                  className="pending-invitation-accept rounded-md bg-[var(--nim-primary)] px-3 py-1.5 text-xs font-semibold text-white"
                  data-testid="pending-invitation-accept"
                  onClick={() => void window.electronAPI.organization.acceptInvitation(invitation.orgId)
                    .then((result) => {
                      if (result?.success === false) throw new Error(result.error ?? t('settings:organization_ui.accept_failed'));
                      trackTeamAnalyticsEvent('team_invitation_accepted', {
                        surface: 'desktop',
                        entryPoint: 'organization_manager',
                        projectMatched: false,
                      });
                      return refresh();
                    })
                    .catch((reason) => {
                      trackTeamAnalyticsEvent('team_operation_failed', {
                        surface: 'desktop',
                        operation: 'accept_invitation',
                        entryPoint: 'organization_manager',
                        callerRole: analyticsCallerRole,
                        errorCategory: categorizeTeamAnalyticsError('organization', reason),
                      });
                      setError(String(reason));
                    })}
                >
                  {t('settings:organization_ui.accept')}
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      {allowOrganizationCreation && <details className="new-organization-card mb-5 rounded-lg border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-3" data-testid="new-organization-card">
        <summary className="cursor-pointer text-sm font-semibold">{t('settings:organization_ui.new')}</summary>
        <TeamAlphaNotice className="mt-3" />
        <form
          className="mt-3 flex flex-col gap-2"
          data-testid="new-organization-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!newOrganizationName.trim()) return;
            void window.electronAPI.organization.create({
              name: newOrganizationName.trim(),
              sourcePersonalOrgId: sourcePersonalOrgId || undefined,
            }).then((result) => {
              if (!result?.success) throw new Error(result?.error ?? t('settings:organization_ui.create_failed'));
              trackTeamAnalyticsEvent('team_organization_created', {
                surface: 'desktop',
                entryPoint: 'organization_manager',
                projectAttached: false,
                encryptionMode: 'server_managed',
                memberCountBucket: bucketMemberCount(1),
              });
              setNewOrganizationName('');
              return refresh();
            }).catch((reason) => {
              trackTeamAnalyticsEvent('team_operation_failed', {
                surface: 'desktop',
                operation: 'create_organization',
                entryPoint: 'organization_manager',
                callerRole: analyticsCallerRole,
                errorCategory: categorizeTeamAnalyticsError('organization', reason),
              });
              setError(String(reason));
            });
          }}
        >
          {accounts.length > 1 && (
            <label className="text-xs text-[var(--nim-text-muted)]">{t('settings:organization_ui.owning_account')}<select className="mt-1 block w-full rounded border border-[var(--nim-border)] bg-[var(--nim-bg)] px-2 py-2 text-sm text-[var(--nim-text)]" value={sourcePersonalOrgId} onChange={(event) => setSourcePersonalOrgId(event.target.value)}>{accounts.map((account) => <option key={account.personalOrgId} value={account.personalOrgId}>{account.email ?? account.personalOrgId}</option>)}</select></label>
          )}
          <div className="flex gap-2"><input className="min-w-0 flex-1 rounded border border-[var(--nim-border)] bg-[var(--nim-bg)] px-3 py-2 text-sm" value={newOrganizationName} onChange={(event) => setNewOrganizationName(event.target.value)} placeholder={t('settings:organization_ui.name')} /><button className="rounded bg-[var(--nim-primary)] px-3 py-2 text-sm font-semibold text-white" type="submit">{t('common:create')}</button></div>
        </form>
      </details>}

      {orgId && (
        <>
          <div className="organization-roster flex flex-col gap-2" data-testid="organization-roster">
            {members.map((member) => (
              <div key={member.memberId} className="member-row flex items-center gap-3 rounded-lg border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-3" data-testid="organization-member-row">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{member.name || member.email}</div>
                  <div className="truncate text-xs text-[var(--nim-text-muted)]">{member.email}</div>
                </div>
                {readOnlyRoles ? (
                  <span className="member-role-badge rounded-full bg-[var(--nim-bg-tertiary)] px-2.5 py-1 text-xs capitalize text-[var(--nim-text-muted)]">
                    {t(`project:org.role_${member.role}`, { defaultValue: member.role })}
                  </span>
                ) : <select
                  value={member.role}
                  disabled={!canAdminister}
                  className="member-role-select rounded border border-[var(--nim-border)] bg-[var(--nim-bg-tertiary)] px-2 py-1 text-xs disabled:cursor-not-allowed"
                  data-testid="member-role-select"
                  onChange={(event) => {
                    const nextRole = event.target.value;
                    void window.electronAPI.organization.updateMemberRole(orgId, member.memberId, nextRole)
                      .then((result) => {
                        if (result?.success === false) throw new Error(result.error ?? t('settings:organization_ui.role_failed'));
                        trackTeamAnalyticsEvent('team_member_role_changed', {
                          surface: 'desktop',
                          callerRole: analyticsCallerRole,
                          fromRole: member.role === 'owner' || member.role === 'admin' || member.role === 'member' ? member.role : 'unknown',
                          toRole: nextRole === 'owner' || nextRole === 'admin' || nextRole === 'member' ? nextRole : 'unknown',
                        });
                        return refresh();
                      })
                      .catch((reason) => {
                        trackTeamAnalyticsEvent('team_operation_failed', {
                          surface: 'desktop',
                          operation: 'change_member_role',
                          entryPoint: 'organization_manager',
                          callerRole: analyticsCallerRole,
                          errorCategory: categorizeTeamAnalyticsError('organization', reason),
                        });
                        setError(String(reason));
                      });
                  }}
                >
                  <option value="member">{t('project:org.role_member')}</option>
                  <option value="admin">{t('project:org.role_admin')}</option>
                  <option value="owner">{t('project:org.role_owner')}</option>
                </select>}
              </div>
            ))}
          </div>

          <ActionGuard allowed={canAdminister} reason={t('settings:organization_ui.invite_requires_admin')}>
            <form
              className="organization-invite-form mt-4 flex gap-2"
              data-testid="organization-invite-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!inviteEmail.trim()) return;
                void window.electronAPI.organization.inviteMember(orgId, inviteEmail.trim())
                  .then((result) => {
                    if (result?.success === false) throw new Error(result.error ?? t('settings:organization_ui.invite_failed'));
                    trackTeamAnalyticsEvent('team_invitation_sent', {
                      surface: 'desktop',
                      entryPoint: 'organization_manager',
                      callerRole: analyticsCallerRole,
                      memberCountBucket: bucketMemberCount(members.length + 1),
                    });
                    setInviteEmail('');
                    return refresh();
                  })
                  .catch((reason) => {
                    trackTeamAnalyticsEvent('team_operation_failed', {
                      surface: 'desktop',
                      operation: 'send_invitation',
                      entryPoint: 'organization_manager',
                      callerRole: analyticsCallerRole,
                      errorCategory: categorizeTeamAnalyticsError('organization', reason),
                    });
                    setError(String(reason));
                  });
              }}
            >
              <input className="min-w-0 flex-1 rounded border border-[var(--nim-border)] bg-[var(--nim-bg)] px-3 py-2 text-sm" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="teammate@example.com" />
              <button className="rounded bg-[var(--nim-primary)] px-3 py-2 text-sm font-semibold text-white" type="submit">{t('project:team.invite')}</button>
            </form>
          </ActionGuard>
        </>
      )}
      {error && <p className="select-text text-sm text-[var(--nim-error)]">{error}</p>}
    </section>
  );
}
