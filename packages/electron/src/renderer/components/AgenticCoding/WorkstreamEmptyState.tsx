import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useTranslation } from '@nimbalyst/i18n/react';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import { sessionListTitleAtom } from '../../store/atoms/sessions';
import { createNewSessionActionAtom } from '../../store/actions/sessionHistoryActions';

/**
 * Shown in place of the transcript when an empty workstream is selected. A
 * workstream is a container, so selecting it must never open it as a session.
 */
export function WorkstreamEmptyState({ workstreamId }: { workstreamId: string }) {
  const { t } = useTranslation('aichat');
  const title = useAtomValue(sessionListTitleAtom(workstreamId));
  const createNewSession = useSetAtom(createNewSessionActionAtom);
  return (
    <div className="workstream-empty-state flex flex-col items-center justify-center h-full gap-3 text-[var(--nim-text-muted)]">
      <MaterialSymbol icon="folder_open" size={32} />
      <p className="m-0 text-sm select-text">{t('workstream_empty_state.no_sessions', { title: title || t('workstream_empty_state.this_workstream') })}</p>
      <button
        onClick={() => void createNewSession({ launchSource: 'new_session_button', intoSelectedWorkstream: true })}
        className="workstream-empty-state-new py-2 px-4 rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)] text-[var(--nim-text)] cursor-pointer text-sm transition-colors hover:bg-[var(--nim-bg-hover)]"
      >
        {t('workstream_empty_state.new_session')}
      </button>
    </div>
  );
}
