// @vitest-environment jsdom
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import * as toolResultParser from '../../../../../ai/server/transcript/toolResultParser';
import { EditorScreenshotWidget } from '../EditorScreenshotWidget';

vi.mock('../../../../../ai/server/transcript/toolResultParser', async (importOriginal) => {
  const actual = await importOriginal<typeof toolResultParser>();
  return { ...actual, parseToolResult: vi.fn(actual.parseToolResult) };
});

let testI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeEach(async () => {
  testI18n = await createI18nInstance('en');
});

describe('EditorScreenshotWidget', () => {
  it('parses the base64 result once across transcript re-renders', () => {
    const imageBase64 = 'A'.repeat(4096);
    const message = {
      type: 'tool_call',
      toolCall: {
        toolName: 'mcp__nimbalyst__capture_editor_screenshot',
        arguments: { file_path: '/ws/doc.md' },
        result: JSON.stringify([{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } }]),
      },
    } as any;
    const props = { message, isExpanded: false, onToggle: () => {}, workspacePath: '/ws' } as any;

    const { rerender, container } = render(
      <I18nextProvider i18n={testI18n}><EditorScreenshotWidget {...props} /></I18nextProvider>,
    );
    rerender(<I18nextProvider i18n={testI18n}><EditorScreenshotWidget {...props} onToggle={() => {}} /></I18nextProvider>);
    rerender(<I18nextProvider i18n={testI18n}><EditorScreenshotWidget {...props} onToggle={() => {}} /></I18nextProvider>);

    expect(toolResultParser.parseToolResult).toHaveBeenCalledTimes(1);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(`data:image/png;base64,${imageBase64}`);
  });

  it('renders Japanese screenshot labels and accessible lightbox controls', async () => {
    await testI18n.changeLanguage('ja');
    const message = {
      type: 'tool_call',
      toolCall: {
        toolName: 'mcp__nimbalyst__capture_editor_screenshot',
        arguments: { file_path: '/ws/doc.md' },
        result: JSON.stringify([{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } }]),
      },
    } as any;

    render(
      <I18nextProvider i18n={testI18n}>
        <EditorScreenshotWidget {...({ message, isExpanded: false, onToggle: () => {}, workspacePath: '/ws' } as any)} />
      </I18nextProvider>,
    );

    expect(screen.getByText('エディターのスクリーンショット')).toBeDefined();
    fireEvent.click(screen.getByTitle('クリックして拡大'));
    expect(screen.getByRole('dialog', { name: '画像プレビュー' })).toBeDefined();
    expect(screen.getByRole('button', { name: '閉じる（Esc）' }).textContent).toBe('閉じる');
  });
});
