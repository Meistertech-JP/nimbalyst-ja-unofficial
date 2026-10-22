/**
 * Image Generation Settings Panel
 *
 * Settings panel for configuring the Image Generation extension.
 * Displayed in Settings > Extensions > Image Generation.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { SettingsPanelProps } from '@nimbalyst/runtime';
import { AVAILABLE_MODELS, DEFAULT_MODEL, type GeminiImageModel } from '../types';

// Storage keys (must match ImageProjectEditor)
const GOOGLE_AI_KEY_STORAGE_KEY = 'google_ai_api_key';
const SELECTED_MODEL_STORAGE_KEY = 'selected_model';

export function ImageGenerationSettings({ storage, theme }: SettingsPanelProps) {
  const { t } = useTranslation('extensions');
  const isDark = theme === 'dark' || theme === 'crystal-dark';
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiImageModel>(DEFAULT_MODEL);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; key: string } | null>(null);

  // Load existing settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load API key
        const storedKey = await storage.getSecret(GOOGLE_AI_KEY_STORAGE_KEY);
        if (storedKey) {
          setApiKey('');
          setHasStoredKey(true);
        }

        // Load selected model
        const storedModel = await storage.get(SELECTED_MODEL_STORAGE_KEY);
        if (storedModel && typeof storedModel === 'string') {
          setSelectedModel(storedModel as GeminiImageModel);
        }
      } catch (error) {
        console.error('[ImageGenSettings] Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [storage]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', key: 'image_generation_ui.enter_api_key_error' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await storage.setSecret(GOOGLE_AI_KEY_STORAGE_KEY, apiKey.trim());
      setHasStoredKey(true);
      setApiKey(''); // Clear the input after saving
      setMessage({ type: 'success', key: 'image_generation_ui.api_key_saved' });
    } catch (error) {
      console.error('[ImageGenSettings] Failed to save API key:', error);
      setMessage({ type: 'error', key: 'image_generation_ui.api_key_save_failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      await storage.deleteSecret(GOOGLE_AI_KEY_STORAGE_KEY);
      setHasStoredKey(false);
      setApiKey('');
      setMessage({ type: 'success', key: 'image_generation_ui.api_key_removed' });
    } catch (error) {
      console.error('[ImageGenSettings] Failed to clear API key:', error);
      setMessage({ type: 'error', key: 'image_generation_ui.api_key_remove_failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleModelChange = async (model: GeminiImageModel) => {
    setSelectedModel(model);
    try {
      await storage.set(SELECTED_MODEL_STORAGE_KEY, model);
      setMessage({ type: 'success', key: 'image_generation_ui.model_preference_saved' });
    } catch (error) {
      console.error('[ImageGenSettings] Failed to save model:', error);
      setMessage({ type: 'error', key: 'image_generation_ui.model_preference_save_failed' });
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 text-nim-muted">
        {t('image_generation_ui.loading_settings')}
      </div>
    );
  }

  return (
    <div className="p-5">
      <h3 className="m-0 mb-2 text-base font-semibold">
        {t('image_generation_ui.google_ai_api_key')}
      </h3>
      <p className="m-0 mb-4 text-[13px] text-nim-muted leading-normal">
        {t('image_generation_ui.api_key_description')}{' '}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-nim-link"
        >
          {t('image_generation_ui.get_api_key')}
        </a>
      </p>

      {hasStoredKey && (
        <div className="px-3 py-2 mb-3 bg-[rgba(34,197,94,0.1)] border border-nim-success rounded-md text-[13px] text-nim-success flex items-center gap-2">
          <span>&#10003;</span>
          <span>{t('image_generation_ui.api_key_configured')}</span>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={hasStoredKey ? t('image_generation_ui.enter_new_key') : t('image_generation_ui.enter_google_ai_api_key')}
          className="flex-1 px-3 py-2 rounded-md border border-nim bg-nim text-nim text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && apiKey.trim()) {
              handleSave();
            }
          }}
        />
        <button
          onClick={handleSave}
          disabled={isSaving || !apiKey.trim()}
          className={`px-4 py-2 rounded-md border-none font-medium text-sm ${apiKey.trim() ? 'bg-nim-primary text-nim-on-primary cursor-pointer' : 'bg-nim-secondary text-nim-muted cursor-not-allowed'}`}
        >
          {isSaving ? t('image_generation_ui.saving') : t('image_generation_ui.save')}
        </button>
        {hasStoredKey && (
          <button
            onClick={handleClear}
            disabled={isSaving}
            className="px-3 py-2 rounded-md border border-nim bg-transparent text-nim-muted cursor-pointer text-sm"
          >
            {t('image_generation_ui.clear')}
          </button>
        )}
      </div>

      {message && (
        <div
          className={`px-3 py-2 rounded-md text-[13px] ${message.type === 'success' ? 'bg-[rgba(34,197,94,0.1)] text-nim-success' : 'bg-[rgba(239,68,68,0.1)] text-nim-error'}`}
        >
          {t(message.key)}
        </div>
      )}

      {/* Model Selection */}
      <div className="mt-6 pt-4 border-t border-nim">
        <h3 className="m-0 mb-2 text-base font-semibold">
          {t('image_generation_ui.model')}
        </h3>
        <p className="m-0 mb-4 text-[13px] text-nim-muted leading-normal">
          {t('image_generation_ui.model_description')}
        </p>

        <div className="flex flex-col gap-2">
          {AVAILABLE_MODELS.map((model) => (
            <label
              key={model.id}
              className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                selectedModel === model.id
                  ? 'border-nim-primary bg-[rgba(59,130,246,0.1)]'
                  : 'border-nim bg-nim-secondary hover:bg-nim-hover'
              }`}
            >
              <input
                type="radio"
                name="model"
                value={model.id}
                checked={selectedModel === model.id}
                onChange={() => handleModelChange(model.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-nim">
                      {model.label}
                  {!model.supportsConversation && (
                    <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-nim-tertiary text-nim-muted">
                      {t('image_generation_ui.single_shot_only')}
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-nim-muted mt-0.5">
               {t(model.id === 'gemini-2.5-flash-image'
                 ? 'image_generation_ui.models.flash_image.description'
                 : 'image_generation_ui.models.pro_image.description')}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-nim">
        <h4 className="m-0 mb-2 text-sm font-medium">
          {t('image_generation_ui.about_title')}
        </h4>
        <p className="m-0 text-[13px] text-nim-muted leading-normal">
          {t('image_generation_ui.about_description')}
        </p>
      </div>
    </div>
  );
}

export default ImageGenerationSettings;
