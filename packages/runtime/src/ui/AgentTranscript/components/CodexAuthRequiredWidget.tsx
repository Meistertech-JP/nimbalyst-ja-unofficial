import React, { useCallback } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';

/**
 * Custom event name used to ask the renderer to open the OpenAI Codex settings
 * panel and scroll the auth section into view. Listened for by `App.tsx`.
 * Detail carries the data-testid of the element to scroll to once the panel
 * mounts.
 */
export const OPEN_CODEX_AUTH_SETTINGS_EVENT = 'nimbalyst:open-codex-auth-settings';

export interface OpenCodexAuthSettingsEventDetail {
  anchor: string;
}

const injectCodexAuthRequiredWidgetStyles = () => {
  const styleId = 'codex-auth-required-widget-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .codex-auth-required-widget {
      background-color: color-mix(in srgb, var(--nim-primary) 6%, transparent);
      border: 1px solid color-mix(in srgb, var(--nim-primary) 25%, transparent);
    }
  `;
  document.head.appendChild(style);
};

export const CodexAuthRequiredWidget: React.FC<{ fallbackMessage?: string }> = ({ fallbackMessage }) => {
  const { t } = useTranslation('aichat');
  React.useEffect(() => {
    injectCodexAuthRequiredWidgetStyles();
  }, []);

  const handleClick = useCallback(() => {
    const detail: OpenCodexAuthSettingsEventDetail = { anchor: 'codex-auth-section' };
    window.dispatchEvent(new CustomEvent(OPEN_CODEX_AUTH_SETTINGS_EVENT, { detail }));
  }, []);

  return (
    <div
      className="codex-auth-required-widget my-4 p-4 rounded-lg flex flex-col gap-3"
      data-testid="codex-auth-required-widget"
    >
      <div className="text-sm font-medium text-[var(--nim-text)]">
        {t('auth.codex_continue')}
      </div>
      <p className="text-[13px] text-[var(--nim-text-muted)] leading-relaxed">
        {t('auth.codex_required')}
      </p>
      {fallbackMessage && (
        <details className="rounded-md border border-[var(--nim-border)] text-[var(--nim-text-muted)] p-3 text-[12px] leading-relaxed">
          <summary className="cursor-pointer">{t('auth.show_technical_details')}</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono">{fallbackMessage}</pre>
        </details>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium cursor-pointer transition-all bg-[var(--nim-primary)] text-white hover:bg-[var(--nim-primary-hover)]"
          data-testid="codex-auth-required-sign-in"
        >
          {t('auth.login')}
        </button>
      </div>
    </div>
  );
};
