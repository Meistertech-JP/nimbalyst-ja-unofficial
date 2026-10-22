// @vitest-environment jsdom
import React from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

import { OrgModeUnboundArm } from '../OrgModeUnboundArm';

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: () => null,
}));
vi.mock('../../Settings/panels/OrganizationOnboardingChoices', () => ({
  OrganizationOnboardingChoices: () => null,
}));
vi.mock('../../common/TeamBetaNotice', () => ({
  TeamBetaBadge: () => null,
  TeamBetaNotice: () => null,
}));

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterAll(() => cleanup());

describe('OrgModeUnboundArm localization', () => {
  it('localizes organization recovery text, settings labels, roles, and retry', () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="en-US">
        {children}
      </UiLanguageProvider>
    );

    render(
      <OrgModeUnboundArm
        chrome="mode"
        targetedOrgId="org-1"
        organizations={[{ orgId: 'org-1', name: 'Acme', role: 'admin' }]}
        loadError={null}
        onSelectOrganization={vi.fn()}
        onReload={vi.fn()}
        onLoadError={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('heading', { name: '組織' })).toBeTruthy();
    expect(screen.getByText('この組織はまだ利用できません。移動先は保持されています。')).toBeTruthy();
    expect(screen.getByText('組織のメンバーシップ情報を読み込み中です。')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Acmeの組織設定' })).toBeTruthy();
    expect(screen.getByText('管理者')).toBeTruthy();
    expect(screen.getByRole('button', { name: '再試行' })).toBeTruthy();
  });
});
