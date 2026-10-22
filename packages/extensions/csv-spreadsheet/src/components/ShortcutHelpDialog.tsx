/**
 * Keyboard shortcut sheet (Cmd+/ or Ctrl+/). Lists what the grid key
 * controller and sheet shortcuts handle, with the platform's modifier name.
 */

import { useEffect, useRef } from 'react';
import { SHORTCUT_SHEET } from '../keyboard/sheetShortcuts';
import { useTranslation } from '@nimbalyst/i18n/react';

const GROUP_KEYS: Record<string, string> = {
  Navigate: 'group_navigate', Edit: 'group_edit', Clipboard: 'group_clipboard', Format: 'group_format',
};

const ACTION_KEYS: Record<string, string> = {
  'Move': 'move',
  'Jump to the edge of the data': 'jump_edge',
  'Extend the selection': 'extend',
  'Start / end of the row': 'row_start_end',
  'First cell / last used cell': 'first_last_cell',
  'Move by a page': 'move_page',
  'Select rows / columns': 'select_rows_cols',
  'Select all': 'select_all',
  'Edit the cell': 'edit_cell',
  'Commit and move down / right': 'commit_move',
  'Cancel the edit': 'cancel_edit',
  'New line in the cell': 'new_line',
  'Fill the selection with the value being typed': 'fill_typed',
  'Fill down / right': 'fill_down_right',
  'Clear the selection': 'clear_selection',
  "Insert today's date": 'insert_date',
  'Insert or edit a link': 'insert_link',
  'Undo / redo': 'undo_redo',
  'Copy / cut / paste': 'copy_cut_paste',
  'Paste values only': 'paste_values',
  'Bold / italic / underline': 'bold_italic_underline',
  'Currency': 'currency',
  'Percent': 'percent',
  'Number': 'number',
  'Show this list': 'show_list',
};

export function ShortcutHelpDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation('editor');
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen) panelRef.current?.focus();
  }, [isOpen]);
  if (!isOpen) return null;
  const mod = /mac/i.test(navigator.platform) ? 'Cmd' : 'Ctrl';

  return (
    <div className="csv-shortcut-dialog fixed inset-0 bg-black/40 flex items-center justify-center z-[2000]" onClick={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-label={t('spreadsheet_ui.shortcuts.title')}
        className="bg-nim border border-nim rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.24)] w-[560px] max-h-[80vh] overflow-auto outline-none"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-nim">
          <h3 className="m-0 text-base font-semibold text-nim">{t('spreadsheet_ui.shortcuts.title')}</h3>
          <button className="bg-none border-none text-xl text-nim-muted cursor-pointer p-0 leading-none hover:text-nim" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-4 select-text">
          {SHORTCUT_SHEET.map(({ group, items }) => (
            <section key={group}>
              <h4 className="m-0 mb-2 text-[12px] font-semibold uppercase text-nim-muted">{GROUP_KEYS[group] ? t(`spreadsheet_ui.shortcuts.${GROUP_KEYS[group]}`) : group}</h4>
              <dl className="m-0 flex flex-col gap-1">
                {items.map(([keys, action]) => (
                  <div key={keys} className="flex justify-between gap-3 text-[12px]">
                    <dt className="text-nim">{ACTION_KEYS[action] ? t(`spreadsheet_ui.shortcuts.${ACTION_KEYS[action]}`) : action}</dt>
                    <dd className="m-0 text-nim-muted whitespace-nowrap">{keys.replace(/mod/g, mod)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
