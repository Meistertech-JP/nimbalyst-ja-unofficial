import React from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';

class LoadBoundary extends React.Component<{
  children: React.ReactNode;
  title: string;
  message: string;
  closeLabel: string;
  onClose: () => void;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="dialog-load-error nim-overlay" role="dialog" aria-modal="true" aria-label={this.props.title}>
        <div className="rounded-lg p-5 bg-nim text-nim border border-nim shadow-lg">
          <h3>{this.props.title}</h3>
          <p role="alert">{this.props.message}</p>
          <button type="button" className="nim-btn-secondary" onClick={this.props.onClose}>{this.props.closeLabel}</button>
        </div>
      </div>
    );
  }
}

/** Keep a rejected lazy import inside its dialog, so the workspace remains usable. */
export function DialogLoadBoundary({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const { t } = useTranslation('dialogs');
  return (
    <LoadBoundary title={t('error.generic_title')} message={t('error.unknown_error')} closeLabel={t('close', { ns: 'common' })} onClose={onClose}>
      {children}
    </LoadBoundary>
  );
}
