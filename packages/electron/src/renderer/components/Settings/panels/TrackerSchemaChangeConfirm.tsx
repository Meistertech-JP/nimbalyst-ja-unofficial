import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import type {
  TrackerSchemaBlastRadiusEntry,
  TrackerSchemaChangeGateVerdict,
  TrackerSchemaDestructiveConfirmCopy,
} from '@nimbalyst/tracker-schema';

/** Shape of the `tracker-schema:preview-change` result. */
export interface TrackerSchemaChangePreview {
  classification: 'none' | 'additive' | 'destructive';
  verdict: TrackerSchemaChangeGateVerdict;
  blastRadiusText: string;
  copy?: TrackerSchemaDestructiveConfirmCopy;
}

/**
 * The confirm for a destructive tracker schema change. It exists to answer two
 * questions before anything is applied: how much of your data this reaches, and
 * whether the removal is really a rename.
 *
 * There is no "delete the values" choice, and that is deliberate: retiring a
 * field leaves its values in the store untouched, so nothing here can destroy
 * data. Deleting item data is a separate, deliberate act and is not offered from
 * a schema edit.
 */
export function TrackerSchemaChangeConfirm({
  preview,
  pending,
  onApply,
  onCancel,
}: {
  preview: TrackerSchemaChangePreview | null;
  pending?: boolean;
  onApply: (optionId: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('tracker');
  const copy = preview?.copy;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(copy?.options[0]?.id ?? null);
  }, [copy]);

  if (!preview || !copy) return null;

  const blockedOnAdmin =
    !preview.verdict.allowed && preview.verdict.reason === 'requires-admin';

  return (
    <div className="nim-overlay tracker-schema-change-confirm-overlay" onClick={onCancel}>
      <div
        className="tracker-schema-change-confirm nim-modal min-w-[440px] max-w-[560px] p-6"
        data-testid="tracker-schema-change-confirm"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="m-0 mb-3 text-lg font-semibold text-nim">
          {copy.presentation.isTeam
            ? t('schema_change_confirm.title_team', {
              trackerName: copy.presentation.trackerName,
              teamName: copy.presentation.teamName || t('schema_change_confirm.your_team'),
            })
            : t('schema_change_confirm.title_personal', {
              trackerName: copy.presentation.trackerName,
            })}
        </h2>

        <div
          className="tracker-schema-blast-radius flex items-start gap-2 mb-3 px-3 py-2 rounded bg-[var(--nim-bg-tertiary)]"
          data-testid="tracker-schema-blast-radius"
        >
          <MaterialSymbol icon="database" size={16} className="mt-[2px] text-[var(--nim-text-muted)]" />
          <span className="text-[13px] text-nim leading-relaxed">
            {describeLocalizedBlastRadius(copy.presentation.blastRadius, t)}
          </span>
        </div>

        <p className="m-0 mb-4 text-sm text-nim-muted leading-relaxed">
          {copy.presentation.isTeam
            ? t('schema_change_confirm.message_team')
            : t('schema_change_confirm.message_personal')}
        </p>

        {blockedOnAdmin ? (
          <p
            className="tracker-schema-admin-required m-0 mb-5 text-sm text-nim leading-relaxed"
            data-testid="tracker-schema-admin-required"
          >
            {t('schema_change_confirm.admin_required')}
          </p>
        ) : (
          <div className="tracker-schema-change-options flex flex-col gap-2 mb-5">
            {copy.options.map((option) => (
              <label
                key={option.id}
                className={`flex items-start gap-2.5 px-3 py-2.5 rounded border cursor-pointer ${
                  selectedId === option.id
                    ? 'border-[var(--nim-primary)] bg-[var(--nim-bg-tertiary)]'
                    : 'border-[var(--nim-border)]'
                }`}
              >
                <input
                  type="radio"
                  name="tracker-schema-change-option"
                  className="mt-[3px]"
                  checked={selectedId === option.id}
                  onChange={() => setSelectedId(option.id)}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-nim">
                    {option.kind === 'rename' && option.rename
                      ? t('schema_change_confirm.rename_label', {
                        previousName: option.rename.previousFieldName,
                        nextName: option.rename.nextFieldName,
                      })
                      : copy.presentation.removedFields.length > 0
                        ? t('schema_change_confirm.retire_fields_label', {
                          fields: copy.presentation.removedFields
                            .map((name) => `\`${name}\``)
                            .join(t('schema_change_confirm.field_separator')),
                        })
                        : t('schema_change_confirm.apply_change_label')}
                  </span>
                  <span className="block text-[12px] text-nim-muted leading-relaxed">
                    {option.kind === 'rename' && option.rename
                      ? t('schema_change_confirm.rename_description', {
                        previousName: option.rename.previousFieldName,
                      })
                      : copy.presentation.removedFields.length > 0
                        ? t('schema_change_confirm.retire_fields_description')
                        : t('schema_change_confirm.apply_change_description')}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button className="nim-btn-secondary" onClick={onCancel}>
            {blockedOnAdmin ? t('schema_change_confirm.close') : t('schema_change_confirm.cancel')}
          </button>
          {!blockedOnAdmin && (
            <button
              className="nim-btn-primary"
              data-testid="tracker-schema-change-apply"
              disabled={pending || !selectedId}
              onClick={() => selectedId && onApply(selectedId)}
            >
              {pending ? t('schema_change_confirm.working') : t('schema_change_confirm.apply')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function describeLocalizedBlastRadius(
  entries: readonly TrackerSchemaBlastRadiusEntry[],
  t: (key: string, options?: Record<string, string | number>) => string,
): string {
  const clauses = entries.flatMap(({ change, affectedItemCount: count }) => {
    switch (change.kind) {
      case 'field-removed':
      case 'field-type-changed':
      case 'constraint-narrowed':
      case 'field-definition-changed':
        return [t(count === 0
          ? 'schema_change_confirm.blast_no_items_have'
          : count === 1
            ? 'schema_change_confirm.blast_one_item_has'
            : 'schema_change_confirm.blast_items_have', {
          count,
          name: change.fieldName,
        })];
      case 'status-removed':
        return [t(count === 0
          ? 'schema_change_confirm.blast_no_items_in'
          : count === 1
            ? 'schema_change_confirm.blast_one_item_in'
            : 'schema_change_confirm.blast_items_in', {
          count,
          value: change.option.value,
        })];
      case 'select-option-removed':
        return [t(count === 0
          ? 'schema_change_confirm.blast_no_items_use'
          : count === 1
            ? 'schema_change_confirm.blast_one_item_use'
            : 'schema_change_confirm.blast_items_use', {
          count,
          value: change.option.value,
        })];
      case 'workflow-status-field-changed':
        return change.previousFieldName
          ? [t(count === 0
            ? 'schema_change_confirm.blast_no_items_have'
            : count === 1
              ? 'schema_change_confirm.blast_one_item_has'
              : 'schema_change_confirm.blast_items_have', {
            count,
            name: change.previousFieldName,
          })]
          : [];
    }
  });
  if (clauses.length === 0) return t('schema_change_confirm.blast_none_affected');
  return `${clauses.join('；')}。`;
}
