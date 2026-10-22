import React, { useState, useEffect } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import './UnifiedOnboarding.css';

export interface UnifiedOnboardingProps {
  isOpen: boolean;
  onComplete: (data: OnboardingData, intent: OnboardingIntent) => void | Promise<void>;
  onSkip: () => void;
  /** Force showing as new user ('new') or existing user ('existing') for testing */
  forcedMode?: 'new' | 'existing' | null;
}

export type OnboardingIntent = 'get-started' | 'tutorial';

export interface OnboardingData {
  role: string | null;
  customRole: string | null;
  referralSource: string | null;
  email: string | null;
  developerMode: boolean;
}

const ROLE_OPTIONS = [
  { value: '', key: 'no_answer' },
  { value: 'developer', key: 'developer' },
  { value: 'product_manager', key: 'product_manager' },
  { value: 'designer', key: 'designer' },
  { value: 'writer', key: 'writer' },
  { value: 'researcher', key: 'researcher' },
  { value: 'marketing', key: 'marketing' },
  { value: 'sales', key: 'sales' },
  { value: 'finance', key: 'finance' },
  { value: 'student', key: 'student' },
  { value: 'hobbyist', key: 'hobbyist' },
  { value: 'other', key: 'other' },
];

const REFERRAL_OPTIONS = [
  { value: '', key: 'no_answer' },
  { value: 'search', key: 'search' },
  { value: 'social', key: 'social' },
  { value: 'friend', key: 'friend' },
  { value: 'ai', key: 'ai' },
  { value: 'ad', key: 'ad' },
  { value: 'youtube', key: 'youtube' },
  { value: 'github', key: 'github' },
  { value: 'course_training', key: 'course_training' },
  { value: 'podcast', key: 'podcast' },
  { value: 'newsletter_article', key: 'newsletter_article' },
  { value: 'other', key: 'other' },
];

const SOCIAL_MEDIA_OPTIONS = [
  { value: 'LinkedIn', key: 'linkedin' },
  { value: 'Twitter/X', key: 'twitter_x' },
  { value: 'Reddit', key: 'reddit' },
  { value: 'TikTok', key: 'tiktok' },
  { value: 'YouTube', key: 'youtube' },
  { value: 'Instagram', key: 'instagram' },
  { value: 'Facebook', key: 'facebook' },
  { value: 'Other', key: 'other' },
];

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const UnifiedOnboarding: React.FC<UnifiedOnboardingProps> = ({
  isOpen,
  onComplete,
  onSkip,
  forcedMode,
}) => {
  const { t } = useTranslation('onboarding');

  // Mode Selection (at top) - null means no selection yet
  const [developerMode, setDeveloperMode] = useState<boolean | null>(null);

  // User Background (optional data collection)
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [customRole, setCustomRole] = useState<string>('');
  const [referralSource, setReferralSource] = useState<string>('');
  const [customReferral, setCustomReferral] = useState<string>('');
  const [aiDetail, setAiDetail] = useState<string>('');
  const [searchDetail, setSearchDetail] = useState<string>('');
  const [socialMediaPlatform, setSocialMediaPlatform] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [hasEmailError, setHasEmailError] = useState(false);

  // Whether user has already filled out the old onboarding form (hide data collection)
  const [isExistingUser, setIsExistingUser] = useState<boolean>(false);
  // Force showing all fields for testing
  const [forceShowAllFields, setForceShowAllFields] = useState<boolean>(false);

  // Check for existing user on open.
  //
  // Defense-in-depth for issue #260: the dialog must remain interactive even
  // if the main process never answers. Race the IPC against a 3s timeout and
  // fall back to the new-user path on timeout. The mode-card click handlers
  // are pure local setState and do not depend on this result, so this fallback
  // strictly widens the "interactive" set of states. Logs timing so we can
  // see in nimbalyst-debug.log whether the IPC actually resolved.
  useEffect(() => {
    if (!isOpen) return;
    const t0 = performance.now();
    let cancelled = false;
    const checkExistingUser = async () => {
      try {
        const result = await Promise.race([
          window.electronAPI.invoke('onboarding:get').then((state) => ({ kind: 'ok' as const, state })),
          new Promise<{ kind: 'timeout' }>((resolve) => setTimeout(() => resolve({ kind: 'timeout' }), 3000)),
        ]);
        if (cancelled) return;
        const elapsed = Math.round(performance.now() - t0);
        if (result.kind === 'timeout') {
          console.warn(`[UnifiedOnboarding] onboarding:get timed out after ${elapsed}ms; using new-user fallback`);
          setIsExistingUser(false);
          return;
        }
        console.log(`[UnifiedOnboarding] onboarding:get resolved in ${elapsed}ms`);
        const hasExistingData = !!(result.state?.userRole && result.state.userRole !== 'skipped');
        setIsExistingUser(hasExistingData);
      } catch (error) {
        if (cancelled) return;
        console.error('[UnifiedOnboarding] onboarding:get failed:', error);
        setIsExistingUser(false);
      }
    };
    checkExistingUser();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDeveloperMode(null); // No selection by default
      setSelectedRole('');
      setCustomRole('');
      setReferralSource('');
      setCustomReferral('');
      setAiDetail('');
      setSearchDetail('');
      setSocialMediaPlatform('');
      setEmail('');
      setHasEmailError(false);
      setForceShowAllFields(false);
    }
  }, [isOpen]);

  // Expose test helpers for developer tools
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).__onboardingTestHelpers = {
        showAllFields: () => setForceShowAllFields(true),
        hideDataCollection: () => setForceShowAllFields(false),
        setIsExistingUser: (value: boolean) => setIsExistingUser(value),
      };
      console.log('[UnifiedOnboarding] Test helpers exposed: window.__onboardingTestHelpers');
    }
    return () => {
      if (import.meta.env.DEV) {
        delete (window as any).__onboardingTestHelpers;
      }
    };
  }, []);

  // Auto-select Software Developer role when Developer mode is selected
  const handleModeChange = (isDeveloper: boolean) => {
    setDeveloperMode(isDeveloper);
    if (isDeveloper) {
      setSelectedRole('developer');
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value && !isValidEmail(value)) {
      setHasEmailError(true);
    } else {
      setHasEmailError(false);
    }
  };

  const handleComplete = (intent: OnboardingIntent) => {
    // Append optional detail to referral sources that collect a follow-up answer.
    let finalReferralSource = referralSource || null;
    if (referralSource === 'social' && socialMediaPlatform) {
      finalReferralSource = `social:${socialMediaPlatform}`;
    } else if (referralSource === 'ai' && aiDetail.trim()) {
      finalReferralSource = `ai:${aiDetail.trim()}`;
    } else if (referralSource === 'search' && searchDetail.trim()) {
      finalReferralSource = `search:${searchDetail.trim()}`;
    } else if (referralSource === 'other' && customReferral.trim()) {
      finalReferralSource = `other:${customReferral.trim()}`;
    }

    const data: OnboardingData = {
      role: selectedRole || null,
      customRole: selectedRole === 'other' ? customRole.trim() || null : null,
      referralSource: finalReferralSource,
      email: email.trim() || null,
      developerMode: developerMode ?? false,
    };
    void onComplete(data, intent);
  };

  if (!isOpen) return null;

  // Determine if we should show data collection fields
  // forcedMode takes precedence over auto-detection
  let showDataCollection: boolean;
  if (forcedMode === 'new') {
    showDataCollection = true;
  } else if (forcedMode === 'existing') {
    showDataCollection = false;
  } else {
    showDataCollection = forceShowAllFields || !isExistingUser;
  }

  // Mode must be selected (required field)
  const isModeSelected = developerMode !== null;
  // Email validation (optional - only validate format if provided)
  const isEmailValid = email.trim() === '' || isValidEmail(email.trim());

  return (
    <div className="unified-onboarding-overlay">
      <div className="unified-onboarding-dialog unified-onboarding-single-screen">
        <div className="unified-onboarding-logo">
          <img src="./icon.png" alt="Nimbalyst" className="unified-onboarding-logo-image" />
        </div>
        <div className="unified-onboarding-header">
          <h2>{t('welcome')}</h2>
        </div>

        <div className="unified-onboarding-content">
          {/* Mode Selection - Always shown at top */}
          <div className="unified-onboarding-section">
            <label className="unified-onboarding-label unified-onboarding-label-centered">
              {t('choose_mode')}<span className="required-asterisk">*</span>
            </label>
            <div className="mode-selection">
              <label
                className={`mode-option ${developerMode === false ? 'selected' : ''}`}
                onClick={() => handleModeChange(false)}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={developerMode === false}
                  onChange={() => handleModeChange(false)}
                />
                <div className="mode-option-content">
                  <div className="mode-option-header">
                    <span className="material-symbols-outlined mode-option-icon">
                      edit_note
                    </span>
                    <span className="mode-option-title">{t('standard_mode')}</span>
                  </div>
                  <p className="mode-option-description">
                    {t('standard_desc')}
                  </p>
                </div>
              </label>

              <label
                className={`mode-option ${developerMode === true ? 'selected' : ''}`}
                onClick={() => handleModeChange(true)}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={developerMode === true}
                  onChange={() => handleModeChange(true)}
                />
                <div className="mode-option-content">
                  <div className="mode-option-header">
                    <span className="material-symbols-outlined mode-option-icon">
                      terminal
                    </span>
                    <span className="mode-option-title">{t('developer_mode')}</span>
                  </div>
                  <p className="mode-option-description">
                    {t('developer_desc')}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Divider between mode selection and data collection */}
          {showDataCollection && <div className="unified-onboarding-divider" />}

          {/* Data Collection Fields - Only shown for new users, grayed out until mode selected */}
          {showDataCollection && (
            <div className={`unified-onboarding-data-collection ${!isModeSelected ? 'disabled' : ''}`}>
              {/* Role Dropdown */}
              <div className="unified-onboarding-section">
                <label className="unified-onboarding-label" htmlFor="role-select">
                  {t('role_question')}
                </label>
                <select
                  id="role-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="unified-onboarding-select"
                  disabled={!isModeSelected}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(`role_options.${option.key}`)}
                    </option>
                  ))}
                </select>

                {selectedRole === 'other' && (
                  <div className="custom-role-input">
                    <input
                      id="custom-role-input"
                      type="text"
                      placeholder={t('custom_role_placeholder')}
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      className="unified-onboarding-input"
                      disabled={!isModeSelected}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Referral Source */}
              <div className="unified-onboarding-section">
                <label className="unified-onboarding-label" htmlFor="referral-select">
                  {t('referral_question')}
                </label>
                <select
                  id="referral-select"
                  value={referralSource}
                  onChange={(e) => {
                    setReferralSource(e.target.value);
                    if (e.target.value !== 'social') {
                      setSocialMediaPlatform('');
                    }
                    if (e.target.value !== 'other') {
                      setCustomReferral('');
                    }
                    if (e.target.value !== 'ai') {
                      setAiDetail('');
                    }
                    if (e.target.value !== 'search') {
                      setSearchDetail('');
                    }
                  }}
                  className="unified-onboarding-select"
                  disabled={!isModeSelected}
                >
                  {REFERRAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(`referral_options.${option.key}`)}
                    </option>
                  ))}
                </select>

                {referralSource === 'other' && (
                  <div className="custom-role-input">
                    <input
                      id="custom-referral-input"
                      type="text"
                      placeholder={t('custom_referral_placeholder')}
                      value={customReferral}
                      onChange={(e) => setCustomReferral(e.target.value)}
                      className="unified-onboarding-input"
                      disabled={!isModeSelected}
                      autoFocus
                    />
                  </div>
                )}

                {referralSource === 'ai' && (
                  <div className="custom-role-input">
                    <input
                      id="ai-detail-input"
                      type="text"
                      placeholder={t('ai_detail_placeholder')}
                      value={aiDetail}
                      onChange={(e) => setAiDetail(e.target.value)}
                      className="unified-onboarding-input"
                      disabled={!isModeSelected}
                      autoFocus
                    />
                  </div>
                )}

                {referralSource === 'search' && (
                  <div className="custom-role-input">
                    <input
                      id="search-detail-input"
                      type="text"
                      aria-label={t('search_detail_placeholder')}
                      placeholder={t('search_detail_placeholder')}
                      value={searchDetail}
                      onChange={(e) => setSearchDetail(e.target.value)}
                      className="unified-onboarding-input"
                      disabled={!isModeSelected}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="unified-onboarding-section">
                <label className="unified-onboarding-label" htmlFor="email-input">
                  {t('email')}
                </label>
                <p className="unified-onboarding-help-text">
                  {t('email_help')}
                </p>
                <input
                  id="email-input"
                  type="email"
                  placeholder={t('email_placeholder')}
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`unified-onboarding-input ${hasEmailError ? 'error' : ''}`}
                  disabled={!isModeSelected}
                />
                {hasEmailError && <p className="error-text">{t('invalid_email')}</p>}
              </div>

              {/* Social Media Platform - appears when social is selected */}
              {referralSource === 'social' && (
                <div className="unified-onboarding-section">
                  <label className="unified-onboarding-label" htmlFor="social-platform-select">
                    {t('social_question')}
                  </label>
                  <select
                    id="social-platform-select"
                    value={socialMediaPlatform}
                    onChange={(e) => setSocialMediaPlatform(e.target.value)}
                    className="unified-onboarding-select"
                    disabled={!isModeSelected}
                  >
                    <option value="">{t('select_one')}</option>
                    {SOCIAL_MEDIA_OPTIONS.map((platform) => (
                      <option key={platform.value} value={platform.value}>
                        {t(`social_options.${platform.key}`)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="unified-onboarding-disclaimer">
                <p className="disclaimer-text">
                  {t('disclaimer')}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="unified-onboarding-footer unified-onboarding-footer-single">
          <div className="unified-onboarding-footer-buttons">
            <button
              type="button"
              className="unified-onboarding-secondary-button"
              onClick={() => handleComplete('get-started')}
              disabled={!isModeSelected || (showDataCollection && !isEmailValid)}
            >
              {t('get_started_intent')}
            </button>
            <button
              type="button"
              className="unified-onboarding-submit"
              onClick={() => handleComplete('tutorial')}
              disabled={!isModeSelected || (showDataCollection && !isEmailValid)}
            >
              {t('start_tutorial')}
            </button>
          </div>
          <p className="unified-onboarding-legal-links">
            {t('continue_agree')}{' '}
            <a
              href="https://nimbalyst.com/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="unified-onboarding-link"
            >
              {t('terms')}
            </a>{' '}
            {t('and')}{' '}
            <a
              href="https://nimbalyst.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="unified-onboarding-link"
            >
              {t('privacy')}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
