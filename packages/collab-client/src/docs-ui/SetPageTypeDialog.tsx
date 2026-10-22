/**
 * The type picker for "Set type" on a page: the section's own creatable types,
 * singular names, one click to convert. The resolver says which types take
 * new pages, so this bundle never reads the tracker registry.
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { CollabTypeTreeResolver } from '../docs/collabTree';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';

export interface SetPageTypeDialogProps {
  pageTitle: string;
  resolver: CollabTypeTreeResolver;
  running: boolean;
  onPick: (typeId: string) => void;
  onClose: () => void;
  /** Open "New type..." in this section; absent where the host cannot write a type. */
  onNewType?: () => void;
}

export function SetPageTypeDialog({ pageTitle, resolver, running, onPick, onClose, onNewType }: SetPageTypeDialogProps) {
  const { t } = useTranslation('collabSidebar');
  const types = (resolver.listedTypes?.() ?? [])
    .filter((type) => type.creatable !== false)
    .map((type) => ({ ...type, label: resolver.typeLabel?.(type.typeId) ?? type.name }));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !running) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, running]);

  return createPortal(
    <div
      className="set-page-type-dialog fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      onClick={() => { if (!running) onClose(); }}
      data-testid="set-page-type-dialog"
    >
      <div
        className="w-[360px] max-w-[92vw] max-h-[70vh] flex flex-col bg-nim border border-nim rounded-lg shadow-xl overflow-hidden"
        role="dialog"
        aria-label={t('set_page_type_dialog.title')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 pt-3 pb-2 border-b border-nim">
          <div className="text-sm font-medium text-nim truncate">
            {t('set_page_type_dialog.heading', { pageTitle: pageTitle || t('list.untitled') })}
          </div>
          <div className="text-xs text-nim-faint mt-0.5">{t('set_page_type_dialog.description')}</div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {types.length === 0 ? (
            <div className="px-4 py-3 text-xs text-nim-faint">
              {onNewType ? t('set_page_type_dialog.empty_create') : t('set_page_type_dialog.empty')}
            </div>
          ) : null}
          {types.map((type) => (
            <button
              key={type.typeId}
              type="button"
              disabled={running}
              className="set-page-type-option w-full flex items-center gap-2 px-4 py-1.5 text-left text-sm text-nim hover:bg-nim-hover disabled:opacity-50"
              onClick={() => onPick(type.typeId)}
              data-testid={`set-page-type-option-${type.typeId}`}
            >
              <MaterialSymbol icon={type.icon || 'label'} size={16} />
              <span className="truncate">{type.label}</span>
            </button>
          ))}
          {onNewType ? (
            <button
              type="button"
              disabled={running}
              className="set-page-type-new w-full flex items-center gap-2 px-4 py-1.5 text-left text-sm text-nim-muted hover:text-nim hover:bg-nim-hover disabled:opacity-50"
              onClick={onNewType}
              data-testid="set-page-type-new-type"
            >
              <MaterialSymbol icon="add" size={16} />
              <span className="truncate">{t('set_page_type_dialog.new_type')}</span>
            </button>
          ) : null}
        </div>
        <div className="px-4 py-2 border-t border-nim flex items-center justify-between">
          <span className="text-xs text-nim-faint">{running ? t('set_page_type_dialog.setting') : ''}</span>
          <button
            type="button"
            disabled={running}
            className="text-xs text-nim-muted hover:text-nim disabled:opacity-50"
            onClick={onClose}
          >
            {t('set_page_type_dialog.cancel')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
