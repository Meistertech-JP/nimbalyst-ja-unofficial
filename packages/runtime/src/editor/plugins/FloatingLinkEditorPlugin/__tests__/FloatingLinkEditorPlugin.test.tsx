import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { $isLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $convertFromMarkdownString } from '@lexical/markdown';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { $getRoot, $isTextNode, type LexicalEditor } from 'lexical';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

import { CORE_TRANSFORMERS } from '../../../markdown/core-transformers';
import { setWorkspaceFileLinkOpener } from '../../../utils/workspaceLinkNavigation';
import FloatingLinkEditorPlugin from '../index';

vi.mock('../../../../ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

let editorRef: LexicalEditor | null = null;
let startToolbarLink: (() => void) | null = null;

function Harness() {
  const [editor] = useLexicalComposerContext();
  const [isLinkEditMode, setIsLinkEditMode] = useState(false);
  editorRef = editor;
  // Mirrors ToolbarPlugin.insertLink on a text selection.
  startToolbarLink = () => {
    setIsLinkEditMode(true);
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
  };
  return (
    <FloatingLinkEditorPlugin
      isLinkEditMode={isLinkEditMode}
      setIsLinkEditMode={setIsLinkEditMode}
    />
  );
}

async function renderMarkdown(markdown: string, language: 'en' | 'ja' = 'en') {
  const i18n = await createI18nInstance(language);
  const Wrapper = ({ children }: React.PropsWithChildren) => (
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
      {children}
    </UiLanguageProvider>
  );
  return render(
    <LexicalComposer
      initialConfig={{
        namespace: 'floating-link-editor-test',
        nodes: [LinkNode],
        onError: (error) => {
          throw error;
        },
        editorState: () => {
          $convertFromMarkdownString(markdown, CORE_TRANSFORMERS);
        },
      }}
    >
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <LinkPlugin />
      <Harness />
    </LexicalComposer>,
    { wrapper: Wrapper },
  );
}

function readLinks(): Array<[string, string]> {
  return editorRef!.getEditorState().read(() =>
    $getRoot()
      .getAllTextNodes()
      .map((node) => node.getParent())
      .filter($isLinkNode)
      .map((link) => [link.getTextContent(), link.getURL()]),
  );
}

describe('FloatingLinkEditorPlugin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setWorkspaceFileLinkOpener(null);
  });

  it('opens a web link on a plain click in an editable editor, without a card', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    await renderMarkdown('Read the [docs](https://docs.example.com/).\n');

    fireEvent.click(await screen.findByRole('link', { name: 'docs' }));

    expect(open).toHaveBeenCalledWith('https://docs.example.com/', '_blank', 'noopener,noreferrer');
    expect(screen.queryByTestId('link-hover-card')).toBeNull();
  });

  it('routes a file-path link to the workspace opener, never window.open', async () => {
    const open = vi.fn();
    const opener = vi.fn();
    vi.stubGlobal('open', open);
    setWorkspaceFileLinkOpener(opener);
    await renderMarkdown('See [notes](./notes.md).\n');

    fireEvent.click(await screen.findByRole('link', { name: 'notes' }));

    expect(opener).toHaveBeenCalledWith('./notes.md', null);
    expect(open).not.toHaveBeenCalled();
  });

  it('edits the hovered link text and URL from its card', async () => {
    await renderMarkdown('Read the [docs](https://docs.example.com/).\n');

    fireEvent.mouseOver(await screen.findByRole('link', { name: 'docs' }));
    const card = await screen.findByTestId('link-hover-card');
    expect(card.textContent).toContain('https://docs.example.com/');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const text = screen.getByRole('textbox', { name: 'Link text' });
    const url = screen.getByRole('textbox', { name: 'Link URL' });
    expect((text as HTMLInputElement).value).toBe('docs');
    expect((url as HTMLInputElement).value).toBe('https://docs.example.com/');
    fireEvent.change(text, { target: { value: 'the guide' } });
    fireEvent.change(url, { target: { value: 'https://example.org/' } });
    fireEvent.keyDown(url, { key: 'Enter' });

    await waitFor(() => expect(readLinks()).toEqual([['the guide', 'https://example.org/']]));
    expect(screen.queryByTestId('link-hover-card')).toBeNull();
  });

  it('localizes link fields, actions, and accessible names', async () => {
    await renderMarkdown('Read the [docs](https://docs.example.com/).\n', 'ja');

    fireEvent.mouseOver(await screen.findByRole('link', { name: 'docs' }));
    fireEvent.click(await screen.findByRole('button', { name: '編集' }));

    expect(screen.getByRole('textbox', { name: 'リンクテキスト' })).not.toBeNull();
    expect(screen.getByRole('textbox', { name: 'リンクURL' })).not.toBeNull();
    expect(screen.getByPlaceholderText('リンクを貼り付けまたは入力')).not.toBeNull();
    expect(screen.getByRole('button', { name: /リンクを削除/ })).not.toBeNull();
    expect(screen.getByRole('button', { name: '保存' })).not.toBeNull();
  });

  it('keeps the hover card open while the pointer travels from the link to its buttons', async () => {
    await renderMarkdown('Read the [docs](https://docs.example.com/).\n');
    const link = await screen.findByRole('link', { name: 'docs' });
    link.getBoundingClientRect = () => new DOMRect(100, 100, 40, 16);

    fireEvent.mouseOver(link);
    const card = await screen.findByTestId('link-hover-card');
    card.getBoundingClientRect = () => new DOMRect(100, 122, 300, 34);

    // Leaving the link crosses plain text, which starts the close timer...
    fireEvent.mouseOver(link.closest('p')!);
    // ...and then the pointer rests on the Edit button at the card's left.
    fireEvent.mouseMove(document, { clientX: 115, clientY: 138 });
    await act(() => new Promise((resolve) => setTimeout(resolve, 700)));
    expect(screen.queryByTestId('link-hover-card')).not.toBeNull();

    fireEvent.mouseMove(document, { clientX: 600, clientY: 400 });
    await waitFor(() => expect(screen.queryByTestId('link-hover-card')).toBeNull());
  });

  it('opens the form, unfocused, when the keyboard moves the caret into a link', async () => {
    await renderMarkdown('Read the [docs](https://docs.example.com/).\n');
    await screen.findByRole('link', { name: 'docs' });

    // A click never opens the form; a key press re-enables it.
    fireEvent.keyDown(document.querySelector('[contenteditable="true"]')!, { key: 'ArrowRight' });
    await act(async () => {
      editorRef!.update(() => {
        const linkText = $getRoot().getAllTextNodes().find((n) => n.getTextContent() === 'docs');
        linkText!.select(2, 2);
      });
    });

    const url = await screen.findByRole('textbox', { name: 'Link URL' });
    expect((url as HTMLInputElement).value).toBe('https://docs.example.com/');
    expect(document.activeElement).not.toBe(url);
  });

  it('cancelling a toolbar-started link leaves no placeholder link behind', async () => {
    await renderMarkdown('Plain words here.\n');
    await screen.findByText('Plain words here.');

    await act(async () => {
      editorRef!.update(() => {
        const text = $getRoot().getAllTextNodes()[0];
        if ($isTextNode(text)) text.select(0, 5);
      });
    });
    await act(async () => {
      startToolbarLink!();
    });

    const input = await screen.findByRole('textbox', { name: 'Link URL' });
    expect((input as HTMLInputElement).value).toBe('https://');
    expect(readLinks()).toEqual([['Plain', 'https://']]);

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => expect(readLinks()).toEqual([]));
    expect(screen.queryByTestId('link-hover-card')).toBeNull();
  });
});
