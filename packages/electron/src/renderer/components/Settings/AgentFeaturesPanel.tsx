import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { usePostHog } from 'posthog-js/react';
import { MaterialSymbol } from '@nimbalyst/runtime';
import {
  advancedSettingsAtom,
  setAdvancedSettingsAtom,
  aiDebugSettingsAtom,
  setAIDebugSettingsAtom,
} from '../../store/atoms/appSettings';
import { autoCommitEnabledAtom, setAutoCommitEnabledAtom } from '../../store/atoms/autoCommitAtoms';
import { ALPHA_FEATURES, type AlphaFeatureTag } from '../../../shared/alphaFeatures';
import { AlphaBadge, SETTINGS_ALPHA_TOOLTIP } from '../common/AlphaBadge';
import { SettingsToggle } from '../GlobalSettings/SettingsToggle';

const AGENT_FEATURE_TAGS: AlphaFeatureTag[] = [
  'super-loops',
  'blitz',
  'meta-agent',
];

interface WorkflowSourceSettings {
  workspaceClaudeCompatibilityEnabled: boolean;
  includeProjectClaudeSources: boolean;
  includeUserClaudeSources: boolean;
  extensionWorkflowsEnabled: boolean;
}

interface WorkflowExportSettings {
  codexEnabled: boolean;
  claudeGeneratedExtensionWorkflowsEnabled: boolean;
}

export function AgentFeaturesPanel() {
  const { t } = useTranslation(['settings']);
  const posthog = usePostHog();
  const [settings] = useAtom(advancedSettingsAtom);
  const [, updateSettings] = useAtom(setAdvancedSettingsAtom);
  const { alphaFeatures } = settings;

  const autoCommitEnabled = useAtomValue(autoCommitEnabledAtom);
  const setAutoCommitEnabled = useSetAtom(setAutoCommitEnabledAtom);

  const [aiDebugSettings] = useAtom(aiDebugSettingsAtom);
  const [, updateAIDebugSettings] = useAtom(setAIDebugSettingsAtom);
  const { showToolCalls, chatShowToolCalls, aiDebugLogging, showPromptAdditions } = aiDebugSettings;
  const [workflowSettingsLoading, setWorkflowSettingsLoading] = useState(false);
  const [preferredAgentLanguage, setPreferredAgentLanguage] = useState<string>('');
  const [apiUpstreamUrl, setApiUpstreamUrl] = useState<string>('');
  const [apiUpstreamError, setApiUpstreamError] = useState<string | null>(null);
  const [workflowSourceSettings, setWorkflowSourceSettings] = useState<WorkflowSourceSettings>({
    workspaceClaudeCompatibilityEnabled: false,
    includeProjectClaudeSources: false,
    includeUserClaudeSources: false,
    extensionWorkflowsEnabled: false,
  });
  const [workflowExportSettings, setWorkflowExportSettings] = useState<WorkflowExportSettings>({
    codexEnabled: false,
    claudeGeneratedExtensionWorkflowsEnabled: false,
  });

  const isDevelopment = import.meta.env.DEV;

  const handleAlphaToggle = (tag: AlphaFeatureTag, enabled: boolean) => {
    updateSettings({
      alphaFeatures: { ...alphaFeatures, [tag]: enabled },
    });
    posthog?.capture('alpha_feature_toggled', {
      feature_tag: tag,
      enabled,
      source: 'agent_features_panel',
    });
  };

  const features = AGENT_FEATURE_TAGS
    .map((tag) => ALPHA_FEATURES.find((f) => f.tag === tag))
    .filter((f): f is (typeof ALPHA_FEATURES)[number] => f != null);

  useEffect(() => {
    const loadAgentWorkflowSettings = async () => {
      try {
        const settings = await window.electronAPI.claudeCode.getSettings();
        const workflowSettings = await window.electronAPI.agentWorkflows.getSettings();
        setApiUpstreamUrl(settings.apiUpstreamUrl ?? '');
        setWorkflowSourceSettings({
          workspaceClaudeCompatibilityEnabled: workflowSettings.sourceSettings.workspaceClaudeCompatibilityEnabled,
          includeProjectClaudeSources: workflowSettings.sourceSettings.includeProjectClaudeSources ?? settings.projectCommandsEnabled,
          includeUserClaudeSources: workflowSettings.sourceSettings.includeUserClaudeSources ?? settings.userCommandsEnabled,
          extensionWorkflowsEnabled: workflowSettings.sourceSettings.extensionWorkflowsEnabled,
        });
        setWorkflowExportSettings(workflowSettings.exportSettings);
      } catch (err) {
        console.error('Failed to load agent workflow settings:', err);
      }
    };

    loadAgentWorkflowSettings();
  }, []);

  useEffect(() => {
    const loadPreferredAgentLanguage = async () => {
      try {
        const language = await window.electronAPI.invoke('preferred-agent-language:get');
        setPreferredAgentLanguage(typeof language === 'string' ? language : '');
      } catch (err) {
        console.error('Failed to load preferred agent language:', err);
      }
    };
    loadPreferredAgentLanguage();
  }, []);

  const handlePreferredAgentLanguageChange = useCallback(async (value: string) => {
    setPreferredAgentLanguage(value);
    try {
      await window.electronAPI.invoke('preferred-agent-language:set', value);
    } catch (err) {
      console.error('Failed to save preferred agent language:', err);
    }
  }, []);

  // Persist on blur (not per-keystroke) so a half-typed URL doesn't flash a
  // validation error. The main process re-validates (loopback-only) and returns
  // the error to surface inline; a value it rejects is NOT saved.
  const handleApiUpstreamBlur = useCallback(async () => {
    try {
      const result = await window.electronAPI.claudeCode.setApiUpstreamUrl(apiUpstreamUrl);
      if (result.success) {
        setApiUpstreamError(null);
      } else {
        setApiUpstreamError(result.error);
      }
    } catch (err) {
      setApiUpstreamError(err instanceof Error ? err.message : t('settings:agent_features.errors.save_upstream'));
    }
  }, [apiUpstreamUrl, t]);

  const handleWorkflowSourceToggle = useCallback(async (
    key: keyof WorkflowSourceSettings,
    enabled: boolean,
  ) => {
    setWorkflowSettingsLoading(true);
    try {
      const next = await window.electronAPI.agentWorkflows.setSourceSettings({ [key]: enabled });
      setWorkflowSourceSettings(next);
    } catch (err) {
      console.error('Failed to update workflow source settings:', err);
    } finally {
      setWorkflowSettingsLoading(false);
    }
  }, []);

  const handleWorkflowExportToggle = useCallback(async (
    key: keyof WorkflowExportSettings,
    enabled: boolean,
  ) => {
    setWorkflowSettingsLoading(true);
    try {
      const next = await window.electronAPI.agentWorkflows.setExportSettings({ [key]: enabled });
      setWorkflowExportSettings(next);
    } catch (err) {
      console.error('Failed to update workflow export settings:', err);
    } finally {
      setWorkflowSettingsLoading(false);
    }
  }, []);

  return (
    <div className="provider-panel flex flex-col">
      <div className="provider-panel-header mb-6 pb-4 border-b border-[var(--nim-border)]">
        <h3 className="provider-panel-title text-xl font-semibold leading-tight mb-2 text-[var(--nim-text)]">
          {t('settings:agent_features.title')}
        </h3>
        <p className="provider-panel-description text-sm leading-relaxed text-[var(--nim-text-muted)]">
          {t('settings:agent_features.description')}
        </p>
      </div>

      <div className="provider-panel-section py-4 mb-4 border-b border-[var(--nim-border)]">
        <SettingsToggle
          checked={autoCommitEnabled}
          onChange={(checked) => {
            setAutoCommitEnabled(checked);
            posthog?.capture('auto_commit_toggled', { enabled: checked });
          }}
          name={t('settings:agent_features.auto_commit_name')}
          description={t('settings:agent_features.auto_commit_desc')}
        />

        <div className="agent-preferred-language flex items-start justify-between gap-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--nim-text)] leading-tight">
              {t('settings:agent_features.preferred_language_name')}
            </div>
            <div className="text-xs text-[var(--nim-text-muted)] leading-snug mt-0.5">
              {t('settings:agent_features.preferred_language_desc')}
            </div>
          </div>
          <input
            type="text"
            value={preferredAgentLanguage}
            onChange={(e) => handlePreferredAgentLanguageChange(e.target.value)}
            placeholder={t('settings:agent_features.preferred_language_placeholder')}
            className="w-40 py-1.5 px-3 rounded-md text-sm bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] text-[var(--nim-text)] outline-none focus:border-[var(--nim-primary)]"
            data-testid="preferred-agent-language-input"
          />
        </div>
      </div>

      <div className="provider-panel-section">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="provider-panel-section-title text-base font-semibold text-[var(--nim-text)] m-0">{t('settings:agent_features.experimental')}</h4>
          <AlphaBadge size="sm" tooltip={t('settings:provider.alpha_tooltip', { defaultValue: SETTINGS_ALPHA_TOOLTIP })} />
        </div>

        <div className="flex items-start gap-2 p-3 mb-3 rounded border border-[var(--nim-warning)]/30 bg-[var(--nim-warning)]/10">
          <MaterialSymbol icon="science" size={16} className="text-[var(--nim-warning)] shrink-0 mt-0.5" />
          <p className="m-0 text-[13px] text-[var(--nim-text)] leading-snug">
            {t('settings:agent_features.experimental_warning')}
          </p>
        </div>

        <div className="claude-api-upstream mb-4 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-3">
          <h5 className="text-sm font-semibold mb-1.5 text-[var(--nim-text)]">
            {t('settings:agent_features.custom_api_title')}
          </h5>
          <p className="text-xs leading-relaxed text-[var(--nim-text-muted)] mb-2">
            {t('settings:agent_features.custom_api_desc')}{' '}
            <code>http://127.0.0.1:8787/anthropic</code>
          </p>
          <div className="flex items-start gap-2 p-2 mb-2 rounded border border-[var(--nim-warning)]/30 bg-[var(--nim-warning)]/10">
            <MaterialSymbol icon="lock" size={14} className="text-[var(--nim-warning)] shrink-0 mt-0.5" />
            <p className="m-0 text-[12px] text-[var(--nim-text)] leading-snug">
              {t('settings:agent_features.custom_api_security')}
            </p>
          </div>
          <input
            type="text"
            value={apiUpstreamUrl}
            onChange={(e) => {
              setApiUpstreamUrl(e.target.value);
              if (apiUpstreamError) setApiUpstreamError(null);
            }}
            onBlur={handleApiUpstreamBlur}
            placeholder="http://127.0.0.1:8787/anthropic"
            spellCheck={false}
            className="w-full py-1.5 px-3 rounded-md text-sm bg-[var(--nim-bg)] border border-[var(--nim-border)] text-[var(--nim-text)] outline-none focus:border-[var(--nim-primary)]"
            data-testid="claude-api-upstream-input"
          />
          {apiUpstreamError && (
            <p className="claude-api-upstream-error mt-1.5 text-xs text-[var(--nim-error)] leading-snug">
              {apiUpstreamError}
            </p>
          )}
        </div>

        <div className="mb-4 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] p-3">
          <h5 className="text-sm font-semibold mb-1.5 text-[var(--nim-text)]">
            {t('settings:agent_features.workflow_title')}
          </h5>
          <p className="text-xs leading-relaxed text-[var(--nim-text-muted)] mb-2">
            {t('settings:agent_features.workflow_desc')}
          </p>

          <div className="border-b border-[var(--nim-border)] mb-2">
            <SettingsToggle
              checked={workflowSourceSettings.workspaceClaudeCompatibilityEnabled}
              onChange={(checked) => handleWorkflowSourceToggle('workspaceClaudeCompatibilityEnabled', checked)}
              disabled={workflowSettingsLoading}
              name={t('settings:agent_features.workspace_compat_name')}
              description={t('settings:agent_features.workspace_compat_desc')}
            />
            <SettingsToggle
              checked={workflowSourceSettings.includeProjectClaudeSources}
              onChange={(checked) => handleWorkflowSourceToggle('includeProjectClaudeSources', checked)}
              disabled={workflowSettingsLoading || !workflowSourceSettings.workspaceClaudeCompatibilityEnabled}
              name={t('settings:agent_features.project_sources_name')}
              description={t('settings:agent_features.project_sources_desc')}
            />
            <SettingsToggle
              checked={workflowSourceSettings.includeUserClaudeSources}
              onChange={(checked) => handleWorkflowSourceToggle('includeUserClaudeSources', checked)}
              disabled={workflowSettingsLoading || !workflowSourceSettings.workspaceClaudeCompatibilityEnabled}
              name={t('settings:agent_features.user_sources_name')}
              description={t('settings:agent_features.user_sources_desc')}
            />
            <SettingsToggle
              checked={workflowSourceSettings.extensionWorkflowsEnabled}
              onChange={(checked) => handleWorkflowSourceToggle('extensionWorkflowsEnabled', checked)}
              disabled={workflowSettingsLoading}
              name={t('settings:agent_features.extension_workflows_name')}
              description={t('settings:agent_features.extension_workflows_desc')}
            />
          </div>

          <div>
            <SettingsToggle
              checked={workflowExportSettings.codexEnabled}
              onChange={(checked) => handleWorkflowExportToggle('codexEnabled', checked)}
              disabled={workflowSettingsLoading}
              name={t('settings:agent_features.codex_skills_name')}
              description={t('settings:agent_features.codex_skills_desc')}
            />
            <SettingsToggle
              checked={workflowExportSettings.claudeGeneratedExtensionWorkflowsEnabled}
              onChange={(checked) => handleWorkflowExportToggle('claudeGeneratedExtensionWorkflowsEnabled', checked)}
              disabled={workflowSettingsLoading}
              name={t('settings:agent_features.claude_workflows_name')}
              description={t('settings:agent_features.claude_workflows_desc')}
            />
          </div>
        </div>

        {features.map((feature) => (
          <SettingsToggle
            key={feature.tag}
            checked={alphaFeatures[feature.tag] ?? false}
            onChange={(checked) => handleAlphaToggle(feature.tag, checked)}
            name={t(`settings:agent_features.features.${feature.tag}.name`, { defaultValue: feature.name })}
            description={t(`settings:agent_features.features.${feature.tag}.description`, { defaultValue: feature.description })}
          />
        ))}

        <SettingsToggle
          checked={chatShowToolCalls}
          onChange={(checked) => updateAIDebugSettings({ chatShowToolCalls: checked })}
          name={t('settings:agent_features.show_chat_tools_name')}
          description={t('settings:agent_features.show_chat_tools_desc')}
        />
      </div>

      {isDevelopment && (
        <div className="provider-panel-section py-4 mt-4 border-t border-[var(--nim-border)]">
          <h4 className="provider-panel-section-title text-base font-semibold mb-2 text-[var(--nim-text)]">{t('settings:agent_features.developer_options')}</h4>
          <p className="text-sm leading-relaxed text-[var(--nim-text-muted)] mb-2">
            {t('settings:agent_features.developer_only')}
          </p>

          <SettingsToggle
            checked={showToolCalls}
            onChange={(checked) => updateAIDebugSettings({ showToolCalls: checked })}
            name={t('settings:agent_features.show_all_tools_name')}
            description={t('settings:agent_features.show_all_tools_desc')}
          />

          <SettingsToggle
            checked={aiDebugLogging}
            onChange={(checked) => updateAIDebugSettings({ aiDebugLogging: checked })}
            name={t('settings:agent_features.debug_logging_name')}
            description={t('settings:agent_features.debug_logging_desc')}
          />

          <SettingsToggle
            checked={showPromptAdditions}
            onChange={(checked) => updateAIDebugSettings({ showPromptAdditions: checked })}
            name={t('settings:agent_features.prompt_additions_name')}
            description={t('settings:agent_features.prompt_additions_desc')}
          />
        </div>
      )}
    </div>
  );
}
