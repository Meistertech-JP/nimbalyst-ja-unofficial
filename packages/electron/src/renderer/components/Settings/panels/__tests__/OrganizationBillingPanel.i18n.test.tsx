// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { OrganizationBillingPanel } from '../OrganizationBillingPanel';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

afterEach(cleanup);

describe('OrganizationBillingPanel localization', () => {
  it('shows the English billing heading and reserved-for-future-release message', () => {
    render(
      <I18nextProvider i18n={englishI18n}>
        <OrganizationBillingPanel />
      </I18nextProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Billing' })).toBeDefined();
    expect(screen.getByText('Billing controls are reserved for a future release.')).toBeDefined();
  });

  it('localizes the heading and reserved-for-future-release message into Japanese', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <OrganizationBillingPanel />
      </I18nextProvider>,
    );

    expect(screen.getByRole('heading', { name: '請求' })).toBeDefined();
    expect(screen.getByText('請求管理機能は今後のリリースで提供予定です。')).toBeDefined();
  });
});
