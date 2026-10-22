import { useTranslation } from '@nimbalyst/i18n/react';

interface PanelHideButtonProps {
  onHide: () => void;
}

export function PanelHideButton({ onHide }: PanelHideButtonProps) {
  const { t } = useTranslation('git');
  return (
    <button
      type="button"
      className="git-log-action-btn git-log-hide-btn"
      onClick={onHide}
      title={t('supplemental.panel_hide.title')}
      aria-label={t('supplemental.panel_hide.aria_label')}
    >
      &minus;
    </button>
  );
}
