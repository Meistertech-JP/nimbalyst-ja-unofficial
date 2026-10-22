// @vitest-environment jsdom
import React from 'react';
import {
  createEditor,
  $getRoot,
  $createParagraphNode,
  $createTextNode,
} from 'lexical';
import { render, screen, fireEvent } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { describe, expect, it, vi } from 'vitest';
import { TrackerSavedDescription } from '../TrackerSavedDescription';

async function renderInEnglish(ui: React.ReactNode) {
  const i18n = await createI18nInstance('en');
  return render(
    <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
      {ui}
    </UiLanguageProvider>,
  );
}

describe('saved description recovery', () => {
  it('renders recovery controls in Japanese', async () => {
    const i18n = await createI18nInstance('ja');
    const editor = createEditor({ namespace: 'recovery-ja', onError: (error) => { throw error; } });
    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <TrackerSavedDescription description="Saved text" editor={editor} canInsert />
      </UiLanguageProvider>,
    );
    screen.getByText('保存済みの説明');
    expect(screen.getByText(/項目の作成時に入力した内容/)).toBeDefined();
    screen.getByRole('button', { name: 'コピー' });
    screen.getByRole('button', { name: '本文に挿入' });
  });

  it('does not mutate on opening and inserts without replacing selected text', async () => {
    const editor = createEditor({
      namespace: 'recovery-test',
      onError: (error) => {
        throw error;
      },
    });
    editor.focus = vi.fn();
    editor.update(
      () => {
        const text = $createTextNode('Keep later edits');
        $getRoot().append($createParagraphNode().append(text));
        text.select(0, text.getTextContentSize());
      },
      { discrete: true },
    );
    const body = () =>
      editor.getEditorState().read(() => $getRoot().getTextContent());
    await renderInEnglish(
      <TrackerSavedDescription
        description="Recovered text"
        editor={editor}
        canInsert
      />,
    );
    fireEvent.click(screen.getByText('Saved description'));
    expect(body()).toBe('Keep later edits');
    fireEvent.click(screen.getByRole('button', { name: 'Insert into body' }));
    expect(body()).toContain('Keep later edits');
    expect(body()).toContain('Recovered text');
    expect(screen.getByText('Recovered text')).toBeDefined();
  });

  it('stays hidden when the description is already the body', async () => {
    // Agent-created and imported items store the same text in both fields;
    // offering it back would duplicate the body on Insert.
    const { container } = await renderInEnglish(
      <TrackerSavedDescription
        description={'Same text\n'}
        currentBody="Same text"
        editor={null}
        canInsert={false}
      />,
    );
    expect(container.querySelector('.tracker-saved-description')).toBeNull();
  });

  it('leaves insertion disabled when a shared body is not ready', async () => {
    await renderInEnglish(
      <TrackerSavedDescription
        description="Original text"
        editor={null}
        canInsert={false}
      />,
    );
    expect(
      (
        screen.getByRole('button', {
          name: 'Insert into body',
          hidden: true,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
