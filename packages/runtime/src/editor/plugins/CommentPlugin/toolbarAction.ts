import type { LexicalEditor } from 'lexical';

import type { CommentsConfig } from '../../commenting/types';
import type { FloatingTextToolbarAction } from '../FloatingTextFormatToolbarPlugin/types';
import { OPEN_COMMENT_COMPOSER_COMMAND } from './commands';
import { runtimeEnglishTranslation, type RuntimeTranslate } from '../../../ui/RuntimeTranslation';

export function getCommentToolbarActions(
  comments: CommentsConfig | undefined,
  editor: Pick<LexicalEditor, 'dispatchCommand'>,
  t: RuntimeTranslate = runtimeEnglishTranslation,
): FloatingTextToolbarAction[] {
  if (!comments) return [];

  return [
    {
      id: 'comment',
      label: t('common:pull_request.add_comment', 'Add comment'),
      icon: 'add_comment',
      onSelect: () => {
        editor.dispatchCommand(OPEN_COMMENT_COMPOSER_COMMAND, undefined);
      },
    },
  ];
}
