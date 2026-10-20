import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { categorizeTeamAnalyticsError } from '../../../../shared/analytics/teamAnalytics';
import { trackTeamAnalyticsEvent } from '../../../utils/teamAnalytics';

interface AccessGrant { userId: string; projectRole: string }
interface Member { memberId: string; email: string; name: string; role: string }

export function ProjectAccessEditor({ orgId, projectId }: { orgId: string; projectId: string }) {
  const { t } = useTranslation(['settings', 'project']);
  const [members, setMembers] = useState<Member[]>([]);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [callerRole, setCallerRole] = useState('member');

  const refresh = useCallback(async () => {
    const [roster, access] = await Promise.all([
      window.electronAPI.organization.listMembers(orgId),
      window.electronAPI.invoke('org:list-project-access', orgId, projectId),
    ]);
    setMembers(roster?.members ?? []);
    setCallerRole(roster?.callerRole ?? 'member');
    setGrants(access?.grants ?? []);
  }, [orgId, projectId]);
  useEffect(() => { void refresh(); }, [refresh]);
  const canAdminister = callerRole === 'owner' || callerRole === 'admin';

  return (
    <div className="project-access-editor flex flex-col gap-2" data-testid="project-access-editor">
      {members.map((member) => {
        const inherited = member.role === 'owner' || member.role === 'admin';
        const grant = grants.find((entry) => entry.userId === member.memberId);
        return (
          <div key={member.memberId} className="project-access-row flex items-center gap-3 rounded-lg border border-[var(--nim-border)] p-3" data-testid="project-access-row">
            <div className="min-w-0 flex-1"><div className="truncate text-sm">{member.name || member.email}</div><div className="truncate text-xs text-[var(--nim-text-muted)]">{inherited ? t('settings:organization_ui.inherited_admin', { role: t(`project:org.role_${member.role}`, { defaultValue: member.role }) }) : member.email}</div></div>
            <select
              value={inherited ? 'project-admin' : grant?.projectRole ?? ''}
              disabled={!canAdminister || inherited}
              className="project-access-role rounded border border-[var(--nim-border)] bg-[var(--nim-bg-tertiary)] px-2 py-1 text-xs disabled:opacity-60"
              data-testid="project-access-role"
              onChange={(event) => {
                const role = event.target.value;
                const promise = role
                  ? window.electronAPI.invoke('org:grant-project-access', orgId, projectId, member.memberId, role)
                  : window.electronAPI.invoke('org:revoke-project-access', orgId, projectId, member.memberId);
                void promise.then((result) => {
                  if (result?.success === false) throw new Error(result.error ?? t('settings:organization_ui.access_failed'));
                  trackTeamAnalyticsEvent('team_project_access_changed', {
                    surface: 'desktop',
                    action: role ? 'granted' : 'revoked',
                    callerRole: callerRole === 'owner' || callerRole === 'admin' || callerRole === 'member' ? callerRole : 'unknown',
                    targetRole: role === 'project-admin' ? 'admin' : 'member',
                  });
                  return refresh();
                }).catch((error) => {
                  trackTeamAnalyticsEvent('team_operation_failed', {
                    surface: 'desktop',
                    operation: 'change_project_access',
                    entryPoint: 'project_sharing',
                    callerRole: callerRole === 'owner' || callerRole === 'admin' || callerRole === 'member' ? callerRole : 'unknown',
                    errorCategory: categorizeTeamAnalyticsError('project', error),
                  });
                });
              }}
            >
              <option value="">{t('settings:organization_ui.no_project_access')}</option>
              <option value="project-viewer">{t('project:org.project_viewer')}</option>
              <option value="project-editor">{t('project:org.project_editor')}</option>
              <option value="project-admin">{t('settings:organization_ui.project_admin')}</option>
            </select>
          </div>
        );
      })}
      {!canAdminister && <p className="text-xs text-[var(--nim-text-faint)]">{t('settings:organization_ui.access_readonly')}</p>}
    </div>
  );
}
