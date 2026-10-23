import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const CODEX_DOCS_URL = 'https://developers.openai.com/codex';

interface CodexLoginStatus {
  installed: boolean;
  isLoggedIn: boolean;
  authMethod?: 'chatgpt' | 'api-key' | 'unknown';
  message: string;
  error?: 'api_unavailable' | 'codex_check_failed' | 'codex_login_failed' | 'codex_cli_unavailable';
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
  const { t } = useTranslation('aichat');
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
          message: 'Not signed in.',
          error: 'api_unavailable',
        });
        return;
      }

      const result = await window.electronAPI.invoke('openai-codex:check-login') as {
        installed: boolean;
        isLoggedIn: boolean;
        authMethod?: 'chatgpt' | 'api-key' | 'unknown';
        message?: string;
        error?: string;
      };
      const message = result.message || '';
      const knownMessage = [
        'Not signed in.',
        'Codex CLI is unavailable.',
        'Signed in with ChatGPT.',
        'Signed in with API key.',
        'Signed in.',
      ].includes(message) || /^Signed in with ChatGPT \(.+\)\.$/.test(message);
      setStatus({
        installed: result.installed,
        isLoggedIn: result.isLoggedIn,
        authMethod: result.authMethod,
        message: knownMessage ? message : 'Not signed in.',
        error: result.error
          ? message === 'Codex CLI is unavailable.' ? 'codex_cli_unavailable' : 'codex_check_failed'
          : undefined,
      });
    } catch {
      setStatus({
        installed: false,
        isLoggedIn: false,
        message: 'Not signed in.',
        error: 'codex_check_failed',
      });
    } finally {
      setIsChecking(false);
    }
  }, [t]);

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
          message: 'Not signed in.',
          error: 'api_unavailable',
        });
        return;
      }

      const result = await window.electronAPI.invoke('openai-codex:login') as { success?: boolean };
      setStatus(result?.success ? {
        installed: true,
        isLoggedIn: false,
        message: 'Opened ChatGPT login in your browser.',
      } : {
        installed: true,
        isLoggedIn: false,
        message: 'Not signed in.',
        error: 'codex_login_failed',
      });
    } catch {
      setStatus({
        installed: false,
        isLoggedIn: false,
        message: 'Not signed in.',
        error: 'codex_login_failed',
      });
    } finally {
      setIsLoggingIn(false);
    }
  }, [t]);

  const handleOpenDocs = useCallback(() => {
    void window.electronAPI?.openExternal?.(CODEX_DOCS_URL);
  }, []);

  const translateStatusMessage = useCallback((message: string) => {
    if (message === 'Not signed in.') return t('auth.not_logged_in');
    if (message === 'Codex CLI is unavailable.') return t('auth.codex_cli_unavailable');
    if (message === 'Signed in with ChatGPT.') return t('auth.codex_signed_in_chatgpt');
    if (message === 'Signed in with API key.') return t('auth.codex_signed_in_api_key');
    if (message === 'Signed in.') return t('auth.codex_signed_in');
    if (message === 'Opened ChatGPT login in your browser.') return t('auth.codex_started');
    if (message === 'Failed to start Codex login.') return t('auth.codex_login_failed');

    const chatgptPlan = message.match(/^Signed in with ChatGPT \((.+)\)\.$/);
    if (chatgptPlan) return t('auth.codex_signed_in_chatgpt_plan', { planType: chatgptPlan[1] });
    return t('auth.codex_check_failed');
  }, [t]);

  const title = useMemo(() => {
    if (status?.isLoggedIn) {
      return t('auth.codex_logged_in');
    }
    return t('auth.codex_title');
  }, [status?.isLoggedIn, t]);

  const description = useMemo(() => {
    if (status?.isLoggedIn) {
      if (status.authMethod === 'chatgpt') {
        return t('auth.codex_chatgpt');
      }
      if (status.authMethod === 'api-key') {
        return t('auth.codex_api_key');
      }
      return t('auth.codex_authenticated');
    }

    return t('auth.codex_first_login');
  }, [status, t]);

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
          {status.error ? t(`auth.${status.error}`) : translateStatusMessage(status.message)}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="inline-flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium cursor-pointer transition-all bg-[var(--nim-primary)] text-white hover:bg-[var(--nim-primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoggingIn ? t('auth.opening_login') : status?.isLoggedIn ? t('auth.login_again') : t('auth.login')}
        </button>
        <button
          onClick={() => void handleCheckStatus()}
          disabled={isChecking}
          className="inline-flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium cursor-pointer transition-all bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] border border-[var(--nim-border)] hover:bg-[var(--nim-bg-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isChecking ? t('auth.checking') : t('auth.check_status')}
        </button>
        <button
          onClick={handleOpenDocs}
          className="inline-flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium cursor-pointer transition-all bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] border border-[var(--nim-border)] hover:bg-[var(--nim-bg-hover)]"
        >
          {t('auth.setup_docs')}
        </button>
      </div>
    </div>
  );
};
