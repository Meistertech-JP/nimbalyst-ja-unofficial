import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UnifiedOnboarding,
  type OnboardingData,
  type OnboardingIntent,
} from '../UnifiedOnboarding/UnifiedOnboarding';
import { persistOnboardingCompletion } from '../../utils/onboardingCompletion';
import { WorkspaceManager } from './WorkspaceManager';
import { ErrorToastContainer } from '../ErrorToast/ErrorToast';

export interface WorkspaceManagerOnboardingProps {
  showOnboarding: boolean;
  safeMode?: boolean;
}

export const WorkspaceManagerOnboarding: React.FC<WorkspaceManagerOnboardingProps> = ({
  showOnboarding,
  safeMode = false,
}) => {
  const { t } = useTranslation('onboarding');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(showOnboarding);

  const handleComplete = useCallback(async (
    data: OnboardingData,
    intent: OnboardingIntent,
  ) => {
    await persistOnboardingCompletion(data);
    setIsOnboardingOpen(false);

    if (intent === 'tutorial') {
      // The overlay is already gone, so a rejection here would strand the user
      // on the project screen with no explanation (and an unhandled rejection).
      // Land them there deliberately instead — the welcome card's own CTA
      // retries and surfaces the error properly.
      try {
        const result = await window.electronAPI.tutorial.start('onboarding');
        if (!result.success) {
          console.error('Failed to start tutorial from onboarding:', result.error);
        }
      } catch (error) {
        console.error('Failed to start tutorial from onboarding:', error);
      }
    }
  }, []);

  return (
    <>
      {safeMode && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 border-b border-[var(--nim-warning)] bg-[var(--nim-bg-secondary)] px-4 py-2 text-sm text-[var(--nim-text)]">
          <strong>{t('safe_mode_banner.label')}</strong>
          <span>
            {t('safe_mode_banner.message_before_command')}{' '}
            <code>--safe-mode</code>{t('safe_mode_banner.message_after_command')}
          </span>
        </div>
      )}
      <WorkspaceManager />
      {/* Deep links main could not route are shown here when no project is
          open (`initDeepLinkNoticeListeners`, started in index.tsx). */}
      <ErrorToastContainer />
      {isOnboardingOpen && (
        <UnifiedOnboarding
          isOpen
          onComplete={handleComplete}
          onSkip={() => {}}
          forcedMode="new"
        />
      )}
    </>
  );
};
