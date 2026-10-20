import React from 'react';
import { useTranslation } from 'react-i18next';
import { SecurityEncryptionSection } from './H2EncryptionMigration';

export function OrganizationSecurityPanel({ orgId }: { orgId?: string }) {
  const { t } = useTranslation(['settings']);
  return (
    <section className="organization-security-panel" data-testid="organization-security-panel" data-component="OrganizationSecurityPanel">
      <header className="mb-5 border-b border-[var(--nim-border)] pb-4"><h2 className="m-0 text-xl font-semibold">{t('settings:organization_ui.security')}</h2><p className="m-0 mt-1 text-sm text-[var(--nim-text-muted)]">{t('settings:organization_ui.security_description')}</p></header>
      {orgId ? <SecurityEncryptionSection orgId={orgId} isAdmin={false} /> : <p className="text-sm text-[var(--nim-text-muted)]">{t('settings:organization_ui.choose')}</p>}
    </section>
  );
}
