import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue, useSetAtom } from 'jotai';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import type { ThemeManifest } from '@nimbalyst/extension-sdk';
import { useTheme } from '../../../hooks/useTheme';
import { pendingThemeFallbackAtom } from '../../../store/atoms/themeFallback';
import { themeListChangedVersionAtom } from '../../../store/atoms/themeList';
import { requestConfirmation } from '../../../dialogs/requestConfirmation';

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
  const { t } = useTranslation('settings');
  const { themeId } = useTheme();
  const [themes, setThemes] = useState<ThemeWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const pendingFallback = useAtomValue(pendingThemeFallbackAtom);
  const setPendingFallback = useSetAtom(pendingThemeFallbackAtom);

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
      setError(err instanceof Error ? err.message : t('themes.panel.load_failed'));
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
      setError(t('themes.panel.cannot_uninstall_builtin'));
      return;
    }

    const confirmed = await requestConfirmation({
      title: t('themes.panel.confirm_uninstall_title'),
      message: t('themes.panel.confirm_uninstall_message', { name: theme.name }),
      confirmLabel: t('themes.panel.uninstall'),
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const result = await window.electronAPI.invoke('theme:uninstall', themeIdToUninstall);
      if (!result.success) {
        throw new Error(result.error || t('themes.panel.uninstall_failed'));
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
      setError(err instanceof Error ? err.message : t('themes.panel.uninstall_failed'));
    }
  }, [themes, loadThemes, t]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await window.electronAPI.invoke('theme:reload');
      await loadThemes();
    } catch (err) {
      console.error('Failed to reload themes:', err);
      setError(err instanceof Error ? err.message : t('themes.panel.reload_failed'));
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

  const getThemeDescription = (theme: ThemeWithState): string => {
    const builtInDescriptionKeys: Record<string, string> = {
      light: 'themes.builtin_descriptions.light',
      dark: 'themes.builtin_descriptions.dark',
      'crystal-dark': 'themes.builtin_descriptions.crystal-dark',
      monokai: 'themes.builtin_descriptions.monokai',
      'solarized-dark': 'themes.builtin_descriptions.solarized-dark',
      'solarized-light': 'themes.builtin_descriptions.solarized-light',
    };
    const descriptionKey = theme.isBuiltIn ? builtInDescriptionKeys[theme.id] : undefined;
    return descriptionKey ? t(descriptionKey) : theme.description || t('themes.panel.no_description');
  };

  const getThemeName = (theme: ThemeWithState): string => {
    const builtInNameKeys: Record<string, string> = {
      light: 'themes.builtin_names.light',
      dark: 'themes.builtin_names.dark',
      'crystal-dark': 'themes.builtin_names.crystal-dark',
      monokai: 'themes.builtin_names.monokai',
      'solarized-dark': 'themes.builtin_names.solarized-dark',
      'solarized-light': 'themes.builtin_names.solarized-light',
    };
    const nameKey = theme.isBuiltIn ? builtInNameKeys[theme.id] : undefined;
    return nameKey ? t(nameKey) : theme.name;
  };

  // Group themes by origin
  const builtInThemes = themes.filter(t => t.isBuiltIn);
  const userThemes = themes.filter(t => t.isUser);
  const extensionThemes = themes.filter(t => t.isExtension);
  const selectedTheme = themes.find(t => t.id === selectedThemeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-nim-muted">{t('themes.panel.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-nim">
        <div>
          <h2 className="text-lg font-semibold text-nim">{t('themes.panel.title')}</h2>
          <p className="text-sm text-nim-muted mt-1">
            {t('themes.panel.description')}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-nim-muted hover:text-nim hover:bg-nim-hover rounded transition-colors"
          title={t('themes.panel.refresh_list')}
        >
          <MaterialSymbol icon="refresh" size={18} />
          <span>{t('themes.panel.refresh')}</span>
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
            <Trans
              ns="settings"
              i18nKey="themes.fallback"
              values={{ missing: pendingFallback.missingId, applied: pendingFallback.appliedId }}
              components={{
                missing: <span className="font-semibold" />,
                applied: <span className="font-semibold" />,
              }}
            />
          </div>
          <button
            data-testid="dismiss-theme-fallback"
            onClick={handleDismissFallback}
            className="p-1 text-nim-muted hover:text-nim hover:bg-nim-hover rounded transition-colors"
            title={t('themes.panel.dismiss')}
            aria-label={t('themes.panel.dismiss')}
          >
            <MaterialSymbol icon="close" size={16} />
          </button>
        </div>
      )}

      {/* Active theme section */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-nim mb-3">{t('themes.panel.active_theme')}</h3>
        <div className="flex items-center gap-3 p-3 bg-nim-secondary border border-nim rounded-md">
          {(() => {
            const activeTheme = themes.find(t => t.isActive);
            if (!activeTheme) return <div className="text-nim-muted text-sm">{t('themes.panel.none_selected')}</div>;

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
                  <span>{t('themes.panel.active')}</span>
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
          <h3 className="text-sm font-medium text-nim mb-3">{t('themes.panel.built_in')}</h3>
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
                    {t('themes.panel.apply')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* User themes */}
        {userThemes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-nim mb-3">{t('themes.panel.user')}</h3>
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
                    <div className="text-sm font-medium text-nim">{getThemeName(theme)}</div>
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
                        {t('themes.panel.apply')}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUninstall(theme.id);
                      }}
                      className="p-1.5 text-nim-muted hover:text-nim-error hover:bg-nim-error/10 rounded transition-colors"
                      title={t('themes.panel.uninstall_theme')}
                      aria-label={t('themes.panel.uninstall_theme')}
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
            <h3 className="text-sm font-medium text-nim mb-3">{t('themes.panel.extension')}</h3>
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
                      {theme.contributedBy ? t('themes.panel.contributed_by', { author: theme.contributedBy }) : t('themes.panel.extension_theme')}
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
                      {t('themes.panel.apply')}
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
            <h3 className="text-sm font-medium text-nim mb-3">{t('themes.panel.installed')}</h3>
            <div className="flex flex-col items-center justify-center p-8 bg-nim-secondary border border-nim border-dashed rounded-md">
              <MaterialSymbol icon="palette" size={32} className="text-nim-muted mb-2" />
              <p className="text-sm text-nim-muted text-center">
                {t('themes.panel.no_installed')}
              </p>
              <p className="text-xs text-nim-faint text-center mt-1">
                {t('themes.panel.install_hint')}
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
              className="p-1 text-nim-muted hover:text-nim rounded transition-colors"
              aria-label={t('themes.panel.close_details')}
            >
              <MaterialSymbol icon="close" size={16} />
            </button>
          </div>

          {/* Theme metadata */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-nim-muted">{t('themes.panel.version')}</span>
              <span className="text-nim">{selectedTheme.version}</span>
            </div>
            {selectedTheme.author && (
              <div className="flex items-center justify-between">
                <span className="text-nim-muted">{t('themes.panel.author')}</span>
                <span className="text-nim">{selectedTheme.author}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-nim-muted">{t('themes.panel.type')}</span>
              <span className="text-nim">{selectedTheme.isDark ? t('themes.panel.dark') : t('themes.panel.light')}</span>
            </div>
            {selectedTheme.tags && selectedTheme.tags.length > 0 && (
              <div className="flex items-start justify-between">
                <span className="text-nim-muted">{t('themes.panel.tags')}</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {selectedTheme.tags.map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 bg-nim-tertiary text-nim-muted rounded text-xs">
                      {t(`themes.builtin_tags.${tag}`, { defaultValue: tag })}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(['solarized-dark', 'solarized-light', 'monokai'].includes(selectedTheme.id)) && (
              <div className="flex items-start justify-between pt-2 border-t border-nim mt-2">
                <span className="text-nim-muted">{t('themes.panel.license')}</span>
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
            <div className="text-xs font-medium text-nim mb-2">{t('themes.panel.colors')}</div>
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
                {t('themes.panel.more_colors', { count: Object.keys(selectedTheme.colors).length - 8 })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
