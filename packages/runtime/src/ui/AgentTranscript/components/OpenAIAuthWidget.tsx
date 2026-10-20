import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRuntimeTranslation } from '../../RuntimeTranslation';

const CODEX_DOCS_URL = 'https://developers.openai.com/codex';

interface CodexLoginStatus {
  installed: boolean;
  isLoggedIn: boolean;
  authMethod?: 'chatgpt' | 'api-key' | 'unknown';
  message: string;
  error?: string;
  localMessage?: 'api_unavailable' | 'codex_check_failed' | 'codex_started' | 'codex_login_failed';
}

const injectOpenAIAuthWidgetStyles = () => {
  const styleId = 'openai-auth-widget-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .openai-auth-widget {
      background-color: color-mix(in srgb, var(--nim-error) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--nim-error) 25%, transparent);
    }
    .openai-auth-widget.logged-in {
      background-color: color-mix(in srgb, var(--nim-success) 10%, transparent);
      border-color: color-mix(in srgb, var(--nim-success) 35%, transparent);
    }
  `;
  document.head.appendChild(style);
};

export const OpenAIAuthWidget: React.FC = () => {
  const { t } = useRuntimeTranslation();
  const [status, setStatus] = useState<CodexLoginStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    injectOpenAIAuthWidgetStyles();
  }, []);

  const handleCheckStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      if (!window.electronAPI?.invoke) {
        setStatus({
          installed: false,
          isLoggedIn: false,
          message: 'Cannot access Electron API. Please restart the application.',
          error: 'Cannot access Electron API. Please restart the application.',
          localMessage: 'api_unavailable',
        });
        return;
      }

      const result = await window.electronAPI.invoke('openai-codex:check-login');
      setStatus(result);
    } catch (error: any) {
      setStatus({
        installed: false,
        isLoggedIn: false,
        message: 'Failed to check Codex login status.',
        error: error?.message || 'Failed to check Codex login status.',
        localMessage: error?.message ? undefined : 'codex_check_failed',
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void handleCheckStatus();
  }, [handleCheckStatus]);

  const handleLogin = useCallback(async () => {
    setIsLoggingIn(true);
    try {
      if (!window.electronAPI?.invoke) {
        setStatus({
          installed: false,
          isLoggedIn: false,
          message: 'Cannot access Electron API. Please restart the application.',
          error: 'Cannot access Electron API. Please restart the application.',
          localMessage: 'api_unavailable',
        });
        return;
      }

      const result = await window.electronAPI.invoke('openai-codex:login');
      setStatus({
        installed: true,
        isLoggedIn: false,
        message: result?.message || 'Started the Codex login flow.',
        localMessage: result?.message ? undefined : 'codex_started',
      });
    } catch (error: any) {
      setStatus({
        installed: false,
        isLoggedIn: false,
        message: 'Failed to start the Codex login flow.',
        error: error?.message || 'Failed to start the Codex login flow.',
        localMessage: error?.message ? undefined : 'codex_login_failed',
      });
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const handleOpenDocs = useCallback(() => {
    void window.electronAPI?.openExternal?.(CODEX_DOCS_URL);
  }, []);

  const title = useMemo(() => {
    if (status?.isLoggedIn) {
      return t('aichat:auth.codex_logged_in', 'OpenAI Codex is logged in');
    }
    return t('aichat:auth.codex_title', 'OpenAI Codex authentication required');
  }, [status?.isLoggedIn, t]);

  const description = useMemo(() => {
    if (status?.isLoggedIn) {
      if (status.authMethod === 'chatgpt') {
        return t('aichat:auth.codex_chatgpt', 'Codex is authenticated with ChatGPT. Retry your prompt if this session was blocked earlier.');
      }
      if (status.authMethod === 'api-key') {
        return t('aichat:auth.codex_api_key', 'Codex is authenticated with an API key. Retry your prompt if this session was blocked earlier.');
      }
      return t('aichat:auth.codex_authenticated', 'Codex is authenticated. Retry your prompt if this session was blocked earlier.');
    }

    return t('aichat:auth.codex_first_login', 'No ~/.codex/auth.json yet is normal before first login. Start the Codex login flow below, or use an API key in Settings if you prefer.');
  }, [status, t]);

  const localMessages = {
    api_unavailable: t('aichat:auth.api_unavailable', 'Cannot access Electron API. Please restart the application.'),
    codex_check_failed: t('aichat:auth.codex_check_failed', 'Failed to check Codex login status.'),
    codex_started: t('aichat:auth.codex_started', 'Started the Codex login flow.'),
    codex_login_failed: t('aichat:auth.codex_login_failed', 'Failed to start the Codex login flow.'),
  };

  const statusBoxClassName = useMemo(() => {
    if (status?.isLoggedIn) {
      return 'border-[var(--nim-success)] text-[var(--nim-success)]';
    }
    if (status?.error) {
      return 'border-[var(--nim-error)] text-[var(--nim-error)]';
    }
    return 'border-[var(--nim-border)] text-[var(--nim-text-muted)]';
  }, [status]);

  return (
    <div className={`openai-auth-widget my-4 p-4 rounded-lg flex flex-col gap-3 ${status?.isLoggedIn ? 'logged-in' : ''}`}>
      <div className={`text-sm font-medium ${status?.isLoggedIn ? 'text-[var(--nim-success)]' : 'text-[var(--nim-text)]'}`}>
        {title}
      </div>
      <p className="text-[13px] text-[var(--nim-text-muted)] leading-relaxed">
        {description}
      </p>

      {status && (
        <div className={`rounded-md border p-3 text-[13px] leading-relaxed ${statusBoxClassName}`}>
          {status.localMessage ? localMessages[status.localMessage] : status.error || status.message}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="inline-flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium cursor-pointer transition-all bg-[var(--nim-primary)] text-white hover:bg-[var(--nim-primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoggingIn ? t('aichat:auth.opening_login', 'Opening Login...') : status?.isLoggedIn ? t('aichat:auth.login_again', 'Log In Again') : t('aichat:auth.login', 'Log In')}
        </button>
        <button
          onClick={() => void handleCheckStatus()}
          disabled={isChecking}
          className="inline-flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium cursor-pointer transition-all bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] border border-[var(--nim-border)] hover:bg-[var(--nim-bg-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isChecking ? t('dialogs:squash.checking', 'Checking...') : t('aichat:auth.check_status', 'Check Status')}
        </button>
        <button
          onClick={handleOpenDocs}
          className="inline-flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium cursor-pointer transition-all bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] border border-[var(--nim-border)] hover:bg-[var(--nim-bg-hover)]"
        >
          {t('aichat:auth.setup_docs', 'Open Setup Docs')}
        </button>
      </div>
    </div>
  );
};
