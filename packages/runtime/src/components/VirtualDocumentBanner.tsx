import React from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import './VirtualDocumentBanner.css';

interface VirtualDocumentBannerProps {
  onDismiss?: () => void;
}

export function VirtualDocumentBanner({ onDismiss }: VirtualDocumentBannerProps) {
  const { t } = useTranslation('common');

  return (
    <div className="virtual-document-banner">
      <div className="virtual-document-banner-content">
        <span className="virtual-document-banner-icon">ⓘ</span>
        <span className="virtual-document-banner-text">
          {t('virtual_document_banner.read_only_notice')}
        </span>
        {onDismiss && (
          <button
            className="virtual-document-banner-dismiss"
            onClick={onDismiss}
            aria-label={t('dismiss')}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
