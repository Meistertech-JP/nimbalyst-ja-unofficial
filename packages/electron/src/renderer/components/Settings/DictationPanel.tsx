import React, { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import type { DictationAvailability, DictationEngineSetting } from '../../../shared/dictation';
import { getShortcutDisplay } from '../../../shared/KeyboardShortcuts';
import {
  dictationAvailabilityAtom,
  dictationSettingsAtom,
  refreshDictationAvailabilityAtom,
  setDictationSettingsAtom,
} from '../../store/atoms/dictation';
import { DICTATION_SHORTCUT } from '../../dictation/dictationShortcut';
import { SettingsToggle } from '../GlobalSettings/SettingsToggle';

const ENGINE_OPTIONS: Array<{ value: DictationEngineSetting; key: string }> = [
  { value: 'auto', key: 'dictation.engine.auto' },
  { value: 'system', key: 'dictation.engine.system' },
  { value: 'on-device', key: 'dictation.engine.on_device' },
  { value: 'openai', key: 'dictation.engine.openai' },
];

const LANGUAGE_OPTIONS: Array<{ value: string; key: string }> = [
  { value: '', key: 'dictation.language.system_default' },
  { value: 'en-US', key: 'dictation.language.en_us' },
  { value: 'en-GB', key: 'dictation.language.en_gb' },
  { value: 'de-DE', key: 'dictation.language.de_de' },
  { value: 'es-ES', key: 'dictation.language.es_es' },
  { value: 'fr-FR', key: 'dictation.language.fr_fr' },
  { value: 'it-IT', key: 'dictation.language.it_it' },
  { value: 'ja-JP', key: 'dictation.language.ja_jp' },
  { value: 'ko-KR', key: 'dictation.language.ko_kr' },
  { value: 'pt-BR', key: 'dictation.language.pt_br' },
  { value: 'zh-CN', key: 'dictation.language.zh_cn' },
];

/** Explain which engine will run, or why none can. */
function describeDictationAvailability(
  engine: DictationEngineSetting,
  availability: DictationAvailability | null,
): { ok: boolean; key: string } | null {
  if (!availability) return null;
  const { system, onDevice, openai } = availability;
  if (engine === 'system' || (engine === 'auto' && system)) {
    return system
      ? {
          ok: true,
          key: engine === 'auto' ? 'dictation.status.auto_uses_system' : 'dictation.status.uses_system',
        }
      : { ok: false, key: 'dictation.status.system_unavailable' };
  }
  if (engine === 'on-device') {
    return onDevice
      ? { ok: true, key: 'dictation.status.on_device_available' }
      : { ok: false, key: 'dictation.status.on_device_unavailable' };
  }
  if (engine === 'openai') {
    return openai
      ? { ok: true, key: 'dictation.status.openai_available' }
      : { ok: false, key: 'dictation.status.openai_unavailable' };
  }
  if (onDevice) return { ok: true, key: 'dictation.status.auto_uses_on_device' };
  if (openai) return { ok: true, key: 'dictation.status.auto_uses_openai' };
  return {
    ok: false,
    key: 'dictation.status.no_engine_available',
  };
}

export function DictationPanel() {
  const { t } = useTranslation('voice');
  const settings = useAtomValue(dictationSettingsAtom);
  const setSettings = useSetAtom(setDictationSettingsAtom);
  const availability = useAtomValue(dictationAvailabilityAtom);
  const refreshAvailability = useSetAtom(refreshDictationAvailabilityAtom);

  useEffect(() => {
    void refreshAvailability();
  }, [refreshAvailability]);

  const status = describeDictationAvailability(settings.engine, availability);
  const shortcut = getShortcutDisplay(DICTATION_SHORTCUT);

  return (
    <div className="dictation-panel provider-panel flex flex-col">
      <div className="provider-panel-header mb-6 pb-4 border-b border-[var(--nim-border)]">
        <h3 className="provider-panel-title text-xl font-semibold leading-tight mb-2 text-[var(--nim-text)]">{t('dictation.title')}</h3>
        <p className="provider-panel-description text-sm leading-relaxed text-[var(--nim-text-muted)]">
          {t('dictation.description')}
        </p>
      </div>

      <SettingsToggle
        variant="enable"
        name={t('dictation.title')}
        description={
          settings.enabled
            ? t('dictation.enabled_description', { shortcut })
            : t('dictation.disabled_description')
        }
        checked={settings.enabled}
        onChange={(enabled) => void setSettings({ enabled })}
        testId="dictation-enabled-toggle"
      />

      {settings.enabled && (
        <div className="provider-panel-section mb-6 flex flex-col gap-4">
          <div className="setting-item">
            <label htmlFor="dictation-engine" className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('dictation.speech_engine')}</label>
            <select
              id="dictation-engine"
              value={settings.engine}
              onChange={(e) => void setSettings({ engine: e.target.value as DictationEngineSetting })}
              className="mt-2 block px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)]"
              data-testid="dictation-engine-select"
            >
              {ENGINE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{t(o.key)}</option>
              ))}
            </select>
            {status && (
              <p
                className={`dictation-availability mt-2 text-xs select-text ${status.ok ? 'text-[var(--nim-text-muted)]' : 'text-[var(--nim-warning)]'}`}
                data-testid="dictation-availability"
              >
                {t(status.key)}
              </p>
            )}
          </div>

          <div className="setting-item">
            <label htmlFor="dictation-language" className="setting-name text-sm font-medium text-[var(--nim-text)]">{t('dictation.language_label')}</label>
            <select
              id="dictation-language"
              value={settings.language ?? ''}
              // '' clears the saved language (main drops empty values)
              onChange={(e) => void setSettings({ language: e.target.value })}
              className="mt-2 block px-3 py-1.5 rounded border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)]"
              data-testid="dictation-language-select"
            >
              {LANGUAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{t(o.key)}</option>
              ))}
              {settings.language && !LANGUAGE_OPTIONS.some((o) => o.value === settings.language) && (
                <option value={settings.language}>{settings.language}</option>
              )}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
