import React, { useState, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { usePostHog } from 'posthog-js/react';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import { useTranslation } from '@nimbalyst/i18n/react';
import { SettingsToggle } from '../SettingsToggle';
import { HelpTooltip } from '../../../help';
import { requestConfirmation } from '../../../dialogs/requestConfirmation';
import {
  advancedSettingsAtom,
  setAdvancedSettingsAtom,
  resetWalkthroughsAtom,
  developerFeatureSettingsAtom,
  setDeveloperFeatureSettingsAtom,
  customPathDirsAtom,
  externalEditorSettingsAtom,
  setExternalEditorSettingsAtom,
  EXTERNAL_EDITOR_NAMES,
  DEVELOPER_FEATURES,
  areAllDeveloperFeaturesEnabled,
  enableAllDeveloperFeatures,
  disableAllDeveloperFeatures,
  type ReleaseChannel,
  type ExternalEditorType,
  type PreferredTerminalShell,
} from '../../../store/atoms/appSettings';
import {
  trackerAutomationAtom,
  setTrackerAutomationAtom,
} from '../../../store/atoms/trackerAutomationAtoms';
import {
  multiProjectModeAtom,
  openProjectsAtom,
  activeWorkspacePathAtom,
  restorePreviousProjectsAtom,
  allowUnlimitedProjectsAtom,
} from '../../../store/atoms/openProjects';
import { settingAtom } from '../../../store/atoms/settingAtomFamily';

/** Reusable compact dropdown row */
function DropdownRow({
  value,
  onChange,
  name,
  description,
  options,
}: {
  value: string | number;
  onChange: (value: string) => void;
  name: string;
  description: string;
  options: { value: string | number; label: string }[];
}) {
  return (
    <div className="setting-item py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="setting-text flex flex-col gap-0 min-w-0">
          <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{name}</span>
          <span className="setting-description text-xs leading-snug text-[var(--nim-text-muted)]">
            {description}
          </span>
        </div>
        <select
          aria-label={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="setting-select shrink-0 py-1.5 px-2 pr-7 rounded-md text-sm bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] text-[var(--nim-text)] outline-none appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M3%204.5L6%207.5L9%204.5%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_8px_center] focus:border-[var(--nim-primary)]"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * AdvancedPanel - Self-contained settings panel for advanced options.
 *
 * All settings subscribe directly to Jotai atoms or load via IPC.
 * Developer mode is a global app setting.
 */
export function AdvancedPanel() {
  const { t } = useTranslation('settings');
  const [uiLanguage, setUiLanguage] = useAtom(settingAtom('app.uiLanguage'));
  const posthog = usePostHog();
  // App-level advanced settings from Jotai atoms
  const [settings] = useAtom(advancedSettingsAtom);
  const [, updateSettings] = useAtom(setAdvancedSettingsAtom);
  const [, resetWalkthroughs] = useAtom(resetWalkthroughsAtom);

  // Current enhanced PATH (fetched from main process)
  const [enhancedPath, setEnhancedPath] = useState<string>('');
  const [showEnhancedPath, setShowEnhancedPath] = useState(false);
  const [availableTerminalShells, setAvailableTerminalShells] = useState<Array<{
    name: string;
    path: string;
    provider?: string;
    bootstrapMode?: 'zsh' | 'bash' | 'powershell' | 'none';
    cwdMode?: 'native' | 'wsl';
  }>>([]);

  // Developer feature settings from Jotai atoms
  const [developerSettings] = useAtom(developerFeatureSettingsAtom);
  const [, updateDeveloperSettings] = useAtom(setDeveloperFeatureSettingsAtom);
  const { developerMode, developerFeatures } = developerSettings;

  // Tracker automation settings
  const trackerAutomation = useAtomValue(trackerAutomationAtom);
  const setTrackerAutomation = useSetAtom(setTrackerAutomationAtom);

  // External editor settings from Jotai atoms
  const [externalEditorSettings] = useAtom(externalEditorSettingsAtom);
  const [, updateExternalEditorSettings] = useAtom(setExternalEditorSettingsAtom);
  const { editorType: externalEditorType, customPath: externalEditorCustomPath } = externalEditorSettings;

  // Handle developer mode change
  const handleDeveloperModeChange = async (enabled: boolean) => {
    updateDeveloperSettings({ developerMode: enabled });

    // Track mode change in PostHog
    if (posthog) {
      posthog.capture('developer_mode_changed', {
        developer_mode: enabled,
        source: 'settings',
        is_initial: false,
      });

      // Update person property
      posthog.people.set({ developer_mode: enabled });
    }
  };

  const {
    releaseChannel,
    analyticsEnabled,
    extensionDevToolsEnabled,
    walkthroughsEnabled,
    walkthroughsViewedCount,
    walkthroughsTotalCount,
    maxHeapSizeMB,
    customPathDirs,
    spellcheckEnabled,
    showDirectChatProviders,
    historyMaxAgeDays,
    historyMaxSnapshots,
    preferredTerminalShell,
  } = settings;
  const [showFeaturesMenu, setShowFeaturesMenu] = useState(false);

  // Fetch enhanced PATH when user clicks to show it
  useEffect(() => {
    if (showEnhancedPath && !enhancedPath) {
      window.electronAPI.environment.getEnhancedPath().then(setEnhancedPath);
    }
  }, [showEnhancedPath, enhancedPath]);

  // Refresh enhanced PATH when custom paths change
  useEffect(() => {
    if (showEnhancedPath) {
      window.electronAPI.environment.getEnhancedPath().then(setEnhancedPath);
    }
  }, [customPathDirs, showEnhancedPath]);

  useEffect(() => {
    if (process.platform !== 'win32') {
      return;
    }

    window.electronAPI.terminal.getAvailableShells()
      .then((shells) => setAvailableTerminalShells(shells ?? []))
      .catch((error) => {
        console.error('[AdvancedPanel] Failed to load terminal shells:', error);
        setAvailableTerminalShells([]);
      });
  }, []);

  const terminalShellOptions: Array<{ value: PreferredTerminalShell; label: string }> = [
    { value: 'auto', label: t('advanced.terminal_shell_auto') },
  ];
  const seenShellProviders = new Set<PreferredTerminalShell>();
  for (const shell of availableTerminalShells) {
    const provider = shell.provider as PreferredTerminalShell | undefined;
    if (!provider || provider === 'auto' || seenShellProviders.has(provider)) {
      continue;
    }
    seenShellProviders.add(provider);
    const label = shell.name === provider
      ? `${shell.name} (${shell.path})`
      : `${shell.name} [${provider}] (${shell.path})`;
    terminalShellOptions.push({ value: provider, label });
  }

  const handleModeClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      setShowFeaturesMenu(prev => !prev);
    }
  };

  return (
    <div className="provider-panel flex flex-col">
      <div className="provider-panel-header mb-6 pb-4 border-b border-[var(--nim-border)]">
        <h3 className="provider-panel-title text-xl font-semibold leading-tight mb-2 text-[var(--nim-text)]">
          {t('advanced.title')}
        </h3>
        <p className="provider-panel-description text-sm leading-relaxed text-[var(--nim-text-muted)]">
          {t('advanced.description')}
        </p>
      </div>

      <div className="provider-panel-section mb-6">
        <DropdownRow
          value={uiLanguage}
          name={t('ui_language.label')}
          description={t('ui_language.description')}
          onChange={(value) => { void setUiLanguage(value as typeof uiLanguage); }}
          options={[
            { value: 'system', label: t('ui_language.system') },
            { value: 'en', label: t('ui_language.english') },
            { value: 'ja', label: t('ui_language.japanese') },
          ]}
        />
      </div>

      {/* Application Mode - Always shown at the top */}
      <div className="provider-panel-section">
          <h4 className="provider-panel-section-title" onClick={handleModeClick}>{t('advanced.application_mode')}</h4>
          <p className="provider-panel-hint">
            {t('advanced.application_mode_desc')}
          </p>

          <div className="mode-selection flex flex-row gap-4 mt-3">
            <label
              className={`mode-option flex flex-1 items-start p-0 rounded-xl cursor-pointer transition-all relative border-2 ${
                !developerMode
                  ? 'selected bg-nim-hover border-nim-primary shadow-[0_0_0_3px_rgba(88,166,255,0.15)]'
                  : 'bg-nim-secondary border-nim'
              }`}
              onClick={() => handleDeveloperModeChange(false)}
            >
              <input
                type="radio"
                name="mode"
                checked={!developerMode}
                onChange={() => handleDeveloperModeChange(false)}
                className="absolute top-3 right-3 m-0 cursor-pointer w-[18px] h-[18px] accent-[var(--nim-primary)]"
              />
              <div className="p-4 w-full flex flex-col items-center text-center">
                <div className="flex flex-col items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-nim-primary text-[32px]">
                    edit_note
                  </span>
                  <span className="text-base font-semibold text-nim">{t('advanced.standard_mode')}</span>
                </div>
                <p className="m-0 text-[13px] leading-snug text-nim-muted">
                  {t('advanced.standard_mode_desc')}
                </p>
              </div>
            </label>

            <label
              className={`mode-option flex flex-1 items-start p-0 rounded-xl cursor-pointer transition-all relative border-2 ${
                developerMode
                  ? 'selected bg-nim-hover border-nim-primary shadow-[0_0_0_3px_rgba(88,166,255,0.15)]'
                  : 'bg-nim-secondary border-nim'
              }`}
              onClick={() => handleDeveloperModeChange(true)}
            >
              <input
                type="radio"
                name="mode"
                checked={developerMode}
                onChange={() => handleDeveloperModeChange(true)}
                className="absolute top-3 right-3 m-0 cursor-pointer w-[18px] h-[18px] accent-[var(--nim-primary)]"
              />
              <div className="p-4 w-full flex flex-col items-center text-center">
                <div className="flex flex-col items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-nim-primary text-[32px]">
                    terminal
                  </span>
                  <span className="text-base font-semibold text-nim">{t('advanced.developer_mode')}</span>
                </div>
                <p className="m-0 text-[13px] leading-snug text-nim-muted">
                  {t('advanced.developer_mode_desc')}
                </p>
              </div>
            </label>
          </div>
        </div>

      {/* Secret Features Menu - Cmd+Click on "Application Mode" title to show */}
      {showFeaturesMenu && (
        <div className="provider-panel-section py-4 mb-4 border-b border-[var(--nim-border)] last:border-b-0 last:mb-0 last:pb-0">
          <h4 className="provider-panel-section-title text-base font-semibold mb-3 text-[var(--nim-text)]">
            {t('advanced.feature_availability')}
          </h4>
          <p className="text-sm leading-relaxed text-[var(--nim-text-muted)] mb-4">
            {t('advanced.feature_availability_desc')}
          </p>

          {/* Developer Features */}
          <div className="mt-4 p-3 bg-nim-secondary rounded-md border border-nim">
            {/* "All Developer Features" master toggle */}
            <div className="setting-item mb-3 pb-3 border-b border-nim">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={areAllDeveloperFeaturesEnabled(developerFeatures)}
                  onChange={(e) => {
                    const newFeatures = e.target.checked ? enableAllDeveloperFeatures() : disableAllDeveloperFeatures();
                    updateDeveloperSettings({ developerFeatures: newFeatures });
                  }}
                  disabled={!developerMode}
                  className="setting-checkbox"
                />
                <div className="setting-text">
                  <span className="setting-name">{t('advanced.all_developer_features')}</span>
                  <span className="setting-description">
                    {t('advanced.all_developer_features_desc')}
                  </span>
                </div>
              </label>
            </div>

            {/* Individual developer feature toggles */}
            {DEVELOPER_FEATURES.map((feature) => {
              const isAvailable = developerMode && developerFeatures[feature.tag];
              return (
                <div key={feature.tag} className="setting-item py-2">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={developerFeatures[feature.tag]}
                      onChange={(e) => {
                        updateDeveloperSettings({
                          developerFeatures: {
                            ...developerFeatures,
                            [feature.tag]: e.target.checked,
                          },
                        });
                      }}
                      disabled={!developerMode}
                      className="setting-checkbox"
                    />
                    <div className="setting-text">
                      <span className="setting-name flex items-center gap-2">
                        {feature.icon && (
                          <span className="material-symbols-outlined text-sm">{feature.icon}</span>
                        )}
                        {t(`advanced.features.${feature.tag}.name`)}
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            isAvailable
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {isAvailable ? t('advanced.available') : t('advanced.hidden')}
                        </span>
                      </span>
                      <span className="setting-description">{t(`advanced.features.${feature.tag}.description`)}</span>
                    </div>
                  </label>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-[var(--nim-text-faint)] mt-3">
            {t('advanced.developer_mode_status', { status: developerMode ? t('advanced.on') : t('advanced.off') })}
          </p>
        </div>
      )}

      {/* ── Release Channel ── */}
      <div className="provider-panel-section py-4 mb-4 border-b border-[var(--nim-border)] last:border-b-0 last:mb-0 last:pb-0">
        <h4 className="provider-panel-section-title text-base font-semibold mb-3 text-[var(--nim-text)]">{t('advanced.release_channel')}</h4>
        <p className="text-sm leading-relaxed text-[var(--nim-text-muted)] mb-4">
          {t('advanced.release_channel_desc')}
        </p>

        <div className="setting-item py-3">
          <div className="setting-text flex flex-col gap-0.5">
            <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('advanced.update_channel')}</span>
            <span className="setting-description text-xs leading-relaxed text-[var(--nim-text-muted)]">
              <strong>{t('advanced.stable_label')}</strong> {t('advanced.stable_desc')}<br/>
              <strong>{t('advanced.alpha_label')}</strong> {t('advanced.alpha_desc')}
            </span>
          </div>
          <select
            value={releaseChannel}
            onChange={(e) => {
              const newChannel = e.target.value as ReleaseChannel;
              updateSettings({ releaseChannel: newChannel });
              posthog?.capture('release_channel_changed', {
                channel: newChannel,
              });
            }}
            className="setting-select mt-2 w-full py-2 px-3 pr-9 rounded-md text-sm bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] text-[var(--nim-text)] outline-none appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M3%204.5L6%207.5L9%204.5%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] focus:border-[var(--nim-primary)]"
          >
            <option value="stable">{t('advanced.stable')}</option>
            <option value="alpha">{t('advanced.alpha_option')}</option>
          </select>
        </div>

        {releaseChannel === 'alpha' && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded border border-[var(--nim-warning)]/30 bg-[var(--nim-warning)]/10">
            <MaterialSymbol icon="warning" size={16} className="text-[var(--nim-warning)] shrink-0 mt-0.5" />
            <p className="m-0 text-[13px] text-[var(--nim-text)] leading-snug">
              {t('advanced.alpha_warning')}
            </p>
          </div>
        )}
      </div>

      {/* ── General ── */}
      <div className="provider-panel-section py-4 mb-4 border-b border-[var(--nim-border)] last:border-b-0 last:mb-0 last:pb-0">
        <h4 className="provider-panel-section-title text-base font-semibold mb-2 text-[var(--nim-text)]">{t('advanced.general')}</h4>

        <MultiProjectModeToggle />

        <UnlimitedProjectsToggle />

        <RestorePreviousProjectsToggle />

        <SettingsToggle
          checked={analyticsEnabled}
          onChange={(checked) => updateSettings({ analyticsEnabled: checked })}
          name={t('advanced.analytics_name')}
          description={t('advanced.analytics_desc')}
        />

        <SettingsToggle
          checked={spellcheckEnabled}
          onChange={(checked) => updateSettings({ spellcheckEnabled: checked })}
          name={t('advanced.spellcheck_name')}
          description={t('advanced.spellcheck_desc')}
        />

        <SettingsToggle
          checked={showDirectChatProviders}
          onChange={(checked) => updateSettings({ showDirectChatProviders: checked })}
          name={t('advanced.show_chat_providers_name')}
          description={t('advanced.show_chat_providers_desc')}
        />

        <SettingsToggle
          checked={walkthroughsEnabled}
          onChange={(checked) => updateSettings({ walkthroughsEnabled: checked })}
          name={t('advanced.guides_name')}
          description={walkthroughsTotalCount > 0
            ? t('advanced.guides_desc_count', { viewed: walkthroughsViewedCount, total: walkthroughsTotalCount })
            : t('advanced.guides_desc')}
        />

        {walkthroughsViewedCount > 0 && (
          <div className="py-1 pl-7">
            <button onClick={() => resetWalkthroughs()} className="nim-btn-secondary text-xs">
              {t('advanced.reset_all_guides')}
            </button>
          </div>
        )}
      </div>

      {/* ── Tracker Automation ── */}
      <div className="provider-panel-section py-4 mb-4 border-b border-[var(--nim-border)] last:border-b-0 last:mb-0 last:pb-0" data-testid="tracker-automation-section">
        <HelpTooltip testId="tracker-automation-section">
        <h4 className="provider-panel-section-title text-base font-semibold mb-2 text-[var(--nim-text)] inline-block">{t('advanced.tracker_automation')}</h4>
        </HelpTooltip>

        <SettingsToggle
          checked={trackerAutomation.enabled}
          onChange={(checked) => setTrackerAutomation({ enabled: checked })}
          name={t('advanced.link_commits_name')}
          description={t('advanced.link_commits_desc')}
        />

        {trackerAutomation.enabled && (
          <SettingsToggle
            checked={trackerAutomation.autoCloseOnCommit}
            onChange={(checked) => setTrackerAutomation({ autoCloseOnCommit: checked })}
            name={t('advanced.auto_close_name')}
            description={t('advanced.auto_close_desc')}
          />
        )}
      </div>

      {/* ── Tools & Environment ── */}
      <div className="provider-panel-section py-4 mb-4 border-b border-[var(--nim-border)] last:border-b-0 last:mb-0 last:pb-0">
        <h4 className="provider-panel-section-title text-base font-semibold mb-2 text-[var(--nim-text)]">{t('advanced.tools_environment')}</h4>

        <DropdownRow
          value={externalEditorType}
          onChange={(val) => updateExternalEditorSettings({ editorType: val as ExternalEditorType })}
          name={t('advanced.external_editor_name')}
          description={t('advanced.external_editor_desc')}
          options={[
            { value: 'none', label: t('advanced.editor_none') },
            { value: 'vscode', label: 'VS Code' },
            { value: 'cursor', label: 'Cursor' },
            { value: 'webstorm', label: 'WebStorm' },
            { value: 'sublime', label: 'Sublime Text' },
            { value: 'vim', label: t('advanced.editor_vim_terminal') },
            { value: 'nvim', label: t('advanced.editor_neovim_terminal') },
            { value: 'custom', label: t('advanced.editor_custom') },
          ]}
        />

        {externalEditorType === 'custom' && (
          <div className="py-2 pl-7">
            <input
              type="text"
              value={externalEditorCustomPath || ''}
              onChange={(e) => updateExternalEditorSettings({ customPath: e.target.value })}
              placeholder={process.platform === 'win32' ? 'C:\\Program Files\\Editor\\editor.exe' : '/usr/local/bin/myeditor'}
              className="w-full py-1.5 px-3 rounded-md text-sm bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] text-[var(--nim-text)] outline-none focus:border-[var(--nim-primary)] font-mono"
            />
          </div>
        )}

        <SettingsToggle
          checked={extensionDevToolsEnabled}
          onChange={(checked) => updateSettings({ extensionDevToolsEnabled: checked })}
          name={t('advanced.extension_tools_name')}
          description={t('advanced.extension_tools_desc')}
        />

        <DropdownRow
          value={maxHeapSizeMB}
          onChange={(val) => updateSettings({ maxHeapSizeMB: parseInt(val, 10) })}
          name={t('advanced.heap_name')}
          description={t('advanced.heap_desc')}
          options={[
            { value: 2048, label: '2 GB' },
            { value: 4096, label: t('advanced.heap_default', { size: 4 }) },
            { value: 6144, label: '6 GB' },
            { value: 8192, label: '8 GB' },
            { value: 12288, label: '12 GB' },
            { value: 16384, label: '16 GB' },
          ]}
        />

        {process.platform === 'win32' && (
          <>
            <DropdownRow
              value={preferredTerminalShell}
              onChange={(val) => updateSettings({ preferredTerminalShell: val as PreferredTerminalShell })}
              name={t('advanced.terminal_shell_name')}
              description={t('advanced.terminal_shell_desc')}
              options={terminalShellOptions}
            />

            <div className="setting-item py-2">
              <div className="setting-text flex flex-col gap-0 mb-2">
                <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('advanced.detected_terminal_shells')}</span>
                <span className="setting-description text-xs leading-snug text-[var(--nim-text-muted)]">
                  {t('advanced.detected_terminal_shells_desc')}
                </span>
              </div>

              <div className="select-text p-2 rounded-md text-xs bg-[var(--nim-bg-tertiary)] border border-[var(--nim-border)] text-[var(--nim-text-muted)] font-mono">
                {availableTerminalShells.length === 0 ? (
                  <div>{t('advanced.no_terminal_shells')}</div>
                ) : (
                  availableTerminalShells.map((shell) => (
                    <div key={`${shell.provider || shell.name}-${shell.path}`} className="py-0.5 break-all">
                      {`${shell.provider || shell.name} | ${shell.path} | bootstrap=${shell.bootstrapMode || 'none'} | cwd=${shell.cwdMode || 'native'}`}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        <DropdownRow
          value={historyMaxAgeDays}
          onChange={(val) => updateSettings({ historyMaxAgeDays: parseInt(val, 10) })}
          name={t('advanced.history_age_name')}
          description={t('advanced.history_age_desc')}
          options={[
            { value: 7, label: t('advanced.days', { count: 7 }) },
            { value: 14, label: t('advanced.days', { count: 14 }) },
            { value: 30, label: t('advanced.days_default', { count: 30 }) },
            { value: 60, label: t('advanced.days', { count: 60 }) },
            { value: 90, label: t('advanced.days', { count: 90 }) },
            { value: 180, label: t('advanced.days', { count: 180 }) },
            { value: 365, label: t('advanced.one_year') },
          ]}
        />

        <DropdownRow
          value={historyMaxSnapshots}
          onChange={(val) => updateSettings({ historyMaxSnapshots: parseInt(val, 10) })}
          name={t('advanced.history_snapshots_name')}
          description={t('advanced.history_snapshots_desc')}
          options={[
            { value: 50, label: '50' },
            { value: 100, label: '100' },
            { value: 250, label: t('advanced.count_default', { count: '250' }) },
            { value: 500, label: '500' },
            { value: 1000, label: '1,000' },
          ]}
        />

        {/* Custom PATH */}
        <div className="setting-item py-2">
          <div className="setting-text flex flex-col gap-0 mb-2">
            <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('advanced.custom_path_dirs')}</span>
            <span className="setting-description text-xs leading-snug text-[var(--nim-text-muted)]">
              {t('advanced.custom_path_dirs_desc')}
            </span>
          </div>
          <textarea
            value={customPathDirs}
            onChange={(e) => updateSettings({ customPathDirs: e.target.value })}
            placeholder={process.platform === 'win32'
              ? 'C:\\MyTools;C:\\Programs\\bin'
              : '/opt/mytools/bin:/usr/local/custom/bin'}
            rows={2}
            className="w-full py-1.5 px-3 rounded-md text-sm bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] text-[var(--nim-text)] outline-none focus:border-[var(--nim-primary)] font-mono resize-none"
          />
          <div className="mt-1">
            <button
              onClick={() => setShowEnhancedPath(!showEnhancedPath)}
              className="text-xs text-[var(--nim-link)] hover:text-[var(--nim-link-hover)] cursor-pointer"
            >
              {showEnhancedPath ? t('advanced.hide_current_path') : t('advanced.show_current_path')}
            </button>

            {showEnhancedPath && enhancedPath && (
              <div className="mt-2">
                <div
                  className="p-2 rounded-md text-xs bg-[var(--nim-bg-tertiary)] border border-[var(--nim-border)] text-[var(--nim-text-muted)] font-mono overflow-x-auto"
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {enhancedPath.split(process.platform === 'win32' ? ';' : ':').map((p, index) => (
                    <div key={index} className="py-0.5">
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

/**
 * Toggle for the multi-project rail. When the user disables it with
 * inactive warm projects in the rail, those projects' main-process
 * services are released and the rail collapses to just the active
 * project so state stays consistent.
 */
function MultiProjectModeToggle() {
  const { t } = useTranslation('settings');
  const [enabled, setEnabled] = useAtom(multiProjectModeAtom);
  const [openProjects, setOpenProjects] = useAtom(openProjectsAtom);
  const activePath = useAtomValue(activeWorkspacePathAtom);

  const handleChange = async (next: boolean) => {
    if (!next && openProjects.length > 1) {
      const proceed = await requestConfirmation({
        title: t('advanced.disable_multi_project_title'),
        message: t('advanced.multi_project_disable_confirm', { count: openProjects.length }),
        confirmLabel: t('advanced.disable_and_close_projects'),
      });
      if (!proceed) return;

      // Release services for every non-active path before collapsing the
      // rail. The main process refcounts services across windows, so this
      // only frees them when no other window references the path.
      const inactivePaths = openProjects
        .filter((p) => p.path !== activePath)
        .map((p) => p.path);
      await Promise.all(
        inactivePaths.map((path) =>
          window.electronAPI?.invoke?.('workspace:unregister-additional', { workspacePath: path })
            .catch((err: unknown) => {
              console.error('[AdvancedPanel] unregister-additional failed for', path, err);
            })
        )
      );

      const remaining = openProjects.filter((p) => p.path === activePath);
      setOpenProjects(remaining);
    }
    setEnabled(next);
  };

  return (
    <SettingsToggle
      checked={enabled}
      onChange={handleChange}
      name={t('advanced.multi_project_mode')}
      description={t('advanced.multi_project_mode_desc')}
    />
  );
}

function UnlimitedProjectsToggle() {
  const { t } = useTranslation('settings');
  const [allowUnlimited, setAllowUnlimited] = useAtom(allowUnlimitedProjectsAtom);
  const enabled = useAtomValue(multiProjectModeAtom);
  const [error, setError] = useState<string | null>(null);
  if (!enabled) return null;

  return (
    <div className="project-limit-setting" data-testid="project-limit-setting">
      <SettingsToggle
        name={t('advanced.unlimited_projects_name')}
        checked={allowUnlimited}
        onChange={async checked => {
          setError(null);
          try {
            await setAllowUnlimited(checked);
          } catch {
            setError(t('advanced.save_setting_error'));
          }
        }}
        description={t('advanced.unlimited_projects_desc')}
      />
      {error && <p role="alert" className="text-sm text-[var(--nim-error)]">{error}</p>}
    </div>
  );
}

/**
 * Toggle for re-opening last session's rail projects on launch. Default
 * off so a normal launch from the project picker opens just the picked
 * project; warm rail projects must be added explicitly via the rail's
 * `+` button.
 */
function RestorePreviousProjectsToggle() {
  const { t } = useTranslation('settings');
  const [enabled, setEnabled] = useAtom(restorePreviousProjectsAtom);
  const isMultiProject = useAtomValue(multiProjectModeAtom);

  return (
    <SettingsToggle
      checked={enabled}
      onChange={setEnabled}
      name={t('advanced.restore_projects')}
      description={
        isMultiProject
          ? t('advanced.restore_projects_desc')
          : t('advanced.restore_projects_requires_multi')
      }
    />
  );
}
