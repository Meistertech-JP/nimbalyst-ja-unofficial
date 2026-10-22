/**
 * DocUnreadDot — the 8px "unread" dot shown on a shared-doc sidebar row.
 * Mirrors the tracker/session unread dot (filled circle in `--nim-primary`).
 * Reads `docUnreadAtom(documentId)` so only the affected row re-renders.
 */

import React from 'react';
import { useAtomValue } from 'jotai';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import { useTranslation } from '@nimbalyst/i18n/react';
import { useCollabDocsUI } from './CollabDocsUIProvider';

export interface DocUnreadDotProps {
  documentId: string;
  className?: string;
}

export const DocUnreadDot: React.FC<DocUnreadDotProps> = ({ documentId, className }) => {
  const { t } = useTranslation('common');
  const { session } = useCollabDocsUI();
  const unread = useAtomValue(session.atoms.unreadDocument(documentId));
  if (!unread) return null;
  return (
    <span
      className={`doc-unread-dot inline-flex items-center justify-center shrink-0 text-[var(--nim-primary)]${
        className ? ` ${className}` : ''
      }`}
      title={t('collab.new_activity')}
      aria-label={t('collab.unread')}
    >
      <MaterialSymbol icon="circle" size={8} fill />
    </span>
  );
};
