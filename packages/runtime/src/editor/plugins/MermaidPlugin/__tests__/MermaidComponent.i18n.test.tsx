import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [{ update: (fn: () => void) => fn() }],
}));
vi.mock('lexical', async (importOriginal) => ({
  ...(await importOriginal<typeof import('lexical')>()),
  $getNodeByKey: () => ({ setContent: vi.fn() }),
}));
vi.mock('../MermaidNode', () => ({ $isMermaidNode: () => true }));
vi.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('../mermaidRender', () => ({ renderMermaid: vi.fn() }));

import MermaidComponent from '../MermaidComponent';
import { renderMermaid } from '../mermaidRender';

const i18n = await createI18nInstance('ja');

function renderMermaidComponent() {
  return render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
      <MermaidComponent content="flowchart TD\n A --> B" nodeKey="mermaid-test" />
    </UiLanguageProvider>,
  );
}

describe('MermaidComponent localization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderMermaid).mockResolvedValue({ svg: '<svg />', bindFunctions: undefined });
  });

  it('localizes the Mermaid label, redraw control, edit control, and source placeholder', () => {
    renderMermaidComponent();

    expect(screen.getByText('Mermaid図').textContent).toBe('Mermaid図');
    expect(screen.getByRole('button', { name: '再描画' }).getAttribute('title')).toBe('図を再描画');
    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    expect((screen.getByPlaceholderText('Mermaidの図のコードを入力…') as HTMLTextAreaElement).placeholder).toBe('Mermaidの図のコードを入力…');
    expect(screen.getByRole('button', { name: '完了' }).textContent).toBe('完了');
  });

  it('localizes the render error heading and fallback message', async () => {
    vi.mocked(renderMermaid).mockRejectedValue({});
    renderMermaidComponent();

    expect((await screen.findByText('図のエラー:')).textContent).toBe('図のエラー:');
    await waitFor(() => expect(screen.getByText('図の描画に失敗しました').textContent).toBe('図の描画に失敗しました'));
  });
});
