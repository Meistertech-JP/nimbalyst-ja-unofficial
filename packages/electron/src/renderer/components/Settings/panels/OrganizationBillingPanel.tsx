import React from 'react';
import { useTranslation } from 'react-i18next';

export function OrganizationBillingPanel() {
  const { t } = useTranslation(['settings']);
  return <section className="organization-billing-panel" data-testid="organization-billing-panel" data-component="OrganizationBillingPanel"><h2 className="m-0 text-xl font-semibold">{t('settings:organization_ui.billing')}</h2><div className="mt-4 rounded-lg border border-dashed border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-5 text-sm text-[var(--nim-text-muted)]">{t('settings:organization_ui.billing_future')}</div></section>;
}
