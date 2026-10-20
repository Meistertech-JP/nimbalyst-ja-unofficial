import React, { useState, useEffect, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ProviderConfig } from '../../Settings/SettingsView';
import { SettingsToggle } from '../SettingsToggle';
import { AlphaBadge } from '../../common/AlphaBadge';

interface CopilotCLIPanelProps {
  config: ProviderConfig;
  apiKeys: Record<string, string>;
  availableModels: any[];
  loading: boolean;
  onToggle: (enabled: boolean) => void;
  onApiKeyChange: (key: string, value: string) => void;
  onModelToggle: (modelId: string, enabled: boolean) => void;
  onSelectAllModels: (selectAll: boolean) => void;
  onTestConnection: () => Promise<void>;
  onConfigChange: (updates: Partial<ProviderConfig>) => void;
}

type CLIStatus = 'checking' | 'installed' | 'not-installed' | 'installing' | 'install-error';

export function CopilotCLIPanel({
  config,
  onToggle,
}: CopilotCLIPanelProps) {
  const { t } = useTranslation(['settings']);
  const [cliStatus, setCLIStatus] = useState<CLIStatus>('checking');
  const [cliVersion, setCLIVersion] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);

  const checkCLI = useCallback(async () => {
    setCLIStatus('checking');
    try {
      const result = await window.electronAPI.invoke('cli:checkInstallation', 'copilot-cli');
      if (result?.installed) {
        setCLIVersion(result.version || null);
        setCLIStatus('installed');
      } else {
        setCLIStatus('not-installed');
      }
    } catch {
      setCLIStatus('not-installed');
    }
  }, []);

  useEffect(() => {
    checkCLI();
  }, [checkCLI]);

  const handleInstall = async () => {
    setCLIStatus('installing');
    setInstallError(null);
    try {
      await window.electronAPI.invoke('cli:install', 'copilot-cli', {});
      await checkCLI();
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : String(err));
      setCLIStatus('install-error');
    }
  };

  return (
    <div className="provider-panel flex flex-col">
      <div className="provider-panel-header mb-6 pb-4 border-b border-[var(--nim-border)]">
        <h3 className="provider-panel-title text-xl font-semibold leading-tight mb-2 text-[var(--nim-text)] flex items-center gap-2">
          {t('settings:provider.copilot.title')}
          <AlphaBadge size="sm" tooltip={t('settings:provider.alpha_tooltip')} />
        </h3>
        <p className="provider-panel-description text-sm leading-relaxed text-[var(--nim-text-muted)]">
          {t('settings:provider.copilot.description')}
        </p>
      </div>

      <div className="provider-panel-section py-4 mb-4 border-b border-[var(--nim-border)]">
        <h4 className="provider-panel-section-title text-base font-semibold mb-3 text-[var(--nim-text)]">
          {t('settings:provider.copilot.cli_title')}
        </h4>

        {cliStatus === 'checking' && (
          <p className="text-[13px] text-[var(--nim-text-muted)]">
            {t('settings:provider.copilot.checking')}
          </p>
        )}

        {cliStatus === 'installed' && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--nim-success)] shrink-0" />
            <span className="text-[13px] text-[var(--nim-text)]">
              {t('settings:provider.copilot.installed')}{cliVersion ? ` (${cliVersion})` : ''}
            </span>
          </div>
        )}

        {(cliStatus === 'not-installed' || cliStatus === 'install-error') && (
          <div>
            <p className="text-[13px] text-[var(--nim-text-muted)] mb-3 leading-relaxed">
              {t('settings:provider.copilot.required')}
            </p>
            <code className="block text-[13px] text-[var(--nim-code-text)] bg-[var(--nim-code-bg)] px-3 py-2 rounded mb-3 select-text">
              npm install -g @github/copilot
            </code>
            <button
              className="inline-flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium cursor-pointer transition-all bg-[var(--nim-primary)] text-white border border-[var(--nim-primary)] hover:opacity-90"
              onClick={handleInstall}
            >
              {t('settings:provider.copilot.install')}
            </button>
            {installError && (
              <div className="text-xs mt-2 text-[var(--nim-error)]">
                {installError}
                <p className="mt-1 text-[var(--nim-text-muted)]">
                  {t('settings:provider.copilot.try_manual')}:{' '}
                  <code className="text-[var(--nim-code-text)] bg-[var(--nim-code-bg)] px-1 rounded">npm install -g @github/copilot</code>
                </p>
              </div>
            )}
          </div>
        )}

        {cliStatus === 'installing' && (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[var(--nim-text-muted)]">
              {t('settings:provider.copilot.installing')}
            </span>
          </div>
        )}

        <p className="text-[13px] text-[var(--nim-text-muted)] mt-3 leading-relaxed">
          {t('settings:provider.copilot.documentation_prefix')}{' '}
          <a
            href="https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--nim-primary)] hover:underline"
          >
            {t('settings:provider.copilot.documentation')}
          </a>
          {' '}{t('settings:provider.copilot.documentation_suffix')}
        </p>
      </div>

      <SettingsToggle
        variant="enable"
        name={t('settings:provider.copilot.enable')}
        checked={config.enabled || false}
        onChange={onToggle}
      />

      {config.enabled && (
        <div className="provider-panel-section py-4 mb-4 border-b border-[var(--nim-border)] last:border-b-0 last:mb-0 last:pb-0">
          <h4 className="provider-panel-section-title text-base font-semibold mb-3 text-[var(--nim-text)]">
            {t('settings:provider.copilot.authentication')}
          </h4>
          <div className="cli-config-section">
            <p className="text-[13px] text-[var(--nim-text-muted)] mb-3">
              <Trans
                t={t}
                i18nKey="settings:provider.copilot.authentication_instructions"
                components={{
                  command: <code className="text-[var(--nim-code-text)] bg-[var(--nim-code-bg)] px-1 rounded" />,
                  login: <code className="text-[var(--nim-code-text)] bg-[var(--nim-code-bg)] px-1 rounded" />,
                }}
              />
            </p>
            <p className="text-[13px] text-[var(--nim-text-muted)]">
              {t('settings:provider.copilot.model_selection_info')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
