import React, { useState, useEffect, useCallback } from 'react';
import { useRuntimeTranslation } from '../../RuntimeTranslation';

// Inject login widget styles once (for color-mix patterns)
const injectLoginWidgetStyles = () => {
  const styleId = 'login-required-widget-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .login-required-widget {
      background-color: color-mix(in srgb, var(--nim-error) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--nim-error) 25%, transparent);
    }
    .login-required-widget.logged-in {
      background-color: color-mix(in srgb, var(--nim-success) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--nim-success) 40%, transparent);
    }
    .login-status-message.success {
      background-color: color-mix(in srgb, var(--nim-success) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--nim-success) 40%, transparent);
    }
    .login-status-message.error {
      background-color: color-mix(in srgb, var(--nim-error) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--nim-error) 25%, transparent);
    }
    .login-required-widget.logged-in .login-account-info {
      color: color-mix(in srgb, var(--nim-success) 80%, var(--nim-text-muted));
    }
  `;
  document.head.appendChild(style);
};

interface LoginRequiredWidgetProps {
  /** Project/worktree folder to open the login terminal in, if known. */
  workspacePath?: string;
}

export const LoginRequiredWidget: React.FC<LoginRequiredWidgetProps> = ({ workspacePath }) => {
  const { t } = useRuntimeTranslation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [loginStatus, setLoginStatus] = useState<{
    message: string;
    localMessage?: 'api_unavailable' | 'not_logged_in' | 'check_failed' | 'login_retry' | 'login_failed' | 'login_started';
    errorDetail?: string;
    success: boolean;
    accountInfo?: {
      email?: string;
      organization?: string;
      subscriptionType?: string;
    };
  } | null>(null);

  // Inject styles on mount
  useEffect(() => {
    injectLoginWidgetStyles();
  }, []);

  const handleRefreshStatus = useCallback(async () => {
    setIsChecking(true);
    setLoginStatus(null);

    try {
      if (!window.electronAPI?.invoke) {
        setLoginStatus({
          message: 'Cannot access Electron API. Please restart the application.',
          localMessage: 'api_unavailable',
          success: false
        });
        setIsChecking(false);
        return;
      }

      const status = await window.electronAPI.invoke('claude-code:check-login');

      if (status.isLoggedIn) {
        setLoginStatus({
          message: 'Login successful! You can now use Claude Agent.',
          success: true,
          accountInfo: {
            email: status.email,
            organization: status.organization,
            subscriptionType: status.subscriptionType
          }
        });
      } else {
        setLoginStatus({
          message: status.error || 'Not logged in. Please complete the authentication flow.',
          localMessage: status.error ? undefined : 'not_logged_in',
          success: false
        });
      }
    } catch (error: any) {
      setLoginStatus({
        message: `Failed to check status: ${error.message || 'Unknown error'}`,
        localMessage: 'check_failed',
        errorDetail: error.message,
        success: false
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Check login status when component mounts
  useEffect(() => {
    handleRefreshStatus();
  }, [handleRefreshStatus]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginStatus(null);

    try {
      // Check if we have the electronAPI available
      if (!window.electronAPI?.invoke) {
        setLoginStatus({
          message: 'Cannot access Electron API. Please restart the application.',
          localMessage: 'api_unavailable',
          success: false
        });
        setIsLoggingIn(false);
        return;
      }

      const result = await window.electronAPI.invoke('claude-code:login', workspacePath);

      if (result.success) {
        setLoginStatus({
          message: 'Login initiated! Complete authentication in the Terminal window (you may have to type /login to complete the process), then click "Check Status".',
          localMessage: 'login_started',
          success: true
        });
      } else {
        setLoginStatus({
          message: result.error || 'Login failed. Please try again.',
          localMessage: result.error ? undefined : 'login_retry',
          success: false
        });
      }
    } catch (error: any) {
      setLoginStatus({
        message: `Login failed: ${error.message || 'Unknown error'}`,
        localMessage: 'login_failed',
        errorDetail: error.message,
        success: false
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const isLoggedIn = loginStatus?.success && loginStatus?.accountInfo;
  // Translate stored UI messages at render time, without repeating login/status IPC on language changes.
  const localMessages = {
    api_unavailable: t('aichat:auth.api_unavailable', 'Cannot access Electron API. Please restart the application.'),
    not_logged_in: t('aichat:auth.not_logged_in', 'Not logged in. Please complete the authentication flow.'),
    check_failed: t('aichat:auth.check_failed', 'Failed to check status: {{error}}', { error: loginStatus?.errorDetail || t('dialogs:error.unknown', 'Unknown error') }),
    login_retry: t('aichat:auth.login_retry', 'Login failed. Please try again.'),
    login_failed: t('aichat:auth.login_failed', 'Login failed: {{error}}', { error: loginStatus?.errorDetail || t('dialogs:error.unknown', 'Unknown error') }),
    login_started: t('aichat:auth.login_started', 'Login started. Complete authentication in the Terminal window (you may have to type /login), then click “Check Status”.'),
  };
  const loginButtonLabel = isLoggingIn
    ? t('aichat:auth.opening_login', 'Opening Login...')
    : isLoggedIn
      ? t('aichat:auth.login_again', 'Log In Again')
      : t('aichat:auth.login', 'Log In');
  const statusButtonLabel = isChecking ? t('dialogs:squash.checking', 'Checking...') : t('aichat:auth.check_status', 'Check Status');

  return (
    <div className={`login-required-widget my-4 p-4 rounded-lg flex flex-col gap-4 ${isLoggedIn ? 'logged-in' : ''}`}>
      <div className="login-required-message text-[var(--nim-text)] text-sm leading-relaxed flex items-center gap-2">
        {isLoggedIn ? (
          <>
            <span className="login-status-icon success text-lg font-bold text-[var(--nim-success)]">&#10003;</span>
            <span className="font-medium text-[var(--nim-success)]">{t('aichat:auth.logged_in', 'You are logged in and can continue your conversation')}</span>
          </>
        ) : (
          t('aichat:auth.claude_required', 'An Anthropic account is required to use Claude Agent. Please login or create an account.')
        )}
      </div>

      {loginStatus && loginStatus.accountInfo && (
        <div className={`login-account-info text-xs flex flex-col gap-1 ${isLoggedIn ? 'pl-0' : 'pl-6'} text-[var(--nim-text-muted)]`}>
          {loginStatus.accountInfo.email && (
            <div>{t('aichat:auth.account', 'Account: {{email}}', { email: loginStatus.accountInfo.email })}</div>
          )}
          {loginStatus.accountInfo.organization && (
            <div>{t('aichat:auth.organization', 'Organization: {{organization}}', { organization: loginStatus.accountInfo.organization })}</div>
          )}
        </div>
      )}

      {loginStatus && !loginStatus.success && (
        <div className="login-status-message error text-[0.85rem] p-4 rounded-md flex flex-col gap-2 leading-relaxed text-[var(--nim-error)]">
          <div className="login-status-header flex items-center gap-2">
            <span className="login-status-icon text-base">&#9888;</span>
            <span>{loginStatus.localMessage ? localMessages[loginStatus.localMessage] : loginStatus.message}</span>
          </div>
          <div className="login-status-fallback text-[var(--nim-text-muted)]">
            {t('aichat:auth.fallback_before', 'Still stuck? Open a Claude Code terminal session and run')}{' '}<code className="px-1 py-0.5 rounded bg-[var(--nim-bg-tertiary)] text-[var(--nim-text)]">/login</code>{' '}{t('aichat:auth.fallback_after', 'there, then click “Check Status”.')}
          </div>
        </div>
      )}

      <div className="login-actions grid gap-3 w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="login-button w-full py-3 px-5 rounded-md text-sm font-semibold cursor-pointer transition-all border-none bg-[var(--nim-primary)] text-white whitespace-nowrap hover:bg-[var(--nim-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--nim-text-faint)] disabled:opacity-60"
        >
          {loginButtonLabel}
        </button>

        <button
          onClick={handleRefreshStatus}
          disabled={isChecking}
          className="status-button w-full py-3 px-5 rounded-md text-sm font-semibold cursor-pointer transition-all border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] whitespace-nowrap hover:bg-[var(--nim-bg-hover)] disabled:cursor-not-allowed disabled:bg-[var(--nim-bg-tertiary)] disabled:opacity-60"
        >
          {statusButtonLabel}
        </button>
      </div>
    </div>
  );
};
