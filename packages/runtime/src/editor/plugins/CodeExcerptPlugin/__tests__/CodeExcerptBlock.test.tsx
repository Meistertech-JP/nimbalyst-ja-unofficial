/**
 * Opening a page never writes file contents into it: an excerpt received from
 * a teammate (empty snapshot or not) is only read for the badge.
 */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, type LexicalEditor } from 'lexical';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { PropsWithChildren } from 'react';
import { afterEach } from 'vitest';

const readExcerptFile = vi.fn(async () => ({ text: 'SECRET=hunter2\n', head: 'abc123def', absolutePath: '/repo/.env' }));
vi.mock('../CodeExcerptCallbacks', () => ({
  readExcerptFile: (...args: unknown[]) => readExcerptFile(...(args as [])),
  openExcerptFile: vi.fn(),
  toWorkspaceRelative: (path: string) => path,
}));

import { CodeExcerptBlock } from '../CodeExcerptBlock';
import { $createCodeExcerptNode, CodeExcerptNode } from '../CodeExcerptNodeCore';

const SHARED = 'path: .env\nlines: 1-100\n---\n';

afterEach(cleanup);

function Harness({ onEditor }: { onEditor: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext();
  const [key, setKey] = React.useState<string | null>(null);
  React.useEffect(() => {
    onEditor(editor);
    editor.update(() => {
      const node = $createCodeExcerptNode({ source: SHARED });
      $getRoot().append(node);
      setKey(node.getKey());
    }, { discrete: true });
  }, [editor, onEditor]);
  return key ? <CodeExcerptBlock source={SHARED} nodeKey={key} /> : null;
}

describe('CodeExcerptBlock', () => {
  it('localizes the quote action and empty snapshot without writing a received excerpt', async () => {
    let editor: LexicalEditor | null = null;
    const language = 'ja';
    const i18n = await createI18nInstance(language);
    const Wrapper = ({ children }: PropsWithChildren) => (
      <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
        {children}
      </UiLanguageProvider>
    );
    render(
      <LexicalComposer initialConfig={{
        namespace: 'excerpt',
        nodes: [CodeExcerptNode],
        onError: (error) => { throw error; },
      }}>
        <Harness onEditor={(value) => { editor = value; }} />
      </LexicalComposer>,
      { wrapper: Wrapper },
    );
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(screen.getByRole('button', { name: '行を引用' })).not.toBeNull();
    expect(screen.getByText('引用された行はありません。')).not.toBeNull();
    const source = editor!.getEditorState().read(() => ($getRoot().getChildren().find((node) => node instanceof CodeExcerptNode) as CodeExcerptNode).getSource());
    expect(source).toBe(SHARED);
  });
});
