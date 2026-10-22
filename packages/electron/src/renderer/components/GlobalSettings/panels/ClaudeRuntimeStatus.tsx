import React, { useEffect, useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';

declare const __CLAUDE_AGENT_SDK_VERSION__: string;
const bundledVersion = typeof __CLAUDE_AGENT_SDK_VERSION__ !== 'undefined' ? __CLAUDE_AGENT_SDK_VERSION__ : 'unknown';

/** Read the provider's merged settings without executing a custom wrapper. */
export function ClaudeRuntimeStatus({ scope, workspacePath, revision }: {
  scope: 'user' | 'project'; workspacePath?: string; revision: number;
}) {
  const { t } = useTranslation('settings', { keyPrefix: 'claude_runtime_status' });
  const [runtime, setRuntime] = useState<{ path: string } | null>(null);
  const [error, setError] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    setRuntime(null);
    setError(undefined);
    async function load() {
      try {
        if (scope === 'project' && !workspacePath) throw new Error(t('project_required'));
        const result = await window.electronAPI.invoke('ai:getEffectiveSettings', scope === 'project' ? workspacePath : undefined);
        if (!result?.success) throw new Error(result?.error || t('resolve_failed'));
        if (!cancelled) setRuntime({ path: result.settings.customClaudeCodePath || '' });
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : t('resolve_failed'));
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [scope, workspacePath, revision, t]);

  return (
    <div className="claude-runtime-status provider-panel-section py-4 mb-4 border-b border-[var(--nim-border)]">
      <h4 className="text-base font-semibold mb-3 text-[var(--nim-text)]">{t('title')}</h4>
      {error ? <p role="alert" className="text-sm text-[var(--nim-error)]">{error}</p> : !runtime ? (
        <p className="text-sm text-[var(--nim-text-muted)]">{t('loading')}</p>
      ) : (
        <div className="installation-status p-4 rounded-lg bg-[var(--nim-bg-secondary)] text-sm text-[var(--nim-text)]">
          <div>{t('source')}{runtime.path ? t('custom_source') : t('bundled_source')}</div>
          {runtime.path ? <div className="claude-runtime-path break-all select-text mt-2">{runtime.path}</div> : <div className="mt-2">{t('version')}: {bundledVersion}</div>}
        </div>
      )}
    </div>
  );
}
