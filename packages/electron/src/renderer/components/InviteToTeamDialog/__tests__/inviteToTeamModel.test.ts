// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  buildProjectGrants,
  inviteActionLabel,
  parseInviteEmails,
  projectRoleForOrgRole,
  summarizeInvitePlan,
  type InviteProjectOption,
} from '../inviteToTeamModel';

describe('parseInviteEmails', () => {
  it('splits on every separator an admin might paste, lowercasing and deduping', () => {
    expect(parseInviteEmails('A@x.com, b@x.com;  c@x.com\nA@X.com')).toEqual({
      emails: ['a@x.com', 'b@x.com', 'c@x.com'],
      invalid: [],
    });
  });

  it('reports malformed tokens instead of silently dropping them', () => {
    // Dropping these quietly is how someone sends four invitations believing
    // they sent five.
    expect(parseInviteEmails('good@x.com nope not@a@b')).toMatchObject({
      emails: ['good@x.com'],
      invalid: ['nope', 'not@a@b'],
    });
  });
});

describe('buildProjectGrants', () => {
  const projects: InviteProjectOption[] = [
    { teamProjectId: 'tp-primary', name: 'Platform', isPrimary: true },
    { teamProjectId: 'tp-second', name: 'Mobile', isPrimary: false },
    { teamProjectId: 'tp-third', name: 'Docs', isPrimary: false },
  ];

  /**
   * The server seeds the primary project for every joiner. Sending it back as
   * an explicit grant is a redundant write that can only fail, and it would
   * make the dialog's count disagree with what the server reports applied.
   */
  it('never sends the primary project, even when it is selected', () => {
    const grants = buildProjectGrants(projects, new Set(['tp-primary', 'tp-second']), 'member');
    expect(grants).toEqual([{ teamProjectId: 'tp-second', projectRole: 'project-editor' }]);
  });

  it('asks for no more than the org role would have granted anyway', () => {
    expect(projectRoleForOrgRole('viewer')).toBe('project-viewer');
    expect(buildProjectGrants(projects, new Set(['tp-second']), 'viewer'))
      .toEqual([{ teamProjectId: 'tp-second', projectRole: 'project-viewer' }]);
    expect(buildProjectGrants(projects, new Set(['tp-second']), 'admin'))
      .toEqual([{ teamProjectId: 'tp-second', projectRole: 'project-admin' }]);
  });
});

describe('the plan the admin reads before sending', () => {
  it('says plainly when an invitation shares nothing', () => {
    expect(summarizeInvitePlan({ people: 1, extraProjects: 0, folders: 0 }))
      .toEqual([
        { key: 'team_invite_dialog.summary.people_one', count: 1 },
        { key: 'team_invite_dialog.summary.nothing_shared_yet' },
      ]);
    expect(inviteActionLabel({ people: 1, extraProjects: 0, folders: 0 }))
      .toBe('team_invite_dialog.action_invite_only');
  });

  /**
   * "Nothing shared yet" is a statement about the team. A team that already
   * publishes documents makes it false, and the admin reading it is being told
   * to fix something that is not broken.
   */
  it('does not claim nothing is shared when the team already has content', () => {
    expect(summarizeInvitePlan({
      people: 1, extraProjects: 0, folders: 0, teamHasSharedContent: true,
    })).toEqual([
      { key: 'team_invite_dialog.summary.people_one', count: 1 },
      { key: 'team_invite_dialog.summary.team_has_shared_content' },
    ]);
  });

  it('counts both halves of what they get', () => {
    const plan = { people: 2, extraProjects: 1, folders: 3 };
    expect(summarizeInvitePlan(plan)).toEqual([
      { key: 'team_invite_dialog.summary.people_other', count: 2 },
      { key: 'team_invite_dialog.summary.extra_projects_one', count: 1 },
      { key: 'team_invite_dialog.summary.folders_published_other', count: 3 },
    ]);
    expect(inviteActionLabel(plan)).toBe('team_invite_dialog.action_invite_and_share');
  });
});
