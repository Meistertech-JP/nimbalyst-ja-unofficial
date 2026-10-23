import { useMemo } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import { resolveCreateAction, type CreateActionMode } from '../../shared/createActions';

/** The renderer owns display language; shared create dispatch stays locale-neutral. */
export function useLocalizedCreateAction(mode: CreateActionMode) {
  const { t } = useTranslation(['files', 'aichat', 'menu']);
  return useMemo(() => {
    const action = resolveCreateAction(mode);
    if (!action) return null;
    const labels = {
      file: t('files:sidebar.new_file_button'),
      session: t('aichat:session_dropdown.new_session_action'),
      sharedDoc: t('menu:top_bar.new_shared_doc'),
      trackerItem: t('menu:top_bar.new_item'),
    };
    return { ...action, label: labels[action.kind] };
  }, [mode, t]);
}
