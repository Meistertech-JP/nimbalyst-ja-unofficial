import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAtom } from 'jotai';
import { SettingsToggle } from '../SettingsToggle';
import {
  notificationSettingsAtom,
  setNotificationSettingsAtom,
  type CompletionSoundType,
} from '../../../store/atoms/appSettings';
import { getSoundPlayer } from '../../../services/SoundPlayer';

function customSoundErrorMessage(error: string, maxBytes: number | undefined, t: TFunction): string {
  switch (error) {
    case 'too-large':
      return t('settings:notifications.custom_too_large', { size: Math.round((maxBytes ?? 0) / 1024 / 1024) });
    case 'invalid':
      return t('settings:notifications.custom_invalid');
    case 'copy-failed':
      return t('settings:notifications.custom_copy_failed');
    case 'unreadable':
      return t('settings:notifications.custom_unreadable');
    default:
      return t('settings:notifications.custom_unusable');
  }
}

/**
 * NotificationsPanel - Self-contained settings panel for notifications.
 *
 * This component subscribes directly to Jotai atoms instead of receiving props.
 * Changes are automatically persisted via the setter atom.
 */
export function NotificationsPanel() {
  const { t } = useTranslation(['settings']);
  const [settings] = useAtom(notificationSettingsAtom);
  const [, updateSettings] = useAtom(setNotificationSettingsAtom);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [notificationHelp, setNotificationHelp] = useState<string | null>(null);
  const [customSoundError, setCustomSoundError] = useState<string | null>(null);

  const { completionSoundEnabled, completionSoundType, completionSoundCustomName, completionSoundVolume, osNotificationsEnabled, notifyWhenFocused } = settings;

  // play-completion-sound is handled by store/listeners/soundListeners.ts.

  const handleTestSound = async () => {
    if (!window.electronAPI) return;

    setIsTestPlaying(true);
    try {
      // Pass the live volume so the test reflects the current slider position
      // immediately, without waiting for the debounced persist to land.
      await window.electronAPI.invoke('completion-sound:test', completionSoundType, completionSoundVolume);
    } catch (error) {
      console.error('Failed to test sound:', error);
    } finally {
      setTimeout(() => setIsTestPlaying(false), 500);
    }
  };

  const handleChooseCustomSound = async () => {
    if (!window.electronAPI) return;
    setCustomSoundError(null);
    try {
      const result = await window.electronAPI.invoke('completion-sound:choose-custom');
      if (!result) return; // user cancelled the dialog
      if (result.error) {
        setCustomSoundError(customSoundErrorMessage(result.error, result.maxBytes, t));
        return;
      }
      if (result.fileName) {
        // Confirm the file actually decodes before committing the selection.
        const decodable = await getSoundPlayer().validateCustomSound();
        if (!decodable) {
          await window.electronAPI.invoke('completion-sound:clear-custom');
          setCustomSoundError(t('settings:notifications.custom_decode_failed'));
          return;
        }
        updateSettings({ completionSoundType: 'custom', completionSoundCustomName: result.fileName });
      }
    } catch (error) {
      console.error('Failed to choose custom sound:', error);
      setCustomSoundError(t('settings:notifications.custom_unusable'));
    }
  };

  const handleClearCustomSound = async () => {
    if (!window.electronAPI) return;
    setCustomSoundError(null);
    try {
      await window.electronAPI.invoke('completion-sound:clear-custom');
      updateSettings({ completionSoundType: 'chime', completionSoundCustomName: null });
    } catch (error) {
      console.error('Failed to clear custom sound:', error);
    }
  };

  const handleTestNotification = async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.invoke('notifications:show-test');
    if (result?.success) {
      setNotificationHelp(t('settings:notifications.test_sent'));
    } else {
      setNotificationHelp(result?.error || t('settings:notifications.test_failed'));
    }
  };

  const handleOpenNotificationSettings = async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.invoke('notifications:open-system-settings');
    if (!result?.success) {
      setNotificationHelp(result?.error || t('settings:notifications.settings_failed'));
    }
  };

  return (
    <div className="provider-panel flex flex-col">
      <div className="provider-panel-header mb-6 pb-4 border-b border-[var(--nim-border)]">
        <h3 className="provider-panel-title text-xl font-semibold leading-tight mb-2 text-[var(--nim-text)]">{t('settings:notifications.title')}</h3>
        <p className="provider-panel-description text-sm leading-relaxed text-[var(--nim-text-muted)]">
          {t('settings:notifications.description')}
        </p>
      </div>

      <div className="provider-panel-section py-4 mb-4 border-b border-[var(--nim-border)] last:border-b-0 last:mb-0 last:pb-0">
        <h4 className="provider-panel-section-title text-base font-semibold mb-3 text-[var(--nim-text)]">{t('settings:notifications.completion_title')}</h4>
        <p className="text-sm leading-relaxed text-[var(--nim-text-muted)] mb-4">
          {t('settings:notifications.completion_description')}
        </p>

        <SettingsToggle
          checked={completionSoundEnabled}
          onChange={(checked) => updateSettings({ completionSoundEnabled: checked })}
          name={t('settings:notifications.enable_completion')}
          description={t('settings:notifications.enable_completion_desc')}
        />

        {completionSoundEnabled && (
          <div className="setting-item py-3 mt-4">
            <div className="setting-text flex flex-col gap-0.5">
              <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('settings:notifications.sound_type')}</span>
              <span className="setting-description text-xs leading-relaxed text-[var(--nim-text-muted)]">
                {t('settings:notifications.sound_type_desc')}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {(['chime', 'bell', 'pop', 'custom'] as CompletionSoundType[]).map((sound) => (
                <label key={sound} className="setting-radio-label flex items-center gap-2 cursor-pointer text-sm text-[var(--nim-text)]">
                  <input
                    type="radio"
                    name="sound-type"
                    value={sound}
                    checked={completionSoundType === sound}
                    onChange={(e) => updateSettings({ completionSoundType: e.target.value as CompletionSoundType })}
                    className="setting-radio w-4 h-4 cursor-pointer shrink-0 accent-[var(--nim-primary)]"
                  />
                  <span>{t(`settings:notifications.sound_${sound}`)}</span>
                </label>
              ))}
            </div>

            {completionSoundType === 'custom' && (
              <div className="completion-sound-custom mt-3 flex flex-col gap-2">
                <span className="text-xs leading-relaxed text-[var(--nim-text-muted)]">
                  {completionSoundCustomName
                    ? t('settings:notifications.selected_sound', { name: completionSoundCustomName })
                    : t('settings:notifications.no_custom_sound')}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleChooseCustomSound} className="nim-btn-secondary text-sm">
                    {completionSoundCustomName ? t('settings:notifications.change_file') : t('settings:notifications.choose_file')}
                  </button>
                  {completionSoundCustomName && (
                    <button onClick={handleClearCustomSound} className="nim-btn-secondary text-sm">
                      {t('settings:notifications.remove')}
                    </button>
                  )}
                </div>
                <span className="text-xs leading-relaxed text-[var(--nim-text-muted)]">
                  {t('settings:notifications.supported_formats')}
                </span>
                {customSoundError && (
                  <span className="completion-sound-custom-error text-xs leading-relaxed text-[var(--nim-error)]">
                    {customSoundError}
                  </span>
                )}
              </div>
            )}

            <div className="setting-text flex flex-col gap-0.5 mt-4">
              <div className="flex items-center justify-between">
                <span className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('settings:notifications.volume')}</span>
                <span className="setting-value text-xs font-medium tabular-nums text-[var(--nim-text-muted)]">
                  {completionSoundVolume}%
                </span>
              </div>
              <span className="setting-description text-xs leading-relaxed text-[var(--nim-text-muted)]">
                {t('settings:notifications.volume_desc')}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={completionSoundVolume}
              onChange={(e) => updateSettings({ completionSoundVolume: Number(e.target.value) })}
              aria-label={t('settings:notifications.volume_aria')}
              className="w-full mt-2 cursor-pointer accent-[var(--nim-primary)]"
            />

            <button
              onClick={handleTestSound}
              disabled={isTestPlaying || (completionSoundType === 'custom' && !completionSoundCustomName)}
              className="nim-btn-secondary text-sm mt-3"
            >
              {isTestPlaying ? t('settings:notifications.playing') : t('settings:notifications.test_sound')}
            </button>
          </div>
        )}
      </div>

      <div className="provider-panel-section py-4 mb-4 border-b border-[var(--nim-border)] last:border-b-0 last:mb-0 last:pb-0">
        <h4 className="provider-panel-section-title text-base font-semibold mb-3 text-[var(--nim-text)]">{t('settings:notifications.os_title')}</h4>
        <p className="text-sm leading-relaxed text-[var(--nim-text-muted)] mb-4">
          {t('settings:notifications.os_description')}
        </p>

        <SettingsToggle
          checked={osNotificationsEnabled}
          onChange={(checked) => {
            updateSettings({ osNotificationsEnabled: checked });
            if (checked) {
              void handleTestNotification();
            } else {
              setNotificationHelp(null);
            }
          }}
          name={t('settings:notifications.enable_os')}
          description={t('settings:notifications.enable_os_desc')}
        />

        {osNotificationsEnabled && (
          <>
            <SettingsToggle
              checked={notifyWhenFocused}
              onChange={(checked) => updateSettings({ notifyWhenFocused: checked })}
              name={t('settings:notifications.focused')}
              description={t('settings:notifications.focused_desc')}
            />

            <div className="setting-item py-3">
              <div className="setting-text flex flex-col gap-2">
                <span className="setting-description text-xs leading-relaxed text-[var(--nim-text-muted)]">
                  {t('settings:notifications.permission_help')}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleTestNotification} className="nim-btn-secondary text-sm">
                    {t('settings:notifications.send_test')}
                  </button>
                  <button onClick={handleOpenNotificationSettings} className="nim-btn-secondary text-sm">
                    {t('settings:notifications.open_settings')}
                  </button>
                </div>
                {notificationHelp && (
                  <span className="text-xs leading-relaxed text-[var(--nim-text-muted)]">{notificationHelp}</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="provider-panel-section py-4 mb-4 border-b border-[var(--nim-border)] last:border-b-0 last:mb-0 last:pb-0">
        <h4 className="provider-panel-section-title text-base font-semibold mb-3 text-[var(--nim-text)]">{t('settings:notifications.blocked_title')}</h4>
        <p className="text-sm leading-relaxed text-[var(--nim-text-muted)] mb-4">
          {t('settings:notifications.blocked_description')}
        </p>

        <SettingsToggle
          checked={settings.sessionBlockedNotificationsEnabled}
          onChange={(checked) => updateSettings({ sessionBlockedNotificationsEnabled: checked })}
          name={t('settings:notifications.blocked_enable')}
          description={t('settings:notifications.blocked_enable_desc')}
        />
      </div>
    </div>
  );
}
