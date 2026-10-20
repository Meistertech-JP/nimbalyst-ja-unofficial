import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePostHog } from 'posthog-js/react';
import { MaterialSymbol, createExtensionStorage } from '@nimbalyst/runtime';
import type { ExtensionManifest, SettingsPanelProps } from '@nimbalyst/runtime';
import { getExtensionLoader } from '@nimbalyst/runtime';
import { ExtensionConfigPanel } from './ExtensionConfigPanel';
import { ExtensionBackendModulesSection } from '../../ExtensionPermissions/ExtensionBackendModulesSection';
import { useTheme } from '../../../hooks/useTheme';
import { ToggleSwitch } from '../../GlobalSettings/SettingsToggle';

interface InstalledExtension {
  id: string;
  path: string;
  manifest: ExtensionManifest;
  isBuiltin?: boolean;
}

interface ExtensionSettings {
  enabled: boolean;
  claudePluginEnabled?: boolean;
  agentWorkflowsEnabled?: boolean;
}

interface MarketplaceInstallRecord {
  extensionId: string;
  version: string;
  installedAt: string;
  updatedAt: string;
  source: 'marketplace' | 'github-url';
  githubUrl?: string;
}

interface RegistryExtensionLite {
  id: string;
  version: string;
  downloadUrl: string;
  checksum: string;
  repositoryUrl?: string;
}

type ExtensionSource = 'marketplace' | 'github' | 'local' | 'built-in';

interface ExtensionWithState extends InstalledExtension {
  enabled: boolean;
  claudePluginEnabled?: boolean;
  agentWorkflowsEnabled?: boolean;
  source: ExtensionSource;
  installedAt?: string;
  installRecord?: MarketplaceInstallRecord;
  availableUpdate?: { currentVersion: string; availableVersion: string };
  registryEntry?: RegistryExtensionLite;
}

interface InstalledExtensionsPanelProps {
  scope: 'user' | 'organization' | 'project';
  workspacePath?: string;
}


export const InstalledExtensionsPanel: React.FC<InstalledExtensionsPanelProps> = ({
  scope,
  workspacePath,
}) => {
  const { t, i18n } = useTranslation(['extensions', 'common']);
  const posthog = usePostHog();
  const { theme } = useTheme();
  const [extensions, setExtensions] = useState<ExtensionWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get extension settings panels from the loader
  const extensionSettingsPanels = useMemo(() => {
    const loader = getExtensionLoader();
    if (!loader) return new Map();

    const panels = new Map<string, React.ComponentType<SettingsPanelProps>>();
    for (const panel of loader.getSettingsPanels()) {
      panels.set(panel.extensionId, panel.component);
    }
    return panels;
  }, [extensions]); // Re-compute when extensions change

  // Selected extension
  const selectedExtension = useMemo(() => {
    return extensions.find(ext => ext.id === selectedId) || null;
  }, [extensions, selectedId]);

  // Load extensions and their enabled state
  useEffect(() => {
    loadExtensions();
  }, []);

  // Auto-select first extension when loaded
  useEffect(() => {
    if (extensions.length > 0 && !selectedId) {
      setSelectedId(extensions[0].id);
    }
  }, [extensions, selectedId]);

  const loadExtensions = async () => {
    try {
      setLoading(true);
      setError(null);

      const [installed, settings, marketplaceInstallsResult, updatesResult, registryResult] = await Promise.all([
        window.electronAPI.extensions.listInstalled() as Promise<InstalledExtension[]>,
        window.electronAPI.extensions.getAllSettings() as Promise<Record<string, ExtensionSettings>>,
        window.electronAPI.invoke('extension-marketplace:get-installed'),
        window.electronAPI.invoke('extension-marketplace:check-updates'),
        window.electronAPI.invoke('extension-marketplace:fetch-registry'),
      ]);

      const installRecords: Record<string, MarketplaceInstallRecord> = marketplaceInstallsResult?.success
        ? (marketplaceInstallsResult.data || {})
        : {};

      const updateMap: Record<string, { currentVersion: string; availableVersion: string }> = {};
      if (updatesResult?.success && Array.isArray(updatesResult.data)) {
        for (const u of updatesResult.data) {
          updateMap[u.extensionId] = { currentVersion: u.currentVersion, availableVersion: u.availableVersion };
        }
      }

      const registryById: Record<string, RegistryExtensionLite> = {};
      if (registryResult?.success && Array.isArray(registryResult.data?.extensions)) {
        for (const ext of registryResult.data.extensions) {
          registryById[ext.id] = {
            id: ext.id,
            version: ext.version,
            downloadUrl: ext.downloadUrl,
            checksum: ext.checksum,
            repositoryUrl: ext.repositoryUrl,
          };
        }
      }

      const extensionsWithState: ExtensionWithState[] = installed.map(ext => {
        const extSettings = settings[ext.id];
        const claudePlugin = ext.manifest.contributions?.claudePlugin;
        const agentWorkflows = ext.manifest.contributions?.agentWorkflows;
        const installRecord = installRecords[ext.id];
        const source: ExtensionSource = ext.isBuiltin
          ? 'built-in'
          : installRecord?.source === 'marketplace'
            ? 'marketplace'
            : installRecord?.source === 'github-url'
              ? 'github'
              : 'local';
        return {
          ...ext,
          enabled: extSettings?.enabled ?? (ext.manifest.defaultEnabled !== false),
          claudePluginEnabled: extSettings?.claudePluginEnabled ?? claudePlugin?.enabledByDefault ?? true,
          agentWorkflowsEnabled: extSettings?.agentWorkflowsEnabled ?? agentWorkflows?.enabledByDefault ?? true,
          source,
          installedAt: installRecord?.installedAt,
          installRecord,
          availableUpdate: updateMap[ext.id],
          registryEntry: registryById[ext.id],
        };
      });

      extensionsWithState.sort((a, b) =>
        a.manifest.name.localeCompare(b.manifest.name)
      );

      setExtensions(extensionsWithState);
    } catch (err) {
      console.error('Failed to load extensions:', err);
      setError(err instanceof Error ? err.message : t('extensions:installed_panel.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = useCallback(async (extensionId: string, enabled: boolean, extensionPath?: string) => {
    setProcessingId(extensionId);
    setError(null);

    try {
      // Update persisted state
      await window.electronAPI.extensions.setEnabled(extensionId, enabled);

      // Update runtime state in ExtensionLoader
      const loader = getExtensionLoader();
      if (enabled) {
        // enableExtension only flips a flag on an already-loaded extension.
        // If it was skipped at startup (e.g. defaultEnabled: false), it isn't
        // loaded yet, so load it from disk now to register its panels/editors.
        if (loader.getExtension(extensionId) || !extensionPath) {
          loader.enableExtension(extensionId);
        } else {
          const result = await loader.loadExtensionFromPath(extensionPath);
          if (!result.success) {
            throw new Error(result.error || t('extensions:installed_panel.load_extension_failed', { id: extensionId }));
          }
        }
      } else {
        loader.disableExtension(extensionId);
      }

      // Track analytics
      posthog?.capture('extension_toggled', {
        action: enabled ? 'enabled' : 'disabled',
      });

      // Update local state
      setExtensions(prev => prev.map(ext =>
        ext.id === extensionId ? { ...ext, enabled } : ext
      ));
    } catch (err) {
      console.error(`Failed to ${enabled ? 'enable' : 'disable'} extension:`, err);
      setError(err instanceof Error ? err.message : t(enabled ? 'extensions:installed_panel.enable_failed' : 'extensions:installed_panel.disable_failed'));
    } finally {
      setProcessingId(null);
    }
  }, [posthog, t]);

  const handleClaudePluginToggle = useCallback(async (extensionId: string, enabled: boolean) => {
    setProcessingId(extensionId);
    setError(null);

    try {
      // Update persisted state for Claude plugin
      await window.electronAPI.extensions.setClaudePluginEnabled(extensionId, enabled);

      // Track analytics
      posthog?.capture('extension_claude_plugin_toggled', {
        extensionId,
        action: enabled ? 'enabled' : 'disabled',
      });

      // Update local state
      setExtensions(prev => prev.map(ext =>
        ext.id === extensionId ? { ...ext, claudePluginEnabled: enabled } : ext
      ));
    } catch (err) {
      console.error(`Failed to ${enabled ? 'enable' : 'disable'} Claude plugin:`, err);
      setError(err instanceof Error ? err.message : t(enabled ? 'extensions:installed_panel.enable_plugin_failed' : 'extensions:installed_panel.disable_plugin_failed'));
    } finally {
      setProcessingId(null);
    }
  }, [posthog, t]);

  const handleAgentWorkflowsToggle = useCallback(async (extensionId: string, enabled: boolean) => {
    setProcessingId(extensionId);
    setError(null);

    try {
      await window.electronAPI.extensions.setAgentWorkflowsEnabled(extensionId, enabled);
      setExtensions(prev => prev.map(ext =>
        ext.id === extensionId ? { ...ext, agentWorkflowsEnabled: enabled } : ext
      ));
    } catch (err) {
      console.error(`Failed to ${enabled ? 'enable' : 'disable'} agent workflows:`, err);
      setError(err instanceof Error ? err.message : t(enabled ? 'extensions:installed_panel.enable_workflows_failed' : 'extensions:installed_panel.disable_workflows_failed'));
    } finally {
      setProcessingId(null);
    }
  }, [t]);

  const handleUpdate = useCallback(async (ext: ExtensionWithState) => {
    if (!ext.registryEntry || !ext.availableUpdate) return;
    setProcessingId(ext.id);
    setError(null);
    try {
      const result = await window.electronAPI.invoke(
        'extension-marketplace:install',
        ext.id,
        ext.registryEntry.downloadUrl,
        ext.registryEntry.checksum,
        ext.registryEntry.version,
      );
      if (result.success) {
        posthog?.capture('extension_marketplace_updated', {
          extensionId: ext.id,
          fromVersion: ext.availableUpdate.currentVersion,
          toVersion: ext.registryEntry.version,
        });
        await loadExtensions();
      } else {
        setError(result.error || t('extensions:installed_panel.update_failed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('extensions:installed_panel.update_failed'));
    } finally {
      setProcessingId(null);
    }
  }, [posthog, t]);

  const handleUninstall = useCallback(async (extensionId: string) => {
    if (!window.confirm(t('extensions:installed_panel.uninstall_confirm'))) return;
    setProcessingId(extensionId);
    setError(null);
    try {
      const result = await window.electronAPI.invoke('extension-marketplace:uninstall', extensionId);
      if (result.success) {
        posthog?.capture('extension_marketplace_uninstalled', { extensionId });
        if (selectedId === extensionId) {
          setSelectedId(null);
        }
        await loadExtensions();
      } else {
        setError(result.error || t('extensions:installed_panel.uninstall_failed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('extensions:installed_panel.uninstall_failed'));
    } finally {
      setProcessingId(null);
    }
  }, [posthog, selectedId, t]);

  const handleReveal = useCallback((path: string) => {
    window.electronAPI.invoke('show-in-finder', path);
  }, []);

  const enabledCount = extensions.filter(ext => ext.enabled).length;
  const totalCount = extensions.length;
  const updateCount = extensions.filter(ext => ext.availableUpdate && ext.registryEntry).length;

  const filteredExtensions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return extensions;
    return extensions.filter((ext) => {
      const name = ext.manifest.name?.toLowerCase() ?? '';
      const author = ext.manifest.author?.toLowerCase() ?? '';
      const description = ext.manifest.description?.toLowerCase() ?? '';
      const id = ext.id.toLowerCase();
      return name.includes(q) || author.includes(q) || description.includes(q) || id.includes(q);
    });
  }, [extensions, searchQuery]);

  const sourceLabel = (s: ExtensionSource) => {
    switch (s) {
      case 'marketplace': return t('extensions:installed_panel.source_marketplace');
      case 'github': return t('extensions:installed_panel.source_github');
      case 'local': return t('extensions:installed_panel.source_local');
      case 'built-in': return t('extensions:installed_panel.source_builtin');
    }
  };

  const sourcePillClasses = (s: ExtensionSource) => {
    switch (s) {
      case 'marketplace': return 'bg-[rgba(96,165,250,0.15)] text-[var(--nim-primary)]';
      case 'github': return 'bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)]';
      case 'local': return 'bg-[rgba(251,191,36,0.15)] text-[var(--nim-warning)]';
      case 'built-in': return 'bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-faint)]';
    }
  };

  if (loading) {
    return (
      <div
        className="installed-extensions-panel provider-panel"
        data-testid="installed-extensions-panel"
        data-component="InstalledExtensionsPanel"
      >
        <div className="flex items-center justify-center py-12 text-[var(--nim-text-muted)]">
          <p>{t('extensions:installed_panel.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="installed-extensions-panel provider-panel flex flex-col absolute inset-0 p-6"
      data-testid="installed-extensions-panel"
      data-component="InstalledExtensionsPanel"
      data-source="packages/electron/src/renderer/components/Settings/panels/InstalledExtensionsPanel.tsx"
    >
      {/* Header */}
      <div className="provider-panel-header mb-5 pb-4 border-b border-[var(--nim-border)] flex-shrink-0">
        <h3 className="provider-panel-title text-xl font-semibold leading-tight mb-2 text-[var(--nim-text)]">{t('extensions:installed')}</h3>

      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[var(--nim-error)] flex-shrink-0">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--nim-text-muted)]">
          <MaterialSymbol icon="extension" size={48} />
          <h3 className="mt-4 mb-2 text-lg font-medium text-[var(--nim-text)]">{t('extensions:no_installed')}</h3>
          <p className="text-sm">
            {t('extensions:installed_panel.no_installed_help')}
          </p>
        </div>
      ) : (
        /* Main content: List + Details split view */
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left: Extension list */}
          <div className="w-[260px] flex-shrink-0 flex flex-col bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] rounded-lg overflow-hidden">
            <div className="px-3 py-2.5 border-b border-[var(--nim-border)] flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-semibold text-[var(--nim-text-muted)] uppercase tracking-wide">{t('extensions:extensions')}</span>
              <span className="text-xs text-[var(--nim-text-faint)]">
                {enabledCount}/{totalCount}
                {updateCount > 0 && (
                  <span className="ml-2 text-[var(--nim-primary)]">{t('extensions:installed_panel.update_count', { count: updateCount })}</span>
                )}
              </span>
            </div>
            <div className="px-2 py-2 border-b border-[var(--nim-border)] flex-shrink-0">
              <div className="relative" role="search">
                <MaterialSymbol
                  icon="search"
                  size={16}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--nim-text-faint)] pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('extensions:search')}
                  aria-label={t('extensions:installed_panel.search_installed')}
                  data-testid="installed-extensions-search"
                  className="w-full py-1.5 pl-8 pr-7 rounded border border-[var(--nim-border)] bg-[var(--nim-bg)] text-[var(--nim-text)] text-sm outline-none focus:border-[var(--nim-primary)] placeholder:text-[var(--nim-text-faint)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label={t('extensions:installed_panel.clear_search')}
                    data-testid="installed-extensions-search-clear"
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center text-[var(--nim-text-muted)] hover:text-[var(--nim-text)]"
                    onClick={() => setSearchQuery('')}
                  >
                    <MaterialSymbol icon="close" size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {filteredExtensions.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-[var(--nim-text-faint)]">
                  {t('extensions:installed_panel.no_match_installed', { query: searchQuery })}
                </div>
              ) : filteredExtensions.map((ext) => (
                <div
                  key={ext.id}
                  data-testid={`installed-extension-${ext.id}`}
                  className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b border-[var(--nim-border)] transition-colors ${
                    selectedId === ext.id
                      ? 'bg-[rgba(38,139,210,0.15)] border-l-2 border-l-[var(--nim-primary)] pl-2.5'
                      : 'hover:bg-[var(--nim-bg-hover)]'
                  } ${!ext.enabled ? 'opacity-50' : ''}`}
                  onClick={() => setSelectedId(ext.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-medium text-[var(--nim-text)] truncate">{ext.manifest.name}</span>
                      {ext.availableUpdate && ext.registryEntry && (
                        <MaterialSymbol icon="upgrade" size={14} className="text-[var(--nim-primary)] shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-flex items-center px-1.5 py-0 rounded text-[0.625rem] font-semibold uppercase tracking-tight ${sourcePillClasses(ext.source)}`}>
                        {sourceLabel(ext.source)}
                      </span>
                      <span className="text-xs text-[var(--nim-text-faint)] truncate">{ext.manifest.author || t('extensions:installed_panel.unknown_author')}</span>
                    </div>
                  </div>
                  <span className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <ToggleSwitch
                      checked={ext.enabled}
                      onChange={(checked) => handleToggle(ext.id, checked, ext.path)}
                      disabled={processingId === ext.id}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Extension details */}
          <div className="flex-1 bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] rounded-lg overflow-hidden flex flex-col">
            {selectedExtension ? (
              <>
                {/* Details header */}
                <div className="p-4 border-b border-[var(--nim-border)] flex-shrink-0">
                  <div className="text-base font-semibold text-[var(--nim-text)]">{selectedExtension.manifest.name}</div>
                  <div className="text-xs text-[var(--nim-text-muted)]">
                    {t('extensions:installed_panel.by_author', { author: selectedExtension.manifest.author || t('extensions:installed_panel.unknown_author') })}
                    <span className="text-[var(--nim-text-faint)] ml-2">v{selectedExtension.manifest.version}</span>
                  </div>
                  <div className="text-sm text-[var(--nim-text-muted)] mt-2 leading-relaxed">
                    {selectedExtension.manifest.description || t('extensions:installed_panel.no_description')}
                  </div>
                </div>

                {/* Details body - scrollable */}
                <div className="flex-1 overflow-y-auto min-h-0 p-4">
                  {/* Source + actions */}
                  <div className="mb-5 pb-4 border-b border-[var(--nim-border)]">
                    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-[var(--nim-text-muted)]">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[0.6875rem] font-semibold uppercase tracking-tight ${sourcePillClasses(selectedExtension.source)}`}>
                        {sourceLabel(selectedExtension.source)}
                      </span>
                      {selectedExtension.installedAt && (
                        <span>{t('extensions:installed_panel.installed_on', { date: new Date(selectedExtension.installedAt).toLocaleDateString(i18n.language) })}</span>
                      )}
                      {selectedExtension.availableUpdate && (
                        <span className="text-[var(--nim-primary)]">
                          v{selectedExtension.availableUpdate.currentVersion} &rarr; v{selectedExtension.availableUpdate.availableVersion}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedExtension.availableUpdate && selectedExtension.registryEntry && (
                        <button
                          className="py-1.5 px-3 border-none rounded text-xs font-medium cursor-pointer transition-opacity duration-150 bg-[var(--nim-primary)] text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                          onClick={() => handleUpdate(selectedExtension)}
                          disabled={processingId === selectedExtension.id}
                          data-testid={`installed-update-${selectedExtension.id}`}
                        >
                          {processingId === selectedExtension.id ? t('extensions:installed_panel.updating') : t('extensions:installed_panel.update_to', { version: selectedExtension.availableUpdate.availableVersion })}
                        </button>
                      )}
                      {(selectedExtension.manifest.marketplace?.repositoryUrl || selectedExtension.registryEntry?.repositoryUrl) && (
                        <button
                          className="py-1.5 px-3 border border-[var(--nim-border)] rounded bg-transparent text-[var(--nim-text-muted)] text-xs font-medium cursor-pointer transition-all duration-150 hover:border-[var(--nim-text-muted)] hover:text-[var(--nim-text)]"
                          onClick={() => {
                            const url = selectedExtension.manifest.marketplace?.repositoryUrl || selectedExtension.registryEntry?.repositoryUrl;
                            if (url) window.electronAPI.openExternal(url);
                          }}
                        >
                          {t('extensions:installed_panel.repository')}
                        </button>
                      )}
                      <button
                        className="py-1.5 px-3 border border-[var(--nim-border)] rounded bg-transparent text-[var(--nim-text-muted)] text-xs font-medium cursor-pointer transition-all duration-150 hover:border-[var(--nim-text-muted)] hover:text-[var(--nim-text)]"
                        onClick={() => handleReveal(selectedExtension.path)}
                        data-testid={`installed-reveal-${selectedExtension.id}`}
                      >
                        {t('extensions:installed_panel.reveal')}
                      </button>
                      {selectedExtension.source !== 'built-in' && (
                        <button
                          className="py-1.5 px-3 border border-[var(--nim-error)] rounded bg-transparent text-[var(--nim-error)] text-xs font-medium cursor-pointer transition-all duration-150 hover:bg-[var(--nim-error)] hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                          onClick={() => handleUninstall(selectedExtension.id)}
                          disabled={processingId === selectedExtension.id}
                          data-testid={`installed-uninstall-${selectedExtension.id}`}
                        >
                          {t('extensions:installed_panel.uninstall')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Extension configuration if available */}
                  {selectedExtension.manifest.contributions?.configuration && selectedExtension.enabled && (
                      <div className="mb-5">
                        <ExtensionConfigPanel
                            extensionId={selectedExtension.id}
                            manifest={selectedExtension.manifest}
                            scope={scope}
                            workspacePath={workspacePath}
                        />
                      </div>
                  )}

                  {/* Privileged backend modules (Phase 4) */}
                  {Array.isArray(selectedExtension.manifest.contributions?.backendModules) &&
                    selectedExtension.manifest.contributions!.backendModules!.length > 0 && (
                      <ExtensionBackendModulesSection
                        extensionId={selectedExtension.id}
                        modules={selectedExtension.manifest.contributions!.backendModules!}
                        workspacePath={workspacePath}
                      />
                    )}

                  {/* Claude Plugin */}
                  {selectedExtension.manifest.contributions?.claudePlugin && (
                    <div className="mb-5">
                      <div className="text-xs font-semibold text-[var(--nim-text-muted)] uppercase tracking-wide mb-2.5">{t('extensions:claude_plugin')}</div>
                      <div className="bg-[var(--nim-bg)] border border-[var(--nim-border)] rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--nim-text)]">
                            <span className="material-symbols-outlined text-base text-[var(--nim-primary)]">smart_toy</span>
                            {selectedExtension.manifest.contributions.claudePlugin.displayName || t('extensions:installed_panel.claude_plugin')}
                          </div>
                          <ToggleSwitch
                            checked={selectedExtension.claudePluginEnabled ?? true}
                            onChange={(checked) => handleClaudePluginToggle(selectedExtension.id, checked)}
                            disabled={processingId === selectedExtension.id || !selectedExtension.enabled}
                          />
                        </div>
                        <div className="text-xs text-[var(--nim-text-muted)] mb-2.5">
                          {selectedExtension.manifest.contributions.claudePlugin.description || t('extensions:installed_panel.no_description_short')}
                        </div>
                        {selectedExtension.manifest.contributions.claudePlugin.commands && selectedExtension.manifest.contributions.claudePlugin.commands.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {selectedExtension.manifest.contributions.claudePlugin.commands.map((cmd, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded text-xs bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)] font-mono" title={cmd.description}>
                                /{cmd.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {!selectedExtension.enabled && (
                          <div className="mt-2 text-xs text-[var(--nim-text-faint)] italic">
                            {t('extensions:installed_panel.enable_plugin')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedExtension.manifest.contributions?.agentWorkflows && (
                    <div className="mb-5">
                      <div className="text-xs font-semibold text-[var(--nim-text-muted)] uppercase tracking-wide mb-2.5">{t('extensions:agent_workflows')}</div>
                      <div className="bg-[var(--nim-bg)] border border-[var(--nim-border)] rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--nim-text)]">
                            <span className="material-symbols-outlined text-base text-[var(--nim-primary)]">hub</span>
                            {selectedExtension.manifest.contributions.agentWorkflows.displayName || t('extensions:agent_workflows')}
                          </div>
                          <ToggleSwitch
                            checked={selectedExtension.agentWorkflowsEnabled ?? true}
                            onChange={(checked) => handleAgentWorkflowsToggle(selectedExtension.id, checked)}
                            disabled={processingId === selectedExtension.id || !selectedExtension.enabled}
                          />
                        </div>
                        <div className="text-xs text-[var(--nim-text-muted)]">
                          {selectedExtension.manifest.contributions.agentWorkflows.description || t('extensions:installed_panel.workflows_description')}
                        </div>
                        {!selectedExtension.enabled && (
                          <div className="mt-2 text-xs text-[var(--nim-text-faint)] italic">
                            {t('extensions:installed_panel.enable_workflows')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Extension Info */}
                  <div className="mb-5">
                    <div className="text-xs font-semibold text-[var(--nim-text-muted)] uppercase tracking-wide mb-2.5">{t('extensions:extension_info')}</div>
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <span className="text-xs text-[var(--nim-text-faint)] w-10">ID</span>
                        <span className="text-xs text-[var(--nim-text-muted)] font-mono">{selectedExtension.id}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-xs text-[var(--nim-text-faint)] w-10">{t('extensions:path')}</span>
                        <span className="text-xs text-[var(--nim-text-muted)] font-mono truncate" title={selectedExtension.path}>
                          {selectedExtension.path.replace(/^.*?\/extensions\//, '~/extensions/')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contributions */}
                  {selectedExtension.manifest.contributions && (
                    <div className="mb-5">
                      <div className="text-xs font-semibold text-[var(--nim-text-muted)] uppercase tracking-wide mb-2.5">{t('extensions:contributions')}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedExtension.manifest.contributions.customEditors?.map((editor, idx) => (
                          <span key={`editor-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)]">
                            <span className="material-symbols-outlined text-sm">edit_document</span>
                            {editor.displayName}
                          </span>
                        ))}
                        {selectedExtension.manifest.contributions.aiTools?.map((tool, idx) => {
                          const toolName = typeof tool === 'string' ? tool : (tool as { name: string }).name;
                          return (
                            <span key={`tool-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)]">
                              <span className="material-symbols-outlined text-sm">smart_toy</span>
                              {t('extensions:installed_panel.ai_tool', { name: toolName })}
                            </span>
                          );
                        })}
                        {selectedExtension.manifest.contributions.slashCommands?.map((cmd, idx) => (
                          <span key={`slash-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)] font-mono">
                            /{cmd.title}
                          </span>
                        ))}
                        {selectedExtension.manifest.contributions.agentWorkflows && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)]">
                            <span className="material-symbols-outlined text-sm">hub</span>
                            {selectedExtension.manifest.contributions.agentWorkflows.displayName}
                          </span>
                        )}
                        {selectedExtension.manifest.contributions.nodes?.map((node, idx) => (
                          <span key={`node-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)]">
                            <span className="material-symbols-outlined text-sm">widgets</span>
                            {node}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Permissions */}
                  {selectedExtension.manifest.permissions && (
                    <div className="mb-5">
                      <div className="text-xs font-semibold text-[var(--nim-text-muted)] uppercase tracking-wide mb-2.5">{t('extensions:installed_panel.permissions')}</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedExtension.manifest.permissions.filesystem && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)]">
                            <span className="material-symbols-outlined text-sm">folder</span>
                            {t('extensions:installed_panel.filesystem')}
                          </span>
                        )}
                        {selectedExtension.manifest.permissions.ai && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)]">
                            <span className="material-symbols-outlined text-sm">psychology</span>
                            {t('extensions:installed_panel.ai_tools')}
                          </span>
                        )}
                        {selectedExtension.manifest.permissions.network && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)]">
                            <span className="material-symbols-outlined text-sm">cloud</span>
                            {t('extensions:installed_panel.network')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Custom settings panel if extension provides one */}
                  {selectedExtension.enabled && extensionSettingsPanels.has(selectedExtension.id) && (() => {
                    const SettingsComponent = extensionSettingsPanels.get(selectedExtension.id)!;
                    const storage = createExtensionStorage(selectedExtension.id);
                    // READ bridge to the extension's backend-module MCP tools
                    // (e.g. live index status, facts list). The IPC handler
                    // resolves the active workspace from this window.
                    const callBackendTool = (toolName: string, args?: Record<string, unknown>) =>
                      window.electronAPI.invoke('extensions:ai-call-backend-tool', {
                        toolName,
                        args: args ?? {},
                        // Host-injected caller identity (not from extension code)
                        // so main can enforce the tool belongs to THIS extension.
                        callerExtensionId: selectedExtension.id,
                      });
                    return (
                      <div className="pt-4 border-t border-[var(--nim-border)]">
                        <SettingsComponent storage={storage} theme={theme} callBackendTool={callBackendTool} />
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--nim-text-muted)] text-center p-5">
                <span className="material-symbols-outlined text-5xl opacity-50 mb-3">extension</span>
                <div className="text-sm font-medium text-[var(--nim-text)]">{t('extensions:no_selected')}</div>
                <div className="text-xs">{t('extensions:select_details')}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
