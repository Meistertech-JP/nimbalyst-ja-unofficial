import React from 'react';
import type { LexicalEditor } from 'lexical';
import { SearchReplaceBar } from '@nimbalyst/runtime/plugins/SearchReplace/SearchReplaceBar';
import { SearchReplaceStateManager } from '@nimbalyst/runtime/plugins/SearchReplace/SearchReplaceStateManager';

/** Loaded only after the host's first find request. */
export default function BrowserFind({ findId, editor, requests }: { findId: string; editor: LexicalEditor; requests: number }): React.JSX.Element {
  React.useEffect(() => {
    SearchReplaceStateManager.openAndFocus(findId);
  }, [findId, requests]);
  React.useEffect(() => () => SearchReplaceStateManager.clearState(findId), [findId]);
  return <SearchReplaceBar filePath={findId} fileName="" editor={editor} />;
}
