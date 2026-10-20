import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {INSERT_BOARD_COMMAND, INSERT_CONFIGURED_BOARD_COMMAND, bindKanbanTranslation} from './BoardCommands';
import { BoardConfigDialog, BoardConfig } from './BoardConfigDialog';
import { useRuntimeTranslation } from '../../../ui/RuntimeTranslation';
// import { Button } from 'primereact/button';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faColumns, faCog } from '@fortawesome/pro-light-svg-icons';

export function BoardToolbar(): JSX.Element {
  const { t } = useRuntimeTranslation();
  const [editor] = useLexicalComposerContext();
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  useEffect(() => bindKanbanTranslation(editor, t), [editor, t]);

  const insertKanbanBoard = () => {
    editor.dispatchCommand(INSERT_BOARD_COMMAND, undefined);
  };

  const insertEntityBoard = () => {
    setShowConfigDialog(true);
  };

  const handleBoardConfigured = (config: BoardConfig) => {
    editor.dispatchCommand(INSERT_CONFIGURED_BOARD_COMMAND, { config });
    setShowConfigDialog(false);
  };

  return (
    <>
      <div className="kanban-toolbar flex gap-2">
        <button
          onClick={insertKanbanBoard}
          className="flex align-items-center gap-2 p-button-secondary p-button-outlined p-button-sm"
        >
          {t('editor:kanban.insert_basic', 'Insert Basic Board')}
        </button>
        
        <button
          onClick={insertEntityBoard}
          className="flex align-items-center gap-2 p-button-primary p-button-sm"
        >
          {t('editor:kanban.insert_entity', 'Insert Entity Board')}
        </button>
      </div>

      <BoardConfigDialog
        visible={showConfigDialog}
        onHide={() => setShowConfigDialog(false)}
        onSelect={handleBoardConfigured}
      />
    </>
  );
}
