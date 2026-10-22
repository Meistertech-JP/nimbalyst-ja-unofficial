// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { OrganizationOnboardingChoices } from '../OrganizationOnboardingChoices';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(cleanup);

describe('OrganizationOnboardingChoices localization', () => {
  it('localizes pending invitations and organization creation while preserving account details', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <OrganizationOnboardingChoices
          organizations={[{
            orgId: 'org-1',
            name: 'Example Org',
            membershipType: 'pending_invitation',
            sourceEmail: 'person@example.com',
          }]}
          onChanged={() => undefined}
          onError={() => undefined}
          allowOrganizationCreation
          showBetaNotice={false}
        />
      </I18nextProvider>,
    );

    expect(screen.getByRole('heading', { name: '承認待ちの招待' })).toBeDefined();
    expect(screen.getByText('Example Org')).toBeDefined();
    expect(screen.getByText('招待されたアカウント：person@example.com')).toBeDefined();
    expect(screen.getByRole('button', { name: '承認' })).toBeDefined();
    expect(screen.getByText('新しい組織')).toBeDefined();
    expect(screen.getByText('組織名を付け、チームを招待し、最初のルームを選択します。')).toBeDefined();
    expect(screen.getByRole('button', { name: '組織を作成' })).toBeDefined();
  });
});
