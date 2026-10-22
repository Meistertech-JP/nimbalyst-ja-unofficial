// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { MemberPicker } from '../../MemberPicker';
import { InboxScopeMenu } from '../InboxScopeMenu';
import type { InboxScopeOptions } from '../inboxTypes';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => cleanup());

describe('Team inbox member and scope controls localization', () => {
  it('localizes scope summary, filter label, sections, and reset action', () => {
    const options: InboxScopeOptions = {
      orgs: [
        { id: 'org-a', name: '組織 A' },
        { id: 'org-b', name: '組織 B' },
      ],
      projects: [
        { id: 'project-a', name: 'プロジェクト A' },
        { id: 'project-b', name: 'プロジェクト B' },
      ],
      sourceKinds: [],
    };
    const onChange = vi.fn();

    render(
      <I18nextProvider i18n={japaneseI18n}>
        <InboxScopeMenu
          scope={{
            orgIds: ['org-a'],
            projectIds: ['project-a', 'project-b'],
            sourceKinds: null,
          }}
          options={options}
          disabled={false}
          onChange={onChange}
        />
      </I18nextProvider>,
    );

    const trigger = screen.getByRole('button', { name: /組織とプロジェクトを絞り込む/ });
    expect(trigger.textContent).toContain('組織 1 件、プロジェクト 2 件');
    fireEvent.click(trigger);
    expect(screen.getByText('組織')).toBeDefined();
    expect(screen.getByText('プロジェクト')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /範囲をリセット/ }));
    expect(onChange).toHaveBeenCalledWith({
      orgIds: null,
      projectIds: null,
      sourceKinds: null,
    });
  });

  it('localizes empty-state text in the member picker', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <MemberPicker
          testId="members"
          members={[]}
          selectedIds={[]}
          onToggle={() => undefined}
        />
      </I18nextProvider>,
    );

    expect(screen.getByPlaceholderText('メンバーを検索')).toBeDefined();
    expect(screen.getByText('この組織には他のメンバーがまだいません。')).toBeDefined();
  });
});
