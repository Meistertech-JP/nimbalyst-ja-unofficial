import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue, useSetAtom } from 'jotai';
import { MaterialSymbol } from '@nimbalyst/runtime';
import type { ThemeManifest } from '@nimbalyst/extension-sdk';
import { useTheme } from '../../../hooks/useTheme';
import { pendingThemeFallbackAtom } from '../../../store/atoms/themeFallback';
import { themeListChangedVersionAtom } from '../../../store/atoms/themeList';

interface ThemesPanelProps {
  scope: 'user' | 'organization' | 'project';
  workspacePath?: string;
}

interface ThemeWithState extends ThemeManifest {
  isBuiltIn: boolean;
  isExtension: boolean;
  isUser: boolean;
  isActive: boolean;
}

export const ThemesPanel: React.FC<ThemesPanelProps> = ({ scope, workspacePath }) => {
  const { t } = useTranslation(['project', 'settings', 'common']);
  const { themeId } = useTheme();
  const [themes, setThemes] = useState<ThemeWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const pendingFallback = useAtomValue(pendingThemeFallbackAtom);
  const setPendingFallback = useSetAtom(pendingThemeFallbackAtom);

  const getThemeName = useCallback((theme: ThemeWithState) => {
    if (!theme.isBuiltIn) return theme.name;
    if (theme.id === 'light') return t('project:themes.builtin_light');
    if (theme.id === 'dark') return t('project:themes.builtin_dark');
    return theme.name;
  }, [t]);

  const getThemeDescription = (theme: ThemeWithState) => theme.isBuiltIn
    ? t(`settings:themes.builtin_descriptions.${theme.id}`, { defaultValue: theme.description || t('project:themes.no_description') })
    : theme.description || t('project:themes.no_description');

  const getThemeAuthor = (theme: ThemeWithState) => {
    const adaptedSuffix = ' (adapted for Nimbalyst)';
    if (theme.isBuiltIn && theme.author?.endsWith(adaptedSuffix)) {
      return t('settings:themes.adapted_author', { author: theme.author.slice(0, -adaptedSuffix.length) });
    }
    return theme.author;
  };

  // Load themes
  const loadThemes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const themeManifests = await window.electronAPI.invoke('theme:list');

      const themesWithState: ThemeWithState[] = themeManifests.map((manifest: ThemeManifest) => ({
        ...manifest,
        isBuiltIn: manifest.origin === 'builtin',
        isExtension: manifest.origin === 'extension',
        isUser: manifest.origin === 'user',
        isActive: manifest.id === themeId,
      }));

      setThemes(themesWithState);
    } catch (err) {
      console.error('Failed to load themes:', err);
      setError(err instanceof Error ? err.message : t('project:themes.error_load'));
    } finally {
      setLoading(false);
    }
  }, [themeId, t]);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  // Refresh when extensions register/unregister themes. The IPC event is
  // handled centrally in store/listeners/themeListeners.ts which bumps
  // themeListChangedVersionAtom; we only react to *new* bumps (skip the
  // initial-mount value) so the side effect doesn't double-fire alongside
  // the loadThemes() effect above.
  const themeListVersion = useAtomValue(themeListChangedVersionAtom);
  const initialThemeListVersionRef = useRef(themeListVersion);
  useEffect(() => {
    if (themeListVersion === initialThemeListVersionRef.current) return;
    void loadThemes();
  }, [themeListVersion, loadThemes]);

  const handleDismissFallback = useCallback(() => {
    if (window.electronAPI?.send) {
      window.electronAPI.send('theme:dismiss-pending-fallback');
    }
    setPendingFallback(null);
  }, [setPendingFallback]);

  // Handle theme selection
  const handleThemeSelect = useCallback(async (themeIdToSelect: string) => {
    const theme = themes.find(t => t.id === themeIdToSelect);
    if (!theme) return;

    // Send theme change to main process
    if (window.electronAPI?.send) {
      window.electronAPI.send('set-theme', themeIdToSelect, theme.isDark);
    }

    // Reload themes to update active state
    await loadThemes();
  }, [themes, loadThemes]);

  // Handle theme uninstall
  const handleUninstall = useCallback(async (themeIdToUninstall: string) => {
    const theme = themes.find(t => t.id === themeIdToUninstall);
    if (!theme) return;

    if (theme.isBuiltIn) {
      setError(t('project:themes.cannot_uninstall_builtin'));
      return;
    }

    const confirmed = confirm(t('project:themes.confirm_uninstall', { name: getThemeName(theme) }));
    if (!confirmed) return;

    try {
      const result = await window.electronAPI.invoke('theme:uninstall', themeIdToUninstall);
      if (!result.success) {
        throw new Error(result.error || t('project:themes.error_uninstall'));
      }

      // If the uninstalled theme was active, switch to light theme
      if (theme.isActive) {
        if (window.electronAPI?.send) {
          window.electronAPI.send('set-theme', 'light', false);
        }
      }

      await loadThemes();
    } catch (err) {
      console.error('Failed to uninstall theme:', err);
      setError(err instanceof Error ? err.message : t('project:themes.error_uninstall'));
    }
  }, [themes, loadThemes, getThemeName, t]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await window.electronAPI.invoke('theme:reload');
      await loadThemes();
    } catch (err) {
      console.error('Failed to reload themes:', err);
      setError(err instanceof Error ? err.message : t('project:themes.error_reload'));
    }
  }, [loadThemes, t]);

  // Get icon for theme
  const getThemeIcon = (theme: ThemeWithState): string => {
    if (theme.isBuiltIn) {
      switch (theme.id) {
        case 'light': return 'light_mode';
        case 'dark': return 'dark_mode';
        case 'crystal-dark': return 'bedtime';
        default: return 'palette';
      }
    }
    return theme.isDark ? 'dark_mode' : 'light_mode';
  };

  // Group themes by origin
  const builtInThemes = themes.filter(t => t.isBuiltIn);
  const userThemes = themes.filter(t => t.isUser);
  const extensionThemes = themes.filter(t => t.isExtension);
  const selectedTheme = themes.find(t => t.id === selectedThemeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-nim-muted">{t('project:themes.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-nim">
        <div>
          <h2 className="text-lg font-semibold text-nim">{t('project:themes.title')}</h2>
          <p className="text-sm text-nim-muted mt-1">
            {t('project:themes.description')}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-nim-muted hover:text-nim hover:bg-nim-hover rounded transition-colors"
          title={t('project:themes.refresh_list')}
        >
          <MaterialSymbol icon="refresh" size={18} />
          <span>{t('project:themes.refresh')}</span>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-nim-error/10 border border-nim-error/30 rounded-md text-nim-error text-sm">
          {error}
        </div>
      )}

      {/* Pending fallback banner */}
      {pendingFallback && (
        <div className="theme-fallback-banner mb-4 p-3 bg-nim-warning/10 border border-nim-warning/30 rounded-md flex items-start gap-2">
          <MaterialSymbol icon="info" size={18} className="text-nim-warning shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-nim">
            <Trans t={t} i18nKey="settings:themes.fallback" values={{ missing: pendingFallback.missingId, applied: pendingFallback.appliedId }} components={{ missing: <span className="font-semibold" />, applied: <span className="font-semibold" /> }} />
          </div>
          <button
            data-testid="dismiss-theme-fallback"
            onClick={handleDismissFallback}
            className="p-1 text-nim-muted hover:text-nim hover:bg-nim-hover rounded transition-colors"
            title={t('project:themes.dismiss')}
          >
            <MaterialSymbol icon="close" size={16} />
          </button>
        </div>
      )}

      {/* Active theme section */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-nim mb-3">{t('project:themes.active_theme')}</h3>
        <div className="flex items-center gap-3 p-3 bg-nim-secondary border border-nim rounded-md">
          {(() => {
            const activeTheme = themes.find(t => t.isActive);
            if (!activeTheme) return <div className="text-nim-muted text-sm">{t('project:themes.no_selected')}</div>;

            return (
              <>
                <div className="flex items-center justify-center w-10 h-10 bg-nim-tertiary rounded-md">
                  <MaterialSymbol icon={getThemeIcon(activeTheme)} size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-nim">{getThemeName(activeTheme)}</div>
                  <div className="text-xs text-nim-muted">{getThemeDescription(activeTheme)}</div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-nim-primary/20 text-nim-primary text-xs rounded">
                  <MaterialSymbol icon="check" size={14} />
                  <span>{t('project:themes.active')}</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Theme list */}
      <div className="flex-1 overflow-auto">
        {/* Built-in themes */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-nim mb-3">{t('project:themes.built_in')}</h3>
          <div className="space-y-2">
            {builtInThemes.map((theme) => (
              <div
                key={theme.id}
                className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-all ${
                  selectedThemeId === theme.id
                    ? 'border-nim-primary bg-nim-primary/5'
                    : 'border-nim bg-nim-secondary hover:bg-nim-tertiary'
                }`}
                onClick={() => setSelectedThemeId(theme.id)}
              >
                <div className="flex items-center justify-center w-10 h-10 bg-nim-tertiary rounded-md">
                  <MaterialSymbol icon={getThemeIcon(theme)} size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-nim">{getThemeName(theme)}</div>
                  <div className="text-xs text-nim-muted">{getThemeDescription(theme)}</div>
                </div>
                {theme.isActive && (
                  <div className="flex items-center gap-1 text-nim-primary text-xs">
                    <MaterialSymbol icon="check" size={14} />
                  </div>
                )}
                {!theme.isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleThemeSelect(theme.id);
                    }}
                    className="px-3 py-1 text-xs text-nim-muted hover:text-nim hover:bg-nim-hover rounded transition-colors"
                  >
                    {t('project:themes.apply')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* User themes */}
        {userThemes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-nim mb-3">{t('project:themes.user')}</h3>
            <div className="space-y-2">
              {userThemes.map((theme) => (
                <div
                  key={theme.id}
                  className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-all ${
                    selectedThemeId === theme.id
                      ? 'border-nim-primary bg-nim-primary/5'
                      : 'border-nim bg-nim-secondary hover:bg-nim-tertiary'
                  }`}
                  onClick={() => setSelectedThemeId(theme.id)}
                >
                  <div className="flex items-center justify-center w-10 h-10 bg-nim-tertiary rounded-md">
                    <MaterialSymbol icon={getThemeIcon(theme)} size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-nim">{theme.name}</div>
                    <div className="text-xs text-nim-muted">{getThemeDescription(theme)}</div>
                  </div>
                  {theme.isActive && (
                    <div className="flex items-center gap-1 text-nim-primary text-xs">
                      <MaterialSymbol icon="check" size={14} />
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {!theme.isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleThemeSelect(theme.id);
                        }}
                        className="px-3 py-1 text-xs text-nim-muted hover:text-nim hover:bg-nim-hover rounded transition-colors"
                      >
                        {t('project:themes.apply')}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUninstall(theme.id);
                      }}
                      className="p-1.5 text-nim-muted hover:text-nim-error hover:bg-nim-error/10 rounded transition-colors"
                      title={t('project:themes.uninstall')}
                    >
                      <MaterialSymbol icon="delete" size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extension themes */}
        {extensionThemes.length > 0 && (
          <div className="extension-themes-section mb-6">
            <h3 className="text-sm font-medium text-nim mb-3">{t('project:themes.extension')}</h3>
            <div className="space-y-2">
              {extensionThemes.map((theme) => (
                <div
                  key={theme.id}
                  data-testid="extension-theme-item"
                  className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-all ${
                    selectedThemeId === theme.id
                      ? 'border-nim-primary bg-nim-primary/5'
                      : 'border-nim bg-nim-secondary hover:bg-nim-tertiary'
                  }`}
                  onClick={() => setSelectedThemeId(theme.id)}
                >
                  <div className="flex items-center justify-center w-10 h-10 bg-nim-tertiary rounded-md">
                    <MaterialSymbol icon={getThemeIcon(theme)} size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-nim">{theme.name}</div>
                    <div className="text-xs text-nim-muted">
                      {theme.contributedBy ? t('project:themes.extension_contributed', { author: theme.contributedBy }) : t('project:themes.extension_theme')}
                    </div>
                  </div>
                  {theme.isActive && (
                    <div className="flex items-center gap-1 text-nim-primary text-xs">
                      <MaterialSymbol icon="check" size={14} />
                    </div>
                  )}
                  {!theme.isActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleThemeSelect(theme.id);
                      }}
                      className="px-3 py-1 text-xs text-nim-muted hover:text-nim hover:bg-nim-hover rounded transition-colors"
                    >
                      {t('project:themes.apply')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no installed themes (user or extension) */}
        {userThemes.length === 0 && extensionThemes.length === 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-nim mb-3">{t('project:themes.installed')}</h3>
            <div className="flex flex-col items-center justify-center p-8 bg-nim-secondary border border-nim border-dashed rounded-md">
              <MaterialSymbol icon="palette" size={32} className="text-nim-muted mb-2" />
              <p className="text-sm text-nim-muted text-center">
                {t('project:themes.no_installed')}
              </p>
              <p className="text-xs text-nim-faint text-center mt-1">
                {t('project:themes.install_hint')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Theme details panel */}
      {selectedTheme && (
        <div className="mt-4 pt-4 border-t border-nim">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-nim">{getThemeName(selectedTheme)}</h3>
              <p className="text-xs text-nim-muted mt-0.5">{getThemeDescription(selectedTheme)}</p>
            </div>
            <button
              onClick={() => setSelectedThemeId(null)}
              aria-label={t('common:close')}
              className="p-1 text-nim-muted hover:text-nim rounded transition-colors"
            >
              <MaterialSymbol icon="close" size={16} />
            </button>
          </div>

          {/* Theme metadata */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-nim-muted">{t('project:themes.version')}</span>
              <span className="text-nim">{selectedTheme.version}</span>
            </div>
            {selectedTheme.author && (
              <div className="flex items-center justify-between">
                <span className="text-nim-muted">{t('project:themes.author')}</span>
                <span className="text-nim">{getThemeAuthor(selectedTheme)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-nim-muted">{t('project:themes.type')}</span>
              <span className="text-nim">{selectedTheme.isDark ? t('project:themes.dark') : t('project:themes.light')}</span>
            </div>
            {selectedTheme.tags && selectedTheme.tags.length > 0 && (
              <div className="flex items-start justify-between">
                <span className="text-nim-muted">{t('project:themes.tags')}</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {selectedTheme.tags.map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 bg-nim-tertiary text-nim-muted rounded text-xs">
                      {selectedTheme.isBuiltIn ? t(`settings:themes.builtin_tags.${tag}`, { defaultValue: tag }) : tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(['solarized-dark', 'solarized-light', 'monokai'].includes(selectedTheme.id)) && (
              <div className="flex items-start justify-between pt-2 border-t border-nim mt-2">
                <span className="text-nim-muted">{t('project:themes.license')}</span>
                <span className="text-nim text-right max-w-[60%]">
                  {selectedTheme.id.startsWith('solarized')
                    ? 'MIT License © 2011 Ethan Schoonover'
                    : 'MIT License © 2006 Wimer Hazenberg'}
                </span>
              </div>
            )}
          </div>

          {/* Color preview */}
          <div className="mt-4">
            <div className="text-xs font-medium text-nim mb-2">{t('project:themes.colors')}</div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(selectedTheme.colors).slice(0, 8).map(([key, value]) => (
                <div key={key} className="flex flex-col items-center gap-1">
                  <div
                    className="w-full h-8 rounded border border-nim"
                    style={{ backgroundColor: value }}
                    title={`${key}: ${value}`}
                  />
                  <span className="text-xs text-nim-muted">{key}</span>
                </div>
              ))}
            </div>
            {Object.keys(selectedTheme.colors).length > 8 && (
              <div className="text-xs text-nim-muted text-center mt-2">
                {t('project:themes.more_colors', { count: Object.keys(selectedTheme.colors).length - 8 })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
