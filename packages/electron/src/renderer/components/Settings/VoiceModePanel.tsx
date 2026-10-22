/**
 * Voice Mode Settings Panel
 *
 * Self-contained component that subscribes directly to Jotai atoms.
 * No props needed - settings are read from and written to atoms.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import { ModelIdentifier } from '@nimbalyst/runtime/ai/server/types';
import {
  voiceModeSettingsAtom,
  setVoiceModeSettingsAtom,
  apiKeysAtom,
  setApiKeyAtom,
  defaultAgentModelAtom,
  type VoiceModeSettings,
  type VoiceId,
  type RealtimeModel,
  type RealtimeReasoningEffort,
  type TurnDetectionConfig,
  type SystemPromptConfig,
  type VoiceEngineSetting,
} from '../../store/atoms/appSettings';
import { liveVoicePreviews } from './liveVoicePreviews';
import { useVoicePreview } from './useVoicePreview';
import { previewEligibility, resolveVoiceForEngine, voiceGroupsForEngine } from './voiceEngineOptions';
import { useRemoteVoicePreview } from './useRemoteVoicePreview';
import { addSessionFullAtom, setSelectedWorkstreamAtom, setWindowModeAtom, navigateToSettingsAtom } from '../../store';
import { useDialog } from '../../contexts/DialogContext';
import { SettingsAlphaBadge } from '../common/AlphaBadge';
import { buildVoiceProjectSummaryPrompt, VOICE_PROJECT_SUMMARY_PATH } from './voiceModeSummaryPrompt';
import type { SessionCreateResult } from '../../../shared/ipc/types';

interface VoiceModePanelProps {
  /** Optional workspace path for project-specific features like summary generation */
  workspacePath?: string;
}

// Default turn detection config
const DEFAULT_TURN_DETECTION: TurnDetectionConfig = {
  mode: 'server_vad',
  vadThreshold: 0.5,
  silenceDuration: 500,
  interruptible: true,
};

type VoiceDescriptionKey =
  | 'voice_desc_ash'
  | 'voice_desc_echo'
  | 'voice_desc_verse'
  | 'voice_desc_cedar'
  | 'voice_desc_coral'
  | 'voice_desc_sage'
  | 'voice_desc_shimmer'
  | 'voice_desc_ballad'
  | 'voice_desc_marin'
  | 'voice_desc_alloy';

const VOICE_DESCRIPTION_KEYS: Record<VoiceId, VoiceDescriptionKey> = {
  ash: 'voice_desc_ash',
  echo: 'voice_desc_echo',
  verse: 'voice_desc_verse',
  cedar: 'voice_desc_cedar',
  coral: 'voice_desc_coral',
  sage: 'voice_desc_sage',
  shimmer: 'voice_desc_shimmer',
  ballad: 'voice_desc_ballad',
  marin: 'voice_desc_marin',
  alloy: 'voice_desc_alloy',
};

type MicAccessStatus = 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';

export const VoiceModePanel: React.FC<VoiceModePanelProps> = ({
  workspacePath,
}) => {
  const { t } = useTranslation('voice');
  // Subscribe to atoms directly - no props needed
  const [voiceModeSettings] = useAtom(voiceModeSettingsAtom);
  const [, updateVoiceModeSettings] = useAtom(setVoiceModeSettingsAtom);
  const apiKeys = useAtomValue(apiKeysAtom);
  const [, setApiKey] = useAtom(setApiKeyAtom);
  const defaultAgentModel = useAtomValue(defaultAgentModelAtom);
  const addSession = useSetAtom(addSessionFullAtom);
  const setSelectedWorkstream = useSetAtom(setSelectedWorkstreamAtom);
  const setWindowMode = useSetAtom(setWindowModeAtom);
  const navigateToSettings = useSetAtom(navigateToSettingsAtom);
  const dialog = useDialog();
  const hasAgentConfigured = !!defaultAgentModel?.trim();

  // Extract values from atom
  const {
    enabled,
    engine,
    voice,
    model,
    reasoningEffort,
    turnDetection,
    voiceAgentPrompt,
    codingAgentPrompt,
    submitDelayMs,
    listenWindowMs,
  } = voiceModeSettings;

  // Check if OpenAI key is configured
  const hasOpenAIKey = !!apiKeys.openai;

  const activeEngine: VoiceEngineSetting = engine ?? 'live';
  const voiceGroups = React.useMemo(() => voiceGroupsForEngine(activeEngine), [activeEngine]);
  const effectiveVoice = resolveVoiceForEngine(activeEngine, voice);
  const preview = previewEligibility(activeEngine, effectiveVoice);
  const previewNote = preview.canPreview
    ? preview.approximate ? t('realtime_only_hint') : ''
    : activeEngine === 'live' ? t('live_preview_unavailable') : t('realtime_preview_unavailable');

  // Handler to update any voice mode setting
  const handleSettingChange = React.useCallback((updates: Partial<VoiceModeSettings>) => {
    updateVoiceModeSettings(updates);
  }, [updateVoiceModeSettings]);

  const [showVoiceAgentPrompt, setShowVoiceAgentPrompt] = React.useState(false);
  const [showCodingAgentPrompt, setShowCodingAgentPrompt] = React.useState(false);
  const localPreview = useVoicePreview(activeEngine === 'live' ? liveVoicePreviews[effectiveVoice] : undefined);
  const remotePreview = useRemoteVoicePreview(activeEngine !== 'live', effectiveVoice);
  const isPreviewPlaying = activeEngine === 'live' ? localPreview.isPlaying : remotePreview.isPlaying;

  // Project summary state. Generation now happens inside an agent session, so
  // there's no in-panel spinner -- we only track whether the file exists on
  // disk and surface failure messages from the launch path.
  const [projectSummaryExists, setProjectSummaryExists] = React.useState<boolean | null>(null);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);
  const [summaryPath, setSummaryPath] = React.useState<string | null>(null);

  // Microphone access state. Only populated while voice mode is enabled --
  // we don't probe the OS at all when voice is off, so a user who never opts
  // in never has the mic permission concept surfaced.
  const [micStatus, setMicStatus] = React.useState<MicAccessStatus | null>(null);
  const [micPlatform, setMicPlatform] = React.useState<NodeJS.Platform | null>(null);

  const checkMicStatus = React.useCallback(async () => {
    try {
      const result = await window.electronAPI?.invoke('voice-mode:get-mic-status') as
        | { status: MicAccessStatus; platform: NodeJS.Platform }
        | undefined;
      if (result) {
        setMicStatus(result.status);
        setMicPlatform(result.platform);
      }
    } catch {
      setMicStatus(null);
    }
  }, []);

  React.useEffect(() => {
    if (!enabled) {
      setMicStatus(null);
      return;
    }
    checkMicStatus();
  }, [enabled, checkMicStatus]);

  const handleOpenMicSettings = async () => {
    await window.electronAPI?.invoke('voice-mode:open-mic-settings');
  };

  // Check if project summary exists
  React.useEffect(() => {
    if (!workspacePath) {
      setProjectSummaryExists(null);
      return;
    }

    const checkSummary = async () => {
      try {
        const path = `${workspacePath}/${VOICE_PROJECT_SUMMARY_PATH}`;
        const exists = await window.electronAPI?.invoke('file:exists', path);
        setProjectSummaryExists(exists);
        if (exists) {
          setSummaryPath(path);
        }
      } catch {
        setProjectSummaryExists(false);
      }
    };

    checkSummary();
  }, [workspacePath]);

  // Launch an agent session that generates the voice-mode project summary.
  // The agent reads project files itself and writes the summary to
  // nimbalyst-local/voice-project-summary.md via its Write tool. Voice mode
  // picks up the file on next session start (see VoiceModeService.ts loadSessionContext).
  const handleGenerateSummary = async () => {
    if (!workspacePath || !window.electronAPI) return;
    if (!hasAgentConfigured) return;

    setSummaryError(null);

    const parsed = ModelIdentifier.tryParse(defaultAgentModel);
    const provider = parsed?.provider || 'claude-code';

    const confirmed = await dialog.confirm({
      title: t('generate_summary_title'),
      message: t('generate_summary_message', { model: defaultAgentModel, path: VOICE_PROJECT_SUMMARY_PATH }),
      confirmLabel: t('launch_session'),
      cancelLabel: t('cancel'),
    });
    if (!confirmed) return;

    try {
      const sessionId = crypto.randomUUID();
      const title = t('summary_session_title');
      const result: SessionCreateResult = await window.electronAPI.invoke('sessions:create', {
        session: {
          id: sessionId,
          provider,
          model: defaultAgentModel,
          title,
        },
        workspaceId: workspacePath,
      });

      if (!result?.success || !result.id) {
        setSummaryError(result?.error || t('summary_error'));
        return;
      }

      addSession({
        id: result.id,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        provider,
        model: defaultAgentModel,
        sessionType: 'session',
        messageCount: 0,
        workspaceId: workspacePath,
        isArchived: false,
        isPinned: false,
        parentSessionId: null,
        worktreeId: null,
        childCount: 0,
        uncommittedCount: 0,
      });

      // Send the first message -- this kicks off agent execution.
      await window.electronAPI.invoke(
        'ai:sendMessage',
        buildVoiceProjectSummaryPrompt(),
        undefined,
        result.id,
        workspacePath,
      );

      // Switch to Agent mode and select the new session so the user can watch it run.
      // Switching modes implicitly unmounts the Settings view -- no explicit close needed.
      setWindowMode('agent');
      setSelectedWorkstream({
        workspacePath,
        selection: { type: 'session', id: result.id },
      });
    } catch (error) {
      console.error('[VoiceModePanel] Failed to launch summary session:', error);
      setSummaryError(error instanceof Error ? error.message : t('summary_launch_error'));
    }
  };

  // Open summary file in editor
  const handleOpenSummary = async () => {
    if (summaryPath && workspacePath) {
      await window.electronAPI?.invoke('workspace:open-file', { workspacePath, filePath: summaryPath });
    }
  };

  // Toggle voice mode. We no longer auto-launch a summary session here --
  // generating the summary spawns a visible agent session that costs tokens,
  // so it must be an explicit user action.
  const handleEnabledChange = (newEnabled: boolean) => {
    handleSettingChange({ enabled: newEnabled });
  };

  // Use defaults for turn detection
  const currentTurnDetection = { ...DEFAULT_TURN_DETECTION, ...turnDetection };

  const handleTurnDetectionChange = (updates: Partial<TurnDetectionConfig>) => {
    handleSettingChange({ turnDetection: { ...currentTurnDetection, ...updates } });
  };

  // Switching engines carries the voice over only if the target engine accepts
  // it; otherwise the stored voice is corrected now rather than failing at
  // connect time.
  const handleModelChange = (nextModel: 'gpt-live-1' | RealtimeModel) => {
    const nextEngine: VoiceEngineSetting = nextModel === 'gpt-live-1' ? 'live' : 'realtime';
    const nextVoice = resolveVoiceForEngine(nextEngine, voice);
    handleSettingChange({
      engine: nextEngine,
      ...(nextModel === 'gpt-live-1' ? {} : { model: nextModel }),
      ...(nextVoice === voice ? {} : { voice: nextVoice as VoiceId }),
    });
  };

  const handlePreviewVoice = activeEngine === 'live' ? localPreview.toggle : remotePreview.toggle;
  return (
    <div className="provider-panel flex flex-col">
      <div className="provider-panel-header mb-6 pb-4 border-b border-[var(--nim-border)]">
        <h3 className="provider-panel-title text-xl font-semibold leading-tight mb-2 text-[var(--nim-text)] flex items-center gap-2">
          {t('title')}
          <SettingsAlphaBadge size="sm" />
        </h3>
        <p className="provider-panel-description text-sm leading-relaxed text-[var(--nim-text-muted)]">
          {t('description')}
        </p>
      </div>

      <div className="provider-panel-section mb-6">
        <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('enable')}</h4>

        <div className="setting-item py-3 mb-3">
          <div className="setting-text flex flex-col gap-0.5">
            <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('api_key')}</span>
            <span className="setting-description text-xs text-[var(--nim-text-muted)]">
              {t('api_required')}
            </span>
          </div>
          <input
            type="password"
            aria-label={t('api_key')}
            value={apiKeys.openai || ''}
            onChange={(e) => setApiKey({ keyName: 'openai', value: e.target.value })}
            onFocus={(e) => e.target.select()}
            placeholder="sk-..."
            className="mt-2 w-full py-2 px-3 rounded-md bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] text-[var(--nim-text)] outline-none font-mono focus:border-[var(--nim-primary)]"
          />
        </div>

        <div className="setting-item py-3">
          <label className="setting-label flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleEnabledChange(e.target.checked)}
              className="setting-checkbox mt-1 w-4 h-4 rounded border-[var(--nim-border)] accent-[var(--nim-primary)]"
              disabled={!hasOpenAIKey}
            />
            <div className="setting-text flex flex-col gap-0.5">
              <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('show_button')}</span>
              <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                {t('show_button_desc')}
              </span>
            </div>
          </label>
        </div>
      </div>

      {enabled && hasOpenAIKey && micStatus && micStatus !== 'granted' && (
        <div
          className="voice-mode-mic-permission-warning provider-panel-section mb-6 p-4 rounded border border-[var(--nim-warning)] bg-[var(--nim-bg-secondary)]"
          data-testid="voice-mode-mic-permission-warning"
        >
          <div className="flex items-start gap-3">
            <MaterialSymbol icon="mic_off" size={20} className="mt-0.5 text-[var(--nim-warning)]" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-[var(--nim-text)] mb-1">{t('mic_not_granted')}</h4>
              <p className="text-xs text-[var(--nim-text-muted)] mb-3">
                {micStatus === 'denied'
                  ? t('mic_denied_with_settings', { settings: micPlatform === 'win32' ? 'Windows' : 'システム' })
                  : micStatus === 'restricted'
                    ? t('mic_restricted')
                    : t('mic_needs_access_with_settings', { settings: micPlatform === 'win32' ? 'Windows' : 'システム' })}
              </p>
              <div className="flex items-center gap-2">
                {(micPlatform === 'darwin' || micPlatform === 'win32') && (
                  <button
                    onClick={handleOpenMicSettings}
                    className="px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-primary)] text-white cursor-pointer text-sm flex items-center gap-1.5"
                    data-testid="voice-mode-open-mic-settings"
                  >
                    <MaterialSymbol icon="open_in_new" size={14} />
                    {t('open_settings_with_platform', { settings: micPlatform === 'win32' ? 'Windows' : 'システム' })}
                  </button>
                )}
                <button
                  onClick={checkMicStatus}
                  className="px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] cursor-pointer text-sm flex items-center gap-1.5"
                  data-testid="voice-mode-recheck-mic"
                >
                  <MaterialSymbol icon="refresh" size={14} />
                  {t('recheck')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {enabled && hasOpenAIKey && (
        <>
          <div className="provider-panel-section mb-6">
            <div className="setting-item py-3">
              <label htmlFor="voice-model" className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('model')}</label>
              <p className="setting-description text-xs text-[var(--nim-text-muted)] mt-1">
                {t('voice_model_desc')}
              </p>
              <select
                id="voice-model"
                value={activeEngine === 'live' ? 'gpt-live-1' : (model ?? 'gpt-realtime-2')}
                onChange={(e) => handleModelChange(e.target.value as 'gpt-live-1' | RealtimeModel)}
                className="mt-2 px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)]"
                data-testid="voice-mode-model-select"
              >
                <option value="gpt-live-1">gpt-live-1 ({t('default')})</option>
                <option value="gpt-realtime-2">gpt-realtime-2</option>
                <option value="gpt-realtime">gpt-realtime</option>
              </select>
              <p className="setting-description text-xs text-[var(--nim-text-muted)] mt-2">
                {t('voice_model_changes_next_connection')}
              </p>
            </div>

            {activeEngine === 'realtime' && model !== 'gpt-realtime' && (
              <div className="setting-item py-3">
                <div className="setting-text flex flex-col gap-0.5">
                  <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('reasoning_effort')}</span>
                  <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                    {t('reasoning_desc')}
                  </span>
                </div>
                <select
                  value={reasoningEffort ?? 'low'}
                  onChange={(e) => handleSettingChange({ reasoningEffort: e.target.value as RealtimeReasoningEffort })}
                  className="mt-2 px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)]"
                  data-testid="voice-mode-reasoning-effort-select"
                >
                  <option value="minimal">{t('minimal')}</option>
                  <option value="low">{t('low')}</option>
                  <option value="medium">{t('medium')}</option>
                  <option value="high">{t('high')}</option>
                  <option value="xhigh">{t('extra_high')}</option>
                </select>
              </div>

            )}
          </div>

          <div className="provider-panel-section mb-6">
            <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('voice_settings')}</h4>

            <div className="setting-item py-3">
              <div className="setting-text flex flex-col gap-0.5">
                <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice')}</span>
                <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                  {t('voice_desc')}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <select
                  value={effectiveVoice}
                  aria-label={t('voice')}
                  onChange={(e) => handleSettingChange({ voice: e.target.value as VoiceId })}
                  className="flex-1 px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)]"
                  data-testid="voice-mode-voice-select"
                >
                  {voiceGroups.map((group) => (
                    <optgroup key={group.label} label={t(group.label === 'Male' ? 'male' : group.label === 'Female' ? 'female' : 'neutral')}>
                      {group.voices.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} - {t(VOICE_DESCRIPTION_KEYS[v.id as VoiceId])}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  onClick={handlePreviewVoice}
                  disabled={!preview.canPreview || (activeEngine !== 'live' && remotePreview.isLoading)}
                  className={`px-3 py-1.5 rounded border border-[var(--nim-border)] cursor-pointer flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isPreviewPlaying
                      ? 'bg-[var(--nim-primary)] text-white'
                      : 'bg-[var(--nim-bg-secondary)] text-[var(--nim-text)]'
                  }`}
                  title={
                    !preview.canPreview
                      ? previewNote
                      : isPreviewPlaying
                        ? t('stop_preview')
                        : t('preview_voice')
                  }
                  data-testid="voice-mode-preview-voice"
                >
                  <MaterialSymbol icon={isPreviewPlaying ? 'stop' : 'play_arrow'} size={16} />
                  {isPreviewPlaying ? t('stop') : t('preview')}
                </button>
              </div>
              <p className="provider-panel-hint mt-2 text-xs text-[var(--nim-text-muted)]">
                {preview.canPreview
                  ? activeEngine === 'live'
                    ? t('live_preview_hint')
                    : t('preview_hint')
                  : previewNote}
                {preview.canPreview && previewNote && <span> {previewNote}</span>}
                {activeEngine === 'live' && localPreview.error && <span role="alert"> {t(`preview_${localPreview.error}`)}</span>}
              </p>
            </div>
          </div>

          <div className="provider-panel-section mb-6">
            <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('turn_detection')}</h4>
            <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-4">
              {t('turn_detection_desc')}
            </p>

            {/* Mode Selection */}
            <div className="setting-item py-3 mb-4">
              <div className="setting-text flex flex-col gap-0.5">
                <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('input_mode')}</span>
                <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                  {t('input_mode_desc')}
                </span>
              </div>
              <select
                value={currentTurnDetection.mode}
                onChange={(e) => handleTurnDetectionChange({ mode: e.target.value as 'server_vad' | 'push_to_talk' })}
                className="mt-2 px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)]"
              >
                <option value="server_vad">{t('vad_auto')}</option>
                <option value="push_to_talk">{t('push_to_talk')}</option>
              </select>
            </div>

            {/* VAD-specific settings */}
            {currentTurnDetection.mode === 'server_vad' && (
              <>
                {/* VAD Threshold */}
                <div className="setting-item py-3 mb-4">
                  <div className="setting-text flex flex-col gap-0.5">
                    <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('sensitivity')}</span>
                    <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                      {t('sensitivity_desc')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-[var(--nim-text-muted)]">{t('sensitive')}</span>
                    <input
                      type="range"
                      aria-label={t('sensitivity')}
                      min="0"
                      max="100"
                      value={(currentTurnDetection.vadThreshold || 0.5) * 100}
                      onChange={(e) => handleTurnDetectionChange({ vadThreshold: parseInt(e.target.value) / 100 })}
                      className="flex-1"
                    />
                    <span className="text-xs text-[var(--nim-text-muted)]">{t('less_sensitive')}</span>
                    <span className="text-xs text-[var(--nim-text)] min-w-[36px]">
                      {Math.round((currentTurnDetection.vadThreshold || 0.5) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Silence Duration */}
                <div className="setting-item py-3 mb-4">
                  <div className="setting-text flex flex-col gap-0.5">
                    <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('pause')}</span>
                    <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                      {t('pause_desc')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-[var(--nim-text-muted)]">{t('faster')}</span>
                    <input
                      type="range"
                      aria-label={t('pause')}
                      min="200"
                      max="1500"
                      step="100"
                      value={currentTurnDetection.silenceDuration || 500}
                      onChange={(e) => handleTurnDetectionChange({ silenceDuration: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-xs text-[var(--nim-text-muted)]">{t('slower')}</span>
                    <span className="text-xs text-[var(--nim-text)] min-w-[50px]">
                      {((currentTurnDetection.silenceDuration || 500) / 1000).toFixed(1)}秒
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Interruptible setting */}
            <div className="setting-item py-3">
              <label className="setting-label flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentTurnDetection.interruptible !== false}
                  onChange={(e) => handleTurnDetectionChange({ interruptible: e.target.checked })}
                  className="setting-checkbox mt-1 w-4 h-4 rounded border-[var(--nim-border)] accent-[var(--nim-primary)]"
                />
                <div className="setting-text flex flex-col gap-0.5">
                  <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('interruptions')}</span>
                  <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                    {t('interruptions_desc')}
                  </span>
                </div>
              </label>
            </div>

            {/* Listen Window Duration */}
            <div className="setting-item py-3">
              <div className="setting-text flex flex-col gap-0.5">
                <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('listen_window')}</span>
                <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                  {t('listen_window_desc')}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-[var(--nim-text-muted)]">5秒</span>
                <input
                  type="range"
                  aria-label={t('listen_window')}
                  min="5000"
                  max="30000"
                  step="1000"
                  value={listenWindowMs ?? 15000}
                  onChange={(e) => handleSettingChange({ listenWindowMs: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs text-[var(--nim-text-muted)]">30秒</span>
                <span className="text-xs text-[var(--nim-text)] min-w-[36px]">
                  {Math.round((listenWindowMs ?? 15000) / 1000)}秒
                </span>
              </div>
            </div>
          </div>

          <div className="provider-panel-section mb-6">
            <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('command_submission')}</h4>

            {/* Submit Delay */}
            <div className="setting-item py-3 mb-4">
              <div className="setting-text flex flex-col gap-0.5">
                <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('review_delay')}</span>
                <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                  {t('review_delay_desc')}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-[var(--nim-text-muted)]">{t('immediate')}</span>
                <input
                  type="range"
                  aria-label={t('review_delay')}
                  min="0"
                  max="10000"
                  step="500"
                  value={submitDelayMs ?? 3000}
                  onChange={(e) => handleSettingChange({ submitDelayMs: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs text-[var(--nim-text-muted)]">{t('ten_seconds')}</span>
                <span className="text-xs text-[var(--nim-text)] min-w-[50px]">
                  {((submitDelayMs ?? 3000) / 1000).toFixed(1)}秒
                </span>
              </div>
            </div>
          </div>

          {/* Project Summary Section */}
          {workspacePath && (
            <div className="voice-mode-project-summary provider-panel-section mb-6">
              <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('project_summary')}</h4>
              <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-3">
                {t('project_summary_hint_with_path', { path: VOICE_PROJECT_SUMMARY_PATH })}
              </p>

              {projectSummaryExists ? (
                <div className="flex items-center gap-2">
                  <MaterialSymbol icon="check_circle" size={16} className="text-[var(--nim-success)]" />
                  <span className="text-[var(--nim-text-muted)]">{t('summary_exists')}</span>
                  <button
                    onClick={handleOpenSummary}
                    className="px-2 py-1 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] cursor-pointer text-xs flex items-center gap-1"
                    title={t('open_summary')}
                    data-testid="voice-mode-summary-view"
                  >
                    <MaterialSymbol icon="open_in_new" size={14} />
                    {t('view')}
                  </button>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={!hasAgentConfigured}
                    className="px-2 py-1 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] cursor-pointer text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={hasAgentConfigured ? t('regenerate_summary') : t('configure_agent')}
                    data-testid="voice-mode-summary-regenerate"
                  >
                    <MaterialSymbol icon="refresh" size={14} />
                    {t('regenerate_summary')}
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={!hasAgentConfigured}
                    className="px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-primary)] text-white cursor-pointer text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="voice-mode-summary-generate"
                  >
                    <MaterialSymbol icon="auto_awesome" size={16} />
                    {t('generate_summary')}
                  </button>
                  <p className="provider-panel-hint mt-2 text-xs text-[var(--nim-text-muted)]">
                    {t('summary_launch')}
                  </p>
                </div>
              )}

              {!hasAgentConfigured && (
                <p className="mt-3 text-xs text-[var(--nim-text-muted)]" data-testid="voice-mode-summary-no-agent">
                  {t('no_agent')}{' '}
                  <button
                    type="button"
                    onClick={() => navigateToSettings({ category: 'claude-code' })}
                    className="bg-transparent border-none p-0 cursor-pointer text-[var(--nim-primary)] underline"
                  >
                    {t('configure_agent_settings_full')}
                  </button>{' '}
                </p>
              )}

              {summaryError && (
                <p className="mt-2 text-xs text-[var(--nim-error)]" data-testid="voice-mode-summary-error">
                  {summaryError}
                </p>
              )}
            </div>
          )}

          <div className="provider-panel-section mb-6">
            <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('usage_pricing')}</h4>
            {activeEngine === 'live' ? (
              <>
                <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)]">
                  {t('live_usage_desc')}
                </p>
                <ul className="ml-5 mt-2 mb-2 text-sm text-[var(--nim-text-muted)] list-disc">
                  <li>{t('live_voice_session')}</li>
                  <li>{t('live_billing_continues')}</li>
                  <li>{t('live_controller_billed')}</li>
                </ul>
                <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)]">
                  {t('live_example_cost')}
                </p>
              </>
            ) : (
              <>
                <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)]">
                  {t('realtime_usage_desc')}
                </p>
                <ul className="ml-5 mt-2 mb-2 text-sm text-[var(--nim-text-muted)] list-disc">
                  <li>{t('realtime_audio_input')}</li>
                  <li>{t('realtime_audio_output')}</li>
                  <li>{t('realtime_extra_costs')}</li>
                </ul>
                <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)]">
                  {t('realtime_example_cost')}
                </p>
              </>
            )}
          </div>

          <div className="provider-panel-section mb-6">
            <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('how_it_works')}</h4>
            <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)]">
              {t(activeEngine === 'live' ? 'how_desc_live' : 'how_desc_realtime')}
            </p>
            <p className="provider-panel-hint mt-2 text-sm text-[var(--nim-text-muted)]">
              {t('how_desc_2')}
            </p>
          </div>

          <div className="provider-panel-section mb-6">
            <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('prompt_customization')}</h4>
            <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-4">
              {t('prompt_customization_desc')}
            </p>

            {/* Voice Agent Prompt Section */}
            <button
              onClick={() => setShowVoiceAgentPrompt(!showVoiceAgentPrompt)}
              className={`flex items-center gap-2 bg-transparent border-none p-0 cursor-pointer text-[var(--nim-text)] text-sm font-medium ${showVoiceAgentPrompt ? 'mb-3' : 'mb-4'}`}
            >
              <MaterialSymbol icon={showVoiceAgentPrompt ? 'expand_less' : 'expand_more'} size={20} />
              {t('voice_agent_instructions')}
            </button>

            {showVoiceAgentPrompt && (
              <div className="mb-6 pl-7">
                <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-3">
                  {t('voice_agent_desc')}
                </p>

                <div className="setting-item py-3 mb-4">
                  <div className="setting-text flex flex-col gap-0.5">
                    <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('prepend')}</span>
                    <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                      {t('prepend_desc_voice')}
                    </span>
                  </div>
                  <textarea
                    value={voiceAgentPrompt?.prepend || ''}
                    aria-label={t('voice_agent_prepend_label')}
                    onChange={(e) => handleSettingChange({
                      voiceAgentPrompt: {
                        ...voiceAgentPrompt,
                        prepend: e.target.value,
                      },
                    })}
                    placeholder={t('placeholder_formal')}
                    className="mt-2 w-full min-h-[80px] px-3 py-2 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] font-inherit text-sm resize-y"
                  />
                </div>

                <div className="setting-item py-3">
                  <div className="setting-text flex flex-col gap-0.5">
                    <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('append')}</span>
                    <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                      {t('append_desc_voice')}
                    </span>
                  </div>
                  <textarea
                    value={voiceAgentPrompt?.append || ''}
                    aria-label={t('voice_agent_append_label')}
                    onChange={(e) => handleSettingChange({
                      voiceAgentPrompt: {
                        ...voiceAgentPrompt,
                        append: e.target.value,
                      },
                    })}
                    placeholder={t('placeholder_files')}
                    className="mt-2 w-full min-h-[80px] px-3 py-2 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] font-inherit text-sm resize-y"
                  />
                </div>
              </div>
            )}

            {/* Coding Agent Prompt Section */}
            <button
              onClick={() => setShowCodingAgentPrompt(!showCodingAgentPrompt)}
              className={`flex items-center gap-2 bg-transparent border-none p-0 cursor-pointer text-[var(--nim-text)] text-sm font-medium ${showCodingAgentPrompt ? 'mb-3' : ''}`}
            >
              <MaterialSymbol icon={showCodingAgentPrompt ? 'expand_less' : 'expand_more'} size={20} />
              {t('coding_agent_instructions')}
            </button>

            {showCodingAgentPrompt && (
              <div className="pl-7">
                <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-3">
                  {t('coding_agent_desc')}
                </p>

                <div className="setting-item py-3 mb-4">
                  <div className="setting-text flex flex-col gap-0.5">
                    <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('prepend')}</span>
                    <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                      {t('prepend_desc_coding')}
                    </span>
                  </div>
                  <textarea
                    value={codingAgentPrompt?.prepend || ''}
                    aria-label={t('coding_agent_prepend_label')}
                    onChange={(e) => handleSettingChange({
                      codingAgentPrompt: {
                        ...codingAgentPrompt,
                        prepend: e.target.value,
                      },
                    })}
                    placeholder={t('placeholder_brief')}
                    className="mt-2 w-full min-h-[80px] px-3 py-2 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] font-inherit text-sm resize-y"
                  />
                </div>

                <div className="setting-item py-3">
                  <div className="setting-text flex flex-col gap-0.5">
                    <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('append')}</span>
                    <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                      {t('append_desc_coding')}
                    </span>
                  </div>
                  <textarea
                    value={codingAgentPrompt?.append || ''}
                    aria-label={t('coding_agent_append_label')}
                    onChange={(e) => handleSettingChange({
                      codingAgentPrompt: {
                        ...codingAgentPrompt,
                        append: e.target.value,
                      },
                    })}
                    placeholder={t('placeholder_summary')}
                    className="mt-2 w-full min-h-[80px] px-3 py-2 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] font-inherit text-sm resize-y"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
