/**
 * The top of a plain page, laid out like a typed page's: the title, then the
 * same type row (`TrackerTypeRow`). A plain page's type is "Page", with its
 * own small set of fields (`pageFields.ts`: status, owner, summary) kept on
 * the document. The "Page" chip offers another type through Set type.
 *
 * Presentational: the host saves the title and fields and runs Set type.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { FieldDefinition } from '@nimbalyst/tracker-schema';
import { TrackerTypeRow } from '@nimbalyst/runtime/plugins/TrackerPlugin/components/TrackerTypeRow';
import type { TeamMemberOption } from '@nimbalyst/runtime/plugins/TrackerPlugin/components/TrackerFieldEditor';
import { PAGE_HEADER_FIELDS, type PageFields } from '../../docs/pageFields';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import { sanitizeTitleInput, useAutoSizedTitle } from './trackerTitleAutoSize';
import { PageFacts, type PageFact } from './PageFacts';
import './TrackerPageView.css';

export interface PlainPageHeaderProps {
  title: string;
  editable: boolean;
  /** Called once the title is committed (Enter or blur), only when it changed. */
  onRename?: (title: string) => void;
  /** Absent where the page cannot get a type here. */
  onSetType?: () => void;
  /** Read-only facts at the end of the row (updated, created). */
  facts?: readonly PageFact[];
  /** The page's own fields. */
  fields?: PageFields;
  /** Saves one field; null clears it. Absent where fields can't be written. */
  onUpdateField?: (name: keyof PageFields, value: unknown) => void;
  teamMembers?: TeamMemberOption[];
}

const NO_FIELDS: PageFields = {};

export const PlainPageHeader: React.FC<PlainPageHeaderProps> = ({
  title,
  editable,
  onRename,
  onSetType,
  facts = [],
  fields = NO_FIELDS,
  onUpdateField,
  teamMembers,
}) => {
  const { t } = useTranslation('tracker');
  const pageHeaderFields = PAGE_HEADER_FIELDS.map((field) => field.name === 'status'
    ? {
      ...field,
      options: field.options?.map((option) => ({
        ...option,
        label: t(`page_status.${option.value}`),
      })),
    }
    : field);
  const handleSaveField = useCallback(
    (field: FieldDefinition, value: unknown) => onUpdateField?.(field.name as keyof PageFields, value),
    [onUpdateField],
  );
  const [draft, setDraft] = useState(title);
  const editing = useRef(false);
  // A rename elsewhere (the tree, a collaborator) shows unless this field is being typed in.
  useEffect(() => {
    if (!editing.current) setDraft(title);
  }, [title]);
  const titleRef = useAutoSizedTitle(draft);
  const commit = () => {
    editing.current = false;
    const next = draft.trim();
    if (!next) {
      setDraft(title);
      return;
    }
    if (next !== title) onRename?.(next);
  };

  return (
    <div className="plain-page-header tracker-page-view-header tracker-page-view-header--bar" data-testid="plain-page-header">
      {editable && onRename ? (
        <textarea
          ref={titleRef}
          rows={1}
          value={draft}
          onFocus={() => { editing.current = true; }}
          onChange={(e) => setDraft(sanitizeTitleInput(e.target.value))}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setDraft(title);
              editing.current = false;
              e.currentTarget.blur();
            }
          }}
          className="tracker-page-view-title m-0 mb-3 w-full resize-none overflow-hidden break-words border-none bg-transparent p-0 text-[28px] font-medium leading-tight text-nim outline-none placeholder:text-nim-faint"
          placeholder={t('inline.untitled')}
          data-testid="plain-page-title"
        />
      ) : (
        <h1 className="tracker-page-view-title m-0 mb-3 break-words text-[28px] font-medium leading-tight text-nim select-text">{title || t('collaboration_surface.untitled')}</h1>
      )}
      <TrackerTypeRow
        typeId="page"
        fields={pageHeaderFields}
        values={fields as Record<string, unknown>}
        editable={editable && Boolean(onUpdateField)}
        onSaveField={handleSaveField}
        teamMembers={teamMembers}
        testIdBase="plain-page"
        className="border-b border-nim pb-3"
        typeChip={(
          <button
            type="button"
            className="plain-page-type tracker-page-view-type inline-flex items-center gap-1 rounded border-none bg-nim-tertiary px-1.5 py-0.5 text-xs font-medium text-nim-muted enabled:cursor-pointer enabled:hover:text-nim"
            title={onSetType ? t('collaboration_surface.page_type_title') : t('collaboration_surface.page')}
            disabled={!onSetType}
            onClick={onSetType}
            data-testid="plain-page-type"
          >
            <MaterialSymbol icon="description" size={13} />
            {t('collaboration_surface.page')}
          </button>
        )}
        end={<PageFacts facts={facts} />}
      />
    </div>
  );
};
