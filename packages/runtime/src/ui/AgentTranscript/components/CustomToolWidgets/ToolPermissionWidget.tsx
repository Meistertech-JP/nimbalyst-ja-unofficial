/**
 * ToolPermissionWidget
 *
 * Interactive widget for tool permission requests.
 * Renders when Claude wants to use a tool that requires user approval.
 *
 * Uses InteractiveWidgetHost for operations that require access to atoms, callbacks, and analytics.
 * The host is read from interactiveWidgetHostAtom(sessionId) - no prop drilling needed.
 *
 * Message format (nimbalyst_tool_use):
 * {
 *   type: 'nimbalyst_tool_use',
 *   id: 'tool-session-12345-abc',
 *   name: 'ToolPermission',
 *   input: {
 *     requestId: 'tool-session-12345-abc',
 *     toolName: 'Bash',
 *     rawCommand: 'git status',
 *     pattern: 'Bash(git status:*)',
 *     patternDisplayName: 'git status commands',
 *     isDestructive: false,
 *     warnings: [],
 *     workspacePath: '/path/to/workspace',
 *   }
 * }
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import type { CustomToolWidgetProps } from './index';
import { interactiveWidgetHostAtom, getInteractiveWidgetHost } from '../../../../store/atoms/interactiveWidgetHost';
import type { PermissionScope } from './InteractiveWidgetHost';
import { unwrapShellCommand } from '../../utils/unwrapShellCommand';
import { useRuntimeTranslation, runtimeEnglishTranslation, type RuntimeTranslate } from '../../../RuntimeTranslation';

/**
 * Get a human-readable display name for a tool pattern
 */
function getPatternDisplayName(pattern: string, t: RuntimeTranslate = runtimeEnglishTranslation): string {
  // Handle compound commands - these get unique patterns and shouldn't be cached
  if (pattern.startsWith('Bash:compound:')) {
    return t('aichat:permission.compound', 'this compound command (one-time only)');
  }

  // Handle Bash patterns like "Bash(git commit:*)" -> "git commit commands"
  const bashMatch = pattern.match(/^Bash\(([^:]+):\*\)$/);
  if (bashMatch) {
    return t('aichat:permission.commands', '{{command}} commands', { command: bashMatch[1] });
  }
  if (pattern === 'Bash') {
    return t('aichat:permission.shell', 'Run shell commands');
  }

  // Handle WebFetch patterns like "WebFetch(domain:example.com)" -> "Fetch from example.com"
  const webfetchMatch = pattern.match(/^WebFetch\(domain:(.+)\)$/);
  if (webfetchMatch) {
    return t('aichat:permission.fetch_domain', 'Fetch from {{domain}}', { domain: webfetchMatch[1] });
  }
  if (pattern === 'WebFetch') {
    return t('aichat:permission.fetch_any', 'Fetch any web page');
  }

  const displayNames: Record<string, string> = {
    'Edit': t('aichat:permission.edit', 'Edit files in project'),
    'Write': t('aichat:permission.write', 'Create files in project'),
    'Read': t('aichat:permission.read', 'Read files'),
    'Glob': t('aichat:permission.glob', 'Search for files'),
    'Grep': t('aichat:permission.grep', 'Search file contents'),
    'WebSearch': t('aichat:permission.web_search', 'Search the web'),
    'Task': t('aichat:permission.task', 'Run background tasks'),
    'TodoWrite': t('aichat:permission.todos', 'Update task list'),
  };

  if (displayNames[pattern]) {
    return displayNames[pattern];
  }

  // Handle MCP tools: mcp__server-name__tool_name -> "Server Name: Tool Name"
  if (pattern.toLowerCase().startsWith('mcp__')) {
    const parts = pattern.split('__');
    if (parts.length >= 3) {
      const serverName = parts[1]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      const mcpToolName = parts[2]
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return `${serverName}: ${mcpToolName}`;
    }
  }

  return pattern;
}

export function getPermissionCaption(pattern: string, supplied: string | undefined, t: RuntimeTranslate): string {
  if (!supplied || supplied === getPatternDisplayName(pattern)) return getPatternDisplayName(pattern, t);
  // Older server-generated captions are persisted in transcripts; custom captions stay verbatim.
  if (pattern === 'WebFetch' && supplied === 'all web fetches') {
    return t('aichat:permission.fetch_all', 'all web fetches');
  }
  const legacyWebFetch = pattern.match(/^WebFetch\(([^:]+):\*\)$/);
  if (legacyWebFetch && supplied === `Fetch from ${legacyWebFetch[1]}`) {
    return t('aichat:permission.fetch_domain', 'Fetch from {{domain}}', { domain: legacyWebFetch[1] });
  }
  return supplied;
}

export function getPermissionWarningText(warning: string, t: RuntimeTranslate): string {
  if (warning === 'This is part of a compound command - each part is checked separately') {
    return t('aichat:permission.compound_warning', 'This is part of a compound command - each part is checked separately');
  }
  if (warning === 'Auto-mode classifier requested user approval before running this tool.') {
    return t('aichat:permission.auto_approval', 'Auto-mode classifier requested user approval before running this tool.');
  }
  const classifierPrefix = 'Auto-mode classifier flagged this call: ';
  if (warning.startsWith(classifierPrefix)) {
    return t('aichat:permission.auto_flagged', 'Auto-mode classifier flagged this call: {{reason}}', { reason: warning.slice(classifierPrefix.length) });
  }
  return warning;
}

// ============================================================
// Widget Component
// ============================================================

export const ToolPermissionWidget: React.FC<CustomToolWidgetProps> = ({
  message,
  sessionId,
}) => {
  const { t } = useRuntimeTranslation();
  const toolCall = message.toolCall;
  if (!toolCall) return null;

  // Get host from atom (set by SessionTranscript)
  const host = useAtomValue(interactiveWidgetHostAtom(sessionId));

  // Parse tool call data
  const args = (toolCall.arguments || {}) as Record<string, any>;
  const requestId = (args.requestId || toolCall.providerToolCallId || '') as string;
  const toolName = (args.toolName || '') as string;
  const rawCommand = unwrapShellCommand((args.rawCommand || '') as string);
  const pattern = (args.pattern || toolName) as string;
  // Preserve caller-provided custom names; translate conventional generated captions only.
  const patternDisplayName = getPermissionCaption(pattern, args.patternDisplayName, t);
  const isDestructive = (args.isDestructive || false) as boolean;
  const warnings: string[] = (args.warnings || []) as string[];
  const workspacePath = (args.workspacePath || '') as string;

  const teammateName = (args.teammateName || '') as string;

  // Check if WebFetch request (for "All Domains" button)
  const isWebFetchRequest = toolName === 'WebFetch' || pattern.startsWith('WebFetch');

  // Parse result to determine completion state
  const rawResult = toolCall.result;
  const hasResult = rawResult !== undefined && rawResult !== null && rawResult !== '';

  // Parse completed state from result
  const completedState = useMemo(() => {
    if (!hasResult) return null;

    if (typeof rawResult === 'string') {
      try {
        const parsed = JSON.parse(rawResult);
        return {
          decision: parsed.decision as 'allow' | 'deny',
          scope: parsed.scope as PermissionScope,
          cancelled: parsed.cancelled || false,
        };
      } catch {
        // Try to infer from string
        const lower = rawResult.toLowerCase();
        if (lower.includes('allow')) {
          return { decision: 'allow' as const, scope: 'once' as PermissionScope, cancelled: false };
        }
        if (lower.includes('deny') || lower.includes('cancel')) {
          return { decision: 'deny' as const, scope: 'once' as PermissionScope, cancelled: lower.includes('cancel') };
        }
      }
    }
    return null;
  }, [rawResult, hasResult]);

  const isCompleted = hasResult && completedState !== null;
  const isPending = !isCompleted;

  // Local state for UI
  const [showTooltip, setShowTooltip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [localResult, setLocalResult] = useState<{ decision: 'allow' | 'deny'; scope: PermissionScope; cancelled?: boolean } | null>(null);
  const [isAllowingAllDomains, setIsAllowingAllDomains] = useState(false);

  // All handlers read the host imperatively at click time so a stale-null
  // captured value from useAtomValue (e.g. caught during the brief gap
  // between SessionTranscript's effect cleanup and re-set) doesn't bail
  // the click before the live host can answer. See #276.
  const handleDeny = useCallback(async () => {
    const liveHost = host || getInteractiveWidgetHost(sessionId);
    if (!liveHost || hasResponded || !isPending) return;

    setIsSubmitting(true);
    setLocalResult({ decision: 'deny', scope: 'once' });
    setHasResponded(true);

    try {
      await liveHost.toolPermissionSubmit(requestId, { decision: 'deny', scope: 'once' });
    } catch (error) {
      console.error('[ToolPermissionWidget] Failed to deny:', error);
      setLocalResult(null);
      setHasResponded(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [host, sessionId, requestId, hasResponded, isPending]);

  // Handle allow once
  const handleAllowOnce = useCallback(async () => {
    const liveHost = host || getInteractiveWidgetHost(sessionId);
    if (!liveHost || hasResponded || !isPending) return;

    setIsSubmitting(true);
    setLocalResult({ decision: 'allow', scope: 'once' });
    setHasResponded(true);

    try {
      await liveHost.toolPermissionSubmit(requestId, { decision: 'allow', scope: 'once' });
    } catch (error) {
      console.error('[ToolPermissionWidget] Failed to allow once:', error);
      setLocalResult(null);
      setHasResponded(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [host, sessionId, requestId, hasResponded, isPending]);

  // Handle allow session
  const handleAllowSession = useCallback(async () => {
    const liveHost = host || getInteractiveWidgetHost(sessionId);
    if (!liveHost || hasResponded || !isPending) return;

    setIsSubmitting(true);
    setLocalResult({ decision: 'allow', scope: 'session' });
    setHasResponded(true);

    try {
      await liveHost.toolPermissionSubmit(requestId, { decision: 'allow', scope: 'session' });
    } catch (error) {
      console.error('[ToolPermissionWidget] Failed to allow session:', error);
      setLocalResult(null);
      setHasResponded(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [host, sessionId, requestId, hasResponded, isPending]);

  // Handle allow always
  const handleAllowAlways = useCallback(async () => {
    const liveHost = host || getInteractiveWidgetHost(sessionId);
    if (!liveHost || hasResponded || !isPending) return;

    setIsSubmitting(true);
    setLocalResult({ decision: 'allow', scope: 'always' });
    setHasResponded(true);

    try {
      await liveHost.toolPermissionSubmit(requestId, { decision: 'allow', scope: 'always' });
    } catch (error) {
      console.error('[ToolPermissionWidget] Failed to allow always:', error);
      setLocalResult(null);
      setHasResponded(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [host, sessionId, requestId, hasResponded, isPending]);

  // Handle allow all domains (WebFetch only)
  const handleAllowAllDomains = useCallback(async () => {
    const liveHost = host || getInteractiveWidgetHost(sessionId);
    if (!liveHost || hasResponded || !isPending) return;

    setIsAllowingAllDomains(true);
    setLocalResult({ decision: 'allow', scope: 'always-all' });
    setHasResponded(true);

    try {
      await liveHost.toolPermissionSubmit(requestId, { decision: 'allow', scope: 'always-all' });
    } catch (error) {
      console.error('[ToolPermissionWidget] Failed to allow all domains:', error);
      setLocalResult(null);
      setHasResponded(false);
      setIsAllowingAllDomains(false);
    }
  }, [host, sessionId, requestId, hasResponded, isPending]);

  // Determine display state
  const displayResult = localResult || completedState;
  const displayCancelled = displayResult?.cancelled || false;

  // Show completed state
  if (displayResult || hasResponded) {
    const statusText = displayCancelled
      ? t('aichat:permission.cancelled', 'Permission Cancelled')
      : displayResult?.decision === 'allow'
        ? t('aichat:permission.granted', 'Permission Granted')
        : t('aichat:permission.denied', 'Permission Denied');

    const statusColor = displayCancelled
      ? 'text-nim-muted'
      : displayResult?.decision === 'allow'
        ? 'text-nim-success'
        : 'text-nim-error';

    const scopeText = displayResult?.scope === 'always-all'
      ? t('aichat:permission.all_domains', 'All Domains')
      : displayResult?.scope === 'always'
        ? t('aichat:permission.always', 'Always')
        : displayResult?.scope === 'session'
          ? t('aichat:permission.this_session', 'This Session')
          : t('aichat:permission.once', 'Once');

    return (
      <div
        data-testid="tool-permission-widget"
        data-state={displayResult?.decision === 'allow' ? 'granted' : 'denied'}
        className="tool-permission-widget rounded-lg bg-nim-secondary border border-nim overflow-hidden opacity-85"
      >
        <div className="flex items-center gap-2 py-3 px-4 bg-nim-tertiary">
          <span className={`w-5 h-5 shrink-0 ${statusColor}`}>
            {displayResult?.decision === 'allow' ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M13.5 4.5L6 12l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          <span className="text-sm font-semibold text-nim flex-1">
            {statusText}
            {teammateName && (
              <span className="ml-2 text-xs font-normal text-nim-muted">
                {t('aichat:permission.teammate', '(from teammate: {{name}})', { name: teammateName })}
              </span>
            )}
          </span>
          <span
            data-testid={displayResult?.decision === 'allow' ? 'tool-permission-granted' : 'tool-permission-denied'}
            className={`text-xs font-medium py-1 px-2 rounded-full ${
              displayResult?.decision === 'allow'
                ? 'bg-[color-mix(in_srgb,var(--nim-success)_12%,transparent)] text-nim-success'
                : 'bg-nim-tertiary text-nim-muted'
            }`}
          >
            {scopeText}
          </span>
        </div>

        <div className="p-3">
          <div className="bg-nim-tertiary rounded p-2 max-h-[200px] overflow-x-auto">
            <code className="font-mono text-xs text-nim whitespace-pre-wrap break-all">
              {rawCommand || toolName}
            </code>
          </div>
        </div>
      </div>
    );
  }

  // Previously: when `host` was null we rendered a button-less "Waiting..."
  // shell. That trapped users when SessionTranscript's host-attaching effect
  // re-ran (cleanup nulls the atom, the new effect re-sets it on the next
  // commit) and a permission request rendered during the gap, or when the
  // session was mounted in a context that hadn't installed a host yet.
  // The dialog had no controls to approve, deny, or cancel and stayed stuck
  // indefinitely. See #276.
  //
  // Fix: fall through to the full interactive UI even when `host` is null.
  // Click handlers read the host imperatively via getInteractiveWidgetHost
  // at click time, so a transient atom-null doesn't poison the click. When
  // `host` stays null at click time (rare; only if SessionTranscript truly
  // never mounted for this session), the buttons are visibly disabled with
  // a "Reconnecting to permission backend..." note instead of an invisible
  // no-op. See `hostUnavailable` below.

  // Show interactive UI for pending request
  return (
    <div
      data-testid="tool-permission-widget"
      data-state="pending"
      className={`tool-permission-widget rounded-lg overflow-hidden border ${
        isDestructive
          ? 'border-[var(--nim-error)] bg-[color-mix(in_srgb,var(--nim-error)_5%,var(--nim-bg-secondary))]'
          : 'border-nim-primary bg-nim-secondary'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 py-3 px-4 border-b border-nim bg-nim-tertiary">
        <span
          className={`w-5 h-5 shrink-0 flex items-center justify-center ${
            isDestructive ? 'text-[var(--nim-error)]' : 'text-nim-primary'
          }`}
        >
          {isDestructive ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6.86 2.573L1.21 12.15c-.478.813.119 1.85 1.07 1.85h11.44c.951 0 1.548-1.037 1.07-1.85L9.14 2.573c-.477-.812-1.663-.812-2.14 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 7H3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5.5 4L3.5 7l2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          )}
        </span>
        <span className="text-sm font-semibold text-nim flex-1">
          {t('aichat:permission.allow_question', 'Allow this tool?')}
          {teammateName && (
            <span className="ml-2 text-xs font-normal text-nim-muted">
              {t('aichat:permission.teammate', '(from teammate: {{name}})', { name: teammateName })}
            </span>
          )}
        </span>
        <span
          className="relative flex items-center cursor-pointer text-nim-faint hover:text-nim-muted"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 11V8M8 5.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {showTooltip && (
            <div className="absolute bottom-full right-0 mb-2 p-3 w-[300px] rounded-md border border-nim bg-nim-tertiary text-[11px] leading-relaxed text-nim-muted shadow-lg z-[100]">
              <div className="font-semibold text-nim mb-2">
                {t('aichat:permission.options', 'Permission Options')}
              </div>
              <div className="mb-2">
                <span className="font-semibold text-nim">{t('aichat:permission.deny_label', 'Deny:')}</span>{' '}{t('aichat:permission.deny_detail', 'Block this request')}
              </div>
              <div className="mb-2">
                <span className="font-semibold text-nim">{t('aichat:permission.once_label', 'Allow Once:')}</span>{' '}{t('aichat:permission.once_detail', 'Allow just this request')}
              </div>
              <div className="mb-2">
                <span className="font-semibold text-nim">{t('aichat:permission.session_label', 'Session:')}</span>{' '}{t('aichat:permission.session_before', 'Allow')}{' '}
                <span className="font-mono text-[10px] text-nim-faint bg-nim-secondary px-1 py-0.5 rounded">
                  {patternDisplayName}
                </span>{' '}{t('aichat:permission.session_after', 'until you close the app')}
              </div>
              <div className="mb-0">
                <span className="font-semibold text-nim">{t('aichat:permission.always_label', 'Always:')}</span>{' '}{t('aichat:permission.save_to', 'Save to')}{' '}
                <span className="font-mono text-[10px] text-nim-faint bg-nim-secondary px-1 py-0.5 rounded">
                  .claude/settings.local.json
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-nim text-nim-faint">
                {t('aichat:permission.pattern', 'Pattern:')}{' '}<span className="font-mono text-[10px] text-nim-faint bg-nim-secondary px-1 py-0.5 rounded">{pattern}</span>
              </div>
            </div>
          )}
        </span>
      </div>

      <div className="p-3 flex flex-col gap-2">
        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-nim-warning">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 mt-px">
                  <path d="M8 5.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <span>{getPermissionWarningText(warning, t)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Command display */}
        <div className="bg-nim-tertiary rounded p-2 max-h-[200px] overflow-x-auto">
          <code className="font-mono text-xs text-nim whitespace-pre-wrap break-all">
            {rawCommand || toolName}
          </code>
        </div>

        {/* Host-unavailable note: shown when useAtomValue captured a null
            host. Click handlers fall back to getInteractiveWidgetHost at
            click time so a transient null does not stop the click, but the
            user gets a visible signal in case the host never attaches. */}
        {!host && (
          <div
            data-testid="tool-permission-host-reconnecting"
            className="text-[11px] text-nim-muted bg-nim-tertiary border border-nim rounded px-2 py-1.5"
          >
            {t('aichat:permission.reconnecting', 'Reconnecting to permission backend. Buttons will work once the session view is fully loaded.')}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-nim">
          <button
            type="button"
            data-testid="tool-permission-deny"
            onClick={handleDeny}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-md text-[11px] font-medium cursor-pointer border border-nim bg-nim-tertiary text-nim whitespace-nowrap transition-all duration-150 hover:bg-nim-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('aichat:permission.deny', 'Deny')}
          </button>
          <button
            type="button"
            data-testid="tool-permission-allow-once"
            onClick={handleAllowOnce}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-md text-[11px] font-medium cursor-pointer border border-nim bg-nim-tertiary text-nim whitespace-nowrap transition-all duration-150 hover:bg-nim-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('aichat:permission.allow_once', 'Allow Once')}
          </button>
          <div className="w-px h-5 bg-nim mx-1" />
          <button
            type="button"
            data-testid="tool-permission-allow-session"
            onClick={handleAllowSession}
            disabled={isSubmitting}
            title={t('aichat:permission.session_title', 'Allow {{pattern}} for this session', { pattern: patternDisplayName })}
            className="px-3 py-1.5 rounded-md text-[11px] font-medium cursor-pointer border border-nim-primary bg-transparent text-nim-primary whitespace-nowrap transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--nim-primary)_10%,transparent)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('aichat:permission.session', 'Session')}
          </button>
          <button
            type="button"
            data-testid="tool-permission-allow-always"
            onClick={handleAllowAlways}
            disabled={isSubmitting}
            title={t('aichat:permission.always_title', 'Save {{pattern}} to .claude/settings.local.json', { pattern: patternDisplayName })}
            className="px-3 py-1.5 rounded-md text-[11px] font-medium cursor-pointer border-none bg-nim-primary text-nim-on-primary whitespace-nowrap transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('aichat:permission.always', 'Always')}
          </button>
          {isWebFetchRequest && (
            <>
              <div className="w-px h-5 bg-nim mx-1" />
              <button
                type="button"
                data-testid="tool-permission-allow-all-domains"
                onClick={handleAllowAllDomains}
                disabled={isSubmitting || isAllowingAllDomains}
                title={t('aichat:permission.all_domains_title', 'Allow fetching from any domain without asking')}
                className="px-3 py-1.5 rounded-md text-[11px] font-medium cursor-pointer border-none bg-nim-primary text-nim-on-primary whitespace-nowrap transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAllowingAllDomains ? t('aichat:permission.saving', 'Saving...') : t('aichat:permission.all_domains', 'All Domains')}
              </button>
            </>
          )}
        </div>

        {/* Pattern info */}
        <div className="text-[11px] text-nim-faint">
          {t('aichat:permission.allowed_pattern', 'Session/Always will allow:')}{' '}<span className="font-medium text-nim-muted bg-nim-tertiary px-1.5 py-0.5 rounded text-[10px]">{patternDisplayName}</span>
        </div>
      </div>
    </div>
  );
};
