import React from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';

interface ProviderAuthRequiredWidgetProps {
  provider?: string;
}

const PROVIDER_AUTH_INSTRUCTIONS: Record<string, { name: string; command?: string; instructionKey?: string }> = {
  'grok-build': { name: 'Grok Build', command: 'grok login' },
  'cursor-agent': { name: 'Cursor Agent', command: 'cursor-agent login' },
  'copilot-cli': { name: 'GitHub Copilot', command: 'copilot', instructionKey: 'copilot_login_instruction' },
  'antigravity-gemini-agent': { name: 'Gemini', instructionKey: 'antigravity_login_instruction' },
  opencode: { name: 'OpenCode', command: 'opencode auth login' },
};

export const ProviderAuthRequiredWidget: React.FC<ProviderAuthRequiredWidgetProps> = ({ provider }) => {
  const { t } = useTranslation('aichat');
  const instructions = provider ? PROVIDER_AUTH_INSTRUCTIONS[provider] : undefined;
  const providerName = instructions?.name ?? provider ?? t('auth.provider_unknown');

  return (
    <div className="provider-auth-required-widget my-3 p-4 rounded-lg border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)]" role="alert">
      <p className="text-sm text-[var(--nim-text)] leading-relaxed">
        {t('auth.provider_login_required', { provider: providerName })}
      </p>
      {instructions?.command && (
        <>
          <p className="mt-2 text-sm text-[var(--nim-text-muted)]">{t('auth.provider_login_command')}</p>
          <code className="inline-block mt-1 px-2 py-1 rounded bg-[var(--nim-code-bg)] text-[var(--nim-code-text)] select-text">
            {instructions.command}
          </code>
        </>
      )}
      {instructions?.instructionKey && (
        <p className="mt-2 text-sm text-[var(--nim-text-muted)]">
          {t(`auth.${instructions.instructionKey}`)}
        </p>
      )}
    </div>
  );
};
