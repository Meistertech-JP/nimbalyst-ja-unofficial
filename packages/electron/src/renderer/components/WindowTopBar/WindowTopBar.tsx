import React from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialSymbol } from '@nimbalyst/runtime';
import { MAIN_WINDOW_TITLE_BAR_HEIGHT } from '../../../shared/windowChrome';
import { FloatingPortal, useFloatingMenu } from '../../hooks/useFloatingMenu';
import './WindowTopBar.css';

export interface WindowTopBarGitStatus {
  branch: string;
  ahead: number;
  behind: number;
  hasUncommitted: boolean;
}

export interface WindowTopBarPanelControl {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  options?: WindowTopBarPanelOption[];
}

export interface WindowTopBarPanelOption {
  id: string;
  label: string;
  icon: string;
  selected: boolean;
  onSelect: () => void;
}

export interface WindowTopBarPanelControls {
  left?: WindowTopBarPanelControl;
  right?: WindowTopBarPanelControl;
}

export interface WindowTopBarGitActions {
  onPull: () => void;
  onPush: () => void;
  onOpenLog: () => void;
  onOpenExtensionSettings?: () => void;
  gitLogAvailable?: boolean;
  busyAction?: 'pull' | 'push' | null;
  feedback?: {
    kind: 'success' | 'error';
    message: string;
  } | null;
}

export interface WindowTopBarNewSessionControl {
  label: string;
  onCreate: () => void;
}

export interface WindowTopBarProps {
  workspaceName: string;
  activeModeLabel: string;
  gitStatus: WindowTopBarGitStatus | null;
  gitActions: WindowTopBarGitActions;
  panelControls?: WindowTopBarPanelControls;
  newSessionControl?: WindowTopBarNewSessionControl;
}

const GIT_FEEDBACK_MAX_LINES = 6;
const GIT_FEEDBACK_MAX_CHARS = 300;
const GIT_FEEDBACK_TOOLTIP_MAX_CHARS = 2000;

/**
 * Git failures can carry an entire pre-push hook log (tens of thousands of
 * characters). The menu is a dropdown, not a log viewer — clamp before render so
 * a long error can't blow out the menu's size.
 */
export function clampGitFeedbackMessage(
  message: string,
  maxLines = GIT_FEEDBACK_MAX_LINES,
  maxChars = GIT_FEEDBACK_MAX_CHARS,
): string {
  const lines = message.trim().split('\n');
  let clamped = lines.slice(0, maxLines).join('\n');
  let truncated = lines.length > maxLines;
  if (clamped.length > maxChars) {
    clamped = clamped.slice(0, maxChars).trimEnd();
    truncated = true;
  }
  return truncated ? `${clamped}…` : clamped;
}

function PanelButton({
  side,
  control,
}: {
  side: 'left' | 'right';
  control: WindowTopBarPanelControl;
}) {
  const { t } = useTranslation(['menu']);
  const menu = useFloatingMenu({ placement: 'bottom-end' });
  const actionLabel = t(control.collapsed ? 'menu:top_bar.show_panel' : 'menu:top_bar.hide_panel', { label: control.label });
  const selectedOption = control.options?.find((option) => option.selected);

  if (control.options) {
    return (
      <>
        <button
          ref={menu.refs.setReference}
          {...menu.getReferenceProps()}
          type="button"
          className="window-top-bar__panel-button window-top-bar__panel-selector window-top-bar__no-drag"
          data-testid={`window-top-bar-${side}-pane`}
          data-collapsed={control.collapsed}
          aria-label={t('menu:top_bar.choose_panel', { label: control.label, selection: selectedOption?.label ?? t('menu:top_bar.hidden') })}
          aria-haspopup="menu"
          aria-expanded={menu.isOpen}
          title={control.label}
          onClick={() => menu.setIsOpen(!menu.isOpen)}
        >
          <MaterialSymbol
            icon={side === 'left' ? 'dock_to_right' : 'dock_to_left'}
            size={18}
          />
          <MaterialSymbol icon="arrow_drop_down" size={16} />
        </button>
        {menu.isOpen && (
          <FloatingPortal>
            <div
              ref={menu.refs.setFloating}
              style={menu.floatingStyles}
              {...menu.getFloatingProps()}
              className="window-top-bar__menu window-top-bar__no-drag"
              data-testid={`window-top-bar-${side}-pane-menu`}
            >
              {control.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="menuitem"
                  className="window-top-bar__menu-item"
                  data-selected={option.selected}
                  onClick={() => {
                    option.onSelect();
                    menu.setIsOpen(false);
                  }}
                >
                  <MaterialSymbol icon={option.icon} size={17} />
                  <span>{option.label}</span>
                  {option.selected && (
                    <MaterialSymbol icon="check" size={16} />
                  )}
                </button>
              ))}
            </div>
          </FloatingPortal>
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      className="window-top-bar__panel-button window-top-bar__no-drag"
      data-testid={`window-top-bar-${side}-pane`}
      data-collapsed={control.collapsed}
      aria-label={actionLabel}
      title={actionLabel}
      onClick={control.onToggle}
    >
      <MaterialSymbol
        icon={side === 'left' ? 'dock_to_right' : 'dock_to_left'}
        size={18}
      />
    </button>
  );
}

function GitStatusMenu({
  gitStatus,
  actions,
}: {
  gitStatus: WindowTopBarGitStatus | null;
  actions: WindowTopBarGitActions;
}) {
  const { t } = useTranslation(['menu']);
  const menu = useFloatingMenu({ placement: 'bottom-end' });
  const branchTitle = gitStatus
    ? [
        gitStatus.branch,
        gitStatus.hasUncommitted ? t('menu:top_bar.modified') : null,
        gitStatus.ahead > 0 ? t('menu:top_bar.ahead', { count: gitStatus.ahead }) : null,
        gitStatus.behind > 0 ? t('menu:top_bar.behind', { count: gitStatus.behind }) : null,
      ].filter(Boolean).join(' · ')
    : t('menu:top_bar.git_unavailable');
  const busy = actions.busyAction != null;

  return (
    <>
      <button
        ref={menu.refs.setReference}
        {...menu.getReferenceProps()}
        type="button"
        className="window-top-bar__git window-top-bar__no-drag"
        data-testid="window-top-bar-git-status"
        data-state={gitStatus ? 'available' : 'unavailable'}
        title={branchTitle}
        aria-label={t('menu:top_bar.git_actions', { branch: branchTitle })}
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        onClick={() => menu.setIsOpen(!menu.isOpen)}
      >
        <MaterialSymbol icon="account_tree" size={16} />
        {gitStatus ? (
          <>
            <span className="window-top-bar__branch">{gitStatus.branch}</span>
            {gitStatus.hasUncommitted && (
              <span className="window-top-bar__git-detail window-top-bar__dirty">
                {t('menu:top_bar.modified')}
              </span>
            )}
            {gitStatus.ahead > 0 && (
              <span
                className="window-top-bar__git-detail window-top-bar__git-count"
                title={t('menu:top_bar.ahead', { count: gitStatus.ahead })}
                aria-label={t('menu:top_bar.ahead', { count: gitStatus.ahead })}
              >
                <MaterialSymbol icon="arrow_upward" size={14} />
                {gitStatus.ahead}
              </span>
            )}
            {gitStatus.behind > 0 && (
              <span
                className="window-top-bar__git-detail window-top-bar__git-count"
                title={t('menu:top_bar.behind', { count: gitStatus.behind })}
                aria-label={t('menu:top_bar.behind', { count: gitStatus.behind })}
              >
                <MaterialSymbol icon="arrow_downward" size={14} />
                {gitStatus.behind}
              </span>
            )}
          </>
        ) : (
          <span className="window-top-bar__git-unavailable">{t('menu:top_bar.git_unavailable')}</span>
        )}
        <MaterialSymbol icon="arrow_drop_down" size={16} />
      </button>
      {menu.isOpen && (
        <FloatingPortal>
          <div
            ref={menu.refs.setFloating}
            style={menu.floatingStyles}
            {...menu.getFloatingProps()}
            className="window-top-bar__menu window-top-bar__git-menu window-top-bar__no-drag"
            data-testid="window-top-bar-git-menu"
          >
            <button
              type="button"
              role="menuitem"
              className="window-top-bar__menu-item"
              disabled={!gitStatus || busy}
              onClick={actions.onPull}
            >
              <MaterialSymbol icon="arrow_downward" size={17} />
              <span>{t(actions.busyAction === 'pull' ? 'menu:top_bar.pulling' : 'menu:top_bar.pull')}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="window-top-bar__menu-item"
              disabled={!gitStatus || busy}
              onClick={actions.onPush}
            >
              <MaterialSymbol icon="arrow_upward" size={17} />
              <span>{t(actions.busyAction === 'push' ? 'menu:top_bar.pushing' : 'menu:top_bar.push')}</span>
            </button>
            <div className="window-top-bar__menu-separator" />
            <button
              type="button"
              role="menuitem"
              className="window-top-bar__menu-item"
              disabled={!gitStatus || actions.gitLogAvailable === false}
              onClick={actions.onOpenLog}
            >
              <MaterialSymbol icon="history" size={17} />
              <span>{t('menu:top_bar.open_git_log')}</span>
            </button>
            {actions.gitLogAvailable === false && actions.onOpenExtensionSettings && (
              <button
                type="button"
                role="menuitem"
                className="window-top-bar__menu-item"
                onClick={() => {
                  actions.onOpenExtensionSettings?.();
                  menu.setIsOpen(false);
                }}
              >
                <MaterialSymbol icon="extension" size={17} />
                <span>{t('menu:top_bar.enable_git_extension')}</span>
              </button>
            )}
            {actions.feedback && (
              <div
                className="window-top-bar__git-feedback"
                data-testid="window-top-bar-git-feedback"
                data-kind={actions.feedback.kind}
                role={actions.feedback.kind === 'error' ? 'alert' : 'status'}
                title={clampGitFeedbackMessage(
                  actions.feedback.message,
                  Number.POSITIVE_INFINITY,
                  GIT_FEEDBACK_TOOLTIP_MAX_CHARS,
                )}
              >
                {clampGitFeedbackMessage(actions.feedback.message)}
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export function WindowTopBar({
  workspaceName,
  activeModeLabel,
  gitStatus,
  gitActions,
  panelControls,
  newSessionControl,
}: WindowTopBarProps) {
  const { t } = useTranslation(['menu']);
  return (
    <header
      className="window-top-bar"
      data-component="WindowTopBar"
      data-testid="window-top-bar"
      style={{
        height: MAIN_WINDOW_TITLE_BAR_HEIGHT,
        minHeight: MAIN_WINDOW_TITLE_BAR_HEIGHT,
      }}
    >
      <div className="window-top-bar__available-area">
        <div className="window-top-bar__left" />

        <div className="window-top-bar__identity">
          <span
            className="window-top-bar__workspace-name"
            data-testid="window-top-bar-workspace-name"
            title={workspaceName}
          >
            {workspaceName}
          </span>
          <span className="window-top-bar__identity-separator" aria-hidden="true">—</span>
          <span
            className="window-top-bar__mode-label"
            data-testid="window-top-bar-mode-label"
          >
            {activeModeLabel}
          </span>
        </div>

        <div className="window-top-bar__right">
          {gitStatus && (
            <div
              className="window-top-bar__git-slot"
              data-testid="window-top-bar-git-slot"
            >
              <GitStatusMenu gitStatus={gitStatus} actions={gitActions} />
            </div>
          )}

          <div
            className="window-top-bar__right-actions"
            data-testid="window-top-bar-right-actions"
          >
            {newSessionControl && (
              <button
                type="button"
                className="window-top-bar__new-session window-top-bar__no-drag"
                data-testid="window-top-bar-new-session"
                title={newSessionControl.label}
                aria-label={newSessionControl.label}
                onClick={newSessionControl.onCreate}
              >
                <MaterialSymbol icon="add" size={17} />
                <span>{t('menu:new')}</span>
              </button>
            )}
            {panelControls?.left && (
              <PanelButton side="left" control={panelControls.left} />
            )}
            {panelControls?.right && (
              <PanelButton side="right" control={panelControls.right} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
