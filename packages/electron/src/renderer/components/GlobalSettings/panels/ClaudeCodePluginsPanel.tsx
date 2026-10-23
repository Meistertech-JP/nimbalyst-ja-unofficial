import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePostHog } from 'posthog-js/react';
import { ErrorBoundary } from '../../ErrorBoundary';
import { useTheme } from '../../../hooks/useTheme';
import { requestConfirmation } from '../../../dialogs/requestConfirmation';

// Marketplace plugin from the official registry
interface MarketplacePlugin {
  name: string;
  description: string;
  author: string;
  homepage?: string;
  source: string;
  category: string;
}

// Installed plugin from local system
interface InstalledPlugin {
  name: string;
  source: string;
  path: string;
  scope: 'user' | 'project';
  projectPath?: string;
  enabled: boolean;
}

// Marketplace data structure from GitHub
interface MarketplaceData {
  plugins: MarketplacePlugin[];
  categories: string[];
  lastUpdated?: string;
}

type ViewState = 'installed' | 'discover';

// Icon configuration for plugin templates
type IconConfig =
  | { type: 'simple-icons'; slug: string }
  | { type: 'material-symbol'; icon: string };

// Icons that are dark/black and need a light color override in dark mode
const DARK_ICONS_NEEDING_LIGHT_OVERRIDE = new Set(['github', 'notion']);

// Map plugin names/categories to icons
const PLUGIN_ICON_CONFIG: Record<string, IconConfig> = {
  // Brand icons
  github: { type: 'simple-icons', slug: 'github' },
  linear: { type: 'simple-icons', slug: 'linear' },
  slack: { type: 'simple-icons', slug: 'slack' },
  notion: { type: 'simple-icons', slug: 'notion' },
  asana: { type: 'simple-icons', slug: 'asana' },
  figma: { type: 'simple-icons', slug: 'figma' },
  vercel: { type: 'simple-icons', slug: 'vercel' },
  sentry: { type: 'simple-icons', slug: 'sentry' },
  stripe: { type: 'simple-icons', slug: 'stripe' },
  firebase: { type: 'simple-icons', slug: 'firebase' },
  supabase: { type: 'simple-icons', slug: 'supabase' },
  pinecone: { type: 'simple-icons', slug: 'pinecone' },
  playwright: { type: 'simple-icons', slug: 'playwright' },
  typescript: { type: 'simple-icons', slug: 'typescript' },
  python: { type: 'simple-icons', slug: 'python' },
  go: { type: 'simple-icons', slug: 'go' },
  rust: { type: 'simple-icons', slug: 'rust' },
  swift: { type: 'simple-icons', slug: 'swift' },
  kotlin: { type: 'simple-icons', slug: 'kotlin' },
  java: { type: 'simple-icons', slug: 'oracle' },
  php: { type: 'simple-icons', slug: 'php' },
  lua: { type: 'simple-icons', slug: 'lua' },
  gitlab: { type: 'simple-icons', slug: 'gitlab' },
  atlassian: { type: 'simple-icons', slug: 'atlassian' },
  huggingface: { type: 'simple-icons', slug: 'huggingface' },

  // Generic icons by category
  development: { type: 'material-symbol', icon: 'code' },
  productivity: { type: 'material-symbol', icon: 'task_alt' },
  database: { type: 'material-symbol', icon: 'storage' },
  testing: { type: 'material-symbol', icon: 'science' },
  security: { type: 'material-symbol', icon: 'shield' },
  learning: { type: 'material-symbol', icon: 'school' },
  design: { type: 'material-symbol', icon: 'brush' },
  monitoring: { type: 'material-symbol', icon: 'monitoring' },
  deployment: { type: 'material-symbol', icon: 'cloud_upload' },
  external: { type: 'material-symbol', icon: 'extension' },
};

// Category labels for display
const CATEGORY_LABEL_KEYS = {
  development: 'claude_code_plugins_panel.categories.development',
  productivity: 'claude_code_plugins_panel.categories.productivity',
  database: 'claude_code_plugins_panel.categories.database',
  testing: 'claude_code_plugins_panel.categories.testing',
  security: 'claude_code_plugins_panel.categories.security',
  learning: 'claude_code_plugins_panel.categories.learning',
  design: 'claude_code_plugins_panel.categories.design',
  monitoring: 'claude_code_plugins_panel.categories.monitoring',
  deployment: 'claude_code_plugins_panel.categories.deployment',
  external: 'claude_code_plugins_panel.categories.external',
} as const;

const CATEGORY_ORDER = [
  'development',
  'productivity',
  'database',
  'testing',
  'security',
  'learning',
  'design',
  'monitoring',
  'deployment',
  'external',
];

// Component to render plugin icon
function PluginIcon({ pluginName, category, isDark }: { pluginName: string; category: string; isDark: boolean }) {
  // Try to find icon by plugin name first
  const nameKey = pluginName.toLowerCase().replace(/[^a-z0-9]/g, '');
  let config = PLUGIN_ICON_CONFIG[nameKey];

  // Fall back to category icon
  if (!config) {
    const categoryKey = category.toLowerCase();
    config = PLUGIN_ICON_CONFIG[categoryKey] || { type: 'material-symbol', icon: 'extension' };
  }

  if (config.type === 'simple-icons') {
    const needsLightOverride = isDark && DARK_ICONS_NEEDING_LIGHT_OVERRIDE.has(config.slug);
    const iconUrl = needsLightOverride
      ? `https://cdn.simpleicons.org/${config.slug}/ffffff`
      : `https://cdn.simpleicons.org/${config.slug}`;

    return (
      <>
        <img
          src={iconUrl}
          alt=""
          className="plugin-icon-img w-5 h-5 object-contain"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <span className="plugin-icon-fallback text-sm font-semibold text-[var(--nim-text-muted)] items-center justify-center w-full h-full hidden">{pluginName[0]}</span>
      </>
    );
  }

  if (config.type === 'material-symbol') {
    return (
      <span className="material-symbols-outlined plugin-icon-material text-xl text-[var(--nim-text-muted)]">
        {config.icon}
      </span>
    );
  }

  return <span className="plugin-icon-fallback text-sm font-semibold text-[var(--nim-text-muted)] flex items-center justify-center w-full h-full">{pluginName[0]}</span>;
}

interface ClaudeCodePluginsPanelProps {
  scope?: 'user' | 'workspace';
  workspacePath?: string;
}

// Marketplace plugins don't carry a source attribution that matches the
// installed_plugins.json key directly. Best-effort extraction lets us produce a
// stable `name@source` key for marketplace cards too.
//
// This mirrors how the install handler derives `sourceName` from the
// marketplace URL, so the value we use to test `isPluginInstalled` matches the
// `name@source` key the installer writes to `installed_plugins.json`.
function extractMarketplaceSourceName(plugin: MarketplacePlugin): string {
  const sourceField = (plugin.source || '').trim();
  if (!/^https?:/i.test(sourceField)) {
    return 'claude-plugins-official';
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(sourceField);
  } catch {
    parsed = null;
  }

  if (!parsed || !/(^|\.)github\.com$/i.test(parsed.hostname)) {
    return 'claude-plugins-official';
  }

  // Pathname looks like "/owner/repo" or "/owner/repo/tree/...". We only care
  // about the first two segments. Strip a trailing `.git` so URLs that come
  // straight from `git clone` examples produce the same key as the marketplace
  // installer.
  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    return 'claude-plugins-official';
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, '');
  return `${owner}-${repo}`;
}

function ClaudeCodePluginsPanelInner({ scope = 'user', workspacePath }: ClaudeCodePluginsPanelProps) {
  const { t } = useTranslation('extensions');
  const posthog = usePostHog();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'crystal-dark';

  const [viewState, setViewState] = useState<ViewState>('discover');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [marketplace, setMarketplace] = useState<MarketplaceData | null>(null);
  const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState<MarketplacePlugin | null>(null);
  const [installStatus, setInstallStatus] = useState<Record<string, 'idle' | 'installing' | 'installed' | 'error'>>({});
  const [installMessage, setInstallMessage] = useState<string>('');
  const [installErrorDetails, setInstallErrorDetails] = useState<string | null>(null);
  const categoryLabel = (category: string) => {
    const key = CATEGORY_LABEL_KEYS[category.toLowerCase() as keyof typeof CATEGORY_LABEL_KEYS];
    return key ? t(key) : category;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      // Fetch marketplace data and installed plugins in parallel
      const [marketplaceResult, installedResult] = await Promise.all([
        window.electronAPI.invoke('claude-plugin:fetch-marketplace'),
        window.electronAPI.invoke('claude-plugin:list-installed', { workspacePath }),
      ]);

      if (marketplaceResult.success) {
        setMarketplace(marketplaceResult.data);
      } else {
        setError(t('claude_code_plugins_panel.load_marketplace_failed'));
        setErrorDetails(marketplaceResult.error || null);
      }

      if (installedResult.success) {
        setInstalledPlugins(installedResult.data || []);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('claude_code_plugins_panel.load_plugin_data_failed');
      console.error('Failed to load plugin data:', err);
      setError(t('claude_code_plugins_panel.load_plugin_data_failed'));
      setErrorDetails(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [workspacePath, t]);

  // Reload when the active workspace changes so project-scoped plugins
  // appear or disappear with the current project.
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInstall = async (plugin: MarketplacePlugin) => {
    setInstallStatus(prev => ({ ...prev, [plugin.name]: 'installing' }));
    setInstallMessage(t('claude_code_plugins_panel.installing_plugin', { name: plugin.name }));
    setInstallErrorDetails(null);

    try {
      // Pass both plugin name and source to the install handler
      const result = await window.electronAPI.invoke('claude-plugin:install', plugin.name, plugin.source);

      if (result.success) {
        setInstallStatus(prev => ({ ...prev, [plugin.name]: 'installed' }));
        setInstallMessage(t('claude_code_plugins_panel.installed_success', { name: plugin.name }));

        // Track analytics
        posthog?.capture('claude_plugin_installed', {
          pluginName: plugin.name,
          category: plugin.category,
          source: plugin.source,
        });

        // Refresh installed plugins
        const installedResult = await window.electronAPI.invoke('claude-plugin:list-installed', { workspacePath });
        if (installedResult.success) {
          setInstalledPlugins(installedResult.data || []);
        }
      } else {
        setInstallStatus(prev => ({ ...prev, [plugin.name]: 'error' }));
        setInstallMessage(t('claude_code_plugins_panel.install_failed'));
        setInstallErrorDetails(result.error || null);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('claude_code_plugins_panel.install_failed');
      setInstallStatus(prev => ({ ...prev, [plugin.name]: 'error' }));
      setInstallMessage(t('claude_code_plugins_panel.install_failed'));
      setInstallErrorDetails(errorMessage);
    }

    // Clear message after a few seconds
    setTimeout(() => {
      setInstallMessage('');
      setInstallErrorDetails(null);
    }, 5000);
  };

  interface UninstallTarget {
    name: string;
    source?: string;
    scope?: 'user' | 'project';
    projectPath?: string;
  }

  const handleUninstall = async (target: UninstallTarget) => {
    const label = target.source ? `${target.name}@${target.source}` : target.name;
    const ok = await requestConfirmation({
      title: t('claude_code_plugins_panel.uninstall_title'),
      message: t('claude_code_plugins_panel.uninstall_confirm', { label }),
      confirmLabel: t('claude_code_plugins_panel.uninstall'),
      destructive: true,
    });
    if (!ok) {
      return;
    }

    setInstallErrorDetails(null);

    try {
      const result = await window.electronAPI.invoke('claude-plugin:uninstall', target);

      if (result.success) {
        setInstallStatus(prev => ({ ...prev, [target.name]: 'idle' }));
        setInstallMessage(t('claude_code_plugins_panel.uninstalled', { label }));

        // Refresh installed plugins
        const installedResult = await window.electronAPI.invoke('claude-plugin:list-installed', { workspacePath });
        if (installedResult.success) {
          setInstalledPlugins(installedResult.data || []);
        }
      } else {
        setInstallMessage(t('claude_code_plugins_panel.uninstall_failed'));
        setInstallErrorDetails(result.error || null);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('claude_code_plugins_panel.uninstall_failed');
      setInstallMessage(t('claude_code_plugins_panel.uninstall_failed'));
      setInstallErrorDetails(errorMessage);
    }

    setTimeout(() => {
      setInstallMessage('');
      setInstallErrorDetails(null);
    }, 5000);
  };

  const isPluginInstalled = (plugin: MarketplacePlugin): boolean => {
    const expectedSource = extractMarketplaceSourceName(plugin).toLowerCase();
    const expectedName = plugin.name.toLowerCase();
    return installedPlugins.some(p =>
      p.name.toLowerCase() === expectedName && p.source.toLowerCase() === expectedSource
    );
  };

  // Filter plugins by search query
  const filteredPlugins = marketplace?.plugins.filter(plugin => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      plugin.name.toLowerCase().includes(query) ||
      plugin.description.toLowerCase().includes(query) ||
      plugin.author.toLowerCase().includes(query) ||
      plugin.category.toLowerCase().includes(query)
    );
  }) || [];

  // Group plugins by category
  const pluginsByCategory: Record<string, MarketplacePlugin[]> = {};
  filteredPlugins.forEach(plugin => {
    const category = plugin.category.toLowerCase();
    if (!pluginsByCategory[category]) {
      pluginsByCategory[category] = [];
    }
    pluginsByCategory[category].push(plugin);
  });

  if (loading) {
    return (
      <div className="provider-panel flex flex-col">
        <div className="plugin-loading p-8 text-center text-[var(--nim-text-muted)]">{t('claude_code_plugins_panel.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="provider-panel flex flex-col">
        <div className="plugin-error p-8 text-center text-[#e74c3c]" role="alert">
          <p>{error}</p>
          {errorDetails && (
            <details className="mt-3 text-left text-[var(--nim-text-muted)]">
              <summary className="cursor-pointer">{t('claude_code_plugins_panel.show_technical_details')}</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{errorDetails}</pre>
            </details>
          )}
          <button onClick={loadData} className="plugin-retry-button ml-4 px-4 py-2 bg-[var(--nim-primary)] text-white border-none rounded cursor-pointer">{t('claude_code_plugins_panel.retry')}</button>
        </div>
      </div>
    );
  }

  const renderDiscover = () => (
    <div className="plugin-discover" role="main" aria-label={t('claude_code_plugins_panel.discover_aria')}>
      {/* Search Bar */}
      <div className="plugin-search relative mb-6" role="search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('claude_code_plugins_panel.search')}
          className="plugin-search-input w-full py-3 pl-4 pr-10 border border-[var(--nim-border)] rounded-lg bg-[var(--nim-bg)] text-[var(--nim-text)] text-[0.9375rem] outline-none focus:border-[var(--nim-primary)] placeholder:text-[var(--nim-text-faint)]"
          aria-label={t('claude_code_plugins_panel.search_aria')}
          autoFocus
        />
        {searchQuery && (
          <button
            className="plugin-search-clear absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 border-none rounded-full bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)] text-xs cursor-pointer flex items-center justify-center hover:bg-[var(--nim-text-faint)] hover:text-[var(--nim-bg)]"
            onClick={() => setSearchQuery('')}
            aria-label={t('claude_code_plugins_panel.clear_search')}
            title={t('claude_code_plugins_panel.clear_search')}
          >
            x
          </button>
        )}
      </div>

      {/* Plugins by Category */}
      {CATEGORY_ORDER.map(category => {
        const plugins = pluginsByCategory[category];
        if (!plugins || plugins.length === 0) return null;

        return (
          <div key={category} className="plugin-category mb-6">
            <h4 className="plugin-category-title text-xs font-semibold uppercase tracking-wider text-[var(--nim-text-faint)] m-0 mb-3 pb-2 border-b border-[var(--nim-border)]">{categoryLabel(category)}</h4>
            <div className="plugin-grid grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 @container" role="list" aria-label={categoryLabel(category)}>
              {plugins.map((plugin) => {
                const installed = isPluginInstalled(plugin);
                const status = installStatus[plugin.name] || 'idle';

                return (
                  <div
                    key={plugin.name}
                    className={`plugin-card flex flex-col p-4 border rounded-lg cursor-pointer transition-all duration-150 ${installed ? 'installed border-[rgba(39,174,96,0.3)] bg-[rgba(39,174,96,0.05)]' : 'border-[var(--nim-border)] bg-[var(--nim-bg-secondary)]'} hover:border-[var(--nim-primary)] hover:bg-[var(--nim-bg-hover)]`}
                    onClick={() => setSelectedPlugin(plugin)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPlugin(plugin);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={t('claude_code_plugins_panel.plugin_aria', { name: plugin.name, author: plugin.author, description: plugin.description })}
                  >
                    <div className="plugin-card-header flex items-center gap-3 mb-2">
                      <div className="plugin-card-icon w-8 h-8 rounded-md bg-[var(--nim-bg-tertiary)] flex items-center justify-center text-base shrink-0 overflow-hidden" aria-hidden="true">
                        <PluginIcon pluginName={plugin.name} category={plugin.category} isDark={isDark} />
                      </div>
                      <div className="plugin-card-name font-semibold text-[0.9375rem] text-[var(--nim-text)]">{plugin.name}</div>
                    </div>
                    <div className="plugin-card-description text-[0.8125rem] text-[var(--nim-text-muted)] leading-relaxed mb-3 flex-1 line-clamp-2">{plugin.description}</div>
                    <div className="plugin-card-footer flex items-center justify-between gap-2">
                      <span className="plugin-card-author text-xs text-[var(--nim-text-faint)]">{t('claude_code_plugins_panel.by_author', { author: plugin.author })}</span>
                      {installed ? (
                        <span className="plugin-card-badge installed inline-flex items-center px-2 py-1 rounded text-[0.6875rem] font-semibold uppercase tracking-tight bg-[rgba(39,174,96,0.15)] text-[#27ae60]">{t('claude_code_plugins_panel.installed')}</span>
                      ) : (
                        <button
                          className={`plugin-install-button py-1.5 px-3 border-none rounded bg-[var(--nim-primary)] text-white text-xs font-medium cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed ${status === 'installing' ? 'installing bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)]' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInstall(plugin);
                          }}
                          disabled={status === 'installing'}
                        >
                          {status === 'installing' ? t('claude_code_plugins_panel.installing') : t('claude_code_plugins_panel.install')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* No results */}
      {filteredPlugins.length === 0 && searchQuery && (
        <div className="plugin-no-results p-8 text-center text-[var(--nim-text-faint)] text-[0.9375rem]" role="status" aria-live="polite">
          {t('claude_code_plugins_panel.no_match', { query: searchQuery })}
        </div>
      )}
    </div>
  );

  const renderInstalled = () => (
    <div className="plugin-installed-view" role="main" aria-label={t('claude_code_plugins_panel.installed_aria')}>
      {installedPlugins.length === 0 ? (
        <div className="plugin-empty-state flex flex-col items-center justify-center py-12 px-6 text-center text-[var(--nim-text-faint)]">
          <span className="plugin-empty-icon material-symbols-outlined text-5xl mb-4 opacity-50">extension_off</span>
          <p className="m-0 mb-6 text-[0.9375rem]">{t('claude_code_plugins_panel.empty')}</p>
          <button
            className="plugin-empty-cta py-2.5 px-5 rounded-md border-none bg-[var(--nim-primary)] text-white text-sm font-medium cursor-pointer transition-opacity duration-150 hover:opacity-90"
            onClick={() => setViewState('discover')}
          >
            {t('claude_code_plugins_panel.browse')}
          </button>
        </div>
      ) : (
        <div className="plugin-installed-list flex flex-col gap-2" role="list">
          {installedPlugins.map((plugin) => {
            const isProjectScope = plugin.scope === 'project';
            const itemKey = `${plugin.name}@${plugin.source}@${plugin.projectPath ?? 'user'}`;
            return (
              <div key={itemKey} className="plugin-installed-item flex items-center justify-between p-4 border border-[var(--nim-border)] rounded-lg bg-[var(--nim-bg-secondary)]" role="listitem">
                <div className="plugin-installed-info flex items-center gap-3 flex-1 min-w-0">
                  <div className="plugin-installed-icon w-9 h-9 rounded-md bg-[var(--nim-bg-tertiary)] flex items-center justify-center shrink-0 overflow-hidden">
                    <PluginIcon pluginName={plugin.name} category="external" isDark={isDark} />
                  </div>
                  <div className="plugin-installed-details flex-1 min-w-0">
                    <div className="plugin-installed-name flex items-center gap-2 font-medium text-[0.9375rem] text-[var(--nim-text)] mb-0.5">
                      <span>{plugin.name}</span>
                      {plugin.source && (
                        <span className="plugin-installed-source text-xs text-[var(--nim-text-faint)] font-normal">@{plugin.source}</span>
                      )}
                      <span
                        className={`plugin-installed-scope inline-flex items-center px-1.5 py-0.5 rounded text-[0.6875rem] font-semibold uppercase tracking-tight ${
                          isProjectScope
                            ? 'bg-[rgba(52,152,219,0.15)] text-[#3498db]'
                            : 'bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)]'
                        }`}
                        title={isProjectScope ? plugin.projectPath : t('claude_code_plugins_panel.available_workspaces')}
                      >
                        {isProjectScope ? t('claude_code_plugins_panel.project') : t('claude_code_plugins_panel.user')}
                      </span>
                      {!plugin.enabled && (
                        <span className="plugin-installed-disabled inline-flex items-center px-1.5 py-0.5 rounded text-[0.6875rem] font-semibold uppercase tracking-tight bg-[rgba(231,76,60,0.12)] text-[#e74c3c]" title={t('claude_code_plugins_panel.disabled_title')}>
                          {t('claude_code_plugins_panel.disabled')}
                        </span>
                      )}
                    </div>
                    <div className="plugin-installed-path text-xs text-[var(--nim-text-faint)] overflow-hidden text-ellipsis whitespace-nowrap">{plugin.path}</div>
                  </div>
                </div>
                <div className="plugin-installed-actions flex gap-2">
                  <button
                    className="plugin-uninstall-button py-1.5 px-3 border border-[#e74c3c] rounded bg-transparent text-[#e74c3c] text-xs font-medium cursor-pointer transition-all duration-150 hover:bg-[#e74c3c] hover:text-white"
                    onClick={() => handleUninstall({
                      name: plugin.name,
                      source: plugin.source,
                      scope: plugin.scope,
                      projectPath: plugin.projectPath,
                    })}
                    aria-label={t('claude_code_plugins_panel.uninstall_aria', { name: plugin.name })}
                  >
                    {t('claude_code_plugins_panel.uninstall')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderPluginDetails = () => {
    if (!selectedPlugin) return null;

    const installed = isPluginInstalled(selectedPlugin);
    const status = installStatus[selectedPlugin.name] || 'idle';

    return (
      <div className="plugin-details-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={() => setSelectedPlugin(null)}>
        <div className="plugin-details-modal bg-[var(--nim-bg)] rounded-xl p-6 max-w-[500px] w-full max-h-[80vh] overflow-y-auto relative shadow-[0_20px_40px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
          <button
            className="plugin-details-close absolute top-4 right-4 w-7 h-7 border-none rounded-full bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)] text-base cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-[var(--nim-text-faint)] hover:text-[var(--nim-bg)]"
            onClick={() => setSelectedPlugin(null)}
            aria-label={t('claude_code_plugins_panel.close')}
          >
            x
          </button>

          <div className="plugin-details-header flex items-center gap-4 mb-4">
            <div className="plugin-details-icon w-12 h-12 rounded-[10px] bg-[var(--nim-bg-tertiary)] flex items-center justify-center shrink-0 overflow-hidden">
              <PluginIcon pluginName={selectedPlugin.name} category={selectedPlugin.category} isDark={isDark} />
            </div>
            <div className="plugin-details-title">
              <h3 className="m-0 mb-1 text-lg font-semibold text-[var(--nim-text)]">{selectedPlugin.name}</h3>
              <span className="plugin-details-author text-[0.8125rem] text-[var(--nim-text-faint)]">{t('claude_code_plugins_panel.by_author', { author: selectedPlugin.author })}</span>
            </div>
          </div>

          <p className="plugin-details-description text-[0.9375rem] text-[var(--nim-text-muted)] leading-relaxed m-0 mb-5">{selectedPlugin.description}</p>

          <div className="plugin-details-meta flex flex-col gap-2 mb-6 p-3 bg-[var(--nim-bg-secondary)] rounded-lg">
            <div className="plugin-details-meta-item flex items-center gap-2 text-[0.8125rem]">
              <span className="plugin-details-meta-label text-[var(--nim-text-faint)]">{t('claude_code_plugins_panel.category_label')}</span>
              <span className="plugin-details-meta-value text-[var(--nim-text)] font-medium">{categoryLabel(selectedPlugin.category)}</span>
            </div>
            {selectedPlugin.homepage && (
              <div className="plugin-details-meta-item flex items-center gap-2 text-[0.8125rem]">
                <span className="plugin-details-meta-label text-[var(--nim-text-faint)]">{t('claude_code_plugins_panel.homepage_label')}</span>
                <a
                  href={selectedPlugin.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="plugin-details-link text-[var(--nim-primary)] no-underline cursor-pointer hover:underline"
                  onClick={() => window.electronAPI.openExternal(selectedPlugin.homepage!)}
                >
                  {t('claude_code_plugins_panel.view_documentation')}
                </a>
              </div>
            )}
          </div>

          <div className="plugin-details-actions flex items-center gap-3">
            {installed ? (
              <>
                <span className="plugin-details-installed-badge inline-flex items-center py-1.5 px-3 rounded bg-[rgba(39,174,96,0.15)] text-[#27ae60] text-[0.8125rem] font-medium">{t('claude_code_plugins_panel.installed')}</span>
                <button
                  className="plugin-uninstall-button py-1.5 px-3 border border-[#e74c3c] rounded bg-transparent text-[#e74c3c] text-xs font-medium cursor-pointer transition-all duration-150 hover:bg-[#e74c3c] hover:text-white"
                  onClick={() => {
                    // Modal originates from a marketplace card, so we only
                    // know name+derived source. The server-side uninstall
                    // handler will refuse ambiguous matches; users on a
                    // multi-marketplace install must uninstall from the
                    // Installed tab where the source is explicit.
                    handleUninstall({
                      name: selectedPlugin.name,
                      source: extractMarketplaceSourceName(selectedPlugin),
                    });
                    setSelectedPlugin(null);
                  }}
                >
                  {t('claude_code_plugins_panel.uninstall')}
                </button>
              </>
            ) : (
              <button
                className={`plugin-details-install-button flex-1 py-3 px-6 border-none rounded-md bg-[var(--nim-primary)] text-white text-[0.9375rem] font-medium cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed ${status === 'installing' ? 'installing bg-[var(--nim-bg-tertiary)] text-[var(--nim-text-muted)]' : ''}`}
                onClick={() => handleInstall(selectedPlugin)}
                disabled={status === 'installing'}
              >
                {status === 'installing' ? t('claude_code_plugins_panel.installing') : t('claude_code_plugins_panel.install_plugin')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="provider-panel flex flex-col">
      <div className="provider-panel-header mb-6 pb-4 border-b border-[var(--nim-border)]">
        <h3 className="provider-panel-title text-xl font-semibold leading-tight mb-2 text-[var(--nim-text)]">{t('claude_code_plugins_panel.title')}</h3>
        <p className="provider-panel-description text-sm leading-relaxed text-[var(--nim-text-muted)]">
          {t('claude_code_plugins_panel.description')}
        </p>
      </div>

      {/* View Switcher */}
      <div className="plugin-view-switcher flex gap-1 mb-4 p-1 bg-[var(--nim-bg-tertiary)] rounded-lg w-fit">
        <button
          className={`plugin-view-button py-2 px-4 border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 ${
            viewState === 'discover'
              ? 'bg-[var(--nim-primary)] text-white shadow-sm'
              : 'bg-transparent text-[var(--nim-text-muted)] hover:text-[var(--nim-text)] hover:bg-[var(--nim-bg-hover)]'
          }`}
          onClick={() => setViewState('discover')}
        >
          {t('claude_code_plugins_panel.discover')}
        </button>
        <button
          className={`plugin-view-button py-2 px-4 border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 ${
            viewState === 'installed'
              ? 'bg-[var(--nim-primary)] text-white shadow-sm'
              : 'bg-transparent text-[var(--nim-text-muted)] hover:text-[var(--nim-text)] hover:bg-[var(--nim-bg-hover)]'
          }`}
          onClick={() => setViewState('installed')}
        >
          {t('claude_code_plugins_panel.installed_count', { count: installedPlugins.length })}
        </button>
      </div>

      {/* Status Message */}
      {installMessage && (
        <div className="plugin-status-message py-3 px-4 mb-4 bg-[rgba(52,152,219,0.1)] border border-[rgba(52,152,219,0.3)] rounded-md text-sm text-[var(--nim-text)]" role="status" aria-live="polite">
          {installMessage}
          {installErrorDetails && (
            <details className="mt-2 text-[var(--nim-text-muted)]">
              <summary className="cursor-pointer">{t('claude_code_plugins_panel.show_technical_details')}</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{installErrorDetails}</pre>
            </details>
          )}
        </div>
      )}

      {/* Content */}
      <div className="plugin-content [container-type:inline-size] [container-name:plugin-content]">
        {viewState === 'discover' && renderDiscover()}
        {viewState === 'installed' && renderInstalled()}
      </div>

      {/* Plugin Details Modal */}
      {selectedPlugin && renderPluginDetails()}
    </div>
  );
}

export function ClaudeCodePluginsPanel(props: ClaudeCodePluginsPanelProps) {
  const { t } = useTranslation('extensions');
  return (
    <ErrorBoundary
      fallback={
        <div className="provider-panel flex flex-col" role="alert" aria-live="assertive">
          <div className="plugin-error p-8 text-center">
            <h3 className="mt-0 mb-4">{t('claude_code_plugins_panel.error_boundary_title')}</h3>
            <p className="mb-6 text-[var(--nim-text-muted)]">
              {t('claude_code_plugins_panel.error_boundary_body')}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="plugin-retry-button py-2 px-4 bg-[var(--nim-primary)] text-white border-none rounded-md cursor-pointer"
            >
              {t('claude_code_plugins_panel.reload_application')}
            </button>
          </div>
        </div>
      }
    >
      <ClaudeCodePluginsPanelInner {...props} />
    </ErrorBoundary>
  );
}
