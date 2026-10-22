import { requestConfirmation } from '../../dialogs/requestConfirmation';
import type { TFunction } from 'i18next';

/** The host confirm the runtime tracker table and row menu call before deleting items. */
export function confirmTrackerItemDelete(
  itemCount: number,
  translate?: TFunction<'tracker'>,
): Promise<boolean> {
  const titleKey = itemCount > 1 ? 'kanban.delete_title_other' : 'kanban.delete_title_one';
  const messageKey = itemCount > 1 ? 'kanban.delete_confirm_other' : 'kanban.delete_confirm_one';
  const fallbackTitle = itemCount > 1 ? 'Delete items?' : 'Delete item?';
  const fallbackMessage = `Delete ${itemCount} item${itemCount > 1 ? 's' : ''}? This cannot be undone.`;
  const translatedTitle = translate?.(titleKey);
  const translatedMessage = translate?.(messageKey, { count: itemCount });
  const translatedConfirmLabel = translate?.('kanban.delete');

  return requestConfirmation({
    title: translatedTitle && translatedTitle !== titleKey ? translatedTitle : fallbackTitle,
    message: translatedMessage && translatedMessage !== messageKey ? translatedMessage : fallbackMessage,
    confirmLabel: translatedConfirmLabel && translatedConfirmLabel !== 'kanban.delete'
      ? translatedConfirmLabel
      : 'Delete',
    destructive: true,
  });
}
