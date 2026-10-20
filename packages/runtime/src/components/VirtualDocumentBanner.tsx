import React from 'react';
import { useRuntimeTranslation } from '../ui/RuntimeTranslation';
import './VirtualDocumentBanner.css';

interface VirtualDocumentBannerProps {
  onDismiss?: () => void;
}

export function VirtualDocumentBanner({ onDismiss }: VirtualDocumentBannerProps) {
  const { t } = useRuntimeTranslation();
  return (
    <div className="virtual-document-banner">
      <div className="virtual-document-banner-content">
        <span className="virtual-document-banner-icon">ⓘ</span>
        <span className="virtual-document-banner-text">
          {t('editor:shared_ui.welcome_read_only', 'This is a read-only welcome document. Changes will not be saved.')}
        </span>
        {onDismiss && (
          <button
            className="virtual-document-banner-dismiss"
            onClick={onDismiss}
            aria-label={t('common:dismiss', 'Dismiss')}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
