/**
 * Voice Mode Settings Panel
 *
 * Self-contained component that subscribes directly to Jotai atoms.
 * No props needed - settings are read from and written to atoms.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { MaterialSymbol } from '@nimbalyst/runtime';
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
} from '../../store/atoms/appSettings';
import { voiceModePreviewAudioAtom } from '../../store/atoms/voiceModeState';
import { addSessionFullAtom, setSelectedWorkstreamAtom, setWindowModeAtom, navigateToSettingsAtom } from '../../store';
import { useDialog } from '../../contexts/DialogContext';
import { AlphaBadge, SETTINGS_ALPHA_TOOLTIP } from '../common/AlphaBadge';
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

// Available OpenAI Realtime API voices with descriptions
// Some voices are Realtime-only and use approximations for TTS preview
// Gender categorization based on OpenAI documentation and community observations
const VOICE_OPTIONS: Array<{
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female' | 'neutral';
  realtimeOnly?: boolean; // If true, preview uses a similar voice approximation
}> = [
  // Male voices
  { id: 'ash', name: 'Ash', description: 'Clear and confident', gender: 'male' },
  { id: 'echo', name: 'Echo', description: 'Smooth and resonant', gender: 'male' },
  { id: 'verse', name: 'Verse', description: 'Dynamic and engaging', gender: 'male', realtimeOnly: true },
  { id: 'cedar', name: 'Cedar', description: 'Deep and authoritative', gender: 'male', realtimeOnly: true },
  // Female voices
  { id: 'coral', name: 'Coral', description: 'Warm and friendly', gender: 'female' },
  { id: 'sage', name: 'Sage', description: 'Thoughtful and calm', gender: 'female' },
  { id: 'shimmer', name: 'Shimmer', description: 'Bright and cheerful', gender: 'female' },
  { id: 'ballad', name: 'Ballad', description: 'Melodic and expressive', gender: 'female', realtimeOnly: true },
  { id: 'marin', name: 'Marin', description: 'Natural and conversational', gender: 'female', realtimeOnly: true },
  // Neutral voices
  { id: 'alloy', name: 'Alloy', description: 'Balanced and versatile', gender: 'neutral' },
];

// Group voices by gender for the dropdown
const VOICE_GROUPS = [
  { label: 'Male', voices: VOICE_OPTIONS.filter(v => v.gender === 'male') },
  { label: 'Female', voices: VOICE_OPTIONS.filter(v => v.gender === 'female') },
  { label: 'Neutral', voices: VOICE_OPTIONS.filter(v => v.gender === 'neutral') },
];

type MicAccessStatus = 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';

export const VoiceModePanel: React.FC<VoiceModePanelProps> = ({
    workspacePath,
  }) => {
    const { t } = useTranslation(['settings', 'voice']);
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

  // Handler to update any voice mode setting
  const handleSettingChange = React.useCallback((updates: Partial<VoiceModeSettings>) => {
    updateVoiceModeSettings(updates);
  }, [updateVoiceModeSettings]);

  const [showVoiceAgentPrompt, setShowVoiceAgentPrompt] = React.useState(false);
  const [showCodingAgentPrompt, setShowCodingAgentPrompt] = React.useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

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
      title: t('voice:generate_summary_title'),
      message: t('voice:generate_summary_message', {
        model: defaultAgentModel,
        path: VOICE_PROJECT_SUMMARY_PATH,
      }),
      confirmLabel: t('voice:launch_session'),
      cancelLabel: t('voice:cancel'),
    });
    if (!confirmed) return;

    try {
      const sessionId = crypto.randomUUID();
      const title = t('voice:summary_session_title');
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
        setSummaryError(result?.error || t('voice:summary_error'));
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
      setSummaryError(error instanceof Error ? error.message : t('voice:summary_launch_error'));
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

  // Listen for preview audio from main process
  // Stop any playing audio on unmount.
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play preview audio when main process broadcasts a `voice-mode:preview-audio`
  // event. The IPC event is handled centrally in
  // store/listeners/voiceModeListeners.ts which writes voiceModePreviewAudioAtom;
  // we play only on *new* bumps so any audio that was queued up before this
  // panel mounted doesn't replay on open.
  const previewAudio = useAtomValue(voiceModePreviewAudioAtom);
  const initialPreviewAudioRef = React.useRef(previewAudio);
  React.useEffect(() => {
    if (previewAudio === initialPreviewAudioRef.current) return;
    if (!previewAudio) return;
    const { audioBase64, format } = previewAudio.payload;
    const audio = new Audio(`data:audio/${format};base64,${audioBase64}`);
    audioRef.current = audio;
    setIsPreviewPlaying(true);

    audio.onended = () => {
      setIsPreviewPlaying(false);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setIsPreviewPlaying(false);
      audioRef.current = null;
    };

    audio.play().catch(() => {
      setIsPreviewPlaying(false);
      audioRef.current = null;
    });
  }, [previewAudio]);

  // Use defaults for turn detection
  const currentTurnDetection = { ...DEFAULT_TURN_DETECTION, ...turnDetection };

  const handleTurnDetectionChange = (updates: Partial<TurnDetectionConfig>) => {
    handleSettingChange({ turnDetection: { ...currentTurnDetection, ...updates } });
  };

  const handlePreviewVoice = async () => {
    if (isPreviewPlaying) {
      // Stop current preview
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPreviewPlaying(false);
      return;
    }

    setIsPreviewPlaying(true);
    try {
      const result = await window.electronAPI?.invoke('voice-mode:preview-voice', voice);
      if (!result?.success) {
        console.error('[VoiceModePanel] Preview failed:', result?.message);
        setIsPreviewPlaying(false);
      }
      // Audio will be received via IPC and played automatically
    } catch (error) {
      console.error('[VoiceModePanel] Preview error:', error);
      setIsPreviewPlaying(false);
    }
  };
  return (
    <div className="provider-panel flex flex-col">
      <div className="provider-panel-header mb-6 pb-4 border-b border-[var(--nim-border)]">
        <h3 className="provider-panel-title text-xl font-semibold leading-tight mb-2 text-[var(--nim-text)] flex items-center gap-2">
          {t('voice:title')}
          <AlphaBadge size="sm" tooltip={t('settings:provider.alpha_tooltip', { defaultValue: SETTINGS_ALPHA_TOOLTIP })} />
        </h3>
        <p className="provider-panel-description text-sm leading-relaxed text-[var(--nim-text-muted)]">
          {t('voice:description')}
        </p>
      </div>

      <div className="provider-panel-section mb-6">
        <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('voice:enable_voice_mode')}</h4>

        <div className="setting-item py-3 mb-3">
          <div className="setting-text flex flex-col gap-0.5">
            <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:openai_api_key')}</span>
            <span className="setting-description text-xs text-[var(--nim-text-muted)]">
              {t('voice:api_required')}
            </span>
          </div>
          <input
            type="password"
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
              <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:show_voice_mode_button')}</span>
              <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                {t('voice:show_button_desc')}
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
              <h4 className="text-sm font-medium text-[var(--nim-text)] mb-1">{t('voice:microphone_not_granted')}</h4>
              <p className="text-xs text-[var(--nim-text-muted)] mb-3">
                {micStatus === 'denied'
                  ? t('voice:mic_denied')
                  : micStatus === 'restricted'
                    ? t('voice:mic_restricted')
                    : t('voice:mic_needs_access')}
              </p>
              <div className="flex items-center gap-2">
                {(micPlatform === 'darwin' || micPlatform === 'win32') && (
                  <button
                    onClick={handleOpenMicSettings}
                    className="px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-primary)] text-white cursor-pointer text-sm flex items-center gap-1.5"
                    data-testid="voice-mode-open-mic-settings"
                  >
                    <MaterialSymbol icon="open_in_new" size={14} />
                    {t('voice:open_system_settings')}
                  </button>
                )}
                <button
                  onClick={checkMicStatus}
                  className="px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] cursor-pointer text-sm flex items-center gap-1.5"
                  data-testid="voice-mode-recheck-mic"
                >
                  <MaterialSymbol icon="refresh" size={14} />
                  {t('voice:recheck')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {enabled && hasOpenAIKey && (
        <>
          <div className="provider-panel-section mb-6">
            <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('voice:model')}</h4>

            <div className="setting-item py-3">
              <div className="setting-text flex flex-col gap-0.5">
                <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:realtime_model')}</span>
                <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                  {t('voice:realtime_desc')}
                </span>
              </div>
              <select
                value={model ?? 'gpt-realtime-2'}
                onChange={(e) => handleSettingChange({ model: e.target.value as RealtimeModel })}
                className="mt-2 px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)]"
                data-testid="voice-mode-model-select"
              >
                <option value="gpt-realtime-2">gpt-realtime-2 ({t('voice:recommended')})</option>
                <option value="gpt-realtime">gpt-realtime</option>
              </select>
            </div>

            <div className="setting-item py-3">
              <div className="setting-text flex flex-col gap-0.5">
                <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:reasoning_effort')}</span>
                <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                  {t('voice:reasoning_desc')}
                </span>
              </div>
              <select
                value={reasoningEffort ?? 'low'}
                onChange={(e) => handleSettingChange({ reasoningEffort: e.target.value as RealtimeReasoningEffort })}
                className="mt-2 px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)]"
                data-testid="voice-mode-reasoning-effort-select"
              >
                <option value="minimal">{t('voice:minimal')} ({t('voice:fastest')})</option>
                <option value="low">{t('voice:low')} ({t('voice:recommended')})</option>
                <option value="medium">{t('voice:medium')}</option>
                <option value="high">{t('voice:high')}</option>
                <option value="xhigh">{t('voice:extra_high')} ({t('voice:slowest_smartest')})</option>
              </select>
            </div>
          </div>

          <div className="provider-panel-section mb-6">
            <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('voice:voice_settings')}</h4>

            <div className="setting-item py-3">
              <div className="setting-text flex flex-col gap-0.5">
                <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:voice')}</span>
                <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                  {t('voice:voice_desc')}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <select
                  value={voice}
                  onChange={(e) => handleSettingChange({ voice: e.target.value as VoiceId })}
                  className="flex-1 px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)]"
                >
                  {VOICE_GROUPS.map((group) => (
                    <optgroup key={group.label} label={t(`voice:${group.label.toLowerCase()}`)}>
                      {group.voices.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} - {t(`voice:voice_desc_${v.id}`)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  onClick={handlePreviewVoice}
                  disabled={isPreviewPlaying && !audioRef.current}
                  className={`px-3 py-1.5 rounded border border-[var(--nim-border)] cursor-pointer flex items-center gap-1 ${
                    isPreviewPlaying
                      ? 'bg-[var(--nim-primary)] text-white'
                      : 'bg-[var(--nim-bg-secondary)] text-[var(--nim-text)]'
                  }`}
                  title={isPreviewPlaying ? t('voice:stop_preview') : t('voice:preview_voice')}
                >
                  <MaterialSymbol icon={isPreviewPlaying ? 'stop' : 'play_arrow'} size={16} />
                  {isPreviewPlaying ? t('voice:stop') : t('voice:preview')}
                </button>
              </div>
              <p className="provider-panel-hint mt-2 text-xs text-[var(--nim-text-muted)]">
                {t('voice:preview_hint')}
                {VOICE_OPTIONS.find(v => v.id === voice)?.realtimeOnly && (
                  <span className="text-[var(--nim-text-muted)]">
                    {' '}{t('voice:realtime_only_hint')}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="provider-panel-section mb-6">
            <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('voice:turn_detection')}</h4>
            <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-4">
              {t('voice:turn_detection_desc')}
            </p>

            {/* Mode Selection */}
            <div className="setting-item py-3 mb-4">
              <div className="setting-text flex flex-col gap-0.5">
                <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:input_mode')}</span>
                <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                  {t('voice:input_mode_desc')}
                </span>
              </div>
              <select
                value={currentTurnDetection.mode}
                onChange={(e) => handleTurnDetectionChange({ mode: e.target.value as 'server_vad' | 'push_to_talk' })}
                className="mt-2 px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)]"
              >
                <option value="server_vad">{t('voice:vad_auto')}</option>
                <option value="push_to_talk">{t('voice:push_to_talk')}</option>
              </select>
            </div>

            {/* VAD-specific settings */}
            {currentTurnDetection.mode === 'server_vad' && (
              <>
                {/* VAD Threshold */}
                <div className="setting-item py-3 mb-4">
                  <div className="setting-text flex flex-col gap-0.5">
                    <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:voice_detection_sensitivity')}</span>
                    <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                      {t('voice:sensitivity_desc')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-[var(--nim-text-muted)]">{t('voice:sensitive')}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(currentTurnDetection.vadThreshold || 0.5) * 100}
                      onChange={(e) => handleTurnDetectionChange({ vadThreshold: parseInt(e.target.value) / 100 })}
                      className="flex-1"
                    />
                    <span className="text-xs text-[var(--nim-text-muted)]">{t('voice:less_sensitive')}</span>
                    <span className="text-xs text-[var(--nim-text)] min-w-[36px]">
                      {Math.round((currentTurnDetection.vadThreshold || 0.5) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Silence Duration */}
                <div className="setting-item py-3 mb-4">
                  <div className="setting-text flex flex-col gap-0.5">
                    <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:pause_before_processing')}</span>
                    <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                      {t('voice:pause_desc')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-[var(--nim-text-muted)]">{t('voice:faster')}</span>
                    <input
                      type="range"
                      min="200"
                      max="1500"
                      step="100"
                      value={currentTurnDetection.silenceDuration || 500}
                      onChange={(e) => handleTurnDetectionChange({ silenceDuration: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-xs text-[var(--nim-text-muted)]">{t('voice:slower')}</span>
                    <span className="text-xs text-[var(--nim-text)] min-w-[50px]">
                      {((currentTurnDetection.silenceDuration || 500) / 1000).toFixed(1)}s
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
                  <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:allow_interruptions')}</span>
                  <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                    {t('voice:interruptions_desc')}
                  </span>
                </div>
              </label>
            </div>

            {/* Listen Window Duration */}
            <div className="setting-item py-3">
              <div className="setting-text flex flex-col gap-0.5">
                <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:listen_window_duration')}</span>
                <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                  {t('voice:listen_window_desc')}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-[var(--nim-text-muted)]">5s</span>
                <input
                  type="range"
                  min="5000"
                  max="30000"
                  step="1000"
                  value={listenWindowMs ?? 15000}
                  onChange={(e) => handleSettingChange({ listenWindowMs: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs text-[var(--nim-text-muted)]">30s</span>
                <span className="text-xs text-[var(--nim-text)] min-w-[36px]">
                  {Math.round((listenWindowMs ?? 15000) / 1000)}s
                </span>
              </div>
            </div>
          </div>

          <div className="provider-panel-section mb-6">
            <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('voice:command_submission')}</h4>

            {/* Submit Delay */}
            <div className="setting-item py-3 mb-4">
              <div className="setting-text flex flex-col gap-0.5">
                <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:review_delay')}</span>
                <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                  {t('voice:review_delay_desc')}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-[var(--nim-text-muted)]">{t('voice:immediate')}</span>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="500"
                  value={submitDelayMs ?? 3000}
                  onChange={(e) => handleSettingChange({ submitDelayMs: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs text-[var(--nim-text-muted)]">{t('voice:ten_seconds')}</span>
                <span className="text-xs text-[var(--nim-text)] min-w-[50px]">
                  {((submitDelayMs ?? 3000) / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
          </div>

          {/* Project Summary Section */}
          {workspacePath && (
            <div className="voice-mode-project-summary provider-panel-section mb-6">
              <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('voice:project_summary')}</h4>
              <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-3">
                {t('voice:project_summary_hint')}{' '}
                <code className="text-xs bg-[var(--nim-bg-secondary)] px-1 py-0.5 rounded">{VOICE_PROJECT_SUMMARY_PATH}</code>
              </p>

              {projectSummaryExists ? (
                <div className="flex items-center gap-2">
                  <MaterialSymbol icon="check_circle" size={16} className="text-[var(--nim-success)]" />
                  <span className="text-[var(--nim-text-muted)]">{t('voice:summary_exists')}</span>
                  <button
                    onClick={handleOpenSummary}
                    className="px-2 py-1 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] cursor-pointer text-xs flex items-center gap-1"
                    title={t('voice:open_summary')}
                    data-testid="voice-mode-summary-view"
                  >
                    <MaterialSymbol icon="open_in_new" size={14} />
                    {t('voice:view')}
                  </button>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={!hasAgentConfigured}
                    className="px-2 py-1 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] cursor-pointer text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={hasAgentConfigured ? t('voice:regenerate_summary') : t('voice:configure_agent')}
                    data-testid="voice-mode-summary-regenerate"
                  >
                    <MaterialSymbol icon="refresh" size={14} />
                    {t('voice:regenerate_summary')}
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
                    {t('voice:generate_summary')}
                  </button>
                  <p className="provider-panel-hint mt-2 text-xs text-[var(--nim-text-muted)]">
                    {t('voice:summary_launch')}
                  </p>
                </div>
              )}

              {!hasAgentConfigured && (
                <p className="mt-3 text-xs text-[var(--nim-text-muted)]" data-testid="voice-mode-summary-no-agent">
                  {t('voice:no_agent')}{' '}
                  <button
                    type="button"
                    onClick={() => navigateToSettings({ category: 'claude-code' })}
                    className="bg-transparent border-none p-0 cursor-pointer text-[var(--nim-primary)] underline"
                  >
                    {t('voice:configure_agent_settings')}
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
            <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('voice:usage_pricing')}</h4>
            <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)]">
                {t('voice:usage_desc')}
            </p>
            <ul className="ml-5 mt-2 mb-2 text-sm text-[var(--nim-text-muted)] list-disc">
                <li>{t('voice:audio_input')}</li>
                <li>{t('voice:audio_output')}</li>
              <li>{t('voice:plus_token_costs')}</li>
            </ul>
            <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)]">
              {t('voice:example_cost')}
            </p>
          </div>

          <div className="provider-panel-section mb-6">
            <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('voice:how_it_works')}</h4>
            <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)]">
              {t('voice:how_desc_1')}
            </p>
            <p className="provider-panel-hint mt-2 text-sm text-[var(--nim-text-muted)]">
              {t('voice:how_desc_2')}
            </p>
          </div>

          <div className="provider-panel-section mb-6">
            <h4 className="provider-panel-section-title text-base font-medium mb-4 text-[var(--nim-text)]">{t('voice:system_prompt')}</h4>
            <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-4">
              {t('voice:prompt_customization_desc')}
            </p>

            {/* Voice Agent Prompt Section */}
            <button
              onClick={() => setShowVoiceAgentPrompt(!showVoiceAgentPrompt)}
              className={`flex items-center gap-2 bg-transparent border-none p-0 cursor-pointer text-[var(--nim-text)] text-sm font-medium ${showVoiceAgentPrompt ? 'mb-3' : 'mb-4'}`}
            >
              <MaterialSymbol icon={showVoiceAgentPrompt ? 'expand_less' : 'expand_more'} size={20} />
              {t('voice:voice_agent_instructions')}
            </button>

            {showVoiceAgentPrompt && (
              <div className="mb-6 pl-7">
                <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-3">
                  {t('voice:voice_agent_desc')}
                </p>

                <div className="setting-item py-3 mb-4">
                  <div className="setting-text flex flex-col gap-0.5">
                    <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:prepend_instructions')}</span>
                    <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                      {t('voice:prepend_desc_voice')}
                    </span>
                  </div>
                  <textarea
                    value={voiceAgentPrompt?.prepend || ''}
                    onChange={(e) => handleSettingChange({
                      voiceAgentPrompt: {
                        ...voiceAgentPrompt,
                        prepend: e.target.value,
                      },
                    })}
                    placeholder={t('voice:placeholder_formal')}
                    className="mt-2 w-full min-h-[80px] px-3 py-2 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] font-inherit text-sm resize-y"
                  />
                </div>

                <div className="setting-item py-3">
                  <div className="setting-text flex flex-col gap-0.5">
                    <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:append_instructions')}</span>
                    <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                      {t('voice:append_desc_voice')}
                    </span>
                  </div>
                  <textarea
                    value={voiceAgentPrompt?.append || ''}
                    onChange={(e) => handleSettingChange({
                      voiceAgentPrompt: {
                        ...voiceAgentPrompt,
                        append: e.target.value,
                      },
                    })}
                    placeholder={t('voice:placeholder_files')}
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
              {t('voice:coding_agent_instructions')}
            </button>

            {showCodingAgentPrompt && (
              <div className="pl-7">
                <p className="provider-panel-hint text-sm text-[var(--nim-text-muted)] mb-3">
                  {t('voice:coding_agent_desc')}
                </p>

                <div className="setting-item py-3 mb-4">
                  <div className="setting-text flex flex-col gap-0.5">
                    <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:prepend_instructions')}</span>
                    <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                      {t('voice:prepend_desc_coding')}
                    </span>
                  </div>
                  <textarea
                    value={codingAgentPrompt?.prepend || ''}
                    onChange={(e) => handleSettingChange({
                      codingAgentPrompt: {
                        ...codingAgentPrompt,
                        prepend: e.target.value,
                      },
                    })}
                    placeholder={t('voice:placeholder_brief')}
                    className="mt-2 w-full min-h-[80px] px-3 py-2 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] font-inherit text-sm resize-y"
                  />
                </div>

                <div className="setting-item py-3">
                  <div className="setting-text flex flex-col gap-0.5">
                    <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('voice:append_instructions')}</span>
                    <span className="setting-description text-xs text-[var(--nim-text-muted)]">
                      {t('voice:append_desc_coding')}
                    </span>
                  </div>
                  <textarea
                    value={codingAgentPrompt?.append || ''}
                    onChange={(e) => handleSettingChange({
                      codingAgentPrompt: {
                        ...codingAgentPrompt,
                        append: e.target.value,
                      },
                    })}
                    placeholder={t('voice:placeholder_summary')}
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
