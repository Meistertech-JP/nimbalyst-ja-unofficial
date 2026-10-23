import React, { useEffect, useId, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslation } from '@nimbalyst/i18n/react';
import {
  FloatingPortal,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react';
import { windowControlsClearance } from '@nimbalyst/runtime/ui/floating/windowControlsClearance';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import { getProviderIcon } from '@nimbalyst/runtime/ui/icons/ProviderIcons';
import { SettingsAlphaBadge } from '../common/AlphaBadge';
import { TeamBetaBadge } from '../common/TeamBetaNotice';
import { developerModeAtom } from '../../store/atoms/appSettings';
import { teamsConfiguredAtom } from '../../store/atoms/settingsDomains';
import {
  getSettingsRoutesForScope,
  getSettingsRouteLabel,
  type SettingsCategory,
  type ExtensionSettingsRoute,
  type SettingsRoute,
  type SettingsScope,
} from './settingsRoutes';

export type { SettingsCategory, SettingsScope } from './settingsRoutes';

interface SettingsSidebarProps {
  selectedCategory: SettingsCategory | string;
  onSelectCategory: (category: SettingsCategory | string) => void;
  providerStatus?: Record<string, { enabled: boolean; testStatus?: string }>;
  scope?: SettingsScope;
  showDirectChatProviders: boolean;
  extensionRoutes?: readonly ExtensionSettingsRoute[];
}

const GROUP_LABEL_KEYS: Record<string, string> = {
  Application: 'sidebar.groups.application',
  Account: 'sidebar.group_account',
  'Agent Providers': 'sidebar.groups.agent_providers',
  'Chat Providers': 'sidebar.groups.chat_providers',
  'Tools & Token Cost': 'sidebar.groups.tools_mcp',
  'Installed Extensions': 'sidebar.groups.installed_extensions',
  'Team / Org': 'sidebar.groups.team_org',
  Organization: 'sidebar.groups.organization',
  'Project Permissions': 'sidebar.groups.project_permissions',
  Project: 'sidebar.groups.project',
  Extensions: 'sidebar.groups.extensions',
};

const GROUP_DESCRIPTION_KEYS: Record<string, string> = {
  'Agent Providers': 'sidebar.groups.agent_providers_tooltip',
  'Chat Providers': 'sidebar.groups.chat_providers_tooltip',
};

function settingsRouteLabel(
  route: SettingsRoute | { id: string; label: string; icon?: string; status: string },
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  return 'source' in route ? getSettingsRouteLabel(route, t) : route.label;
}

function routeIcon(route: SettingsRoute): React.ReactNode {
  if (['claude-code', 'claude', 'openai', 'openai-codex', 'opencode', 'copilot-cli', 'grok-build', 'cursor-agent', 'antigravity-gemini-agent', 'lmstudio'].includes(route.id)) {
    const providerId = route.id === 'openai-codex' ? 'openai' : route.id;
    return getProviderIcon(providerId, { size: 16 });
  }
  return <MaterialSymbol icon={route.icon} size={16} />;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  selectedCategory,
  onSelectCategory,
  providerStatus = {},
  scope = 'application',
  showDirectChatProviders,
  extensionRoutes = [],
}) => {
  const { t } = useTranslation('settings');
  const developerMode = useAtomValue(developerModeAtom);
  const teamsConfigured = useAtomValue(teamsConfiguredAtom);
  const [extAgentProviders, setExtAgentProviders] = useState<
    Array<{ id: string; name: string; icon?: string; status: string }>
  >([]);
  const [tooltipText, setTooltipText] = useState<string | null>(null);
  const tooltipId = useId();
  useEffect(() => {
    setTooltipText(null);
  }, [t]);
  const { refs, floatingStyles } = useFloating({
    open: tooltipText !== null,
    placement: 'right',
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 }), windowControlsClearance()],
  });

  useEffect(() => {
    let cancelled = false;
    const invoke = window.electronAPI?.invoke;
    if (!invoke) return;
    invoke('agent-providers:list')
      .then((res: { success?: boolean; data?: Array<{ id: string; name: string; icon?: string; status: string }> }) => {
        if (!cancelled && res?.success && Array.isArray(res.data)) setExtAgentProviders(res.data);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const groups = useMemo(() => {
    const grouped = new Map<string, Array<SettingsRoute | { id: string; label: string; icon?: string; status: string }>>();
    for (const route of getSettingsRoutesForScope(
      scope,
      { developerMode, showDirectChatProviders, teamsConfigured },
      extensionRoutes,
    )) {
      const entries = grouped.get(route.group) ?? [];
      entries.push(route);
      grouped.set(route.group, entries);
    }
    if (scope === 'application' && extAgentProviders.length > 0) {
      const entries = grouped.get('Agent Providers') ?? [];
      entries.push(...extAgentProviders.map((provider) => ({ ...provider, label: provider.name })));
      grouped.set('Agent Providers', entries);
    }
    return [...grouped.entries()];
  }, [developerMode, extAgentProviders, extensionRoutes, scope, showDirectChatProviders, teamsConfigured]);

  return (
    <aside
      className="settings-sidebar w-[240px] shrink-0 border-r border-[var(--nim-border)] bg-[var(--nim-bg)] overflow-y-auto"
      data-testid="settings-sidebar"
      data-component="SettingsSidebar"
    >
      <div className="settings-sidebar-content p-3">
        {groups.map(([group, routes]) => (
          <section key={group} className="settings-sidebar-group mb-4" data-testid={`settings-group-${group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
            <div className="settings-sidebar-group-title flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--nim-text-muted)]">
              {t(GROUP_LABEL_KEYS[group] ?? group, { defaultValue: group })}
              {GROUP_DESCRIPTION_KEYS[group] && (
                <button
                  type="button"
                  className="settings-sidebar-group-info inline-flex border-0 bg-transparent p-0 text-[var(--nim-text-faint)] hover:text-[var(--nim-text-muted)]"
                  aria-label={t('sidebar.about_group', { group: t(GROUP_LABEL_KEYS[group] ?? group, { defaultValue: group }) })}
                  onMouseEnter={(event) => {
                    refs.setReference(event.currentTarget);
                    setTooltipText(t(GROUP_DESCRIPTION_KEYS[group]));
                  }}
                  onMouseLeave={() => setTooltipText(null)}
                  onFocus={(event) => {
                    refs.setReference(event.currentTarget);
                    setTooltipText(t(GROUP_DESCRIPTION_KEYS[group]));
                  }}
                  onBlur={() => setTooltipText(null)}
                >
                  <MaterialSymbol icon="info" size={14} />
                </button>
              )}
            </div>
            {routes.map((route) => {
              const isSettingsRoute = 'source' in route;
              const id = route.id;
              const label = isSettingsRoute
                ? settingsRouteLabel(route, t)
                : t(`sidebar.item_${id.replace(/-/g, '_')}`, { defaultValue: route.label });
              const providerState = providerStatus[id];
              const status = !isSettingsRoute
                ? route.status
                : providerState?.enabled ? providerState.testStatus : undefined;
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`settings-route-${id}`}
                  aria-describedby={tooltipText === label ? tooltipId : undefined}
                  className={`settings-sidebar-item w-full flex items-center gap-2 px-2 py-1.5 rounded text-left cursor-pointer text-sm transition-colors ${
                    selectedCategory === id
                      ? 'bg-[var(--nim-bg-selected)] text-[var(--nim-text)]'
                      : 'bg-transparent text-[var(--nim-text-muted)] hover:bg-[var(--nim-bg-hover)] hover:text-[var(--nim-text)]'
                  }`}
                  onClick={() => onSelectCategory(id)}
                  onMouseEnter={(event) => {
                    refs.setReference(event.currentTarget);
                    setTooltipText(label);
                  }}
                  onMouseLeave={() => setTooltipText(null)}
                  onFocus={(event) => {
                    refs.setReference(event.currentTarget);
                    setTooltipText(label);
                  }}
                  onBlur={() => setTooltipText(null)}
                >
                  <span aria-hidden="true" className="settings-sidebar-item-icon flex items-center justify-center w-5 h-5 shrink-0 text-[var(--nim-text-muted)]">
                    {isSettingsRoute
                      ? routeIcon(route)
                      : route.icon ? <MaterialSymbol icon={route.icon} size={16} /> : getProviderIcon(id, { size: 16 })}
                  </span>
                  <span className="settings-sidebar-item-name min-w-0 flex-1 whitespace-normal break-words leading-5">{label}</span>
                  {isSettingsRoute && route.source === 'builtin' && route.isAlpha && (
                    route.id === 'project-sharing'
                      ? <TeamBetaBadge size="xs" className="shrink-0" />
                      : <SettingsAlphaBadge size="xs" className="shrink-0" />
                  )}
                  {(status === 'success' || status === 'active' || status === 'error' || status === 'denied') && (
                    <span className={`settings-sidebar-item-status h-2 w-2 shrink-0 rounded-full ${status === 'success' || status === 'active' ? 'bg-[var(--nim-success)]' : 'bg-[var(--nim-error)]'}`} />
                  )}
                </button>
              );
            })}
          </section>
        ))}
      </div>

      {tooltipText && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            role="tooltip"
            id={tooltipId}
            className="settings-sidebar-tooltip z-[10000] max-w-[280px] rounded-lg border border-[var(--nim-border)] bg-[var(--nim-bg-tertiary)] px-3 py-2 text-sm text-[var(--nim-text)] shadow-lg"
          >
            {tooltipText}
          </div>
        </FloatingPortal>
      )}
    </aside>
  );
};
