/**
 * FilesScopeDropdown - Title dropdown for Files Edited sidebar scope selection.
 *
 * Replaces the static "Files Edited" title with an interactive dropdown that:
 * - Shows the current scope mode as the title
 * - Displays context subtitle (session/workstream/worktree)
 * - Allows changing scope mode and session filter
 * - Contains display options (group by directory)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialSymbol } from '@nimbalyst/runtime';
import type { AgentFileScopeMode } from '../../store/atoms/projectState';
import { useFloatingMenu, FloatingPortal } from '../../hooks/useFloatingMenu';

interface FilesScopeDropdownProps {
  /** Current file scope mode */
  fileScopeMode: AgentFileScopeMode;
  /** Callback when file scope mode changes */
  onFileScopeModeChange: (mode: AgentFileScopeMode) => void;
  /** Whether this workstream has multiple sessions */
  hasMultipleSessions: boolean;
  /** The currently active/open session ID */
  activeSessionId: string | null;
  /** Whether filtering to current session only (true) or all sessions (false/null) */
  filterToCurrentSession: boolean;
  /** Callback when session filter changes */
  onFilterToCurrentSessionChange: (filterToCurrent: boolean) => void;
  /** Whether to group files by directory */
  groupByDirectory: boolean;
  /** Callback when group by directory changes */
  onGroupByDirectoryChange: (value: boolean) => void;
  /** Whether this is a worktree session */
  isWorktree: boolean;
  /** Number of sessions in the workstream */
  workstreamSessionCount: number;
  /** Name of the worktree (if applicable) */
  worktreeName?: string;
}

export const FilesScopeDropdown: React.FC<FilesScopeDropdownProps> = ({
  fileScopeMode,
  onFileScopeModeChange,
  hasMultipleSessions,
  activeSessionId,
  filterToCurrentSession,
  onFilterToCurrentSessionChange,
  groupByDirectory,
  onGroupByDirectoryChange,
  isWorktree,
  workstreamSessionCount,
  worktreeName,
}) => {
  const { t } = useTranslation(['files', 'aichat']);
  const menu = useFloatingMenu({ placement: 'bottom-start' });

  const scopeLabels: Record<AgentFileScopeMode, { title: string; description: string }> = {
    'current-changes': {
      title: t('files:scope.current_title'),
      description: t('files:scope.current_description'),
    },
    'session-files': {
      title: t('files:scope.session_title'),
      description: t('files:scope.session_description'),
    },
    'all-changes': {
      title: t('files:scope.all_title'),
      description: t('files:scope.all_description'),
    },
  };
  const currentLabel = scopeLabels[fileScopeMode];
  const contextSubtitle = fileScopeMode === 'all-changes'
    ? isWorktree && worktreeName
      ? t('files:scope.in_worktree', { name: worktreeName })
      : t(isWorktree ? 'files:scope.in_this_worktree' : 'files:scope.in_this_workspace')
    : filterToCurrentSession
      ? t('files:scope.in_current_session')
      : workstreamSessionCount > 1
        ? t('files:scope.in_workstream', { count: workstreamSessionCount })
        : t('files:scope.in_session');

  return (
    <div className="files-scope-dropdown min-w-60">
      {/* Dropdown trigger - acts as the title */}
      <button
        ref={menu.refs.setReference}
        {...menu.getReferenceProps()}
        onClick={() => menu.setIsOpen(!menu.isOpen)}
        data-testid="files-scope-dropdown"
        className={`files-scope-dropdown__trigger flex flex-col items-start gap-0 px-2 py-1 -mx-2 -my-1 border-none rounded cursor-pointer transition-colors max-w-full ${
          menu.isOpen ? 'bg-[var(--nim-bg-tertiary)]' : 'bg-transparent hover:bg-[var(--nim-bg-hover)]'
        }`}
      >
        <div className="files-scope-dropdown__title-row flex items-center gap-1 max-w-full">
          <MaterialSymbol icon="description" size={16} className="text-[var(--nim-text-muted)] shrink-0" />
          <span className="files-scope-dropdown__title text-sm font-medium text-[var(--nim-text)] truncate min-w-0">
            {currentLabel.title}
          </span>
          <MaterialSymbol
            icon="expand_more"
            size={16}
            className={`files-scope-dropdown__chevron text-[var(--nim-text-muted)] transition-transform duration-200 shrink-0 ${
              menu.isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
        <span className="files-scope-dropdown__subtitle text-xs text-[var(--nim-text-muted)] pl-5">
          {contextSubtitle}
        </span>
      </button>

      {/* Dropdown panel */}
      {menu.isOpen && (
        <FloatingPortal>
          <div
            ref={menu.refs.setFloating}
            style={menu.floatingStyles}
            {...menu.getFloatingProps()}
            className="files-scope-dropdown__menu min-w-[260px] bg-[var(--nim-bg)] border border-[var(--nim-border)] rounded-lg shadow-lg z-[1000] overflow-hidden"
          >
            {/* Show Files section */}
            <div className="files-scope-dropdown__section px-3 py-2 border-b border-[var(--nim-border)]">
              <div className="files-scope-dropdown__section-header text-[10px] font-semibold text-[var(--nim-text-faint)] uppercase tracking-wide mb-1.5">
                {t('files:filter.show_files')}
              </div>
              {(Object.entries(scopeLabels) as [AgentFileScopeMode, { title: string; description: string }][]).map(
                ([mode, { title, description }]) => {
                  // Customize description for all-changes mode when in a worktree
                  const displayDescription = mode === 'all-changes' && isWorktree && worktreeName
                    ? t('files:scope.all_worktree_description', { name: worktreeName })
                    : description;

                  return (
                    <label
                      key={mode}
                      className="files-scope-dropdown__option flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--nim-bg-hover)]"
                    >
                      <input
                        type="radio"
                        name="fileScopeMode"
                        checked={fileScopeMode === mode}
                        onChange={() => {
                          onFileScopeModeChange(mode);
                        }}
                        className="cursor-pointer mt-0.5"
                      />
                      <div className="files-scope-dropdown__option-content flex flex-col">
                        <span className="files-scope-dropdown__option-title text-xs font-medium text-[var(--nim-text)]">
                          {title}
                        </span>
                        <span className="files-scope-dropdown__option-description text-[10px] text-[var(--nim-text-muted)]">
                          {displayDescription}
                        </span>
                      </div>
                    </label>
                  );
                }
              )}
            </div>

            {/* Scope section - only show if multiple sessions and not in all-changes mode */}
            {hasMultipleSessions && fileScopeMode !== 'all-changes' && (
              <div className="files-scope-dropdown__section px-3 py-2 border-b border-[var(--nim-border)]">
                <div className="files-scope-dropdown__section-header text-[10px] font-semibold text-[var(--nim-text-faint)] uppercase tracking-wide mb-1.5">
                  {t('files:scope.scope')}
                </div>
                <label className="files-scope-dropdown__option flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--nim-bg-hover)]">
                  <input
                    type="radio"
                    name="sessionFilter"
                    checked={!filterToCurrentSession}
                    onChange={() => onFilterToCurrentSessionChange(false)}
                    className="cursor-pointer"
                  />
                  <span className="text-xs text-[var(--nim-text)]">
                    {t('files:scope.all_sessions', { count: workstreamSessionCount })}
                  </span>
                </label>
                <label className="files-scope-dropdown__option flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--nim-bg-hover)]">
                  <input
                    type="radio"
                    name="sessionFilter"
                    checked={filterToCurrentSession}
                    onChange={() => onFilterToCurrentSessionChange(true)}
                    className="cursor-pointer"
                  />
                  <span className="text-xs text-[var(--nim-text)]">
                    {t('files:scope.current_session_only')}
                  </span>
                </label>
              </div>
            )}

            {/* Display section */}
            <div className="files-scope-dropdown__section px-3 py-2">
              <div className="files-scope-dropdown__section-header text-[10px] font-semibold text-[var(--nim-text-faint)] uppercase tracking-wide mb-1.5">
                {t('files:scope.display')}
              </div>
              <label className="files-scope-dropdown__option flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--nim-bg-hover)]">
                <input
                  type="checkbox"
                  checked={groupByDirectory}
                  onChange={(e) => onGroupByDirectoryChange(e.target.checked)}
                  className="cursor-pointer"
                />
                <span className="text-xs text-[var(--nim-text)]">{t('aichat:file_gutter.group_by_directory')}</span>
              </label>
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
};

FilesScopeDropdown.displayName = 'FilesScopeDropdown';
