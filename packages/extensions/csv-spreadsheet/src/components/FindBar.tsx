/**
 * Find / find-and-replace bar.
 *
 * Visual language follows the host's Lexical search bar: a fixed strip under
 * the formula bar rather than a floating overlay, same input/button styles,
 * same "3 of 17" / "No results" counter states.
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { SpreadsheetFind } from '../hooks/useSpreadsheetFind';
import { shouldIsolateFromGrid } from '../editors/editorKeyActions';

const INPUT_CLASS =
  'w-full px-2.5 py-1.5 text-[13px] border border-nim rounded bg-nim text-nim outline-none transition-colors duration-150 focus:border-[var(--nim-primary)] placeholder:text-nim-faint';
const NAV_BUTTON_CLASS =
  'bg-transparent border border-nim rounded w-6 h-6 flex items-center justify-center cursor-pointer text-nim p-0 transition-colors duration-150 hover:enabled:bg-nim-hover disabled:opacity-40 disabled:cursor-not-allowed';
const ACTION_BUTTON_CLASS =
  'px-2 py-1 text-[12px] whitespace-nowrap bg-transparent border border-nim rounded cursor-pointer text-nim-muted transition-colors duration-150 hover:enabled:bg-nim-hover hover:enabled:text-nim disabled:opacity-40 disabled:cursor-not-allowed';

function toggleClass(active: boolean): string {
  return `${ACTION_BUTTON_CLASS} ${active ? 'bg-[var(--nim-primary)] border-[var(--nim-primary)] text-white' : ''}`;
}

const CHEVRON_PATHS = {
  up: 'M3 7.5L6 4.5L9 7.5',
  down: 'M3 4.5L6 7.5L9 4.5',
  right: 'M4.5 3L7.5 6L4.5 9',
} as const;

function Chevron({ direction }: { direction: keyof typeof CHEVRON_PATHS }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d={CHEVRON_PATHS[direction]}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * `readOnly` keeps find (navigation only) and drops replace. Used during diff
 * review, where any write would land against phantom-row-shifted indices.
 */
export function FindBar({ find, readOnly = false }: { find: SpreadsheetFind; readOnly?: boolean }) {
  const { t } = useTranslation('editor');
  const queryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queryInputRef.current?.select();
  }, [find.showReplace]);

  /** Escape closes from either input; Enter steps, matching the host's bar. */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Typing a query is not grid input -- see `shouldIsolateFromGrid`. Without
    // this, Backspace in the find field clears the selected cells.
    if (shouldIsolateFromGrid(event)) event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      find.close();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      find.step(event.shiftKey ? 'previous' : 'next');
    }
  };

  const noMatches = find.cursor.count === 0;
  const counterText = find.cursor.count > 0
    ? t('spreadsheet_find.match_position', { current: find.cursor.index + 1, count: find.cursor.count })
    : find.query ? t('spreadsheet_find.no_results') : '';

  return (
    <div className="csv-find-bar flex flex-col gap-2 px-3 py-2 bg-nim-secondary border-b border-nim">
      <div className="csv-find-bar-row flex items-center gap-2">
        {/* Leading chevron expands the replace row, so the only button reading
            "Replace" is the one that actually replaces. Read-only keeps the
            slot so the find input stays aligned with the formula bar above. */}
        {readOnly ? (
          <span className={`${NAV_BUTTON_CLASS} invisible`} aria-hidden="true" />
        ) : (
          <button
            className={NAV_BUTTON_CLASS}
            onClick={find.toggleReplace}
            aria-label={t('spreadsheet_find.toggle_replace')}
            aria-expanded={find.showReplace}
            title={t('spreadsheet_find.toggle_replace')}
          >
            <Chevron direction={find.showReplace ? 'down' : 'right'} />
          </button>
        )}
        <input
          ref={queryInputRef}
          className={INPUT_CLASS}
          value={find.query}
          onChange={(event) => find.setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('spreadsheet_find.find_in_sheet')}
          aria-label={t('spreadsheet_find.find')}
          autoFocus
        />
        <span className="csv-find-count text-[13px] text-nim-muted min-w-20 text-center select-none">
          {counterText}
        </span>
        <button
          className={NAV_BUTTON_CLASS}
          onClick={() => find.step('previous')}
          disabled={noMatches}
          aria-label={t('spreadsheet_find.previous_match')}
          title={t('spreadsheet_find.previous_match_shortcut')}
        >
          <Chevron direction="up" />
        </button>
        <button
          className={NAV_BUTTON_CLASS}
          onClick={() => find.step('next')}
          disabled={noMatches}
          aria-label={t('spreadsheet_find.next_match')}
          title={t('spreadsheet_find.next_match_shortcut')}
        >
          <Chevron direction="down" />
        </button>
        <button
          className={toggleClass(find.caseSensitive)}
          onClick={() => find.setCaseSensitive(!find.caseSensitive)}
          title={t('spreadsheet_find.match_case')}
        >
          Aa
        </button>
        <button
          className={toggleClass(find.wholeCell)}
          onClick={() => find.setWholeCell(!find.wholeCell)}
          title={t('spreadsheet_find.match_entire_cell')}
        >
          {t('spreadsheet_find.cell')}
        </button>
        <button className={ACTION_BUTTON_CLASS} onClick={find.close} title={t('spreadsheet_find.close_shortcut')} aria-label={t('spreadsheet_find.close_find')}>
          &#10005;
        </button>
      </div>

      {find.showReplace && !readOnly && (
        <div className="csv-find-bar-row csv-find-replace-row flex items-center gap-2">
          {/* Keeps the replace input aligned under the find input. */}
          <span className={`${NAV_BUTTON_CLASS} invisible`} aria-hidden="true" />
          <input
            className={INPUT_CLASS}
            value={find.replacement}
            onChange={(event) => find.setReplacement(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('spreadsheet_find.replace_with')}
            aria-label={t('spreadsheet_find.replace_with')}
          />
          <button className={ACTION_BUTTON_CLASS} onClick={find.replaceCurrent} disabled={noMatches}>
            {t('spreadsheet_find.replace')}
          </button>
          <button className={ACTION_BUTTON_CLASS} onClick={() => find.replaceAll('sheet')} disabled={noMatches}>
            {t('spreadsheet_find.replace_all')}
          </button>
          <button
            className={`csv-find-replace-selection ${ACTION_BUTTON_CLASS}`}
            onClick={() => find.replaceAll('selection')}
            disabled={noMatches || !find.hasSelection}
            title={t('spreadsheet_find.replace_in_selection')}
          >
            {t('spreadsheet_find.in_selection')}
          </button>
        </div>
      )}
    </div>
  );
}
